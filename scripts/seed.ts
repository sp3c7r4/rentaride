/**
 * Load demo data into the database.
 *   npm run db:seed    -> inserts demo data if the database is empty
 *   npm run db:reset   -> deletes everything, then inserts demo data
 *
 * Reuses the frontend demo data (src/lib/mock/seed.ts) so the real backend
 * starts with the same accounts, vehicles, lease and dispute.
 * Every demo account's password is DEMO_PASSWORD.
 */
import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createSeed } from "../src/lib/mock/seed";
import * as s from "../src/server/db/schema";

export const DEMO_PASSWORD = "rentaride-demo";

const day = (iso: string) => iso.slice(0, 10);

async function main() {
  const url = process.argv.includes("--test")
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema: s });

  try {
    if (process.argv.includes("--reset")) {
      await db.execute(sql`
        TRUNCATE users, sessions, verification_codes, driver_licences,
          payout_accounts, uploads, vehicles, vehicle_photos, lease_requests,
          leases, payments, repayments, payouts, paystack_events, disputes,
          dispute_messages, notifications, contact_messages
        RESTART IDENTITY CASCADE`);
      console.log("Cleared all tables.");
    } else {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(s.users);
      if (count > 0) {
        console.log(
          `Database already has ${count} users. Use db:reset to reseed.`,
        );
        return;
      }
    }

    const seed = createSeed();
    const passwordHash = await hash(DEMO_PASSWORD);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(s.users).values(
        seed.users.map((u) => ({
          id: u.id,
          email: u.email,
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          phone: u.phone,
          city: u.city,
          emailVerifiedAt: now,
          kycStatus: u.kycStatus,
          kycNote: u.kycNote ?? null,
          onboarded: u.onboarded,
          staff: u.staff ?? false,
          createdAt: new Date(u.createdAt),
        })),
      );

      const licences = seed.users.filter((u) => u.licence);
      if (licences.length)
        await tx.insert(s.driverLicences).values(
          licences.map((u) => ({
            userId: u.id,
            number: u.licence?.number ?? "",
            expiry: u.licence?.expiry ?? "",
            fileName: u.licence?.fileName ?? null,
          })),
        );

      const accounts = seed.users.filter((u) => u.payoutAccount);
      if (accounts.length)
        await tx.insert(s.payoutAccounts).values(
          accounts.map((u) => ({
            userId: u.id,
            bankCode: u.payoutAccount?.bankCode ?? "",
            bankName: u.payoutAccount?.bankName ?? "",
            accountNumber: u.payoutAccount?.accountNumber ?? "",
            accountName: u.payoutAccount?.accountName ?? "",
          })),
        );

      await tx.insert(s.vehicles).values(
        seed.vehicles.map((v) => ({
          id: v.id,
          ownerId: v.ownerId,
          make: v.make,
          model: v.model,
          year: v.year,
          colour: v.colour,
          plate: v.plate,
          type: v.type,
          transmission: v.transmission,
          seats: v.seats,
          fuel: v.fuel,
          city: v.city,
          mileageKm: v.mileageKm,
          priceDaily: v.pricing.daily,
          priceWeekly: v.pricing.weekly,
          priceMonthly: v.pricing.monthly,
          status: v.status,
          rating: v.rating,
          trips: v.trips,
          createdAt: new Date(v.createdAt),
        })),
      );
      await tx.insert(s.vehiclePhotos).values(
        seed.vehicles.flatMap((v) =>
          [v.photo, ...(v.gallery ?? [])].map((src, position) => ({
            id: `${v.id}_p${position}`,
            vehicleId: v.id,
            src,
            position,
          })),
        ),
      );

      await tx.insert(s.leaseRequests).values(
        seed.requests.map((r) => ({
          id: r.id,
          vehicleId: r.vehicleId,
          driverId: r.driverId,
          ownerId: r.ownerId,
          schedule: r.schedule,
          termMonths: r.termMonths,
          startDate: day(r.startDate),
          message: r.message,
          status: r.status,
          declineReason: r.declineReason ?? null,
          decidedAt: r.decidedAt ? new Date(r.decidedAt) : null,
          createdAt: new Date(r.createdAt),
        })),
      );

      for (const l of seed.leases) {
        await tx.insert(s.leases).values({
          id: l.id,
          requestId: l.requestId,
          vehicleId: l.vehicleId,
          driverId: l.driverId,
          ownerId: l.ownerId,
          schedule: l.schedule,
          termMonths: l.termMonths,
          startDate: day(l.startDate),
          endDate: day(l.endDate),
          deposit: l.deposit,
          depositPaidAt: new Date(l.createdAt),
          status: l.status,
          createdAt: new Date(l.createdAt),
        });
        // Paid seed repayments get a matching successful payment.
        const paid = l.repayments.filter((r) => r.status === "paid");
        if (paid.length)
          await tx.insert(s.payments).values(
            paid.map((r) => ({
              id: `pmt_${r.id}`,
              reference: r.reference ?? `RAR-SEED-${r.id}`,
              leaseId: l.id,
              repaymentId: r.id,
              driverId: l.driverId,
              amount: r.amount,
              channel: r.method ?? null,
              status: "success" as const,
              paidAt: r.paidAt ? new Date(r.paidAt) : null,
              createdAt: r.paidAt ? new Date(r.paidAt) : now,
            })),
          );
        await tx.insert(s.repayments).values(
          l.repayments.map((r) => ({
            id: r.id,
            leaseId: l.id,
            index: r.index,
            dueDate: day(r.dueDate),
            amount: r.amount,
            status: r.status,
            paidAt: r.paidAt ? new Date(r.paidAt) : null,
            paymentId: r.status === "paid" ? `pmt_${r.id}` : null,
          })),
        );
      }

      if (seed.payouts.length)
        await tx.insert(s.payouts).values(
          seed.payouts.map((p) => ({
            id: p.id,
            ownerId: p.ownerId,
            period: p.period,
            amount: p.amount,
            status: p.status,
            payDate: day(p.payDate),
            reference: p.reference ?? null,
          })),
        );

      for (const d of seed.disputes) {
        await tx.insert(s.disputes).values({
          id: d.id,
          leaseId: d.leaseId,
          openedBy: d.openedBy,
          category: d.category,
          subject: d.subject,
          status: d.status,
          createdAt: new Date(d.createdAt),
        });
        await tx.insert(s.disputeMessages).values(
          d.messages.map((m) => ({
            id: m.id,
            disputeId: d.id,
            authorId: m.authorId === "support" ? null : m.authorId,
            body: m.body,
            createdAt: new Date(m.createdAt),
          })),
        );
      }

      if (seed.notifications.length)
        await tx.insert(s.notifications).values(
          seed.notifications.map((n) => ({
            id: n.id,
            userId: n.userId,
            kind: n.kind,
            title: n.title,
            body: n.body,
            href: n.href ?? null,
            readAt: n.read ? new Date(n.createdAt) : null,
            createdAt: new Date(n.createdAt),
          })),
        );
    });

    console.log(
      `Seeded ${seed.users.length} users, ${seed.vehicles.length} vehicles, ${seed.leases.length} lease.`,
    );
    console.log(`Demo password for every account: ${DEMO_PASSWORD}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
