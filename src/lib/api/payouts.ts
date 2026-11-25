import { apiGet, mutate } from "@/lib/http";
import type { ApiResult, User } from "@/lib/types";
import { updatePayoutAccountAction } from "@/server/actions/payouts";
import type { PayoutSummary } from "@/server/services/payouts";

export type { PayoutSummary };

/** Owner payouts, newest period first, with totals and the account on file. */
export async function getPayouts(_user: User): Promise<PayoutSummary> {
  return apiGet<PayoutSummary>("/api/payouts");
}

/** Replace the payout account. The server resolves the account name itself. */
export const updatePayoutAccount = (
  bankCode: string,
  accountNumber: string,
): Promise<ApiResult<NonNullable<User["payoutAccount"]>>> =>
  mutate(updatePayoutAccountAction(bankCode, accountNumber));

/** "••••6789" */
export const maskAccount = (n: string) => `••••${n.slice(-4)}`;
