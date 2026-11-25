import "server-only";
import { and, eq, inArray, lt, lte } from "drizzle-orm";
import { formatDate, formatNaira } from "@/lib/format";
import { db, schema } from "@/server/db";
import { type Notice, notify } from "./notify";

/** Repayments become "due" this many days before their date (the reminder). */
const REMIND_DAYS = 2;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Daily job. On active leases: upcoming repayments within the reminder window
 * become due (driver reminded); due ones past their date become overdue
 * (driver and owner told). Safe to run more than once a day.
 */
export async function refreshRepaymentStatuses(now = new Date()) {
  const today = isoDay(now);
  const remindUntil = isoDay(
    new Date(now.getTime() + REMIND_DAYS * 86_400_000),
  );
  const activeLeases = db()
    .select({ id: schema.leases.id })
    .from(schema.leases)
    .where(eq(schema.leases.status, "active"));

  const nowDue = await db()
    .update(schema.repayments)
    .set({ status: "due" })
    .where(
      and(
        eq(schema.repayments.status, "upcoming"),
        lte(schema.repayments.dueDate, remindUntil),
        inArray(schema.repayments.leaseId, activeLeases),
      ),
    )
    .returning();
  const nowOverdue = await db()
    .update(schema.repayments)
    .set({ status: "overdue" })
    .where(
      and(
        eq(schema.repayments.status, "due"),
        lt(schema.repayments.dueDate, today),
        inArray(schema.repayments.leaseId, activeLeases),
      ),
    )
    .returning();

  const leaseIds = [
    ...new Set([...nowDue, ...nowOverdue].map((r) => r.leaseId)),
  ];
  if (leaseIds.length === 0) return { due: 0, overdue: 0 };
  const leases = await db()
    .select({
      l: schema.leases,
      make: schema.vehicles.make,
      model: schema.vehicles.model,
    })
    .from(schema.leases)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.leases.vehicleId))
    .where(inArray(schema.leases.id, leaseIds));
  const byId = new Map(leases.map((x) => [x.l.id, x]));

  const notices: Notice[] = [];
  for (const r of nowDue) {
    const x = byId.get(r.leaseId);
    if (!x) continue;
    notices.push({
      userId: x.l.driverId,
      kind: "payment_due",
      title: "Repayment due soon",
      body: `Your ${formatNaira(r.amount)} repayment for the ${x.make} ${x.model} is due on ${formatDate(r.dueDate)}.`,
      href: `/dashboard/leases/${x.l.id}`,
      cta: "Pay now",
    });
  }
  for (const r of nowOverdue) {
    const x = byId.get(r.leaseId);
    if (!x) continue;
    notices.push(
      {
        userId: x.l.driverId,
        kind: "payment_due",
        title: "Repayment overdue",
        body: `Your ${formatNaira(r.amount)} repayment for the ${x.make} ${x.model} was due on ${formatDate(r.dueDate)}. Pay now to keep your lease in good standing.`,
        href: `/dashboard/leases/${x.l.id}`,
        cta: "Pay now",
      },
      {
        userId: x.l.ownerId,
        kind: "payment_due",
        title: "Repayment overdue",
        body: `The repayment due ${formatDate(r.dueDate)} on your ${x.make} ${x.model} hasn't been paid yet. We're following up with the driver.`,
        href: `/dashboard/leases/${x.l.id}`,
        email: false,
      },
    );
  }
  await notify(notices);
  return { due: nowDue.length, overdue: nowOverdue.length };
}
