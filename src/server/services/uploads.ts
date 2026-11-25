import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import sharp from "sharp";
import type { User } from "@/lib/types";
import { db, schema } from "@/server/db";
import { AppError } from "@/server/errors";
import { newId } from "@/server/ids";
import { putObject } from "@/server/storage";

export type UploadKind = (typeof schema.uploadKindEnum.enumValues)[number];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_TYPES = [...IMAGE_TYPES, "application/pdf"];

const RULES: Record<
  UploadKind,
  { types: string[]; maxMb: number; maxPx: number }
> = {
  vehicle_photo: { types: IMAGE_TYPES, maxMb: 8, maxPx: 1600 },
  registration: { types: DOC_TYPES, maxMb: 8, maxPx: 2000 },
  licence: { types: DOC_TYPES, maxMb: 8, maxPx: 2000 },
  evidence: { types: DOC_TYPES, maxMb: 10, maxPx: 2000 },
};

/** Vehicle photos are public; everything else needs a permission check. */
export const isPublicKind = (kind: UploadKind) => kind === "vehicle_photo";

export type UploadResult = {
  key: string;
  url: string;
  name: string;
  contentType: string;
};

/** PDFs start with "%PDF-". Don't trust the browser's declared type. */
const isPdf = (b: Buffer) => b.subarray(0, 5).toString("latin1") === "%PDF-";

/**
 * Store an upload. Images are decoded and re-encoded with sharp, which
 * rejects non-images, strips EXIF (including GPS) and caps the size.
 */
export async function storeUpload(
  user: User,
  kind: UploadKind,
  file: File,
): Promise<UploadResult> {
  const rule = RULES[kind];
  if (!rule) throw new AppError("Unknown upload type.");
  if (file.size === 0) throw new AppError("That file is empty.");
  if (file.size > rule.maxMb * 1024 * 1024)
    throw new AppError(`Files can be up to ${rule.maxMb} MB.`);
  if (!rule.types.includes(file.type))
    throw new AppError(
      rule.types.includes("application/pdf")
        ? "Use a JPG, PNG, WebP or PDF file."
        : "Use a JPG, PNG or WebP image.",
    );

  const input = Buffer.from(await file.arrayBuffer());
  let body: Buffer;
  let contentType: string;
  let ext: string;

  if (file.type === "application/pdf") {
    if (!isPdf(input)) throw new AppError("That file isn't a valid PDF.");
    body = input;
    contentType = "application/pdf";
    ext = "pdf";
  } else {
    try {
      body = await sharp(input, { failOn: "error" })
        .rotate() // apply EXIF orientation before metadata is dropped
        .resize({
          width: rule.maxPx,
          height: rule.maxPx,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new AppError("That image couldn't be read. Try another file.");
    }
    contentType = "image/jpeg";
    ext = "jpg";
  }

  const id = newId("upl");
  const key = `${kind}/${user.id}/${id}.${ext}`;
  await putObject(key, body, contentType);
  const name =
    file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || `${kind}.${ext}`;
  await db().insert(schema.uploads).values({
    id,
    key,
    ownerId: user.id,
    kind,
    contentType,
    size: body.length,
    originalName: name,
  });
  return { key, url: `/files/${key}`, name, contentType };
}

/**
 * Check that every key was uploaded by `userId` with the expected kind.
 * Stops one user from attaching another user's files.
 */
export async function assertOwnUploads(
  userId: string,
  kind: UploadKind,
  keys: string[],
): Promise<Map<string, { name: string; contentType: string }>> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return new Map();
  const rows = await db()
    .select({
      key: schema.uploads.key,
      name: schema.uploads.originalName,
      contentType: schema.uploads.contentType,
    })
    .from(schema.uploads)
    .where(
      and(
        inArray(schema.uploads.key, unique),
        eq(schema.uploads.ownerId, userId),
        eq(schema.uploads.kind, kind),
      ),
    );
  if (rows.length !== unique.length)
    throw new AppError("One of the files is missing. Upload it again.");
  return new Map(
    rows.map((r) => [r.key, { name: r.name, contentType: r.contentType }]),
  );
}

/**
 * Can `viewer` read this private upload? The uploader and staff always can.
 * Evidence: both parties of the disputed lease. Licence and registration:
 * only the uploader and staff.
 */
export async function canReadUpload(
  viewer: User | null,
  key: string,
): Promise<{ kind: UploadKind } | null> {
  const [row] = await db()
    .select({ kind: schema.uploads.kind, ownerId: schema.uploads.ownerId })
    .from(schema.uploads)
    .where(eq(schema.uploads.key, key))
    .limit(1);
  if (!row) return null;
  if (isPublicKind(row.kind)) return { kind: row.kind };
  if (!viewer) return null;
  if (viewer.staff || viewer.id === row.ownerId) return { kind: row.kind };
  if (row.kind === "evidence") {
    // Attached to a message on a dispute whose lease the viewer is part of.
    const hits = await db()
      .select({ id: schema.disputeMessages.id })
      .from(schema.disputeMessages)
      .innerJoin(
        schema.disputes,
        eq(schema.disputes.id, schema.disputeMessages.disputeId),
      )
      .innerJoin(schema.leases, eq(schema.leases.id, schema.disputes.leaseId))
      .where(
        and(
          or(
            eq(schema.leases.driverId, viewer.id),
            eq(schema.leases.ownerId, viewer.id),
          ),
          // jsonb containment: attachments @> [{"key": key}]
          sqlContainsKey(key),
        ),
      )
      .limit(1);
    if (hits.length) return { kind: row.kind };
  }
  return null;
}

const sqlContainsKey = (key: string) =>
  sql`${schema.disputeMessages.attachments} @> ${JSON.stringify([{ key }])}::jsonb`;
