import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/env";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
/** A transaction handle; services accept either so they compose. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

// One pool per process. Survives Next.js dev reloads via globalThis.
const globalForDb = globalThis as unknown as { rentarideDb?: Db };

export function db(): Db {
  if (!globalForDb.rentarideDb) {
    const pool = new Pool({ connectionString: env().DATABASE_URL, max: 10 });
    globalForDb.rentarideDb = drizzle(pool, { schema });
  }
  return globalForDb.rentarideDb;
}

export { schema };
