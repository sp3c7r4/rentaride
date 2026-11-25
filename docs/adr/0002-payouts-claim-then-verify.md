# 0002 — Payouts are claimed, then verified; never blindly retried

**Status:** accepted

## Context

Owner payouts are real bank transfers. A transfer call can fail in three very
different ways: it was rejected, it never reached Paystack, or it succeeded and
we lost the response (timeout, 5xx, worker restart). Retrying an accepted
transfer pays the owner twice; not retrying a rejected one leaves them unpaid.

## Decision

`runDuePayouts()` (worker, 09:00 on the 5th):

1. select `scheduled` payouts whose `pay_date` has arrived;
2. **claim** the row with a conditional update to `processing` and a fixed
   `reference` (`PO-…`), so two workers cannot both send it;
3. send the transfer with that reference;
4. on any error, ask Paystack (`GET /transfer/verify/<reference>`) before
   deciding: `success` → mark paid, `pending`/`otp`/unknown → **leave
   `processing`**, `failed`/`reversed` → mark `failed`.

`reconcilePayouts()` runs in the daily job and resolves rows left in
`processing` for more than 30 minutes with the same verification. Only a row
that Paystack confirms as failed is rescheduled, and `reschedulePayout()` clears
the reference so the retry is a new transfer.

## Consequences

- A timeout never causes a double payment; the worst case is a delayed payout.
- `processing` is a real state with an owner: the reconciler. If neither the
  worker nor the daily job runs, payouts stall visibly rather than silently
  duplicating.
- Webhook events (`transfer.success|failed|reversed`) move the same rows and are
  the fast path.
