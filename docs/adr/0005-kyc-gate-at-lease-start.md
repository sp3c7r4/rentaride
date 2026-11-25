# 0005 — Verification gates the lease start, not the request

**Status:** accepted

## Context

A new driver is usable before staff have checked their licence: the onboarding
copy says "you can browse and request vehicles in the meantime". Owners therefore
see requests from unverified drivers. Before this decision, `approveRequest`
checked nothing, so an owner could hand over a car to someone the platform had
never verified — the exact risk the KYC step exists to remove.

## Decision

- Requesting is open to any onboarded driver, verified or not.
- `approveRequest` refuses to start a lease unless `users.kyc_status` is
  `verified` (`409`, message naming verification).
- The request card shows the driver's KYC badge; the owner's Approve button is
  disabled with the reason, and the server enforces the same rule regardless of
  the UI.
- Staff approve verification in the review queue; the driver is notified and the
  owner can then approve.

## Consequences

- The verification promise is enforced at the money boundary, where it matters,
  without blocking the funnel earlier than necessary.
- A pending-driver request can sit in the owner's queue; the owner sees why it
  can't be approved.
- Payments inherit the gate: no lease, no checkout.
