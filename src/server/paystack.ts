import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "@/server/auth/crypto";
import { env } from "./env";
import { AppError } from "./errors";
import { logger } from "./logger";
import { cached } from "./redis";

/**
 * Minimal Paystack client (https://paystack.com/docs/api). Amounts passed in
 * and out of this module are naira; Paystack itself uses kobo.
 */
const BASE = "https://api.paystack.co";

type PaystackResponse<T> = { status: boolean; message: string; data: T };

function secret(): string {
  const key = env().PAYSTACK_SECRET_KEY;
  if (!key)
    throw new AppError(
      "Payments aren't configured yet. Add PAYSTACK_SECRET_KEY.",
      503,
      "paystack_unconfigured",
    );
  return key;
}

export const paystackConfigured = () => !!env().PAYSTACK_SECRET_KEY;

async function call<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res
    .json()
    .catch(() => null)) as PaystackResponse<T> | null;
  if (!res.ok || !json?.status) {
    logger.warn("paystack error", {
      path,
      status: res.status,
      message: json?.message,
    });
    throw new PaystackError(
      json?.message ?? `Paystack returned ${res.status}`,
      res.status,
    );
  }
  return json.data;
}

export class PaystackError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

const toKobo = (naira: number) => Math.round(naira * 100);
export const fromKobo = (kobo: number) => Math.round(kobo) / 100;

// ── Banks ───────────────────────────────────────────────────────────────────

export type Bank = { code: string; name: string };

/** Nigerian banks that support NUBAN transfers. Cached for a day. */
export async function listBanks(): Promise<Bank[]> {
  return cached("paystack:banks:ngn", 86_400, async () => {
    const banks = await call<
      { code: string; name: string; active: boolean; is_deleted: boolean }[]
    >("GET", "/bank?currency=NGN&perPage=200");
    return banks
      .filter((b) => b.active && !b.is_deleted)
      .map((b) => ({ code: b.code, name: b.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

/** Account holder's name for a NUBAN account, or null when it doesn't resolve. */
export async function resolveAccount(
  accountNumber: string,
  bankCode: string,
): Promise<string | null> {
  try {
    const data = await call<{ account_name: string }>(
      "GET",
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    );
    return data.account_name.toUpperCase();
  } catch (e) {
    if (e instanceof PaystackError && e.status >= 400 && e.status < 500)
      return null;
    throw e;
  }
}

// ── Transactions ────────────────────────────────────────────────────────────

export async function initializeTransaction(input: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  channels: ("card" | "bank_transfer" | "ussd")[];
  metadata: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; accessCode: string }> {
  const data = await call<{ authorization_url: string; access_code: string }>(
    "POST",
    "/transaction/initialize",
    {
      email: input.email,
      amount: toKobo(input.amount),
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: input.channels,
      metadata: input.metadata,
    },
  );
  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
  };
}

export type PaystackTransaction = {
  id: number;
  status:
    | "success"
    | "failed"
    | "abandoned"
    | "ongoing"
    | "pending"
    | "reversed"
    | string;
  reference: string;
  amount: number; // kobo
  currency: string;
  channel: string;
  paid_at: string | null;
  gateway_response: string;
};

export const verifyTransaction = (reference: string) =>
  call<PaystackTransaction>(
    "GET",
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );

// ── Transfers (owner payouts) ───────────────────────────────────────────────

export async function createTransferRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<string> {
  const data = await call<{ recipient_code: string }>(
    "POST",
    "/transferrecipient",
    {
      type: "nuban",
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: "NGN",
    },
  );
  return data.recipient_code;
}

export async function initiateTransfer(input: {
  amount: number;
  recipientCode: string;
  reference: string;
  reason: string;
}): Promise<{ transferCode: string; status: string }> {
  const data = await call<{ transfer_code: string; status: string }>(
    "POST",
    "/transfer",
    {
      source: "balance",
      amount: toKobo(input.amount),
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason,
      currency: "NGN",
    },
  );
  return { transferCode: data.transfer_code, status: data.status };
}

export type PaystackTransfer = {
  status: "success" | "pending" | "otp" | "failed" | "reversed" | string;
  reference: string;
  amount: number;
  transfer_code: string;
};

/**
 * What Paystack thinks of a transfer. Used after an ambiguous failure (timeout,
 * 5xx): retrying a transfer Paystack already accepted pays the owner twice.
 */
export const verifyTransfer = (reference: string) =>
  call<PaystackTransfer>(
    "GET",
    `/transfer/verify/${encodeURIComponent(reference)}`,
  );

// ── Webhooks ────────────────────────────────────────────────────────────────

/** Paystack signs the raw body with HMAC-SHA512 using the secret key. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
) {
  if (!signature) return false;
  const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
