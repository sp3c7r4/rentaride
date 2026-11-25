import "server-only";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { addMonths, repaymentCount } from "@/lib/pricing";
import type {
  Lease,
  Repayment,
  Schedule,
  TermMonths,
  User,
  Vehicle,
} from "@/lib/types";
import { type DbOrTx, db, schema } from "@/server/db";
import { vehiclesByIds } from "./vehicles";

type LeaseRow = typeof schema.leases.$inferSelect;
type RepaymentRow = typeof schema.repayments.$inferSelect;

export type LeaseView = Lease & {
  vehicle: Vehicle;
  owner: Pick<User, "firstName" | "lastName">;
  driver: Pick<User, "firstName" | "lastName" | "phone">;
  next?: Repayment;
  outstanding: number;
  paidCount: number;
  /** False until the first payment, which includes the deposit. */
  depositPaid: boolean;
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Due date of repayment `index` (0-based) for a lease starting on `start` (YYYY-MM-DD). */
export function dueDate(
  start: string,
  schedule: Schedule,
  index: number,
): string {
  const d = new Date(`${start}T00:00:00Z`);
  if (schedule === "monthly") return isoDay(addMonths(d, index));
  d.setUTCDate(d.getUTCDate() + index * (schedule === "weekly" ? 7 : 1));
  return isoDay(d);
}

/**
 * Repayment rows for a new lease. Nothing is paid yet: the first repayment is
 * due (it's collected with the deposit), the rest are upcoming. The daily job
 * moves later ones to due and overdue as their dates arrive.
 */
export function buildSchedule(
  leaseId: string,
  start: string,
  schedule: Schedule,
  termMonths: TermMonths,
  amount: number,
) {
  return Array.from(
    { length: repaymentCount(schedule, termMonths) },
    (_, i) => ({
      id: `${leaseId}_r${i}`,
      leaseId,
      index: i,
      dueDate: dueDate(start, schedule, i),
      amount,
      status: (i === 0 ? "due" : "upcoming") as RepaymentRow["status"],
    }),
  );
}

export const endDateFor = (start: string, termMonths: number) =>
  isoDay(addMonths(new Date(`${start}T00:00:00Z`), termMonths));

/** Turn lease rows into views with vehicles, people, repayments and payment refs. */
export async function leaseViews(
  rows: LeaseRow[],
  q: DbOrTx = db(),
): Promise<LeaseView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const userIds = [...new Set(rows.flatMap((r) => [r.driverId, r.ownerId]))];
  const [vehicles, people, reps] = await Promise.all([
    vehiclesByIds(
      rows.map((r) => r.vehicleId),
      q,
    ),
    q
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        phone: schema.users.phone,
      })
      .from(schema.users)
      .where(inArray(schema.users.id, userIds)),
    q
      .select({
        r: schema.repayments,
        reference: schema.payments.reference,
        channel: schema.payments.channel,
      })
      .from(schema.repayments)
      .leftJoin(
        schema.payments,
        eq(schema.payments.id, schema.repayments.paymentId),
      )
      .where(inArray(schema.repayments.leaseId, ids))
      .orderBy(asc(schema.repayments.index)),
  ]);
  const personBy = new Map(people.map((p) => [p.id, p]));
  const repsBy = new Map<string, Repayment[]>();
  for (const { r, reference, channel } of reps) {
    const list = repsBy.get(r.leaseId) ?? [];
    list.push({
      id: r.id,
      index: r.index,
      dueDate: r.dueDate,
      amount: r.amount,
      status: r.status,
      paidAt: r.paidAt?.toISOString(),
      reference: reference ?? undefined,
      method: channel ?? undefined,
    });
    repsBy.set(r.leaseId, list);
  }

  return rows.flatMap((l) => {
    const vehicle = vehicles.get(l.vehicleId);
    const owner = personBy.get(l.ownerId);
    const driver = personBy.get(l.driverId);
    if (!vehicle || !owner || !driver) return [];
    const repayments = repsBy.get(l.id) ?? [];
    const unpaid = repayments.filter((r) => r.status !== "paid");
    return [
      {
        id: l.id,
        requestId: l.requestId,
        vehicleId: l.vehicleId,
        driverId: l.driverId,
        ownerId: l.ownerId,
        schedule: l.schedule,
        termMonths: l.termMonths as TermMonths,
        startDate: l.startDate,
        endDate: l.endDate,
        deposit: l.deposit,
        status: l.status,
        repayments,
        createdAt: l.createdAt.toISOString(),
        vehicle,
        owner: { firstName: owner.firstName, lastName: owner.lastName },
        driver: {
          firstName: driver.firstName,
          lastName: driver.lastName,
          phone: driver.phone,
        },
        next:
          unpaid.find((r) => r.status === "due" || r.status === "overdue") ??
          unpaid[0],
        outstanding: unpaid.reduce((s, r) => s + r.amount, 0),
        paidCount: repayments.length - unpaid.length,
        depositPaid: l.depositPaidAt !== null,
      },
    ];
  });
}

const partOf = (user: User) =>
  or(eq(schema.leases.driverId, user.id), eq(schema.leases.ownerId, user.id));

/** Active first, then newest. */
export async function listLeases(user: User): Promise<LeaseView[]> {
  const rows = await db()
    .select()
    .from(schema.leases)
    .where(partOf(user))
    .orderBy(asc(schema.leases.status), desc(schema.leases.createdAt));
  return leaseViews(rows);
}

/** A lease the user is part of (driver, owner) or any lease for staff. */
export async function getLease(
  user: User,
  id: string,
): Promise<LeaseView | null> {
  const [row] = await db()
    .select()
    .from(schema.leases)
    .where(
      user.staff
        ? eq(schema.leases.id, id)
        : and(eq(schema.leases.id, id), partOf(user)),
    )
    .limit(1);
  if (!row) return null;
  return (await leaseViews([row]))[0] ?? null;
}

export type PaymentRow = Repayment & {
  leaseId: string;
  vehicle: Pick<Vehicle, "make" | "model" | "year">;
  /** Deposit charged with this repayment, if any. The total taken was amount + deposit. */
  deposit: number;
};

/** A driver's paid repayments, newest first. */
export async function listDriverPayments(driver: User): Promise<PaymentRow[]> {
  const rows = await db()
    .select({
      r: schema.repayments,
      reference: schema.payments.reference,
      channel: schema.payments.channel,
      deposit: schema.payments.depositAmount,
      make: schema.vehicles.make,
      model: schema.vehicles.model,
      year: schema.vehicles.year,
    })
    .from(schema.repayments)
    .innerJoin(schema.leases, eq(schema.leases.id, schema.repayments.leaseId))
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.leases.vehicleId))
    .leftJoin(
      schema.payments,
      eq(schema.payments.id, schema.repayments.paymentId),
    )
    .where(
      and(
        eq(schema.leases.driverId, driver.id),
        eq(schema.repayments.status, "paid"),
      ),
    )
    .orderBy(desc(schema.repayments.paidAt));
  return rows.map(({ r, reference, channel, deposit, make, model, year }) => ({
    id: r.id,
    index: r.index,
    dueDate: r.dueDate,
    amount: r.amount,
    status: r.status,
    paidAt: r.paidAt?.toISOString(),
    reference: reference ?? undefined,
    method: channel ?? undefined,
    leaseId: r.leaseId,
    deposit: deposit ?? 0,
    vehicle: { make, model, year },
  }));
}
