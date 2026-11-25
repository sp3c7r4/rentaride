import { apiGet, mutate } from "@/lib/http";
import type { ApiResult, User } from "@/lib/types";
import {
  confirmPaymentAction,
  quoteAction,
  startCheckoutAction,
} from "@/server/actions/payments";
import type { LeaseView, PaymentRow } from "@/server/services/leases";
import type { CheckoutStart, PaymentStatus } from "@/server/services/payments";

export type { LeaseView, PaymentRow, CheckoutStart, PaymentStatus };
export type PaymentMethod = "card" | "transfer" | "ussd";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Card",
  transfer: "Bank transfer",
  ussd: "USSD",
};

export async function listLeases(_user: User): Promise<LeaseView[]> {
  return (await apiGet<{ leases: LeaseView[] }>("/api/leases")).leases;
}

export async function getLease(
  id: string,
  _user: User,
): Promise<LeaseView | null> {
  try {
    return (
      await apiGet<{ lease: LeaseView }>(
        `/api/leases/${encodeURIComponent(id)}`,
      )
    ).lease;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

/** What the next payment costs, including the deposit on the first one. */
export const quotePayment = (leaseId: string, repaymentId: string) =>
  quoteAction(leaseId, repaymentId);

/**
 * Start a Paystack checkout. Returns a URL to send the browser to, or
 * `settled` when development simulates the payment.
 */
export const startCheckout = (
  leaseId: string,
  repaymentId: string,
  method: PaymentMethod,
): Promise<ApiResult<CheckoutStart>> =>
  mutate(startCheckoutAction(leaseId, repaymentId, method));

/** Confirm a payment after Paystack redirects back with `?reference=`. */
export const confirmPayment = (
  reference: string,
): Promise<ApiResult<PaymentStatus>> => mutate(confirmPaymentAction(reference));

/** Paid repayments for a driver, newest first. */
export async function listPayments(_user: User): Promise<PaymentRow[]> {
  return (await apiGet<{ payments: PaymentRow[] }>("/api/payments")).payments;
}
