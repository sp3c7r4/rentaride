import "server-only";
import { eq } from "drizzle-orm";
import type { Role, User } from "@/lib/types";
import { type DbOrTx, db, schema } from "@/server/db";
import { AppError, forbidden, unauthorized } from "@/server/errors";
import { currentUserId } from "./session";

/**
 * Data access layer for "who is calling". Every Server Action and Route
 * Handler that needs a user calls one of these; layouts and the proxy are
 * never trusted for authorization.
 */

/** Load a user with licence and payout account, shaped like the frontend `User`. */
export async function loadUser(
  id: string,
  q: DbOrTx = db(),
): Promise<User | null> {
  const [row] = await q
    .select()
    .from(schema.users)
    .leftJoin(
      schema.driverLicences,
      eq(schema.driverLicences.userId, schema.users.id),
    )
    .leftJoin(
      schema.payoutAccounts,
      eq(schema.payoutAccounts.userId, schema.users.id),
    )
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!row) return null;
  const u = row.users;
  const l = row.driver_licences;
  const p = row.payout_accounts;
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    phone: u.phone,
    city: u.city,
    kycStatus: u.kycStatus,
    kycNote: u.kycNote ?? undefined,
    onboarded: u.onboarded,
    staff: u.staff || undefined,
    createdAt: u.createdAt.toISOString(),
    licence: l
      ? {
          number: l.number,
          expiry: l.expiry,
          fileName: l.fileName ?? undefined,
        }
      : undefined,
    payoutAccount: p
      ? {
          bankCode: p.bankCode,
          bankName: p.bankName,
          accountNumber: p.accountNumber,
          accountName: p.accountName,
        }
      : undefined,
  };
}

/** The signed-in, email-verified user, or null. */
export async function optionalUser(): Promise<User | null> {
  const id = await currentUserId();
  return id ? loadUser(id) : null;
}

export async function requireUser(): Promise<User> {
  const user = await optionalUser();
  if (!user) throw unauthorized();
  return user;
}

/** A signed-in member who finished onboarding, optionally with a given role. */
export async function requireMember(role?: Role): Promise<User> {
  const user = await requireUser();
  if (user.staff) throw forbidden("Staff accounts can't do that.");
  if (!user.onboarded)
    throw new AppError(
      "Finish setting up your account first.",
      403,
      "onboarding",
    );
  if (role && user.role !== role)
    throw forbidden(
      role === "owner"
        ? "Only owners can do that."
        : "Only drivers can do that.",
    );
  return user;
}

export async function requireStaff(): Promise<User> {
  const user = await requireUser();
  if (!user.staff) throw forbidden("Only reviewers can do that.");
  return user;
}
