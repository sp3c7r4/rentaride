import "server-only";
import { Redis } from "ioredis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as { rentarideRedis?: Redis };

/** Shared connection for rate limits and caches. BullMQ makes its own. */
export function redis(): Redis {
  if (!globalForRedis.rentarideRedis) {
    globalForRedis.rentarideRedis = new Redis(env().REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }
  return globalForRedis.rentarideRedis;
}

/** Get a JSON value from cache, or compute and store it for `ttlSeconds`. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const hit = await redis().get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await compute();
  await redis().set(key, JSON.stringify(value), "EX", ttlSeconds);
  return value;
}
