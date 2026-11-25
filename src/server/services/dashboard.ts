import "server-only";
import { and, asc, count, desc, eq, gte, sum } from "drizzle-orm";
import { OWNER_SHARE } from "@/lib/pricing";
import type { AppNotification, Payout, User, VehicleStatus } from "@/lib/types";
import { db, schema } from "@/server/db";
import { type LeaseView, leaseViews } from "./leases";
import { listRequests, type RequestRow } from "./requests";

export async function recentActivity(
  userId: string,
  limit = 5,
): Promise<AppNotification[]> {
  const rows = await db()
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit);
  return rows.map(toNotification);
}

export function toNotification(
  n: typeof schema.notifications.$inferSelect,
): AppNotification {
  return {
    id: n.id,
    userId: n.userId,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href ?? undefined,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  };
}

export function toPayout(p: typeof schema.payouts.$inferSelect): Payout {
  return {
    id: p.id,
    ownerId: p.ownerId,
    period: p.period,
    amount: p.amount,
    status: p.status === "paid" ? "paid" : "scheduled",
    payDate: p.payDate,
    reference: p.reference ?? undefined,
  };
}

export type DriverOverview = {
  activeLease: LeaseView | null;
  pendingRequests: RequestRow[];
  totalPaid: number;
  activity: AppNotification[];
};

export async function driverOverview(driver: User): Promise<DriverOverview> {
  const [active, requests, [paid], activity] = await Promise.all([
    db()
      .select()
      .from(schema.leases)
      .where(
        and(
          eq(schema.leases.driverId, driver.id),
          eq(schema.leases.status, "active"),
        ),
      )
      .limit(1),
    listRequests(driver),
    db()
      .select({ total: sum(schema.repayments.amount).mapWith(Number) })
      .from(schema.repayments)
      .innerJoin(schema.leases, eq(schema.leases.id, schema.repayments.leaseId))
      .where(
        and(
          eq(schema.leases.driverId, driver.id),
          eq(schema.repayments.status, "paid"),
        ),
      ),
    recentActivity(driver.id),
  ]);
  return {
    activeLease: (await leaseViews(active))[0] ?? null,
    pendingRequests: requests.filter((r) => r.status === "pending"),
    totalPaid: paid?.total ?? 0,
    activity,
  };
}

export type OwnerOverview = {
  earningsThisMonth: number;
  lifetimeEarnings: number;
  nextPayout: Payout | null;
  vehicleCounts: Record<VehicleStatus, number>;
  vehicleTotal: number;
  activeLeases: number;
  pendingRequests: RequestRow[];
  activity: AppNotification[];
};

export async function ownerOverview(owner: User): Promise<OwnerOverview> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [collected, paidOut, next, counts, [leases], requests, activity] =
    await Promise.all([
      db()
        .select({ total: sum(schema.repayments.amount).mapWith(Number) })
        .from(schema.repayments)
        .innerJoin(
          schema.leases,
          eq(schema.leases.id, schema.repayments.leaseId),
        )
        .where(
          and(
            eq(schema.leases.ownerId, owner.id),
            eq(schema.repayments.status, "paid"),
            gte(schema.repayments.paidAt, monthStart),
          ),
        ),
      db()
        .select({ total: sum(schema.payouts.amount).mapWith(Number) })
        .from(schema.payouts)
        .where(
          and(
            eq(schema.payouts.ownerId, owner.id),
            eq(schema.payouts.status, "paid"),
          ),
        ),
      db()
        .select()
        .from(schema.payouts)
        .where(
          and(
            eq(schema.payouts.ownerId, owner.id),
            eq(schema.payouts.status, "scheduled"),
          ),
        )
        .orderBy(asc(schema.payouts.payDate))
        .limit(1),
      db()
        .select({ status: schema.vehicles.status, n: count() })
        .from(schema.vehicles)
        .where(eq(schema.vehicles.ownerId, owner.id))
        .groupBy(schema.vehicles.status),
      db()
        .select({ n: count() })
        .from(schema.leases)
        .where(
          and(
            eq(schema.leases.ownerId, owner.id),
            eq(schema.leases.status, "active"),
          ),
        ),
      listRequests(owner),
      recentActivity(owner.id),
    ]);

  const vehicleCounts: Record<VehicleStatus, number> = {
    pending_review: 0,
    live: 0,
    leased: 0,
    unlisted: 0,
    rejected: 0,
  };
  for (const c of counts) vehicleCounts[c.status] = c.n;

  return {
    earningsThisMonth: Math.round((collected[0]?.total ?? 0) * OWNER_SHARE),
    lifetimeEarnings: paidOut[0]?.total ?? 0,
    nextPayout: next[0] ? toPayout(next[0]) : null,
    vehicleCounts,
    vehicleTotal: counts.reduce((s, c) => s + c.n, 0),
    activeLeases: leases?.n ?? 0,
    pendingRequests: requests.filter((r) => r.status === "pending"),
    activity,
  };
}
