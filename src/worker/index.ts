/**
 * Background worker. Runs beside `next start` (npm run worker).
 *   email queue  - sends every email the app queues, with retries
 *   jobs queue   - scheduled work (times in Africa/Lagos):
 *       repayments:daily   06:00 every day  - due/overdue, reminders, then
 *                            reconciles pending payments and stuck payouts
 *       payouts:monthly    09:00 on the 5th - owner transfers
 * Run a job now: npm run job -- repayments | payouts
 */
import { Worker } from "bullmq";
import { logger } from "@/server/logger";
import { deliverEmail, type EmailJob } from "@/server/mail/send";
import { bullConnection, jobsQueue, QUEUES } from "@/server/queue";
import { reconcilePendingPayments } from "@/server/services/payments";
import { reconcilePayouts, runDuePayouts } from "@/server/services/payouts";
import { refreshRepaymentStatuses } from "@/server/services/repayment-status";

const connection = bullConnection();
const TZ = "Africa/Lagos";

const JOBS = {
  "repayments:daily": async () => ({
    ...(await refreshRepaymentStatuses()),
    // Webhooks are the primary path; these two are the backstop for ones that
    // never arrived or for a worker that died mid-transfer.
    payments: await reconcilePendingPayments(),
    payouts: await reconcilePayouts(),
  }),
  "payouts:monthly": () => runDuePayouts(),
} as const;

const email = new Worker<EmailJob>(
  QUEUES.email,
  async (job) => deliverEmail(job.data),
  { connection, concurrency: 5 },
);
email.on("failed", (job, err) =>
  logger.error("email failed", {
    template: job?.data.template,
    attempt: job?.attemptsMade,
    error: err,
  }),
);

const jobs = new Worker(
  QUEUES.jobs,
  async (job) => {
    const run = JOBS[job.name as keyof typeof JOBS];
    if (!run) throw new Error(`Unknown job ${job.name}`);
    const result = await run();
    logger.info(`job ${job.name} done`, { result });
    return result;
  },
  // One at a time: payouts and status changes shouldn't overlap.
  { connection, concurrency: 1 },
);
jobs.on("failed", (job, err) =>
  logger.error(`job ${job?.name} failed`, { error: err }),
);

async function schedule() {
  const q = jobsQueue();
  await q.upsertJobScheduler(
    "repayments:daily",
    { pattern: "0 6 * * *", tz: TZ },
    { name: "repayments:daily" },
  );
  await q.upsertJobScheduler(
    "payouts:monthly",
    { pattern: "0 9 5 * *", tz: TZ },
    { name: "payouts:monthly" },
  );
}

schedule()
  .then(() =>
    logger.info("worker started", { queues: [QUEUES.email, QUEUES.jobs] }),
  )
  .catch((e) => {
    logger.error("could not schedule jobs", { error: e });
    process.exit(1);
  });

async function shutdown(signal: string) {
  logger.info(`worker stopping (${signal})`);
  await Promise.all([email.close(), jobs.close()]);
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
