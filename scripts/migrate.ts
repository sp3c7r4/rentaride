/**
 * Apply pending migrations from ./drizzle.
 *   npm run db:migrate            -> DATABASE_URL
 *   npm run db:migrate -- --test  -> TEST_DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const test = process.argv.includes("--test");
const url = test ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
if (!url) {
  console.error(`${test ? "TEST_DATABASE_URL" : "DATABASE_URL"} is not set.`);
  process.exit(1);
}

async function main(connectionString: string) {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log(
      `Migrations applied to ${new URL(connectionString).pathname.slice(1)}.`,
    );
  } finally {
    await pool.end();
  }
}

main(url).catch((e) => {
  console.error(e);
  process.exit(1);
});
