import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { redis } from "@/server/redis";

/**
 * Liveness/readiness for the load balancer and `docker healthcheck`.
 * Unauthenticated on purpose: it reports ok/not-ok and nothing else.
 */
export async function GET() {
  const checks = { db: false, redis: false };
  try {
    await db().execute(sql`select 1`);
    checks.db = true;
  } catch {}
  try {
    await redis().ping();
    checks.redis = true;
  } catch {}
  const ok = checks.db && checks.redis;
  return Response.json(
    { ok, checks },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
