import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db, schema } from "@/server/db";
import { buildSchedule, dueDate } from "@/server/services/leases";
import { settlePayment, startCheckout } from "@/server/services/payments";
import { refreshRepaymentStatuses } from "@/server/services/repayment-status";
import { approveRequest, createRequest } from "@/server/services/requests";
import { isoDay, makeUser, makeVehicle, resetDb } from "./fixtures";

beforeEach(resetDb);

async function leaseFor(weekly = 50_000) {
  const owner = await makeUser("owner");
  const driver = await makeUser("driver");
  const vehicleId = await makeVehicle(owner.id, weekly);
  const { id } = await createRequest(driver, {
    vehicleId,
    schedule: "weekly",
    termMonths: 3,
    startDate: isoDay(0),
    message: "",
  });
  const { leaseId } = await approveRequest(owner, id);
  return { owner, driver, vehicleId, leaseId };
}

const repaymentsOf = (leaseId: string) =>
  db()
    .select()
    .from(schema.repayments)
    .where(eq(schema.repayments.leaseId, leaseId))
    .orderBy(schema.repayments.index);

describe("schedule", () => {
  it("adds 7 days per weekly repayment and a month per monthly one", () => {
    expect(dueDate("2026-01-31", "weekly", 1)).toBe("2026-02-07");
    expect(dueDate("2026-01-15", "monthly", 2)).toBe("2026-03-15");
    expect(dueDate("2026-12-31", "daily", 1)).toBe("2027-01-01");
  });

  it("starts with the first repayment due and nothing paid", () => {
    const rows = buildSchedule("lse_x", "2026-01-01", "weekly", 3, 45_000);
    expect(rows).toHaveLength(13);
    expect(rows[0].status).toBe("due");
    expect(rows.slice(1).every((r) => r.status === "upcoming")).toBe(true);
  });
});

describe("approving a request", () => {
  it("creates the lease, leases the vehicle and blocks a second active lease", async () => {
    const { owner, driver, vehicleId, leaseId } = await leaseFor();
    const [v] = await db()
      .select()
      .from(schema.vehicles)
      .where(eq(schema.vehicles.id, vehicleId));
    expect(v.status).toBe("leased");
    expect(await repaymentsOf(leaseId)).toHaveLength(13);

    // The same driver can't request another vehicle while this lease is active.
    const other = await makeVehicle(owner.id);
    await expect(
      createRequest(driver, {
        vehicleId: other,
        schedule: "weekly",
        termMonths: 3,
        startDate: isoDay(1),
      }),
    ).rejects.toThrow(/active lease/);
  });
});

describe("payments", () => {
  const confirm = (amountNaira: number) => ({
    amountKobo: amountNaira * 100,
    currency: "NGN",
    channel: "card",
    paystackId: "1",
    paidAt: new Date(),
    gatewayResponse: "Approved",
  });

  it("charges the deposit with the first repayment and credits 80% of the repayment only", async () => {
    const { owner, driver, leaseId } = await leaseFor(50_000);
    const [first] = await repaymentsOf(leaseId);
    // No Paystack key in tests: development settles immediately.
    const start = await startCheckout(driver, leaseId, first.id, "card");
    expect(start.kind).toBe("settled");

    const [payment] = await db()
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.leaseId, leaseId));
    expect(payment.amount).toBe(50_000 + 100_000); // repayment + 2 weeks deposit
    expect(payment.depositAmount).toBe(100_000);
    const [lease] = await db()
      .select()
      .from(schema.leases)
      .where(eq(schema.leases.id, leaseId));
    expect(lease.depositPaidAt).not.toBeNull();

    const [payout] = await db()
      .select()
      .from(schema.payouts)
      .where(eq(schema.payouts.ownerId, owner.id));
    expect(payout.amount).toBe(40_000);
    expect(payout.status).toBe("scheduled");
  });

  it("is idempotent: a webhook after the redirect changes nothing", async () => {
    const { owner, driver, leaseId } = await leaseFor(50_000);
    const [first] = await repaymentsOf(leaseId);
    const { reference } = await startCheckout(
      driver,
      leaseId,
      first.id,
      "card",
    );
    expect(await settlePayment(reference, confirm(150_000))).toBe("already");
    const [payout] = await db()
      .select()
      .from(schema.payouts)
      .where(eq(schema.payouts.ownerId, owner.id));
    expect(payout.amount).toBe(40_000);
  });

  it("rejects a confirmation for the wrong amount", async () => {
    const { driver, leaseId } = await leaseFor(50_000);
    const [, second] = await repaymentsOf(leaseId);
    // Pay the first one so the second is next.
    const [first] = await repaymentsOf(leaseId);
    await startCheckout(driver, leaseId, first.id, "card");
    // Create a pending payment by hand, then confirm it with a smaller amount.
    await db().insert(schema.payments).values({
      id: "pmt_wrong",
      reference: "RAR-WRONG",
      leaseId,
      repaymentId: second.id,
      driverId: driver.id,
      amount: 50_000,
    });
    await settlePayment("RAR-WRONG", confirm(5_000));
    const [p] = await db()
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.reference, "RAR-WRONG"));
    expect(p.status).toBe("failed");
    const [r] = await db()
      .select()
      .from(schema.repayments)
      .where(eq(schema.repayments.id, second.id));
    expect(r.status).not.toBe("paid");
  });

  it("only lets the driver pay the earliest unpaid repayment", async () => {
    const { driver, leaseId } = await leaseFor();
    const [, second] = await repaymentsOf(leaseId);
    await expect(
      startCheckout(driver, leaseId, second.id, "card"),
    ).rejects.toThrow(/earlier repayments/);
  });
});

describe("daily repayment status", () => {
  it("marks late repayments overdue and upcoming ones in the reminder window due", async () => {
    const { leaseId } = await leaseFor();
    // 8 days in: repayments on day 0 and day 7 are late; day 14 is outside
    // the 2-day reminder window, so it stays upcoming.
    const result = await refreshRepaymentStatuses(
      new Date(Date.now() + 8 * 86_400_000),
    );
    expect(result.overdue).toBe(2);
    const after = await repaymentsOf(leaseId);
    expect(after.map((r) => r.status).slice(0, 3)).toEqual([
      "overdue",
      "overdue",
      "upcoming",
    ]);

    // 13 days in: day 14 enters the window and becomes due.
    await refreshRepaymentStatuses(new Date(Date.now() + 13 * 86_400_000));
    expect((await repaymentsOf(leaseId))[2].status).toBe("due");
  });

  it("notifies the driver about an overdue repayment", async () => {
    const { driver } = await leaseFor();
    await refreshRepaymentStatuses(new Date(Date.now() + 2 * 86_400_000));
    const notes = await db()
      .select()
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, driver.id),
          eq(schema.notifications.title, "Repayment overdue"),
        ),
      );
    expect(notes.length).toBe(1);
  });
});
