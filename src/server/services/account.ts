import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AppNotification, User } from "@/lib/types";
import { clientIp } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { newId, newReference } from "@/server/ids";
import { sendEmail } from "@/server/queue";
import { rateLimit } from "@/server/rate-limit";
import { toNotification } from "./dashboard";
import { notify } from "./notify";
import { assertOwnUploads } from "./uploads";

const PHONE = /^(\+?234|0)[789][01]\d{8}$/;

// ── Profile and licence ─────────────────────────────────────────────────────

const profileInput = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  lastName: z.string().trim().min(1, "Enter your last name.").max(60),
  phone: z.string().trim(),
  city: z.string().trim().min(2, "Enter your city.").max(60),
});

export async function updateProfile(user: User, raw: unknown): Promise<void> {
  const r = profileInput.safeParse(raw);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? "Check your details.");
  if (!PHONE.test(r.data.phone.replace(/[\s-]/g, "")))
    throw new AppError("Enter a valid Nigerian phone number.");
  await db()
    .update(schema.users)
    .set(r.data)
    .where(eq(schema.users.id, user.id));
}

const licenceInput = z.object({
  number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z]{3}[A-Z0-9]{9}$/,
      "Enter the 12-character licence number, for example LAG12345AA01.",
    ),
  expiry: z.iso.date(),
  fileKey: z.string().min(1, "Upload a photo of the new licence."),
});

/** Replacing the licence restarts verification. */
export async function updateLicence(user: User, raw: unknown): Promise<void> {
  if (user.role !== "driver")
    throw new AppError("Only drivers have a licence on file.");
  const r = licenceInput.safeParse(raw);
  if (!r.success)
    throw new AppError(
      r.error.issues[0]?.message ?? "Check the licence details.",
    );
  if (r.data.expiry <= new Date().toISOString().slice(0, 10))
    throw new AppError("This licence has expired.");
  const files = await assertOwnUploads(user.id, "licence", [r.data.fileKey]);
  const values = {
    number: r.data.number,
    expiry: r.data.expiry,
    fileKey: r.data.fileKey,
    fileName: files.get(r.data.fileKey)?.name,
  };
  await db().transaction(async (tx) => {
    await tx
      .insert(schema.driverLicences)
      .values({ userId: user.id, ...values })
      .onConflictDoUpdate({
        target: schema.driverLicences.userId,
        set: values,
      });
    await tx
      .update(schema.users)
      .set({ kycStatus: "pending", kycNote: null })
      .where(eq(schema.users.id, user.id));
  });
  await notify([
    {
      userId: user.id,
      kind: "kyc_update",
      title: "Licence received",
      body: "We're checking your new licence. This usually takes a few hours.",
      href: "/dashboard/settings?tab=verification",
      email: false,
    },
  ]);
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function listNotifications(
  user: User,
): Promise<AppNotification[]> {
  const rows = await db()
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, user.id))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(100);
  return rows.map(toNotification);
}

export async function unreadCount(user: User): Promise<number> {
  const [r] = await db()
    .select({ n: count() })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        isNull(schema.notifications.readAt),
      ),
    );
  return r?.n ?? 0;
}

export async function markRead(user: User, id: string) {
  await db()
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.userId, user.id),
        isNull(schema.notifications.readAt),
      ),
    );
}

export async function markAllRead(user: User) {
  await db()
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        isNull(schema.notifications.readAt),
      ),
    );
}

// ── Contact form ────────────────────────────────────────────────────────────

const contactInput = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.email("Enter a valid email address."),
  topic: z.enum(["general", "account", "payments", "listing", "partnership"]),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more, at least 10 characters.")
    .max(4000),
});

/** Store a support message and email it to the support inbox. */
export async function sendContactMessage(
  user: User | null,
  raw: unknown,
): Promise<{ ticket: string }> {
  await rateLimit(`contact:${await clientIp()}`, 5, 3600);
  const r = contactInput.safeParse(raw);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? "Check the form.");
  const ticket = newReference("RR");
  await db()
    .insert(schema.contactMessages)
    .values({ id: newId("cm"), ticket, userId: user?.id ?? null, ...r.data });
  await sendEmail(env().SUPPORT_EMAIL, "notification", {
    firstName: "team",
    title: `[${ticket}] ${r.data.topic}: message from ${r.data.name}`,
    body: `${r.data.message}\n\nFrom: ${r.data.name} <${r.data.email}>${user ? ` (account ${user.id})` : ""}`,
  });
  return { ticket };
}
