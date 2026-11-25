import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { pricingFromWeekly } from "@/lib/pricing";
import type { Schedule, User, Vehicle, VehicleStatus } from "@/lib/types";
import { type DbOrTx, db, schema } from "@/server/db";
import { AppError, notFound } from "@/server/errors";
import { newId } from "@/server/ids";
import { notify } from "./notify";
import { assertOwnUploads } from "./uploads";

type VehicleRow = typeof schema.vehicles.$inferSelect;

/** Photos for many vehicles in one query, ordered by position. */
async function photosFor(ids: string[], q: DbOrTx = db()) {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  const rows = await q
    .select({
      vehicleId: schema.vehiclePhotos.vehicleId,
      src: schema.vehiclePhotos.src,
    })
    .from(schema.vehiclePhotos)
    .where(inArray(schema.vehiclePhotos.vehicleId, ids))
    .orderBy(asc(schema.vehiclePhotos.position));
  for (const r of rows)
    map.set(r.vehicleId, [...(map.get(r.vehicleId) ?? []), r.src]);
  return map;
}

/** Vehicle DTO in the shape the frontend uses. */
export function toVehicle(v: VehicleRow, photos: string[] = []): Vehicle {
  const [photo = "", ...gallery] = photos;
  return {
    id: v.id,
    ownerId: v.ownerId,
    make: v.make,
    model: v.model,
    year: v.year,
    colour: v.colour,
    plate: v.plate,
    type: v.type,
    transmission: v.transmission,
    seats: v.seats,
    fuel: v.fuel,
    city: v.city,
    mileageKm: v.mileageKm,
    pricing: {
      daily: v.priceDaily,
      weekly: v.priceWeekly,
      monthly: v.priceMonthly,
    },
    photo,
    gallery,
    registrationDoc: v.registrationName ?? undefined,
    reviewNote: v.reviewNote ?? undefined,
    status: v.status,
    rating: Number(v.rating),
    trips: v.trips,
    createdAt: v.createdAt.toISOString(),
  };
}

/** Load vehicles by id as DTOs (keeps the input order). */
export async function vehiclesByIds(ids: string[], q: DbOrTx = db()) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map<string, Vehicle>();
  const rows = await q
    .select()
    .from(schema.vehicles)
    .where(inArray(schema.vehicles.id, unique));
  const photos = await photosFor(unique, q);
  return new Map(rows.map((r) => [r.id, toVehicle(r, photos.get(r.id))]));
}

// ── Public marketplace ──────────────────────────────────────────────────────

const filters = z.object({
  q: z.string().trim().max(80).optional(),
  type: z.enum(schema.vehicleTypeEnum.enumValues).optional().catch(undefined),
  city: z.string().trim().max(60).optional(),
  schedule: z.enum(["daily", "weekly", "monthly"]).optional().catch(undefined),
  sort: z
    .enum(["recommended", "price_asc", "price_desc", "rating"])
    .optional()
    .catch(undefined),
});

const priceColumn = (s: Schedule) =>
  s === "daily"
    ? schema.vehicles.priceDaily
    : s === "monthly"
      ? schema.vehicles.priceMonthly
      : schema.vehicles.priceWeekly;

export async function listLiveVehicles(raw: unknown): Promise<Vehicle[]> {
  const f = filters.parse(raw ?? {});
  const price = priceColumn(f.schedule ?? "weekly");
  const q = f.q ? `%${f.q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const where = and(
    eq(schema.vehicles.status, "live"),
    f.type ? eq(schema.vehicles.type, f.type) : undefined,
    f.city ? eq(schema.vehicles.city, f.city) : undefined,
    q
      ? or(
          ilike(
            sql`${schema.vehicles.make} || ' ' || ${schema.vehicles.model} || ' ' || ${schema.vehicles.year}`,
            q,
          ),
        )
      : undefined,
  );
  const order =
    f.sort === "price_asc"
      ? [asc(price)]
      : f.sort === "price_desc"
        ? [desc(price)]
        : f.sort === "rating"
          ? [desc(schema.vehicles.rating)]
          : // Recommended: rating weighted by experience.
            [
              desc(
                sql`${schema.vehicles.rating} * ln(${schema.vehicles.trips} + 2)`,
              ),
            ];
  const rows = await db()
    .select()
    .from(schema.vehicles)
    .where(where)
    .orderBy(...order, asc(schema.vehicles.id))
    .limit(200);
  const photos = await photosFor(rows.map((r) => r.id));
  return rows.map((r) => toVehicle(r, photos.get(r.id)));
}

export async function listLiveCities(): Promise<string[]> {
  const rows = await db()
    .selectDistinct({ city: schema.vehicles.city })
    .from(schema.vehicles)
    .where(eq(schema.vehicles.status, "live"))
    .orderBy(asc(schema.vehicles.city));
  return rows.map((r) => r.city);
}

export type VehicleDetail = {
  vehicle: Vehicle;
  owner: {
    firstName: string;
    lastInitial: string;
    city: string;
    createdAt: string;
    vehicleCount: number;
  };
};

/** Live and leased listings are public; other statuses only to their owner and staff. */
export async function getVehicleDetail(
  id: string,
  viewer: User | null,
): Promise<VehicleDetail | null> {
  const [row] = await db()
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.id, id))
    .limit(1);
  if (!row) return null;
  const isPublic = row.status === "live" || row.status === "leased";
  if (!isPublic && row.ownerId !== viewer?.id && !viewer?.staff) return null;
  const [owner] = await db()
    .select({
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      city: schema.users.city,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, row.ownerId))
    .limit(1);
  if (!owner) return null;
  const [{ n }] = await db()
    .select({ n: count() })
    .from(schema.vehicles)
    .where(
      and(
        eq(schema.vehicles.ownerId, row.ownerId),
        ne(schema.vehicles.status, "rejected"),
      ),
    );
  const photos = await photosFor([id]);
  const vehicle = toVehicle(row, photos.get(id));
  // The registration document name is only for the owner.
  if (row.ownerId !== viewer?.id && !viewer?.staff)
    vehicle.registrationDoc = undefined;
  return {
    vehicle,
    owner: {
      firstName: owner.firstName,
      lastInitial: owner.lastName.charAt(0),
      city: owner.city,
      createdAt: owner.createdAt.toISOString(),
      vehicleCount: n,
    },
  };
}

// ── Owner listings ──────────────────────────────────────────────────────────

export type OwnerVehicle = Vehicle & {
  pendingRequests: number;
  activeLeaseId?: string;
};

export async function listOwnerVehicles(owner: User): Promise<OwnerVehicle[]> {
  const rows = await db()
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.ownerId, owner.id))
    .orderBy(desc(schema.vehicles.createdAt));
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];
  const [photos, pending, active] = await Promise.all([
    photosFor(ids),
    db()
      .select({ vehicleId: schema.leaseRequests.vehicleId, n: count() })
      .from(schema.leaseRequests)
      .where(
        and(
          inArray(schema.leaseRequests.vehicleId, ids),
          eq(schema.leaseRequests.status, "pending"),
        ),
      )
      .groupBy(schema.leaseRequests.vehicleId),
    db()
      .select({ vehicleId: schema.leases.vehicleId, id: schema.leases.id })
      .from(schema.leases)
      .where(
        and(
          inArray(schema.leases.vehicleId, ids),
          eq(schema.leases.status, "active"),
        ),
      ),
  ]);
  const pendingBy = new Map(pending.map((p) => [p.vehicleId, p.n]));
  const activeBy = new Map(active.map((a) => [a.vehicleId, a.id]));
  return rows.map((r) => ({
    ...toVehicle(r, photos.get(r.id)),
    pendingRequests: pendingBy.get(r.id) ?? 0,
    activeLeaseId: activeBy.get(r.id),
  }));
}

const MAX_PHOTOS = 8;
const listingInput = z.object({
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(60),
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(new Date().getFullYear() + 1),
  colour: z.string().trim().min(1).max(30),
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9-]{5,12}$/,
      "Enter the plate as it appears, e.g. ABC-123DE.",
    ),
  type: z.enum(schema.vehicleTypeEnum.enumValues),
  transmission: z.enum(schema.transmissionEnum.enumValues),
  seats: z.coerce.number().int().min(2).max(18),
  fuel: z.enum(schema.fuelEnum.enumValues),
  city: z.string().trim().min(2).max(60),
  mileageKm: z.coerce.number().int().min(0).max(2_000_000),
  weeklyPrice: z.coerce
    .number()
    .int()
    .min(5000, "The weekly price must be at least ₦5,000.")
    .max(5_000_000),
  /** Photo URLs: `/files/<key>` for uploads, or existing photo URLs on edit. */
  photos: z
    .array(z.string().min(1).max(2000))
    .min(1, "Add at least one photo.")
    .max(MAX_PHOTOS, `You can add up to ${MAX_PHOTOS} photos.`),
  /** Upload key of a new registration document. */
  registrationKey: z.string().min(1).optional(),
});

export type ListingInput = z.input<typeof listingInput>;

function parseListing(raw: unknown) {
  const r = listingInput.safeParse(raw);
  if (!r.success)
    throw new AppError(
      r.error.issues[0]?.message ?? "Check the listing details.",
    );
  return r.data;
}

/**
 * Photos must be the owner's own uploads, or photos already on this vehicle
 * (when editing). Anything else is rejected, so listings can't hotlink.
 */
async function checkPhotos(
  owner: User,
  photos: string[],
  existing: string[] = [],
) {
  const newKeys = photos
    .filter((p) => !existing.includes(p))
    .map((p) => {
      if (!p.startsWith("/files/vehicle_photo/"))
        throw new AppError("One of the photos is invalid. Upload it again.");
      return p.slice("/files/".length);
    });
  await assertOwnUploads(owner.id, "vehicle_photo", newKeys);
}

const isPlateConflict = (e: unknown) =>
  (e as { code?: string; cause?: { code?: string } }).code === "23505" ||
  (e as { cause?: { code?: string } }).cause?.code === "23505";
const plateTaken = () =>
  new AppError("A vehicle with this plate number is already listed.");

async function writePhotos(tx: DbOrTx, vehicleId: string, photos: string[]) {
  await tx
    .delete(schema.vehiclePhotos)
    .where(eq(schema.vehiclePhotos.vehicleId, vehicleId));
  await tx.insert(schema.vehiclePhotos).values(
    photos.map((src, position) => ({
      id: newId("vph"),
      vehicleId,
      src,
      position,
    })),
  );
}

/** New listings wait for review before going live. */
export async function createListing(
  owner: User,
  raw: unknown,
): Promise<{ id: string }> {
  const d = parseListing(raw);
  if (!d.registrationKey)
    throw new AppError("Upload the registration document.");
  await checkPhotos(owner, d.photos);
  const reg = await assertOwnUploads(owner.id, "registration", [
    d.registrationKey,
  ]);
  const pricing = pricingFromWeekly(d.weeklyPrice);
  const id = newId("veh");
  try {
    await db().transaction(async (tx) => {
      await tx.insert(schema.vehicles).values({
        id,
        ownerId: owner.id,
        make: d.make,
        model: d.model,
        year: d.year,
        colour: d.colour,
        plate: d.plate,
        type: d.type,
        transmission: d.transmission,
        seats: d.seats,
        fuel: d.fuel,
        city: d.city,
        mileageKm: d.mileageKm,
        priceDaily: pricing.daily,
        priceWeekly: pricing.weekly,
        priceMonthly: pricing.monthly,
        status: "pending_review",
        registrationKey: d.registrationKey,
        registrationName: reg.get(d.registrationKey ?? "")?.name,
      });
      await writePhotos(tx, id, d.photos);
    });
  } catch (e) {
    if (isPlateConflict(e)) throw plateTaken();
    throw e;
  }
  return { id };
}

async function ownVehicle(owner: User, id: string) {
  const [row] = await db()
    .select()
    .from(schema.vehicles)
    .where(
      and(eq(schema.vehicles.id, id), eq(schema.vehicles.ownerId, owner.id)),
    )
    .limit(1);
  if (!row) throw notFound("Vehicle");
  return row;
}

/** Leased vehicles can't be edited. A listing that needed changes goes back to review. */
export async function updateListing(
  owner: User,
  id: string,
  raw: unknown,
): Promise<void> {
  const current = await ownVehicle(owner, id);
  if (current.status === "leased")
    throw new AppError(
      "This vehicle is on an active lease and can't be edited.",
    );
  const d = parseListing(raw);
  const existing = (await photosFor([id])).get(id) ?? [];
  await checkPhotos(owner, d.photos, existing);
  const reg = d.registrationKey
    ? await assertOwnUploads(owner.id, "registration", [d.registrationKey])
    : null;
  const pricing = pricingFromWeekly(d.weeklyPrice);
  try {
    await db().transaction(async (tx) => {
      await tx
        .update(schema.vehicles)
        .set({
          make: d.make,
          model: d.model,
          year: d.year,
          colour: d.colour,
          plate: d.plate,
          type: d.type,
          transmission: d.transmission,
          seats: d.seats,
          fuel: d.fuel,
          city: d.city,
          mileageKm: d.mileageKm,
          priceDaily: pricing.daily,
          priceWeekly: pricing.weekly,
          priceMonthly: pricing.monthly,
          ...(reg && d.registrationKey
            ? {
                registrationKey: d.registrationKey,
                registrationName: reg.get(d.registrationKey)?.name,
              }
            : {}),
          ...(current.status === "rejected"
            ? { status: "pending_review" as const, reviewNote: null }
            : {}),
        })
        .where(eq(schema.vehicles.id, id));
      await writePhotos(tx, id, d.photos);
    });
  } catch (e) {
    if (isPlateConflict(e)) throw plateTaken();
    throw e;
  }
}

/**
 * Take a live listing off the marketplace, or put an unlisted one back.
 * Unlisting declines the vehicle's pending requests so drivers aren't left waiting.
 */
export async function setListed(
  owner: User,
  id: string,
  listed: boolean,
): Promise<{ declined: number }> {
  const v = await ownVehicle(owner, id);
  const from: VehicleStatus = listed ? "unlisted" : "live";
  if (v.status !== from)
    throw new AppError(
      listed
        ? "Only unlisted vehicles can be relisted."
        : "Only live vehicles can be unlisted.",
    );

  const declined = await db().transaction(async (tx) => {
    // Conditional update: a concurrent approval can't race this.
    const updated = await tx
      .update(schema.vehicles)
      .set({ status: listed ? "live" : "unlisted" })
      .where(and(eq(schema.vehicles.id, id), eq(schema.vehicles.status, from)))
      .returning({ id: schema.vehicles.id });
    if (updated.length === 0)
      throw new AppError("This vehicle changed. Refresh and try again.", 409);
    if (listed) return [];
    return tx
      .update(schema.leaseRequests)
      .set({
        status: "declined",
        declineReason: "The owner took this vehicle off the marketplace.",
        decidedAt: new Date(),
      })
      .where(
        and(
          eq(schema.leaseRequests.vehicleId, id),
          eq(schema.leaseRequests.status, "pending"),
        ),
      )
      .returning({ driverId: schema.leaseRequests.driverId });
  });

  await notify(
    declined.map((r) => ({
      userId: r.driverId,
      kind: "request_declined" as const,
      title: "Request declined",
      body: `The ${v.make} ${v.model} is no longer available.`,
      href: "/dashboard/requests",
    })),
  );
  return { declined: declined.length };
}
