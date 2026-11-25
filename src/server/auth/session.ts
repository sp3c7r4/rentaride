import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { randomToken, sha256, sign, unsign } from "./crypto";

const SESSION_COOKIE = "rr_session";
const PENDING_COOKIE = "rr_pending";
const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;
/** Only extend a session once a day, so reads don't write on every request. */
const REFRESH_AFTER_MS = DAY_MS;

const secure = () => env().NODE_ENV === "production";

async function requestMeta() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    ip:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
  };
}

/** Client IP for rate limiting (set by nginx in production). */
export async function clientIp(): Promise<string> {
  return (await requestMeta()).ip ?? "local";
}

/** Create a session row and set the cookie. Call from an action or handler. */
export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await db()
    .insert(schema.sessions)
    .values({ id: sha256(token), userId, expiresAt, ...(await requestMeta()) });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The user id for the current request's session, or null. */
export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = sha256(token);
  const [row] = await db()
    .select({
      userId: schema.sessions.userId,
      lastSeenAt: schema.sessions.lastSeenAt,
    })
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.id, id),
        gt(schema.sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (Date.now() - row.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
    // Sliding expiry. The cookie keeps its original expiry until the next
    // sign-in; the row is what decides validity.
    await db()
      .update(schema.sessions)
      .set({
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_DAYS * DAY_MS),
      })
      .where(eq(schema.sessions.id, id));
  }
  return row.userId;
}

/** Delete the current session and clear the cookie. */
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token)
    await db()
      .delete(schema.sessions)
      .where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

/** Sign out everywhere, e.g. after a password reset. */
export async function destroyAllSessions(userId: string) {
  await db().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

// ── Pending signup ──────────────────────────────────────────────────────────
// Holds the unverified user's id between signup and email verification, so the
// email address never appears in a URL. Signed, httpOnly, one hour.

export async function setPendingUser(userId: string) {
  (await cookies()).set(PENDING_COOKIE, sign(userId), {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function pendingUserId(): Promise<string | null> {
  return unsign((await cookies()).get(PENDING_COOKIE)?.value);
}

export async function clearPendingUser() {
  (await cookies()).delete(PENDING_COOKIE);
}
