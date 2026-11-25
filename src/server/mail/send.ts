import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { type EmailName, type EmailTemplates, renderEmail } from "./templates";

let transport: Transporter | null = null;

function transporter() {
  if (!transport) {
    const e = env();
    transport = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      auth: e.SMTP_USER
        ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transport;
}

export type EmailJob<N extends EmailName = EmailName> = {
  to: string;
  template: N;
  data: EmailTemplates[N];
};

/** Render and send immediately. Called by the worker; app code enqueues. */
export async function deliverEmail(job: EmailJob) {
  const { subject, text, html } = renderEmail(job.template, job.data);
  const info = await transporter().sendMail({
    from: env().EMAIL_FROM,
    to: job.to,
    subject,
    text,
    html,
  });
  logger.info("email sent", { template: job.template, id: info.messageId });
}
