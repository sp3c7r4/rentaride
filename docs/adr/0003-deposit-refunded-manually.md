# 0003 — The deposit is held, and refunded by hand

**Status:** accepted (with a known manual step)

## Context

Every lease holds a refundable deposit of two weeks' rent, charged inside the
first payment. The UI promises it back: "Refundable at the end". There is no
automated refund — no Paystack refund call, no refund state on the lease.

Options were: build automated refunds, drop the deposit, or keep the deposit and
run the refund as an operations step.

## Decision

Keep the deposit; refund it **manually**, tracked by support.

- `leases.deposit` is the amount held, `deposit_paid_at` when it was collected.
- `settlePayment` never touches the deposit after collection; it is not part of
  the owner's 80% (`creditOwner` uses the repayment amount only).
- When the last repayment settles, the lease becomes `completed` and the vehicle
  returns to `live`. The deposit stays recorded on the lease.

**Runbook (support):** when a lease completes and the vehicle is returned
cleanly, refund `leases.deposit` through the Paystack dashboard (Refunds →
search the first payment's `reference`), then note the refund reference on the
dispute/notification thread. Damage claims are deducted from the deposit before
refund, decided in the dispute.

## Consequences

- No code path moves deposit money out, so nothing can double-refund.
- Refunds are not automatic: if support forgets, nothing surfaces it. A future
  change should add a `refunded_at` column plus a nightly report of leases
  completed more than 7 days ago without one.
- The copy "Refundable at the end" stays honest only while this runbook is
  followed.
