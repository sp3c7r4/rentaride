import "server-only";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import type { Dispute, DisputeCategory, User, Vehicle } from "@/lib/types";
import { db, schema } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { newId } from "@/server/ids";
import { type Notice, notify } from "./notify";
import { assertOwnUploads } from "./uploads";

export type Attachment = { url: string; name: string; image: boolean };

export type DisputeView = Omit<Dispute, "messages"> & {
  messages: (Omit<Dispute["messages"][number], "attachments"> & {
    attachments: Attachment[];
  })[];
  vehicle: Pick<Vehicle, "make" | "model" | "year">;
  /** Full names keyed by user id, plus "support". */
  authors: Record<string, string>;
};

const SUPPORT_ACK =
  "Thanks for reporting this. A case manager has been assigned and will review the details and evidence with both parties. Expect an update within 2 working days.";

/** Leases the user is part of; staff see all. */
const leaseScope = (user: User) =>
  user.staff
    ? undefined
    : or(
        eq(schema.leases.driverId, user.id),
        eq(schema.leases.ownerId, user.id),
      );

async function views(
  rows: (typeof schema.disputes.$inferSelect)[],
): Promise<DisputeView[]> {
  if (rows.length === 0) return [];
  const leaseIds = [...new Set(rows.map((d) => d.leaseId))];
  const [leases, messages] = await Promise.all([
    db()
      .select({
        l: schema.leases,
        make: schema.vehicles.make,
        model: schema.vehicles.model,
        year: schema.vehicles.year,
      })
      .from(schema.leases)
      .innerJoin(
        schema.vehicles,
        eq(schema.vehicles.id, schema.leases.vehicleId),
      )
      .where(inArray(schema.leases.id, leaseIds)),
    db()
      .select()
      .from(schema.disputeMessages)
      .where(
        inArray(
          schema.disputeMessages.disputeId,
          rows.map((d) => d.id),
        ),
      )
      .orderBy(asc(schema.disputeMessages.createdAt)),
  ]);
  const leaseBy = new Map(leases.map((x) => [x.l.id, x]));
  const people = await db()
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
    })
    .from(schema.users)
    .where(
      inArray(schema.users.id, [
        ...new Set(leases.flatMap((x) => [x.l.driverId, x.l.ownerId])),
      ]),
    );
  const nameBy = new Map(
    people.map((p) => [p.id, `${p.firstName} ${p.lastName}`]),
  );

  return rows.flatMap((d) => {
    const x = leaseBy.get(d.leaseId);
    if (!x) return [];
    const authors: Record<string, string> = { support: "RentARide support" };
    for (const id of [x.l.driverId, x.l.ownerId])
      authors[id] = nameBy.get(id) ?? "Member";
    return [
      {
        id: d.id,
        leaseId: d.leaseId,
        openedBy: d.openedBy,
        category: d.category,
        subject: d.subject,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        vehicle: { make: x.make, model: x.model, year: x.year },
        authors,
        messages: messages
          .filter((m) => m.disputeId === d.id)
          .map((m) => ({
            id: m.id,
            authorId: m.authorId ?? "support",
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            attachments: m.attachments.map((a) => ({
              url: `/files/${a.key}`,
              name: a.name,
              image: a.contentType.startsWith("image/"),
            })),
          })),
      },
    ];
  });
}

export async function listDisputes(user: User): Promise<DisputeView[]> {
  const rows = await db()
    .select({ d: schema.disputes })
    .from(schema.disputes)
    .innerJoin(schema.leases, eq(schema.leases.id, schema.disputes.leaseId))
    .where(leaseScope(user))
    .orderBy(desc(schema.disputes.updatedAt));
  return views(rows.map((r) => r.d));
}

async function findDispute(user: User, id: string) {
  const [row] = await db()
    .select({ d: schema.disputes, l: schema.leases })
    .from(schema.disputes)
    .innerJoin(schema.leases, eq(schema.leases.id, schema.disputes.leaseId))
    .where(and(eq(schema.disputes.id, id), leaseScope(user)))
    .limit(1);
  return row ?? null;
}

export async function getDispute(
  user: User,
  id: string,
): Promise<DisputeView | null> {
  const row = await findDispute(user, id);
  return row ? ((await views([row.d]))[0] ?? null) : null;
}

export async function listDisputableLeases(user: User) {
  const rows = await db()
    .select({ l: schema.leases, v: schema.vehicles })
    .from(schema.leases)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.leases.vehicleId))
    .where(
      or(
        eq(schema.leases.driverId, user.id),
        eq(schema.leases.ownerId, user.id),
      ),
    )
    .orderBy(desc(schema.leases.createdAt));
  return rows.map(({ l, v }) => ({
    id: l.id,
    label: `${v.year} ${v.make} ${v.model} · ${v.plate}`,
    status: l.status,
  }));
}

async function attachmentsFrom(user: User, keys: string[]) {
  if (keys.length > 6) throw new AppError("You can attach up to 6 files.");
  const files = await assertOwnUploads(user.id, "evidence", keys);
  return keys.map((key) => {
    const f = files.get(key);
    if (!f) throw new AppError("One of the files is missing. Upload it again.");
    return { key, name: f.name, contentType: f.contentType };
  });
}

/** Tell the other party (or both, for support messages). */
function otherParty(
  lease: typeof schema.leases.$inferSelect,
  authorId: string | null,
) {
  return authorId === null
    ? [lease.driverId, lease.ownerId]
    : [lease.driverId === authorId ? lease.ownerId : lease.driverId];
}

const createInput = z.object({
  leaseId: z.string().min(1),
  category: z.enum(schema.disputeCategoryEnum.enumValues),
  subject: z.string().trim().min(5, "Add a short subject.").max(100),
  body: z
    .string()
    .trim()
    .min(20, "Describe what happened in at least 20 characters.")
    .max(2000),
  attachments: z.array(z.string()).max(6).default([]),
});

export type CreateDisputeInput = z.input<typeof createInput>;

/** Open a dispute. Support acknowledges it and moves it to "in review". */
export async function createDispute(
  user: User,
  raw: unknown,
): Promise<{ id: string }> {
  const r = createInput.safeParse(raw);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? "Check the form.");
  const input = r.data;
  const [lease] = await db()
    .select()
    .from(schema.leases)
    .where(
      and(
        eq(schema.leases.id, input.leaseId),
        or(
          eq(schema.leases.driverId, user.id),
          eq(schema.leases.ownerId, user.id),
        ),
      ),
    )
    .limit(1);
  if (!lease) throw new AppError("Choose one of your leases.");
  const attachments = await attachmentsFrom(user, input.attachments);

  const id = newId("dsp");
  const now = Date.now();
  await db().transaction(async (tx) => {
    await tx.insert(schema.disputes).values({
      id,
      leaseId: lease.id,
      openedBy: user.id,
      category: input.category as DisputeCategory,
      subject: input.subject,
      status: "in_review",
    });
    await tx.insert(schema.disputeMessages).values([
      {
        id: newId("msg"),
        disputeId: id,
        authorId: user.id,
        body: input.body,
        attachments,
        createdAt: new Date(now),
      },
      {
        id: newId("msg"),
        disputeId: id,
        authorId: null,
        body: SUPPORT_ACK,
        createdAt: new Date(now + 1000),
      },
    ]);
  });
  await notify(
    otherParty(lease, user.id).map((userId) => ({
      userId,
      kind: "dispute_update" as const,
      title: "Dispute opened",
      body: `${user.firstName} opened a dispute: ${input.subject}`,
      href: `/dashboard/disputes/${id}`,
      cta: "View dispute",
    })),
  );
  return { id };
}

const replyInput = z.object({
  body: z.string().trim().max(2000).default(""),
  attachments: z.array(z.string()).max(6).default([]),
});

export async function replyToDispute(
  user: User,
  id: string,
  raw: unknown,
): Promise<void> {
  const input = replyInput.parse(raw ?? {});
  if (!input.body && input.attachments.length === 0)
    throw new AppError("Write a message or attach a file.");
  const row = await findDispute(user, id);
  if (!row) throw notFound("Dispute");
  if (row.d.status === "resolved")
    throw new AppError("This dispute is closed.");
  const attachments = await attachmentsFrom(user, input.attachments);
  // Staff reply as RentARide support.
  const authorId = user.staff ? null : user.id;
  await db().transaction(async (tx) => {
    await tx.insert(schema.disputeMessages).values({
      id: newId("msg"),
      disputeId: id,
      authorId,
      body: input.body,
      attachments,
    });
    await tx
      .update(schema.disputes)
      .set({ updatedAt: new Date() })
      .where(eq(schema.disputes.id, id));
  });
  const notices: Notice[] = otherParty(row.l, authorId).map((userId) => ({
    userId,
    kind: "dispute_update",
    title: "New message on a dispute",
    body: `${authorId ? user.firstName : "RentARide support"} replied on “${row.d.subject}”.`,
    href: `/dashboard/disputes/${id}`,
    cta: "Read reply",
  }));
  await notify(notices);
}

/** The person who opened a dispute (or staff) can close it. */
export async function resolveDispute(user: User, id: string): Promise<void> {
  const row = await findDispute(user, id);
  if (!row) throw notFound("Dispute");
  if (row.d.openedBy !== user.id && !user.staff)
    throw new AppError("Only the person who opened it can close it.", 403);
  if (row.d.status === "resolved") return;
  await db().transaction(async (tx) => {
    await tx
      .update(schema.disputes)
      .set({ status: "resolved" })
      .where(eq(schema.disputes.id, id));
    await tx.insert(schema.disputeMessages).values({
      id: newId("msg"),
      disputeId: id,
      authorId: null,
      body: `${user.staff ? "RentARide support" : user.firstName} marked this dispute as resolved. Reply within 7 days if anything changes.`,
    });
  });
  await notify(
    otherParty(row.l, user.staff ? null : user.id).map((userId) => ({
      userId,
      kind: "dispute_update" as const,
      title: "Dispute resolved",
      body: `“${row.d.subject}” was marked as resolved.`,
      href: `/dashboard/disputes/${id}`,
      email: false,
    })),
  );
}
