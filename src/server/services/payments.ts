import "server-only";
import { and, asc, eq, lt, ne, sql } from "drizzle-orm";
import { formatNaira } from "@/lib/format";
import { addMonths, OWNER_SHARE } from "@/lib/pricing";
import type { User } from "@/lib/types";
import { db, schema, type Tx } from "@/server/db";
import { env } from "@/server/env";
import { AppError, notFound } from "@/server/errors";
import { newId, newReference } from "@/server/ids";
import { logger } from "@/server/logger";
import * as paystack from "@/server/paystack";
import { sendEmail } from "@/server/queue";
import { rateLimit } from "@/server/rate-limit";
import { type Notice, notify } from "./notify";

export type PaymentChannel = "card" | "transfer" | "ussd";
const PAYSTACK_CHANNEL: Record<
  PaymentChannel,
  "card" | "bank_transfer" | "ussd"
> = {
  card: "card",
  transfer: "bank_transfer",
  ussd: "ussd",
};
const fromPaystackChannel = (c: string): PaymentChannel | null =>
  c === "card"
    ? "card"
    : c === "bank_transfer"
      ? "transfer"
      : c === "ussd"
        ? "ussd"
        : null;

/**
 * Without PAYSTACK_SECRET_KEY in development, checkout settles immediately so
 * the flow can be tested. Production always goes through Paystack.
 */
const simulate = () =>
  !paystack.paystackConfigured() && env().NODE_ENV !== "production";

export type CheckoutStart =
  | { kind: "redirect"; url: string; reference: string }
  | { kind: "settled"; reference: string };

/** What the next payment on a lease costs: the repayment, plus the deposit the first time. */
async function nextCharge(driver: User, leaseId: string, repaymentId: string) {
  const [lease] = await db()
    .select()
    .from(schema.leases)
    .where(
      and(eq(schema.leases.id, leaseId), eq(schema.leases.driverId, driver.id)),
    )
    .limit(1);
  if (!lease) throw notFound("Lease");
  if (lease.status !== "active")
    throw new AppError("This lease is no longer active.");
  const [next] = await db()
    .select()
    .from(schema.repayments)
    .where(
      and(
        eq(schema.repayments.leaseId, leaseId),
        ne(schema.repayments.status, "paid"),
      ),
    )
    .orderBy(asc(schema.repayments.index))
    .limit(1);
  if (!next) throw new AppError("This lease is fully paid.");
  if (next.id !== repaymentId)
    throw new AppError("Pay your earlier repayments first.");
  const deposit = lease.depositPaidAt ? 0 : lease.deposit;
  return { lease, repayment: next, deposit, amount: next.amount + deposit };
}

export async function startCheckout(
  driver: User,
  leaseId: string,
  repaymentId: string,
  channel: PaymentChannel,
): Promise<CheckoutStart> {
  await rateLimit(`checkout:${driver.id}`, 20, 3600);
  const { lease, repayment, deposit, amount } = await nextCharge(
    driver,
    leaseId,
    repaymentId,
  );
  const reference = newReference("RAR");

  // Older unfinished attempts for this repayment are abandoned.
  await db()
    .update(schema.payments)
    .set({ status: "abandoned" })
    .where(
      and(
        eq(schema.payments.repaymentId, repayment.id),
        eq(schema.payments.status, "pending"),
      ),
    );
  await db()
    .insert(schema.payments)
    .values({
      id: newId("pmt"),
      reference,
      leaseId: lease.id,
      repaymentId: repayment.id,
      driverId: driver.id,
      amount,
      depositAmount: deposit,
      channel,
    });

  if (simulate()) {
    logger.debug("simulated Paystack payment (no PAYSTACK_SECRET_KEY)", {
      reference,
    });
    await settlePayment(reference, {
      amountKobo: amount * 100,
      currency: "NGN",
      channel: PAYSTACK_CHANNEL[channel],
      paystackId: "simulated",
      paidAt: new Date(),
      gatewayResponse: "Simulated in development",
    });
    return { kind: "settled", reference };
  }

  const init = await paystack.initializeTransaction({
    email: driver.email,
    amount,
    reference,
    callbackUrl: `${env().APP_URL}/dashboard/leases/${lease.id}?reference=${reference}`,
    channels: [PAYSTACK_CHANNEL[channel]],
    metadata: {
      leaseId: lease.id,
      repaymentId: repayment.id,
      driverId: driver.id,
    },
  });
  return { kind: "redirect", url: init.authorizationUrl, reference };
}

type Confirmation = {
  amountKobo: number;
  currency: string;
  channel: string;
  paystackId: string;
  paidAt: Date;
  gatewayResponse: string;
};

/** Owner's share goes on the scheduled payout for this month (or the next, if this one has gone out). */
async function creditOwner(tx: Tx, ownerId: string, repaymentAmount: number) {
  const share = Math.round(repaymentAmount * OWNER_SHARE);
  for (let offset = 0; offset < 3; offset++) {
    const month = addMonths(new Date(), offset);
    const period = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
    const payDay = addMonths(new Date(`${period}-05T00:00:00Z`), 1)
      .toISOString()
      .slice(0, 10);
    const inserted = await tx
      .insert(schema.payouts)
      .values({
        id: newId("pay"),
        ownerId,
        period,
        amount: share,
        payDate: payDay,
      })
      .onConflictDoUpdate({
        target: [schema.payouts.ownerId, schema.payouts.period],
        set: { amount: sql`${schema.payouts.amount} + ${share}` },
        setWhere: eq(schema.payouts.status, "scheduled"),
      })
      .returning({ id: schema.payouts.id });
    if (inserted.length) return;
  }
  throw new Error(`No open payout period for owner ${ownerId}`);
}

/**
 * Mark a payment successful and apply it. Idempotent: the browser return and
 * the webhook can both call it; only the first changes anything. The amount
 * Paystack confirms must match what we charged.
 */
export async function settlePayment(
  reference: string,
  c: Confirmation,
): Promise<"settled" | "already"> {
  const notices: Notice[] = [];
  let receipt: {
    to: string;
    firstName: string;
    amount: number;
    vehicle: string;
    leaseId: string;
  } | null = null;

  const outcome = await db().transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.reference, reference))
      .for("update")
      .limit(1);
    if (!payment) throw new Error(`Unknown payment reference ${reference}`);
    if (payment.status === "success") return "already" as const;
    if (c.currency !== "NGN" || c.amountKobo !== payment.amount * 100) {
      logger.error("payment amount mismatch", {
        reference,
        expected: payment.amount * 100,
        got: c.amountKobo,
      });
      await tx
        .update(schema.payments)
        .set({ status: "failed", gatewayResponse: "Amount mismatch" })
        .where(eq(schema.payments.id, payment.id));
      return "already" as const;
    }

    await tx
      .update(schema.payments)
      .set({
        status: "success",
        channel: fromPaystackChannel(c.channel) ?? payment.channel,
        paystackId: c.paystackId,
        paidAt: c.paidAt,
        gatewayResponse: c.gatewayResponse,
      })
      .where(eq(schema.payments.id, payment.id));

    const [repayment] = await tx
      .update(schema.repayments)
      .set({ status: "paid", paidAt: c.paidAt, paymentId: payment.id })
      .where(
        and(
          eq(schema.repayments.id, payment.repaymentId),
          ne(schema.repayments.status, "paid"),
        ),
      )
      .returning();
    const [lease] = await tx
      .select()
      .from(schema.leases)
      .where(eq(schema.leases.id, payment.leaseId))
      .limit(1);
    if (!lease) throw new Error(`Lease missing for payment ${reference}`);
    if (!repayment) {
      // Already paid by another payment: money arrived twice. Keep it for support.
      logger.error("duplicate payment for repayment", {
        reference,
        repaymentId: payment.repaymentId,
      });
      return "already" as const;
    }
    if (payment.depositAmount > 0 && !lease.depositPaidAt)
      await tx
        .update(schema.leases)
        .set({ depositPaidAt: c.paidAt })
        .where(eq(schema.leases.id, lease.id));

    await creditOwner(tx, lease.ownerId, repayment.amount);

    const [{ remaining }] = await tx
      .select({ remaining: sql<number>`count(*)::int` })
      .from(schema.repayments)
      .where(
        and(
          eq(schema.repayments.leaseId, lease.id),
          ne(schema.repayments.status, "paid"),
        ),
      );
    const [vehicle] = await tx
      .select()
      .from(schema.vehicles)
      .where(eq(schema.vehicles.id, lease.vehicleId))
      .limit(1);
    if (remaining === 0) {
      await tx
        .update(schema.leases)
        .set({ status: "completed" })
        .where(eq(schema.leases.id, lease.id));
      await tx
        .update(schema.vehicles)
        .set({ status: "live", trips: sql`${schema.vehicles.trips} + 1` })
        .where(eq(schema.vehicles.id, lease.vehicleId));
    }

    const name = vehicle ? `${vehicle.make} ${vehicle.model}` : "your vehicle";
    const [driver] = await tx
      .select({ email: schema.users.email, firstName: schema.users.firstName })
      .from(schema.users)
      .where(eq(schema.users.id, lease.driverId))
      .limit(1);
    if (driver)
      receipt = {
        to: driver.email,
        firstName: driver.firstName,
        amount: payment.amount,
        vehicle: name,
        leaseId: lease.id,
      };
    notices.push(
      {
        userId: lease.driverId,
        kind: "payment_received",
        title: "Payment received",
        body: `We received ${formatNaira(payment.amount)} for the ${name}. Reference ${reference}.`,
        href: "/dashboard/payments",
        email: false, // the receipt email covers it
      },
      {
        userId: lease.ownerId,
        kind: "payment_received",
        title: "Repayment collected",
        body: `A repayment for your ${name} was collected. It will be included in your next payout.`,
        href: `/dashboard/leases/${lease.id}`,
      },
    );
    return "settled" as const;
  });

  if (outcome === "settled") {
    await notify(notices);
    if (receipt) {
      const r = receipt as {
        to: string;
        firstName: string;
        amount: number;
        vehicle: string;
        leaseId: string;
      };
      await sendEmail(r.to, "payment_receipt", {
        firstName: r.firstName,
        amount: formatNaira(r.amount),
        vehicle: r.vehicle,
        reference,
        url: `${env().APP_URL}/dashboard/leases/${r.leaseId}`,
      }).catch((e) =>
        logger.error("receipt email failed", { error: e, reference }),
      );
    }
  }
  return outcome;
}

export type PaymentStatus = {
  status: "success" | "pending" | "failed" | "abandoned";
  reference: string;
  amount: number;
};

/** Apply what Paystack says about one pending payment. */
async function syncWithPaystack(payment: typeof schema.payments.$inferSelect) {
  const tx = await paystack.verifyTransaction(payment.reference);
  if (tx.status === "success") {
    await settlePayment(payment.reference, {
      amountKobo: tx.amount,
      currency: tx.currency,
      channel: tx.channel,
      paystackId: String(tx.id),
      paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
      gatewayResponse: tx.gateway_response,
    });
    return "success" as const;
  }
  if (tx.status === "failed" || tx.status === "abandoned") {
    await db()
      .update(schema.payments)
      .set({ status: tx.status, gatewayResponse: tx.gateway_response })
      .where(
        and(
          eq(schema.payments.id, payment.id),
          eq(schema.payments.status, "pending"),
        ),
      );
    return tx.status;
  }
  return "pending" as const;
}

/** After Paystack redirects back: confirm with Paystack and settle. */
export async function confirmReturn(
  driver: User,
  reference: string,
): Promise<PaymentStatus> {
  const [payment] = await db()
    .select()
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.reference, reference),
        eq(schema.payments.driverId, driver.id),
      ),
    )
    .limit(1);
  if (!payment) throw notFound("Payment");
  if (payment.status === "pending" && paystack.paystackConfigured()) {
    const status = await syncWithPaystack(payment);
    return { status, reference, amount: payment.amount };
  }
  return { status: payment.status, reference, amount: payment.amount };
}

/**
 * Backstop for a webhook that never arrived (nginx, restarts, a missed event):
 * payments still pending after `minutes` are re-checked with Paystack. The
 * webhook stays the primary path; this only stops money sitting unallocated.
 */
export async function reconcilePendingPayments(minutes = 60, limit = 50) {
  if (!paystack.paystackConfigured()) return { checked: 0, settled: 0 };
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const rows = await db()
    .select()
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.status, "pending"),
        lt(schema.payments.createdAt, cutoff),
      ),
    )
    .orderBy(asc(schema.payments.createdAt))
    .limit(limit);
  let settled = 0;
  for (const payment of rows) {
    try {
      if ((await syncWithPaystack(payment)) === "success") settled++;
    } catch (e) {
      logger.warn("payment reconcile failed", {
        reference: payment.reference,
        error: e,
      });
    }
  }
  return { checked: rows.length, settled };
}

/** Paystack webhook for `charge.success`: verify with Paystack, then settle. */
export async function handleChargeSuccess(reference: string) {
  const tx = await paystack.verifyTransaction(reference);
  if (tx.status !== "success") {
    logger.warn("charge.success but verify says otherwise", {
      reference,
      status: tx.status,
    });
    return;
  }
  await settlePayment(reference, {
    amountKobo: tx.amount,
    currency: tx.currency,
    channel: tx.channel,
    paystackId: String(tx.id),
    paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
    gatewayResponse: tx.gateway_response,
  });
}

/** Quote for the checkout dialog: includes the deposit on the first payment. */
export async function quote(
  driver: User,
  leaseId: string,
  repaymentId: string,
) {
  const { deposit, amount, repayment } = await nextCharge(
    driver,
    leaseId,
    repaymentId,
  );
  return { repayment: repayment.amount, deposit, total: amount };
}
