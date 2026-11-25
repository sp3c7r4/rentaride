/**
 * Queue a scheduled job to run now on the worker.
 *   npm run job -- repayments
 *   npm run job -- payouts
 */
import { jobsQueue } from "../src/server/queue";

const NAMES: Record<string, string> = {
  repayments: "repayments:daily",
  payouts: "payouts:monthly",
};

async function main() {
  const name = NAMES[process.argv[2] ?? ""];
  if (!name) {
    console.error(`Usage: npm run job -- ${Object.keys(NAMES).join(" | ")}`);
    process.exit(1);
  }
  const q = jobsQueue();
  const job = await q.add(name, {});
  console.log(
    `Queued ${name} (job ${job.id}). Watch the worker log for the result.`,
  );
  await q.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
