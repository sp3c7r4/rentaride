import "server-only";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { depositFor } from "@/lib/pricing";
import type {
  LeaseRequest,
  Schedule,
  TermMonths,
  User,
  Vehicle,
} from "@/lib/types";
import { db, schema } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { newId } from "@/server/ids";
import { buildSchedule, endDateFor } from "./leases";
import { type Notice, notify } from "./notify";
import { vehiclesByIds } from "./vehicles";

export type RequestRow = LeaseRequest & {
  vehicle: Vehicle;
  driver: Pick<
    User,
    "firstName" | "lastName" | "city" | "kycStatus" | "createdAt"
  >;
  owner: Pick<User, "firstName" | "lastName">;
};

const fullName = (u: Pick<User, "firstName" | "lastName">) =>
  `${u.firstName} ${u.lastName}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const isUniqueViolation = (e: unknown) =>
  (e as { code?: string }).code === "23505" ||
  (e as { cause?: { code?: string } }).cause?.code === "23505";

/** Requests a driver sent or an owner received, newest first. */
export async function listRequests(user: User): Promise<RequestRow[]> {
  const rows = await db()
    .select()
    .from(schema.leaseRequests)
    .where(
      user.role === "owner"
        ? eq(schema.leaseRequests.ownerId, user.id)
        : eq(schema.leaseRequests.driverId, user.id),
    )
    .orderBy(desc(schema.leaseRequests.createdAt))
    .limit(200);
  if (rows.length === 0) return [];
  const [vehicles, people] = await Promise.all([
    vehiclesByIds(rows.map((r) => r.vehicleId)),
    db()
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        city: schema.users.city,
        kycStatus: schema.users.kycStatus,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(
        inArray(schema.users.id, [
          ...new Set(rows.flatMap((r) => [r.driverId, r.ownerId])),
        ]),
      ),
  ]);
  const personBy = new Map(people.map((p) => [p.id, p]));
  return rows.flatMap((r) => {
    const vehicle = vehicles.get(r.vehicleId);
    const driver = personBy.get(r.driverId);
    const owner = personBy.get(r.ownerId);
    if (!vehicle || !driver || !owner) return [];
    return [
      {
        id: r.id,
        vehicleId: r.vehicleId,
        driverId: r.driverId,
        ownerId: r.ownerId,
        schedule: r.schedule,
        termMonths: r.termMonths as TermMonths,
        startDate: r.startDate,
        message: r.message,
        status: r.status,
        declineReason: r.declineReason ?? undefined,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString(),
        vehicle,
        driver: {
          firstName: driver.firstName,
          lastName: driver.lastName,
          city: driver.city,
          kycStatus: driver.kycStatus,
          createdAt: driver.createdAt.toISOString(),
        },
        owner: { firstName: owner.firstName, lastName: owner.lastName },
      },
    ];
  });
}

const newRequest = z.object({
  vehicleId: z.string().min(1).max(40),
  schedule: z.enum(["daily", "weekly", "monthly"]),
  termMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]),
  startDate: z.iso.date("Choose a start date."),
  message: z.string().max(500).default(""),
});

export type NewLeaseRequest = z.input<typeof newRequest>;

export async function createRequest(
  driver: User,
  raw: unknown,
): Promise<{ id: string }> {
  const parsed = newRequest.safeParse(raw);
  if (!parsed.success)
    throw new AppError(parsed.error.issues[0]?.message ?? "Check the request.");
  const input = parsed.data;
  if (driver.kycStatus === "action_needed")
    throw new AppError(
      "Update your verification documents before requesting a lease.",
    );
  if (input.startDate < todayIso())
    throw new AppError("Choose a start date from today onwards.");

  const [vehicle] = await db()
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.id, input.vehicleId))
    .limit(1);
  if (!vehicle || vehicle.status !== "live")
    throw new AppError("This vehicle is no longer available.");
  if (vehicle.ownerId === driver.id)
    throw new AppError("You can't lease your own vehicle.");

  const [active] = await db()
    .select({ id: schema.leases.id })
    .from(schema.leases)
    .where(
      and(
        eq(schema.leases.driverId, driver.id),
        eq(schema.leases.status, "active"),
      ),
    )
    .limit(1);
  if (active)
    throw new AppError(
      "You already have an active lease. Finish it before starting another.",
    );
  const [dup] = await db()
    .select({ id: schema.leaseRequests.id })
    .from(schema.leaseRequests)
    .where(
      and(
        eq(schema.leaseRequests.driverId, driver.id),
        eq(schema.leaseRequests.vehicleId, vehicle.id),
        eq(schema.leaseRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (dup)
    throw new AppError("You already have a pending request for this vehicle.");

  const id = newId("req");
  await db()
    .insert(schema.leaseRequests)
    .values({
      id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      ownerId: vehicle.ownerId,
      schedule: input.schedule as Schedule,
      termMonths: input.termMonths,
      startDate: input.startDate,
      message: input.message.trim(),
    });
  await notify([
    {
      userId: vehicle.ownerId,
      kind: "request_received",
      title: "New lease request",
      body: `${fullName(driver)} wants to lease your ${vehicle.make} ${vehicle.model} for ${input.termMonths} months.`,
      href: "/dashboard/requests",
      cta: "Review request",
    },
  ]);
  return { id };
}

async function pendingRequest(
  id: string,
  where: "driver" | "owner",
  user: User,
) {
  const [req] = await db()
    .select()
    .from(schema.leaseRequests)
    .where(
      and(
        eq(schema.leaseRequests.id, id),
        where === "driver"
          ? eq(schema.leaseRequests.driverId, user.id)
          : eq(schema.leaseRequests.ownerId, user.id),
      ),
    )
    .limit(1);
  if (!req) throw notFound("Request");
  return req;
}

/** Conditional status change: fails if someone else decided first. */
async function decide(
  id: string,
  set: Partial<typeof schema.leaseRequests.$inferInsert>,
) {
  const updated = await db()
    .update(schema.leaseRequests)
    .set({ ...set, decidedAt: new Date() })
    .where(
      and(
        eq(schema.leaseRequests.id, id),
        eq(schema.leaseRequests.status, "pending"),
      ),
    )
    .returning({ id: schema.leaseRequests.id });
  if (updated.length === 0)
    throw new AppError("This request has already been decided.", 409);
}

export async function withdrawRequest(driver: User, id: string): Promise<void> {
  const req = await pendingRequest(id, "driver", driver);
  if (req.status !== "pending")
    throw new AppError("Only pending requests can be withdrawn.");
  await decide(id, { status: "withdrawn" });
}

export async function declineRequest(
  owner: User,
  id: string,
  reasonRaw: unknown,
): Promise<void> {
  const reason =
    String(reasonRaw ?? "")
      .trim()
      .slice(0, 300) || null;
  const req = await pendingRequest(id, "owner", owner);
  if (req.status !== "pending")
    throw new AppError("This request has already been decided.");
  await decide(id, { status: "declined", declineReason: reason });
  const vehicle = (await vehiclesByIds([req.vehicleId])).get(req.vehicleId);
  await notify([
    {
      userId: req.driverId,
      kind: "request_declined",
      title: "Request declined",
      body: `Your request for the ${vehicle?.make} ${vehicle?.model} was declined.${reason ? ` Reason: ${reason}` : ""}`,
      href: "/dashboard/requests",
    },
  ]);
}

/**
 * Approve a request: creates the lease and its schedule, marks the vehicle
 * leased and declines other pending requests for it. All in one transaction
 * with conditional updates; partial unique indexes stop double leases.
 */
export async function approveRequest(
  owner: User,
  id: string,
): Promise<{ leaseId: string }> {
  const req = await pendingRequest(id, "owner", owner);
  if (req.status !== "pending")
    throw new AppError("This request has already been decided.");
  // A lease only starts for a driver whose licence has been checked. Without
  // this the owner can hand a car to someone the platform hasn't verified.
  const [driver] = await db()
    .select({ kycStatus: schema.users.kycStatus })
    .from(schema.users)
    .where(eq(schema.users.id, req.driverId))
    .limit(1);
  if (driver?.kycStatus !== "verified")
    throw new AppError(
      "This driver's licence isn't verified yet. Ask them to finish verification first.",
      409,
    );
  const leaseId = newId("lse");
  const notices: Notice[] = [];

  try {
    await db().transaction(async (tx) => {
      const [vehicle] = await tx
        .update(schema.vehicles)
        .set({ status: "leased" })
        .where(
          and(
            eq(schema.vehicles.id, req.vehicleId),
            eq(schema.vehicles.status, "live"),
          ),
        )
        .returning();
      if (!vehicle)
        throw new AppError("This vehicle is not available to lease.");

      const decided = await tx
        .update(schema.leaseRequests)
        .set({ status: "approved", decidedAt: new Date() })
        .where(
          and(
            eq(schema.leaseRequests.id, id),
            eq(schema.leaseRequests.status, "pending"),
          ),
        )
        .returning({ id: schema.leaseRequests.id });
      if (decided.length === 0)
        throw new AppError("This request has already been decided.", 409);

      // A request may have been sent with a start date that has now passed.
      const start = req.startDate < todayIso() ? todayIso() : req.startDate;
      const amount =
        req.schedule === "daily"
          ? vehicle.priceDaily
          : req.schedule === "monthly"
            ? vehicle.priceMonthly
            : vehicle.priceWeekly;
      await tx.insert(schema.leases).values({
        id: leaseId,
        requestId: req.id,
        vehicleId: vehicle.id,
        driverId: req.driverId,
        ownerId: req.ownerId,
        schedule: req.schedule,
        termMonths: req.termMonths,
        startDate: start,
        endDate: endDateFor(start, req.termMonths),
        deposit: depositFor(vehicle.priceWeekly),
        status: "active",
      });
      await tx
        .insert(schema.repayments)
        .values(
          buildSchedule(
            leaseId,
            start,
            req.schedule,
            req.termMonths as TermMonths,
            amount,
          ),
        );

      const others = await tx
        .update(schema.leaseRequests)
        .set({
          status: "declined",
          declineReason: "The vehicle was leased to another driver.",
          decidedAt: new Date(),
        })
        .where(
          and(
            eq(schema.leaseRequests.vehicleId, vehicle.id),
            eq(schema.leaseRequests.status, "pending"),
            ne(schema.leaseRequests.id, id),
          ),
        )
        .returning({ driverId: schema.leaseRequests.driverId });

      const name = `${vehicle.make} ${vehicle.model}`;
      notices.push(
        {
          userId: req.driverId,
          kind: "request_approved",
          title: "Request approved",
          body: `Your lease for the ${name} is confirmed. Pay your deposit and first repayment to get the keys.`,
          href: `/dashboard/leases/${leaseId}`,
          cta: "Pay now",
        },
        ...others.map((o) => ({
          userId: o.driverId,
          kind: "request_declined" as const,
          title: "Request declined",
          body: `The ${name} was leased to another driver.`,
          href: "/dashboard/requests",
        })),
      );
    });
  } catch (e) {
    if (isUniqueViolation(e))
      throw new AppError(
        "This driver started another lease in the meantime.",
        409,
      );
    throw e;
  }
  await notify(notices);
  return { leaseId };
}
