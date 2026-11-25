import "server-only";
import { inArray } from "drizzle-orm";
import type { NotificationKind } from "@/lib/types";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { newId } from "@/server/ids";
import { logger } from "@/server/logger";
import { sendEmail } from "@/server/queue";

export type Notice = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  /** Also email it. On by default; off for low-value updates. */
  email?: boolean;
  cta?: string;
};

/**
 * Record in-app notifications and queue their emails. Call after the
 * transaction that caused them commits, so a rollback never notifies.
 * Failures are logged, never thrown: a notification must not undo a payment.
 */
export async function notify(notices: Notice[]) {
  if (notices.length === 0) return;
  try {
    await db()
      .insert(schema.notifications)
      .values(
        notices.map((n) => ({
          id: newId("ntf"),
          userId: n.userId,
          kind: n.kind,
          title: n.title,
          body: n.body,
          href: n.href ?? null,
        })),
      );
    const emailed = notices.filter((n) => n.email !== false);
    if (emailed.length === 0) return;
    const users = await db()
      .select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
      })
      .from(schema.users)
      .where(
        inArray(schema.users.id, [...new Set(emailed.map((n) => n.userId))]),
      );
    const byId = new Map(users.map((u) => [u.id, u]));
    for (const n of emailed) {
      const u = byId.get(n.userId);
      if (!u) continue;
      await sendEmail(u.email, "notification", {
        firstName: u.firstName,
        title: n.title,
        body: n.body,
        url: n.href ? `${env().APP_URL}${n.href}` : undefined,
        cta: n.cta,
      });
    }
  } catch (e) {
    logger.error("notify failed", { error: e, count: notices.length });
  }
}
