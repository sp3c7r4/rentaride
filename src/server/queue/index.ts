import "server-only";
import { Queue } from "bullmq";
import { env } from "@/server/env";
import type { EmailJob } from "@/server/mail/send";
import type { EmailTemplates } from "@/server/mail/templates";

/** BullMQ wants plain connection options; workers need maxRetriesPerRequest null. */
export function bullConnection() {
  const url = new URL(env().REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export const QUEUES = { email: "email", jobs: "jobs" } as const;

const globalForQueues = globalThis as unknown as {
  rentarideQueues?: { email: Queue<EmailJob>; jobs: Queue };
};

function queues() {
  if (!globalForQueues.rentarideQueues) {
    const connection = bullConnection();
    globalForQueues.rentarideQueues = {
      email: new Queue<EmailJob>(QUEUES.email, {
        connection,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 10_000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
      jobs: new Queue(QUEUES.jobs, { connection }),
    };
  }
  return globalForQueues.rentarideQueues;
}

/** Queue an email. The worker renders and sends it, retrying on failure. */
export async function sendEmail<N extends keyof EmailTemplates>(
  to: string,
  template: N,
  data: EmailTemplates[N],
) {
  await queues().email.add(template, { to, template, data });
}

export const jobsQueue = () => queues().jobs;
