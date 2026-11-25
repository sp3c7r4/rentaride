"use server";

import type { ApiResult } from "@/lib/types";
import { requireMember } from "@/server/auth/dal";
import { action } from "@/server/handlers";
import {
  type CheckoutStart,
  confirmReturn,
  type PaymentChannel,
  type PaymentStatus,
  quote,
  startCheckout,
} from "@/server/services/payments";

const CHANNELS: PaymentChannel[] = ["card", "transfer", "ussd"];

export async function quoteAction(
  leaseId: string,
  repaymentId: string,
): Promise<ApiResult<{ repayment: number; deposit: number; total: number }>> {
  return action("quote", async () =>
    quote(await requireMember("driver"), String(leaseId), String(repaymentId)),
  );
}

export async function startCheckoutAction(
  leaseId: string,
  repaymentId: string,
  channel: PaymentChannel,
): Promise<ApiResult<CheckoutStart>> {
  return action("startCheckout", async () =>
    startCheckout(
      await requireMember("driver"),
      String(leaseId),
      String(repaymentId),
      CHANNELS.includes(channel) ? channel : "card",
    ),
  );
}

/** Called when Paystack sends the driver back with ?reference=. */
export async function confirmPaymentAction(
  reference: string,
): Promise<ApiResult<PaymentStatus>> {
  return action("confirmPayment", async () =>
    confirmReturn(
      await requireMember("driver"),
      String(reference).slice(0, 40),
    ),
  );
}
