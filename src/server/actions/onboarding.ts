"use server";

import type { ApiResult, User } from "@/lib/types";
import { requireUser } from "@/server/auth/dal";
import { action } from "@/server/handlers";
import { resolveAccountName } from "@/server/services/banking";
import {
  completeOnboarding,
  type OnboardingInput,
} from "@/server/services/onboarding";

export async function completeOnboardingAction(
  input: OnboardingInput,
): Promise<ApiResult<User>> {
  return action("completeOnboarding", async () =>
    completeOnboarding(await requireUser(), input),
  );
}

/** Look up the account holder's name for the payout form. */
export async function resolveAccountNameAction(
  bankCode: string,
  accountNumber: string,
): Promise<ApiResult<{ accountName: string; bankName: string }>> {
  return action("resolveAccountName", async () =>
    resolveAccountName(
      await requireUser(),
      String(bankCode),
      String(accountNumber),
    ),
  );
}
