import "server-only";
import { BANKS } from "@/lib/kyc";
import type { User } from "@/lib/types";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import * as paystack from "@/server/paystack";
import { rateLimit } from "@/server/rate-limit";

/**
 * Bank list and account-name lookup through Paystack. In development without
 * PAYSTACK_SECRET_KEY, a fixed list and a simulated lookup keep the flow
 * usable (account number 0000000000 fails). Production always uses Paystack.
 */
const simulate = () =>
  !paystack.paystackConfigured() && env().NODE_ENV !== "production";

export async function listBanks(): Promise<paystack.Bank[]> {
  if (simulate()) return BANKS.map((b) => ({ code: b.value, name: b.label }));
  return paystack.listBanks();
}

export async function resolveAccountName(
  user: Pick<User, "id" | "firstName" | "lastName">,
  bankCode: string,
  accountNumber: string,
): Promise<{ accountName: string; bankName: string }> {
  if (!/^\d{10}$/.test(accountNumber))
    throw new AppError("Enter a 10-digit account number.");
  await rateLimit(`resolve:${user.id}`, 30, 3600);
  const bank = (await listBanks()).find((b) => b.code === bankCode);
  if (!bank) throw new AppError("Choose your bank from the list.");

  if (simulate()) {
    logger.debug("simulated account resolution (no PAYSTACK_SECRET_KEY)");
    if (accountNumber === "0000000000")
      throw new AppError("We couldn't find an account with these details.");
    return {
      accountName: `${user.firstName} ${user.lastName}`.toUpperCase(),
      bankName: bank.name,
    };
  }
  const name = await paystack.resolveAccount(accountNumber, bankCode);
  if (!name)
    throw new AppError("We couldn't find an account with these details.");
  return { accountName: name, bankName: bank.name };
}
