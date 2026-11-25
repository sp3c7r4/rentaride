# RentARide — domain glossary

Terms as they are used in the code, the database and the UI. If a term here
disagrees with a variable name somewhere, this file wins for meaning and the
variable should be renamed.

## People

| Term | Meaning |
| --- | --- |
| **member** | A signed-in, email-verified user. `requireMember()` — the gate for anything a non-staff user can do. |
| **driver** | A member whose `role` is `driver`. Leases vehicles. |
| **owner** | A member whose `role` is `owner`. Lists vehicles and receives payouts. |
| **staff** | A user with `staff = true`. Not a `role`. Staff skip onboarding, are blocked from member actions (`requireMember`) and use the review console. |
| **KYC** | The driver's licence check. `users.kyc_status` is `pending` → `verified`/`rejected`, decided by staff in the review queue. A driver may browse and request while pending; a lease cannot start (ADR 0005). |

## Money

Amounts are **naira** everywhere in our code and database. Paystack is the only
place kobo appears (`toKobo`/`fromKobo` at the boundary).

| Term | Meaning |
| --- | --- |
| **repayment** | One instalment on a lease. `repayments.amount`, `index`, `due_date`, `status` (`upcoming` → `due` → `overdue`/`paid`). |
| **deposit** | Refundable security held on a lease: two weeks of the weekly price (`depositFor`). Charged **inside the first payment** (`payments.deposit_amount`), never as its own payment row. Refunded by support, not by the app (ADR 0003). |
| **payment** | One attempt to pay a repayment (plus the deposit the first time). Status `pending` → `success` / `failed` / `abandoned`. |
| **reference** | Our id for a gateway operation: `RAR-…` for charges, `PO-…` for owner transfers. Unique, printed in receipts and support threads. |
| **checkout** | `startCheckout` — creates the payment row and returns either a Paystack URL (`redirect`) or a settled payment (development simulation). Only the earliest unpaid repayment can be paid. |
| **settlement** | `settlePayment` — the only code allowed to mark a payment successful. Locks the row, checks amount and currency against Paystack, marks the repayment paid, records the deposit, credits the owner. Idempotent (ADR 0001). |
| **owner share** | 80% of a repayment (`OWNER_SHARE`). The deposit is not shared. |
| **payout** | What the owner is owed for one calendar month (`period`, `YYYY-MM`). Created/accumulated by settlement, `pay_date` is the 5th of the following month, status `scheduled` → `processing` → `paid`/`failed`. |
| **transfer** | The Paystack call that moves a payout to the owner's bank account, identified by the payout's `reference` (ADR 0002). |
| **receipt** | Email sent to the driver on settlement. The notification says "Payment received"; the receipt carries the amount and reference. |

## Leases

| Term | Meaning |
| --- | --- |
| **request** | A driver asking an owner for a vehicle: schedule, term, start date, message. `pending` → `approved`/`declined`/`withdrawn`. |
| **lease** | The started contract created by approving a request. At most one **active** lease per vehicle and per driver (partial unique indexes). |
| **schedule** | `daily`, `weekly`, `monthly`. Determines the repayment unit, count and the deposit (always 2 × weekly). |
| **term** | `term_months` — 3, 6 or 12 months. Repayments are generated for the whole term up front (`buildSchedule`). |
| **outstanding** | Sum of unpaid repayments. Excludes the deposit. |
| **completed** | Every repayment paid: the lease closes, the vehicle goes back to `live` and its trip count increments. |

## Trust

| Term | Meaning |
| --- | --- |
| **listing** | A vehicle in `pending_review` → `live` → `leased`, or `unlisted`/`needs_changes`. Approved by staff. |
| **evidence** | A file attached to a dispute message. Readable by both parties of that lease and by staff. |
| **dispute** | A problem raised on a lease by either party: `open` → `in_review` → `resolved`. Messages are append-only; either party and staff can reply; the opener or staff can resolve. |
| **upload** | A row in `uploads` keyed `kind/userId/id.ext`. Vehicle photos are public; licence, registration and evidence are checked per request. |
