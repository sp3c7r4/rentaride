import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Tests run without a Paystack key; these two paths only exist when the
// gateway is live, so the module is stubbed to report what Paystack would.
const verifyTransaction = vi.fn();
const verifyTransfer = vi.fn();
vi.mock("@/server/paystack", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/paystack")>()),
  paystackConfigured: () => true,
  verifyTransaction: (...args: unknown[]) => verifyTransaction(...args),
  verifyTransfer: (...args: unknown[]) => verifyTransfer(...args),
}));

const { db, schema } = await import("@/server/db");
const { reconcilePayouts } = await import("@/server/services/payouts");
const { reconcilePendingPayments } = await import("@/server/services/payments");
const { rateLimit } = await import("@/server/rate-limit");
const { redis } = await import("@/server/redis");
const { approveRequest, createRequest } = await import(
  "@/server/services/requests"
);
const { isoDay, makeUser, makeVehicle, resetDb } = await import("./fixtures");

beforeEach(async () => {
  verifyTransaction.mockReset();
  verifyTransfer.mockReset();
  await resetDb();
});

async function leaseFor(kyc: "verified" | "pending" = "verified") {
  const owner = await makeUser("owner");
  const driver = await makeUser("driver", { kycStatus: kyc });
  const vehicleId = await makeVehicle(owner.id, 50_000);
  const { id } = await createRequest(driver, {
    vehicleId,
    schedule: "weekly",
    termMonths: 3,
    startDate: isoDay(0),
    message: "",
  });
  return { owner, driver, vehicleId, requestId: id };
}

describe("rate limiting", () => {
  it("always leaves an expiry on the counter", async () => {
    const key = `test:${Date.now()}`;
    await rateLimit(key, 1, 60);
    const ttl = await redis().ttl(`rl:${key}`);
    expect(ttl).toBeGreaterThan(0);
    await expect(rateLimit(key, 1, 60)).rejects.toThrow(/Too many attempts/);
  });
});

describe("starting a lease", () => {
  it("refuses to start for a driver whose licence isn't verified", async () => {
    const { owner, requestId } = await leaseFor("pending");
    await expect(approveRequest(owner, requestId)).rejects.toThrow(
      /isn't verified/,
    );
    const leases = await db().select().from(schema.leases);
    expect(leases).toHaveLength(0);
  });
});

describe("reconciling a missed webhook", () => {
  it("settles a pending payment that Paystack says succeeded", async () => {
    const { owner, driver, requestId } = await leaseFor();
    const { leaseId } = await approveRequest(owner, requestId);
    const [first] = await db()
      .select()
      .from(schema.repayments)
      .where(eq(schema.repayments.leaseId, leaseId));
    await db()
      .insert(schema.payments)
      .values({
        id: "pmt_pending",
        reference: "RAR-PENDING",
        leaseId,
        repaymentId: first.id,
        driverId: driver.id,
        amount: first.amount,
        status: "pending",
        createdAt: new Date(Date.now() - 2 * 3_600_000),
      });
    verifyTransaction.mockResolvedValue({
      id: 1,
      status: "success",
      reference: "RAR-PENDING",
      amount: first.amount * 100,
      currency: "NGN",
      channel: "card",
      paid_at: new Date().toISOString(),
      gateway_response: "Approved",
    });

    expect(await reconcilePendingPayments()).toEqual({
      checked: 1,
      settled: 1,
    });
    const [payment] = await db()
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.reference, "RAR-PENDING"));
    expect(payment.status).toBe("success");
    const [repayment] = await db()
      .select()
      .from(schema.repayments)
      .where(eq(schema.repayments.id, first.id));
    expect(repayment.status).toBe("paid");
    const [payout] = await db()
      .select()
      .from(schema.payouts)
      .where(eq(schema.payouts.ownerId, owner.id));
    expect(payout.amount).toBe(40_000);
  });

  it("leaves a payment alone while Paystack still says pending", async () => {
    const { owner, driver, requestId } = await leaseFor();
    const { leaseId } = await approveRequest(owner, requestId);
    const [first] = await db()
      .select()
      .from(schema.repayments)
      .where(eq(schema.repayments.leaseId, leaseId));
    await db()
      .insert(schema.payments)
      .values({
        id: "pmt_pending",
        reference: "RAR-PENDING",
        leaseId,
        repaymentId: first.id,
        driverId: driver.id,
        amount: first.amount,
        status: "pending",
        createdAt: new Date(Date.now() - 2 * 3_600_000),
      });
    verifyTransaction.mockResolvedValue({
      id: 1,
      status: "ongoing",
      reference: "RAR-PENDING",
      amount: first.amount * 100,
      currency: "NGN",
      channel: "card",
      paid_at: null,
      gateway_response: "Pending",
    });
    expect(await reconcilePendingPayments()).toEqual({
      checked: 1,
      settled: 0,
    });
    const [payment] = await db()
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.reference, "RAR-PENDING"));
    expect(payment.status).toBe("pending");
  });
});

describe("reconciling payouts", () => {
  it("marks a stuck transfer paid when Paystack says it succeeded", async () => {
    const owner = await makeUser("owner");
    await db()
      .insert(schema.payouts)
      .values({
        id: "pay_stuck",
        ownerId: owner.id,
        period: "2026-11",
        amount: 40_000,
        payDate: isoDay(-1),
        status: "processing",
        reference: "PO-STUCK",
        updatedAt: new Date(Date.now() - 2 * 3_600_000),
      });
    verifyTransfer.mockResolvedValue({
      status: "success",
      reference: "PO-STUCK",
      amount: 4_000_000,
      transfer_code: "TRF_1",
    });

    expect(await reconcilePayouts()).toEqual({ checked: 1 });
    const [payout] = await db()
      .select()
      .from(schema.payouts)
      .where(eq(schema.payouts.id, "pay_stuck"));
    expect(payout.status).toBe("paid");
  });

  it("marks it failed when Paystack says the transfer failed", async () => {
    const owner = await makeUser("owner");
    await db()
      .insert(schema.payouts)
      .values({
        id: "pay_stuck",
        ownerId: owner.id,
        period: "2026-11",
        amount: 40_000,
        payDate: isoDay(-1),
        status: "processing",
        reference: "PO-STUCK",
        updatedAt: new Date(Date.now() - 2 * 3_600_000),
      });
    verifyTransfer.mockResolvedValue({
      status: "failed",
      reference: "PO-STUCK",
      amount: 4_000_000,
      transfer_code: "TRF_1",
    });

    await reconcilePayouts();
    const [payout] = await db()
      .select()
      .from(schema.payouts)
      .where(eq(schema.payouts.id, "pay_stuck"));
    expect(payout.status).toBe("failed");
  });
});
