"use server";

import type { ApiResult, User } from "@/lib/types";
import { requireMember } from "@/server/auth/dal";
import { action } from "@/server/handlers";
import { updatePayoutAccount } from "@/server/services/payouts";

export async function updatePayoutAccountAction(
  bankCode: string,
  accountNumber: string,
): Promise<ApiResult<NonNullable<User["payoutAccount"]>>> {
  return action("updatePayoutAccount", async () =>
    updatePayoutAccount(
      await requireMember("owner"),
      String(bankCode),
      String(accountNumber),
    ),
  );
}
