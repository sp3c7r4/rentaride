/**
 * Client auth API. Mutations are Server Actions (`src/server/actions/auth.ts`);
 * the session lives in an httpOnly cookie the browser never reads.
 */
import { apiGet, invalidate } from "@/lib/http";
import type { ApiResult, Role, User } from "@/lib/types";
import {
  requestPasswordResetAction,
  resendEmailCodeAction,
  resetPasswordAction,
  signInAction,
  signOutAction,
  signUpAction,
  verifyEmailAction,
} from "@/server/actions/auth";
import {
  completeOnboardingAction,
  resolveAccountNameAction,
} from "@/server/actions/onboarding";
import type { OnboardingData } from "./kyc";
import { clearSession, refreshSession } from "./session";
import { uploadFile } from "./uploads";

export type { Role };

export const OTP_LENGTH = 6;
export const RESEND_COOLDOWN_SECONDS = 45;

/** Where a signed-in user should land. */
export function homeFor(user: User) {
  if (user.staff) return "/review";
  return user.onboarded ? "/dashboard" : "/onboarding";
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
}

export type SignInResponse =
  | { ok: true; user: User }
  | { ok: true; verifyEmail: true }
  | { ok: false; error: string };

export async function signIn(
  email: string,
  password: string,
): Promise<SignInResponse> {
  const res = await signInAction({ email, password });
  if (!res.ok) return res;
  if (res.data.status === "verify_email")
    return { ok: true, verifyEmail: true };
  await refreshSession();
  invalidate();
  return { ok: true, user: res.data.user };
}

export async function signOut() {
  await signOutAction();
  clearSession();
  invalidate();
}

export type SignUpPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: Role;
};

/** Create the account and email a code. The server remembers who's pending. */
export const signUp = (payload: SignUpPayload) => signUpAction(payload);

export type PendingSignup = { maskedEmail: string; firstName: string };

export async function getPendingSignup(): Promise<PendingSignup | null> {
  try {
    const { pending } = await apiGet<{ pending: PendingSignup | null }>(
      "/api/auth/pending",
    );
    return pending;
  } catch {
    return null;
  }
}

/** Verify the emailed code. On success the server signs the user in. */
export async function verifyOtp(code: string): Promise<ApiResult<User>> {
  const res = await verifyEmailAction(code);
  if (res.ok) await refreshSession();
  return res;
}

export const resendOtp = () => resendEmailCodeAction();

export const requestPasswordReset = (email: string) =>
  requestPasswordResetAction(email);

export const resetPassword = (token: string, password: string) =>
  resetPasswordAction({ token, password });

export type ResolveResult =
  | { ok: true; accountName: string }
  | { ok: false; error: string };

export async function resolveAccountName(
  bankCode: string,
  accountNumber: string,
): Promise<ResolveResult> {
  const res = await resolveAccountNameAction(bankCode, accountNumber);
  return res.ok ? { ok: true, accountName: res.data.accountName } : res;
}

/**
 * Upload the onboarding files, then save everything in one Server Action.
 * The server re-resolves the payout account name itself.
 */
export async function completeOnboarding(
  role: Role,
  data: OnboardingData,
): Promise<ApiResult> {
  try {
    if (role === "driver") {
      if (!data.licenceFile)
        return { ok: false, error: "Upload a photo of your licence." };
      const licence = await uploadFile(data.licenceFile, "licence");
      const res = await completeOnboardingAction({
        role,
        phone: data.phone,
        city: data.city,
        licence: {
          number: data.licenceNumber,
          expiry: data.licenceExpiry,
          fileKey: licence.key,
        },
      });
      return finish(res);
    }

    const vehicles = [];
    for (const v of data.vehicles) {
      if (!v.photo || !v.registrationDoc)
        return {
          ok: false,
          error: `Add a photo and registration for the ${v.make} ${v.model}.`,
        };
      const [photo, registration] = await Promise.all([
        uploadFile(v.photo, "vehicle_photo"),
        uploadFile(v.registrationDoc, "registration"),
      ]);
      vehicles.push({
        make: v.make,
        model: v.model,
        year: Number(v.year),
        colour: v.colour,
        plate: v.plate,
        type: v.type,
        transmission: v.transmission,
        weeklyPrice: v.weeklyPrice,
        photoKey: photo.key,
        registrationKey: registration.key,
      });
    }
    const res = await completeOnboardingAction({
      role,
      phone: data.phone,
      city: data.city,
      payout: { bankCode: data.bankCode, accountNumber: data.accountNumber },
      vehicles,
    });
    return finish(res);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }
}

async function finish(res: ApiResult<User>): Promise<ApiResult> {
  if (!res.ok) return res;
  await refreshSession();
  invalidate();
  return { ok: true };
}
