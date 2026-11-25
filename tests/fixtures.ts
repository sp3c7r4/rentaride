import { sql } from "drizzle-orm";
import { loadUser } from "@/server/auth/dal";
import { db, schema } from "@/server/db";

/** Empty every table in the test database. */
export async function resetDb() {
  await db().execute(sql`
    TRUNCATE users, sessions, verification_codes, driver_licences,
      payout_accounts, uploads, vehicles, vehicle_photos, lease_requests,
      leases, payments, repayments, payouts, paystack_events, disputes,
      dispute_messages, notifications, contact_messages
    RESTART IDENTITY CASCADE`);
}

let n = 0;

/** A verified, onboarded member. */
export async function makeUser(
  role: "driver" | "owner",
  extra: Partial<typeof schema.users.$inferInsert> = {},
) {
  n++;
  const id = `usr_t${role}${n}`;
  await db()
    .insert(schema.users)
    .values({
      id,
      email: `${id}@test.rentaride.ng`,
      passwordHash: "x",
      firstName: role === "owner" ? "Olu" : "Dami",
      lastName: `Test${n}`,
      role,
      phone: "08030000000",
      city: "Lagos",
      emailVerifiedAt: new Date(),
      kycStatus: "verified",
      onboarded: true,
      ...extra,
    });
  const user = await loadUser(id);
  if (!user) throw new Error("fixture user missing");
  return user;
}

export async function makeVehicle(ownerId: string, weekly = 50_000) {
  n++;
  const id = `veh_t${n}`;
  await db()
    .insert(schema.vehicles)
    .values({
      id,
      ownerId,
      make: "Toyota",
      model: "Corolla",
      year: 2020,
      colour: "Blue",
      plate: `LAG-${100 + n}TS`,
      type: "sedan",
      transmission: "automatic",
      seats: 5,
      fuel: "petrol",
      city: "Lagos",
      mileageKm: 40_000,
      priceDaily: Math.round(weekly / 6 / 500) * 500,
      priceWeekly: weekly,
      priceMonthly: weekly * 4,
      status: "live",
    });
  return id;
}

export const isoDay = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
