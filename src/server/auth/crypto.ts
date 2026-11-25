import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { env } from "@/server/env";

export const hashPassword = (password: string) => hash(password);

// A real hash of a random value, verified when the email doesn't exist so
// sign-in takes the same time either way (no account enumeration by timing).
let dummyHash: Promise<string> | null = null;
export async function verifyPassword(
  stored: string | null,
  password: string,
): Promise<boolean> {
  if (!stored) {
    dummyHash ??= hash(randomBytes(16).toString("hex"));
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  return verify(stored, password).catch(() => false);
}

/** URL-safe random token, 32 bytes. */
export const randomToken = () => randomBytes(32).toString("base64url");

export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Keyed hash for short secrets (6-digit codes) so a DB leak doesn't reveal them. */
export const hmac = (value: string) =>
  createHmac("sha256", env().AUTH_SECRET).update(value).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Uniform 6-digit code, leading zeros allowed. */
export const sixDigitCode = () =>
  randomInt(0, 1_000_000).toString().padStart(6, "0");

/** Sign a small value for a cookie: `value.signature`. */
export const sign = (value: string) => `${value}.${hmac(`cookie:${value}`)}`;

export function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  return safeEqual(signed.slice(i + 1), hmac(`cookie:${value}`)) ? value : null;
}
