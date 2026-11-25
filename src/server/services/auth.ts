import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Role, User } from "@/lib/types";
import {
  hashPassword,
  hmac,
  randomToken,
  safeEqual,
  sixDigitCode,
  verifyPassword,
} from "@/server/auth/crypto";
import { loadUser } from "@/server/auth/dal";
import {
  clearPendingUser,
  clientIp,
  createSession,
  destroyAllSessions,
  pendingUserId,
  setPendingUser,
} from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { newId } from "@/server/ids";
import { sendEmail } from "@/server/queue";
import { rateLimit } from "@/server/rate-limit";

const CODE_TTL_MS = 10 * 60_000;
const RESET_TTL_MS = 60 * 60_000;
const MAX_CODE_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 45;

const email = z
  .email("Enter a valid email address.")
  .transform((e) => e.trim().toLowerCase());
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(200, "That password is too long.");
const name = z.string().trim().min(1).max(60);

const byEmail = (e: string) =>
  db()
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${e}`)
    .limit(1)
    .then((r) => r[0]);

function parse<T>(schemaDef: z.ZodType<T>, input: unknown): T {
  const r = schemaDef.safeParse(input);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? "Check the form.");
  return r.data;
}

// ── Email codes ─────────────────────────────────────────────────────────────

async function issueEmailCode(user: {
  id: string;
  email: string;
  firstName: string;
}) {
  const code = sixDigitCode();
  await db().transaction(async (tx) => {
    // Only the newest code works.
    await tx
      .update(schema.verificationCodes)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(schema.verificationCodes.userId, user.id),
          eq(schema.verificationCodes.purpose, "email_verify"),
          isNull(schema.verificationCodes.consumedAt),
        ),
      );
    await tx.insert(schema.verificationCodes).values({
      id: newId("vc"),
      userId: user.id,
      purpose: "email_verify",
      codeHash: hmac(`email_verify:${user.id}:${code}`),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
  });
  await sendEmail(user.email, "verify_email", {
    firstName: user.firstName,
    code,
  });
}

// ── Signup and verification ─────────────────────────────────────────────────

const signUpInput = z.object({
  firstName: name,
  lastName: name,
  email,
  password,
  role: z.enum(["driver", "owner"]).optional(),
});

export async function signUp(input: unknown): Promise<void> {
  const data = parse(signUpInput, input);
  await rateLimit(`signup:${await clientIp()}`, 10, 3600);

  const existing = await byEmail(data.email);
  if (existing?.emailVerifiedAt)
    throw new AppError(
      "An account with this email already exists. Sign in instead.",
    );

  const passwordHash = await hashPassword(data.password);
  let user: { id: string; email: string; firstName: string };
  if (existing) {
    // Unverified account from an earlier attempt: take the new details.
    await db()
      .update(schema.users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        role: data.role ?? existing.role,
      })
      .where(eq(schema.users.id, existing.id));
    user = {
      id: existing.id,
      email: existing.email,
      firstName: data.firstName,
    };
  } else {
    const id = newId("usr");
    await db()
      .insert(schema.users)
      .values({
        id,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? null,
      });
    user = { id, email: data.email, firstName: data.firstName };
  }
  await setPendingUser(user.id);
  await issueEmailCode(user);
}

export type PendingSignup = { maskedEmail: string; firstName: string };

export function maskEmail(address: string): string {
  const [local, domain] = address.split("@");
  if (!local || !domain) return address;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
}

export async function getPendingSignup(): Promise<PendingSignup | null> {
  const id = await pendingUserId();
  if (!id) return null;
  const [u] = await db()
    .select({
      email: schema.users.email,
      firstName: schema.users.firstName,
      verified: schema.users.emailVerifiedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!u || u.verified) return null;
  return { maskedEmail: maskEmail(u.email), firstName: u.firstName };
}

export async function verifyEmail(code: unknown): Promise<User> {
  const value = parse(
    z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
    code,
  );
  const userId = await pendingUserId();
  if (!userId) throw new AppError("Your sign-up session expired. Start again.");
  await rateLimit(`verify:${userId}`, 20, 3600);

  const [row] = await db()
    .select()
    .from(schema.verificationCodes)
    .where(
      and(
        eq(schema.verificationCodes.userId, userId),
        eq(schema.verificationCodes.purpose, "email_verify"),
        isNull(schema.verificationCodes.consumedAt),
      ),
    )
    .orderBy(desc(schema.verificationCodes.createdAt))
    .limit(1);

  const invalid = new AppError("That code is incorrect or has expired.");
  if (!row || row.expiresAt < new Date() || row.attempts >= MAX_CODE_ATTEMPTS)
    throw invalid;
  if (!safeEqual(row.codeHash, hmac(`email_verify:${userId}:${value}`))) {
    await db()
      .update(schema.verificationCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(schema.verificationCodes.id, row.id));
    throw row.attempts + 1 >= MAX_CODE_ATTEMPTS
      ? new AppError("Too many wrong codes. Request a new one.")
      : invalid;
  }

  await db().transaction(async (tx) => {
    await tx
      .update(schema.verificationCodes)
      .set({ consumedAt: new Date() })
      .where(eq(schema.verificationCodes.id, row.id));
    await tx
      .update(schema.users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(schema.users.id, userId));
  });
  await clearPendingUser();
  await createSession(userId);
  const user = await loadUser(userId);
  if (!user) throw new AppError("Account not found.", 404);
  return user;
}

export async function resendEmailCode(): Promise<void> {
  const userId = await pendingUserId();
  if (!userId) throw new AppError("Your sign-up session expired. Start again.");
  const [last] = await db()
    .select({ createdAt: schema.verificationCodes.createdAt })
    .from(schema.verificationCodes)
    .where(
      and(
        eq(schema.verificationCodes.userId, userId),
        eq(schema.verificationCodes.purpose, "email_verify"),
      ),
    )
    .orderBy(desc(schema.verificationCodes.createdAt))
    .limit(1);
  const wait = last
    ? RESEND_COOLDOWN_SECONDS - (Date.now() - last.createdAt.getTime()) / 1000
    : 0;
  if (wait > 0)
    throw new AppError(
      `Wait ${Math.ceil(wait)} seconds before requesting another code.`,
    );
  await rateLimit(`resend:${userId}`, 6, 3600);
  const [u] = await db()
    .select({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!u) throw new AppError("Your sign-up session expired. Start again.");
  await issueEmailCode(u);
}

// ── Sign in ─────────────────────────────────────────────────────────────────

export type SignInResult =
  | { status: "signed_in"; user: User }
  | { status: "verify_email" };

const signInInput = z.object({ email, password: z.string().min(1).max(200) });

export async function signIn(input: unknown): Promise<SignInResult> {
  const data = parse(signInInput, input);
  const ip = await clientIp();
  await rateLimit(`signin:ip:${ip}`, 30, 900);
  await rateLimit(`signin:email:${data.email}`, 10, 900);

  const user = await byEmail(data.email);
  const valid = await verifyPassword(user?.passwordHash ?? null, data.password);
  if (!user || !valid)
    throw new AppError(
      "We couldn't find an account with that email and password.",
    );

  if (!user.emailVerifiedAt) {
    await setPendingUser(user.id);
    await issueEmailCode(user);
    return { status: "verify_email" };
  }
  await createSession(user.id);
  const dto = await loadUser(user.id);
  if (!dto) throw new AppError("Account not found.", 404);
  return { status: "signed_in", user: dto };
}

// ── Password reset ──────────────────────────────────────────────────────────

export async function requestPasswordReset(input: unknown): Promise<void> {
  const address = parse(email, input);
  await rateLimit(`reset:ip:${await clientIp()}`, 10, 3600);
  await rateLimit(`reset:email:${address}`, 3, 3600);
  const user = await byEmail(address);
  // Same response whether or not the account exists.
  if (!user?.emailVerifiedAt) return;

  const token = randomToken();
  await db()
    .insert(schema.verificationCodes)
    .values({
      id: newId("vc"),
      userId: user.id,
      purpose: "password_reset",
      codeHash: hmac(`password_reset:${token}`),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });
  await sendEmail(user.email, "password_reset", {
    firstName: user.firstName,
    url: `${env().APP_URL}/reset-password?token=${token}`,
  });
}

const resetInput = z.object({ token: z.string().min(20).max(200), password });

export async function resetPassword(input: unknown): Promise<void> {
  const data = parse(resetInput, input);
  await rateLimit(`reset-submit:${await clientIp()}`, 20, 3600);
  const [row] = await db()
    .select()
    .from(schema.verificationCodes)
    .where(
      and(
        eq(schema.verificationCodes.purpose, "password_reset"),
        eq(
          schema.verificationCodes.codeHash,
          hmac(`password_reset:${data.token}`),
        ),
        isNull(schema.verificationCodes.consumedAt),
      ),
    )
    .limit(1);
  if (!row || row.expiresAt < new Date())
    throw new AppError("This reset link has expired. Request a new one.");

  const passwordHash = await hashPassword(data.password);
  const [user] = await db().transaction(async (tx) => {
    await tx
      .update(schema.verificationCodes)
      .set({ consumedAt: new Date() })
      .where(eq(schema.verificationCodes.id, row.id));
    return tx
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, row.userId))
      .returning({
        email: schema.users.email,
        firstName: schema.users.firstName,
      });
  });
  await destroyAllSessions(row.userId);
  if (user)
    await sendEmail(user.email, "password_changed", {
      firstName: user.firstName,
    });
}

const changeInput = z.object({ current: z.string().min(1), next: password });

export async function changePassword(
  user: User,
  input: unknown,
): Promise<void> {
  const data = parse(changeInput, input);
  await rateLimit(`change-password:${user.id}`, 10, 3600);
  const [row] = await db()
    .select({ hash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);
  if (!(await verifyPassword(row?.hash ?? null, data.current)))
    throw new AppError("Your current password is incorrect.");
  if (data.current === data.next)
    throw new AppError("Choose a password you haven't used for this account.");
  await db()
    .update(schema.users)
    .set({ passwordHash: await hashPassword(data.next) })
    .where(eq(schema.users.id, user.id));
  // Sign out other devices, then keep this one signed in.
  await destroyAllSessions(user.id);
  await createSession(user.id);
  await sendEmail(user.email, "password_changed", {
    firstName: user.firstName,
  });
}

export type { Role };
