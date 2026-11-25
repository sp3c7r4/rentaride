"use server";

import type { ApiResult, User } from "@/lib/types";
import { requireUser } from "@/server/auth/dal";
import { destroySession } from "@/server/auth/session";
import { action } from "@/server/handlers";
import * as auth from "@/server/services/auth";

/*
 * Server Actions for authentication. Inputs are untrusted and validated in
 * the service. Errors come back as `{ ok: false, error }`.
 */

export async function signUpAction(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: "driver" | "owner";
}): Promise<ApiResult> {
  return action("signUp", () => auth.signUp(input));
}

export async function verifyEmailAction(
  code: string,
): Promise<ApiResult<User>> {
  return action("verifyEmail", () => auth.verifyEmail(code));
}

export async function resendEmailCodeAction(): Promise<ApiResult> {
  return action("resendEmailCode", () => auth.resendEmailCode());
}

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<ApiResult<auth.SignInResult>> {
  return action("signIn", () => auth.signIn(input));
}

export async function signOutAction(): Promise<ApiResult> {
  return action("signOut", () => destroySession());
}

export async function requestPasswordResetAction(
  email: string,
): Promise<ApiResult> {
  return action("requestPasswordReset", () => auth.requestPasswordReset(email));
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
}): Promise<ApiResult> {
  return action("resetPassword", () => auth.resetPassword(input));
}

export async function changePasswordAction(input: {
  current: string;
  next: string;
}): Promise<ApiResult> {
  return action("changePassword", async () =>
    auth.changePassword(await requireUser(), input),
  );
}
