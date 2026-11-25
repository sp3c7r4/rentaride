import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { pricingFromWeekly } from "@/lib/pricing";
import type { User } from "@/lib/types";
import { loadUser } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import { AppError } from "@/server/errors";
import { newId } from "@/server/ids";
import { resolveAccountName } from "./banking";
import { assertOwnUploads } from "./uploads";

const PHONE = /^(\+?234|0)[789][01]\d{8}$/;
const today = () => new Date().toISOString().slice(0, 10);

const vehicleDraft = z.object({
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
  weeklyPrice: z.coerce.number().int().min(5000).max(5_000_000),
  photoKey: z.string().min(1),
  registrationKey: z.string().min(1),
});

const input = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("driver"),
    phone: z.string(),
    city: z.string().trim().min(2).max(60),
    licence: z.object({
      number: z
        .string()
        .trim()
        .toUpperCase()
        .regex(
          /^[A-Z]{3}[A-Z0-9]{9}$/,
          "Enter the 12-character licence number.",
        ),
      expiry: z.iso.date(),
      fileKey: z.string().min(1),
    }),
  }),
  z.object({
    role: z.literal("owner"),
    phone: z.string(),
    city: z.string().trim().min(2).max(60),
    payout: z.object({
      bankCode: z.string().min(1),
      accountNumber: z
        .string()
        .regex(/^\d{10}$/, "Enter a 10-digit account number."),
    }),
    vehicles: z.array(vehicleDraft).max(5).default([]),
  }),
]);

export type OnboardingInput = z.input<typeof input>;

/**
 * Finish onboarding: role, contact details, then the driver's licence or the
 * owner's payout account and any vehicles. KYC goes to "pending" for review.
 */
export async function completeOnboarding(
  user: User,
  raw: unknown,
): Promise<User> {
  if (user.onboarded) throw new AppError("Your account is already set up.");
  if (user.staff) throw new AppError("Staff accounts don't need onboarding.");
  const parsed = input.safeParse(raw);
  if (!parsed.success)
    throw new AppError(
      parsed.error.issues[0]?.message ?? "Check your details.",
    );
  const data = parsed.data;
  const phone = data.phone.replace(/[\s-]/g, "");
  if (!PHONE.test(phone))
    throw new AppError("Enter a valid Nigerian phone number.");

  let licenceName: string | undefined;
  let account: { accountName: string; bankName: string } | undefined;
  const fileNames = new Map<string, string>();

  if (data.role === "driver") {
    if (data.licence.expiry <= today())
      throw new AppError("This licence has expired.");
    const files = await assertOwnUploads(user.id, "licence", [
      data.licence.fileKey,
    ]);
    licenceName = files.get(data.licence.fileKey)?.name;
  } else {
    // Resolve on the server; never trust an account name from the browser.
    account = await resolveAccountName(
      user,
      data.payout.bankCode,
      data.payout.accountNumber,
    );
    if (data.vehicles.length) {
      const photos = await assertOwnUploads(
        user.id,
        "vehicle_photo",
        data.vehicles.map((v) => v.photoKey),
      );
      const regs = await assertOwnUploads(
        user.id,
        "registration",
        data.vehicles.map((v) => v.registrationKey),
      );
      for (const [k, v] of [...photos, ...regs]) fileNames.set(k, v.name);
    }
  }

  await db()
    .transaction(async (tx) => {
      await tx
        .update(schema.users)
        .set({
          role: data.role,
          phone: data.phone.trim(),
          city: data.city,
          onboarded: true,
          kycStatus: "pending",
          kycNote: null,
        })
        .where(eq(schema.users.id, user.id));

      if (data.role === "driver") {
        await tx
          .insert(schema.driverLicences)
          .values({
            userId: user.id,
            number: data.licence.number,
            expiry: data.licence.expiry,
            fileKey: data.licence.fileKey,
            fileName: licenceName,
          })
          .onConflictDoUpdate({
            target: schema.driverLicences.userId,
            set: {
              number: data.licence.number,
              expiry: data.licence.expiry,
              fileKey: data.licence.fileKey,
              fileName: licenceName,
            },
          });
        return;
      }

      if (account) {
        const values = {
          bankCode: data.payout.bankCode,
          bankName: account.bankName,
          accountNumber: data.payout.accountNumber,
          accountName: account.accountName,
          recipientCode: null,
        };
        await tx
          .insert(schema.payoutAccounts)
          .values({ userId: user.id, ...values })
          .onConflictDoUpdate({
            target: schema.payoutAccounts.userId,
            set: values,
          });
      }

      for (const v of data.vehicles) {
        const id = newId("veh");
        const pricing = pricingFromWeekly(v.weeklyPrice);
        await tx.insert(schema.vehicles).values({
          id,
          ownerId: user.id,
          make: v.make,
          model: v.model,
          year: v.year,
          colour: v.colour,
          plate: v.plate,
          type: v.type,
          transmission: v.transmission,
          seats: v.type === "van" ? 8 : 5,
          fuel: v.type === "electric" ? "electric" : "petrol",
          city: data.city,
          mileageKm: 0,
          priceDaily: pricing.daily,
          priceWeekly: pricing.weekly,
          priceMonthly: pricing.monthly,
          status: "pending_review",
          registrationKey: v.registrationKey,
          registrationName: fileNames.get(v.registrationKey),
        });
        await tx.insert(schema.vehiclePhotos).values({
          id: newId("vph"),
          vehicleId: id,
          src: `/files/${v.photoKey}`,
          position: 0,
        });
      }
    })
    .catch((e: unknown) => {
      // Unique index on active plates.
      if (
        (e as { cause?: { code?: string } }).cause?.code === "23505" ||
        (e as { code?: string }).code === "23505"
      )
        throw new AppError(
          "A vehicle with this plate number is already listed.",
        );
      throw e;
    });

  const updated = await loadUser(user.id);
  if (!updated) throw new AppError("Account not found.", 404);
  return updated;
}
