import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { newId } from "@/server/ids";
import { logger } from "@/server/logger";
import { verifyWebhookSignature } from "@/server/paystack";
import { handleChargeSuccess } from "@/server/services/payments";
import { handleTransferEvent } from "@/server/services/payouts";

type PaystackEvent = { event: string; data: { reference?: string } };

/**
 * Paystack webhook. Configure in the Paystack dashboard as
 *   https://<your-domain>/api/webhooks/paystack
 * The signature is an HMAC-SHA512 of the raw body with the secret key.
 * Each (event, reference) is processed once; replays return 200.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (
    !verifyWebhookSignature(raw, request.headers.get("x-paystack-signature"))
  ) {
    logger.warn("paystack webhook: bad signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: PaystackEvent;
  try {
    payload = JSON.parse(raw) as PaystackEvent;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const reference = payload.data?.reference;
  if (!payload.event || !reference)
    return new Response("ignored", { status: 200 });

  const [stored] = await db()
    .insert(schema.paystackEvents)
    .values({ id: newId("pse"), event: payload.event, reference, payload })
    .onConflictDoNothing()
    .returning({ id: schema.paystackEvents.id });
  if (!stored) return new Response("duplicate", { status: 200 });

  try {
    if (payload.event === "charge.success")
      await handleChargeSuccess(reference);
    else if (payload.event.startsWith("transfer."))
      await handleTransferEvent(payload.event, reference);
    await db()
      .update(schema.paystackEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.paystackEvents.id, stored.id));
  } catch (e) {
    logger.error("paystack webhook failed", {
      event: payload.event,
      reference,
      error: e,
    });
    // Let Paystack retry: remove the record so the retry is processed.
    await db()
      .delete(schema.paystackEvents)
      .where(eq(schema.paystackEvents.id, stored.id));
    return new Response("error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
