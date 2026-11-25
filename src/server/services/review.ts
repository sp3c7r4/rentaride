import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { User, Vehicle } from "@/lib/types";
import { db, schema } from "@/server/db";
import { AppError } from "@/server/errors";
import { notify } from "./notify";
import { vehiclesByIds } from "./vehicles";

export type KycItem = Pick<
  User,
  | "id"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "city"
  | "role"
  | "createdAt"
  | "licence"
  | "payoutAccount"
> & { licenceUrl?: string };

export type ListingItem = Vehicle & {
  owner: Pick<User, "firstName" | "lastName" | "kycStatus">;
  registrationUrl?: string;
};

export type ReviewQueues = { kyc: KycItem[]; listings: ListingItem[] };

const MIN_REASON = 10;

/** Oldest first, so the longest-waiting items are reviewed first. */
export async function reviewQueues(): Promise<ReviewQueues> {
  const members = await db()
    .select({
      u: schema.users,
      l: schema.driverLicences,
      p: schema.payoutAccounts,
    })
    .from(schema.users)
    .leftJoin(
      schema.driverLicences,
      eq(schema.driverLicences.userId, schema.users.id),
    )
    .leftJoin(
      schema.payoutAccounts,
      eq(schema.payoutAccounts.userId, schema.users.id),
    )
    .where(
      and(
        eq(schema.users.staff, false),
        eq(schema.users.onboarded, true),
        eq(schema.users.kycStatus, "pending"),
      ),
    )
    .orderBy(asc(schema.users.updatedAt));

  const pending = await db()
    .select({
      id: schema.vehicles.id,
      key: schema.vehicles.registrationKey,
      ownerId: schema.vehicles.ownerId,
    })
    .from(schema.vehicles)
    .where(eq(schema.vehicles.status, "pending_review"))
    .orderBy(asc(schema.vehicles.updatedAt));
  const vehicles = await vehiclesByIds(pending.map((v) => v.id));
  const owners = new Map(
    (
      await db()
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          kycStatus: schema.users.kycStatus,
        })
        .from(schema.users)
        .where(
          inArray(schema.users.id, [
            ...new Set(pending.map((v) => v.ownerId)),
            "_none",
          ]),
        )
    ).map((o) => [o.id, o]),
  );

  return {
    kyc: members.map(({ u, l, p }) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      city: u.city,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      licence: l
        ? {
            number: l.number,
            expiry: l.expiry,
            fileName: l.fileName ?? undefined,
          }
        : undefined,
      licenceUrl: l?.fileKey ? `/files/${l.fileKey}` : undefined,
      payoutAccount: p
        ? {
            bankCode: p.bankCode,
            bankName: p.bankName,
            accountNumber: p.accountNumber,
            accountName: p.accountName,
          }
        : undefined,
    })),
    listings: pending.flatMap((row) => {
      const v = vehicles.get(row.id);
      const o = owners.get(row.ownerId);
      if (!v || !o) return [];
      return [
        {
          ...v,
          owner: {
            firstName: o.firstName,
            lastName: o.lastName,
            kycStatus: o.kycStatus,
          },
          registrationUrl: row.key ? `/files/${row.key}` : undefined,
        },
      ];
    }),
  };
}

function checkReason(approve: boolean, reason: unknown) {
  const text = String(reason ?? "")
    .trim()
    .slice(0, 300);
  if (!approve && text.length < MIN_REASON)
    throw new AppError(
      "Write what needs to change, in at least 10 characters.",
    );
  return text;
}

export async function decideKyc(
  userId: string,
  approve: boolean,
  reasonRaw: unknown,
): Promise<void> {
  const reason = checkReason(approve, reasonRaw);
  const [u] = await db()
    .update(schema.users)
    .set({
      kycStatus: approve ? "verified" : "action_needed",
      kycNote: approve ? null : reason,
    })
    .where(
      and(eq(schema.users.id, userId), eq(schema.users.kycStatus, "pending")),
    )
    .returning({ role: schema.users.role });
  if (!u)
    throw new AppError("This member is no longer waiting for review.", 409);
  await notify([
    {
      userId,
      kind: "kyc_update",
      title: approve ? "You're verified" : "Verification needs attention",
      body: approve
        ? u.role === "driver"
          ? "Your licence has been checked. You can now request vehicles."
          : "Your account has been checked. Your listings can go live."
        : reason,
      href: "/dashboard/settings?tab=verification",
    },
  ]);
}

export async function decideListing(
  vehicleId: string,
  approve: boolean,
  reasonRaw: unknown,
): Promise<void> {
  const reason = checkReason(approve, reasonRaw);
  const [v] = await db()
    .update(schema.vehicles)
    .set({
      status: approve ? "live" : "rejected",
      reviewNote: approve ? null : reason,
    })
    .where(
      and(
        eq(schema.vehicles.id, vehicleId),
        eq(schema.vehicles.status, "pending_review"),
      ),
    )
    .returning({
      ownerId: schema.vehicles.ownerId,
      make: schema.vehicles.make,
      model: schema.vehicles.model,
    });
  if (!v)
    throw new AppError("This listing is no longer waiting for review.", 409);
  await notify([
    {
      userId: v.ownerId,
      kind: "kyc_update",
      title: approve ? "Your listing is live" : "Your listing needs changes",
      body: approve
        ? `The ${v.make} ${v.model} is now on the marketplace.`
        : `${v.make} ${v.model}: ${reason}`,
      href: "/dashboard/vehicles",
    },
  ]);
}
