import "server-only";
import { AppError } from "./errors";
import { redis } from "./redis";

/**
 * Fixed-window limit: at most `limit` hits per `windowSeconds` for `key`.
 * Throws a user-facing 429 when exceeded. Shared across instances via Redis.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const k = `rl:${key}`;
  // INCR and the TTL go in one MULTI: a crash between them used to leave a
  // counter without an expiry, which locked that key out for good.
  // EXPIRE ... NX only sets a TTL when there isn't one, which also heals any
  // key already stuck without one.
  const replies = await redis()
    .multi()
    .incr(k)
    .expire(k, windowSeconds, "NX")
    .exec();
  const count = Number(replies?.[0]?.[1] ?? 1);
  if (count > limit) {
    const ttl = await redis().ttl(k);
    const minutes = Math.max(1, Math.ceil(ttl / 60));
    throw new AppError(
      `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      "rate_limited",
    );
  }
}
