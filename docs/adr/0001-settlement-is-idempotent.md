# 0001 — One place settles a payment, and it is idempotent

**Status:** accepted

## Context

Two independent events can report the same money: the browser returning to
`/dashboard/leases/<id>?reference=…` and Paystack's `charge.success` webhook.
Either can arrive twice, in any order, or not at all (closed tab, nginx
misconfiguration, a deploy mid-request). A double-settled payment pays the owner
twice and closes two repayments.

## Decision

`settlePayment(reference, confirmation)` in `src/server/services/payments.ts` is
the only code that moves a payment to `success`:

- it runs in one transaction with `SELECT … FOR UPDATE` on the payment row;
- a payment already `success` returns `already` and changes nothing;
- the amount and currency Paystack reports must equal `payments.amount * 100`,
  otherwise the payment is marked `failed` and logged — never settled;
- the repayment is updated with `status <> 'paid'`, so a second payment for an
  already-paid repayment is refused and left for support;
- the owner credit uses `INSERT … ON CONFLICT (owner_id, period) DO UPDATE`
  guarded by `status = 'scheduled'`, so a period already paid out is never
  mutated.

The return redirect and the webhook both call it. The webhook is the primary
path; `reconcilePendingPayments()` runs in the daily job as the backstop for a
webhook that never arrived, re-checking payments still `pending` after an hour.

## Consequences

- Duplicate deliveries are free; no event-ordering assumptions.
- A real overpayment is marked `failed` rather than silently accepted — the
  money is visible in Paystack and must be resolved by support, not by code.
- The daily job needs a Paystack key; without one it is a no-op (development).
- Manual settlement is impossible by design: there is no "mark as paid" button.
