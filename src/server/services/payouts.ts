import "server-only";
import { and, desc, eq, gt, lt, lte } from "drizzle-orm";
import { formatNaira, formatPeriod } from "@/lib/format";
import type { Payout, User } from "@/lib/types";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { newReference } from "@/server/ids";
import { logger } from "@/server/logger";
import * as paystack from "@/server/paystack";
import { resolveAccountName } from "./banking";
import { toPayout } from "./dashboard";
import { notify } from "./notify";

const simulate = () =>
  !paystack.paystackConfigured() && env().NODE_ENV !== "production";

export type PayoutSummary = {
  payouts: Payout[];
  next: Payout | null;
  paidToDate: number;
  account: NonNullable<User["payoutAccount"]> | null;
};

export async function payoutSummary(owner: User): Promise<PayoutSummary> {
  const rows = await db()
    .select()
    .from(schema.payouts)
    .where(eq(schema.payouts.ownerId, owner.id))
    .orderBy(desc(schema.payouts.period));
  const payouts = rows.map(toPayout);
  const scheduled = rows
    .filter((p) => p.status === "scheduled" || p.status === "processing")
    .sort((a, b) => a.payDate.localeCompare(b.payDate));
  return {
    payouts,
    next: scheduled[0] ? toPayout(scheduled[0]) : null,
    paidToDate: rows
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0),
    account: owner.payoutAccount ?? null,
  };
}

/** Change the payout account. The name is resolved here, never taken from the browser. */
export async function updatePayoutAccount(
  owner: User,
  bankCode: string,
  accountNumber: string,
): Promise<NonNullable<User["payoutAccount"]>> {
  const resolved = await resolveAccountName(owner, bankCode, accountNumber);
  const values = {
    bankCode,
    bankName: resolved.bankName,
    accountNumber,
    accountName: resolved.accountName,
    // A new account needs a new Paystack transfer recipient.
    recipientCode: null,
  };
  await db()
    .insert(schema.payoutAccounts)
    .values({ userId: owner.id, ...values })
    .onConflictDoUpdate({ target: schema.payoutAccounts.userId, set: values });
  return {
    bankCode,
    bankName: resolved.bankName,
    accountNumber,
    accountName: resolved.accountName,
  };
}

/**
 * Pay every scheduled payout whose pay date has arrived. Runs from the worker
 * on the 5th (and is safe to run again: each payout moves to "processing"
 * once, with a fixed transfer reference).
 */
export async function runDuePayouts(
  today = new Date().toISOString().slice(0, 10),
) {
  const due = await db()
    .select({ p: schema.payouts, a: schema.payoutAccounts })
    .from(schema.payouts)
    .leftJoin(
      schema.payoutAccounts,
      eq(schema.payoutAccounts.userId, schema.payouts.ownerId),
    )
    .where(
      and(
        eq(schema.payouts.status, "scheduled"),
        lte(schema.payouts.payDate, today),
        gt(schema.payouts.amount, 0),
      ),
    );
  let sent = 0;
  for (const { p, a } of due) {
    if (!a) {
      logger.warn("payout skipped: no payout account", { payoutId: p.id });
      continue;
    }
    const reference = p.reference ?? newReference("PO");
    // Claim it first so two workers can't both send it.
    const claimed = await db()
      .update(schema.payouts)
      .set({ status: "processing", reference })
      .where(
        and(
          eq(schema.payouts.id, p.id),
          eq(schema.payouts.status, "scheduled"),
        ),
      )
      .returning({ id: schema.payouts.id });
    if (claimed.length === 0) continue;
    if (simulate()) {
      logger.debug("simulated payout transfer (no PAYSTACK_SECRET_KEY)", {
        reference,
      });
      await handleTransferEvent("transfer.success", reference);
      sent++;
      continue;
    }
    try {
      let recipient = a.recipientCode;
      if (!recipient) {
        recipient = await paystack.createTransferRecipient({
          name: a.accountName,
          accountNumber: a.accountNumber,
          bankCode: a.bankCode,
        });
        await db()
          .update(schema.payoutAccounts)
          .set({ recipientCode: recipient })
          .where(eq(schema.payoutAccounts.userId, a.userId));
      }
      const t = await paystack.initiateTransfer({
        amount: p.amount,
        recipientCode: recipient,
        reference,
        reason: `RentARide payout ${p.period}`,
      });
      await db()
        .update(schema.payouts)
        .set({ transferCode: t.transferCode })
        .where(eq(schema.payouts.id, p.id));
      sent++;
    } catch (e) {
      // A timeout or 5xx can still mean Paystack accepted the transfer. Ask
      // before marking it failed: a retry gets a new reference and would pay
      // the owner twice.
      const state = await transferState(reference);
      if (state === "paid") {
        logger.warn("payout transfer succeeded despite an error", {
          payoutId: p.id,
          reference,
        });
        await handleTransferEvent("transfer.success", reference);
        sent++;
        continue;
      }
      if (state === "open" || state === "unknown") {
        // Leave it "processing": reconcilePayouts() asks again later.
        logger.error("payout transfer unconfirmed, left processing", {
          payoutId: p.id,
          reference,
          state,
          error: e,
        });
        continue;
      }
      logger.error("payout transfer failed", { payoutId: p.id, error: e });
      await db()
        .update(schema.payouts)
        .set({
          status: "failed",
          failureReason:
            e instanceof Error ? e.message.slice(0, 300) : "Transfer failed",
        })
        .where(eq(schema.payouts.id, p.id));
    }
  }
  return { due: due.length, sent };
}

/** What Paystack says about a transfer we could not confirm locally. */
async function transferState(
  reference: string,
): Promise<"paid" | "open" | "failed" | "unknown"> {
  try {
    const t = await paystack.verifyTransfer(reference);
    if (t.status === "success") return "paid";
    if (t.status === "failed" || t.status === "reversed") return "failed";
    return "open";
  } catch {
    return "unknown";
  }
}

/**
 * Finish payouts stuck in "processing" (the worker died or the transfer call
 * was ambiguous). Safe to run repeatedly; only moves rows that are already
 * more than `minutes` old.
 */
export async function reconcilePayouts(minutes = 30) {
  if (!paystack.paystackConfigured()) return { checked: 0 };
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const rows = await db()
    .select({ id: schema.payouts.id, reference: schema.payouts.reference })
    .from(schema.payouts)
    .where(
      and(
        eq(schema.payouts.status, "processing"),
        lt(schema.payouts.updatedAt, cutoff),
      ),
    )
    .limit(50);
  for (const p of rows) {
    if (!p.reference) continue;
    const state = await transferState(p.reference);
    if (state === "paid")
      await handleTransferEvent("transfer.success", p.reference);
    else if (state === "failed")
      await handleTransferEvent("transfer.failed", p.reference);
    else
      logger.warn("payout still processing at Paystack", {
        payoutId: p.id,
        reference: p.reference,
        state,
      });
  }
  return { checked: rows.length };
}

/** transfer.success / transfer.failed / transfer.reversed from Paystack. */
export async function handleTransferEvent(event: string, reference: string) {
  const [p] = await db()
    .select()
    .from(schema.payouts)
    .where(eq(schema.payouts.reference, reference))
    .limit(1);
  if (!p) {
    logger.warn("transfer event for unknown payout", { event, reference });
    return;
  }
  if (event === "transfer.success") {
    if (p.status === "paid") return;
    await db()
      .update(schema.payouts)
      .set({ status: "paid" })
      .where(eq(schema.payouts.id, p.id));
    const [a] = await db()
      .select()
      .from(schema.payoutAccounts)
      .where(eq(schema.payoutAccounts.userId, p.ownerId))
      .limit(1);
    await notify([
      {
        userId: p.ownerId,
        kind: "payout_sent",
        title: "Payout sent",
        body: `Your ${formatPeriod(p.period)} payout of ${formatNaira(p.amount)} has been sent${a ? ` to ${a.bankName} ••••${a.accountNumber.slice(-4)}` : ""}.`,
        href: "/dashboard/payouts",
      },
    ]);
  } else if (event === "transfer.failed" || event === "transfer.reversed") {
    await db()
      .update(schema.payouts)
      .set({ status: "failed", failureReason: event })
      .where(eq(schema.payouts.id, p.id));
    logger.error("payout transfer did not complete", { event, reference });
  }
}

/** Retry a failed payout on the next run (staff or job use). */
export async function reschedulePayout(id: string) {
  const r = await db()
    .update(schema.payouts)
    // A new reference: Paystack rejects a reused transfer reference.
    .set({
      status: "scheduled",
      failureReason: null,
      reference: null,
      transferCode: null,
    })
    .where(and(eq(schema.payouts.id, id), eq(schema.payouts.status, "failed")))
    .returning({ id: schema.payouts.id });
  if (r.length === 0) throw new AppError("Only failed payouts can be retried.");
}
