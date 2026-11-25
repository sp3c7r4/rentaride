# RentARide backend: tasks

Status: `[x]` done, `[-]` in progress, `[ ]` not started.
Every task ends with `tsc`, biome on touched files, vitest for the services it adds,
and a browser pass through Chrome DevTools MCP against the real backend.

## B0: infrastructure
- [x] B0.1 `docker-compose.yml` (Postgres, Redis, Mailpit, MinIO), `.env.example`, validated env
- [x] B0.2 Drizzle schema for every domain table, first migration, seed script (demo accounts and vehicles)
- [x] B0.3 Server foundations: db client, logger, errors, DTO helpers, Redis, rate limiter

## B1: auth
- [x] B1.1 Signup, email code, verify, resend; sessions; sign-in, sign-out; `GET /api/auth/me`
- [x] B1.2 Forgot and reset password by emailed link; change password
- [x] B1.3 Onboarding (role, basics, licence, payout account) and the client `useSession`
- [x] B1.4 `proxy.ts` optimistic redirects; staff guard

### B0 and B1 test notes
- Compose services healthy; migrations applied to `rentaride` and `rentaride_test`; seed loads the frontend demo data.
  MinIO images are gone from Docker Hub, so storage is SeaweedFS (S3 API on 9010); the app creates the bucket.
- Owner signup from `/signup?role=owner`: code delivered by the worker to Mailpit; a wrong code is rejected, the right
  one signs in. Onboarding resolved the payout account name on the server (simulated until Paystack keys are set).
- Sign-out clears the session; wrong password rejected; sign-in works. Forgot password emailed a link; resetting
  signed out every session.
- Driver signup with a licence photo: uploaded, re-encoded to JPEG by sharp, stored; owner can fetch it, a signed-out
  request gets 404, path traversal 404, anonymous upload 401. Proxy redirects signed-out `/dashboard/*` (307).
- vitest: cookie signing, codes, argon2, email escaping (10 tests).

## B2: files and vehicles
- [x] B2.1 Upload endpoint (sharp, S3/MinIO), `/files/<key>` with access checks
- [x] B2.2 Public browse and vehicle detail; owner vehicle create, edit, unlist, relist

## B3: requests and leases
- [x] B3.1 Create, withdraw, approve, decline requests (approval creates the lease and schedule)
- [x] B3.2 Leases list and detail; driver and owner overviews

## B4: payments
- [x] B4.1 Paystack checkout (initialise, return verify), `charge.success` webhook, receipts
- [x] B4.2 Bank list and account-name resolution through Paystack

## B5: payouts and jobs
- [x] B5.1 BullMQ worker: email queue, daily repayment status and reminders, monthly payouts
- [x] B5.2 Paystack transfers and transfer webhooks; payouts page on real data

### B2 to B5 test notes
- Browse filters and sorts from Postgres; unpublished listings return 404 to other users.
- Owner listing with two uploaded photos and a PDF registration saved as pending review with derived prices.
  Unlisting declined the pending request and emailed the driver; relist works.
- Driver requested the Expedition; owner approved (lease, 26 weekly repayments, nothing pre-paid, vehicle leased).
  First payment: ₦70,000 + ₦140,000 deposit = ₦210,000; owner payout +₦56,000 (80% of the repayment only);
  receipt and owner emails sent. Payments simulate until PAYSTACK_SECRET_KEY is set.
- Worker: daily repayment status and monthly payouts scheduled (Africa/Lagos); `npm run job -- payouts` sent the
  November payout (simulated transfer) and emailed the owner.
- Database constraints: one active lease per vehicle and per driver (partial unique indexes).
- vitest on `rentaride_test`: schedule maths, approval, deposit and owner share, idempotent settlement, amount
  mismatch rejected, pay-in-order, daily status transitions and overdue notice (19 tests total).

## B6: disputes, notifications, review, settings
- [x] B6.1 Disputes with evidence and messages
- [x] B6.2 Notifications
- [x] B6.3 Review console (KYC and listings), settings (profile, licence, payout account), contact form

## B7: hardening and deploy
- [x] B7.1 Remove the localStorage mock; full regression in the browser
- [x] B7.2 EC2 deployment files (Dockerfile, worker, nginx notes), production checklist

### B6 and B7 test notes
- Dispute opened from the lease with an uploaded photo and PDF; the owner could open both and reply; an
  unrelated member got 404 on the evidence, the dispute and the lease, and 403 on `/api/review`.
- Reviewer verified two members and approved the Kia listing (now live); each was notified. Licence and
  registration documents open from the queue for staff.
- Contact form stored ticket RR-… and emailed the support inbox. Notifications page and "Mark all as read"
  clear the bell. Profile save and licence replacement (back to pending) work.
- Mock store removed: `src/lib/mock/db.ts` is gone; `src/lib/mock/seed.ts` remains only as seed data.
- Production: `next build` (49 routes) and `docker build`; the image runs as app and worker against
  the local services (vehicles API, pages, webhook signature check 401).
- Fixed during testing:
  - Route-handler and action wrappers swallowed Next.js's internal "dynamic route" signal at build time;
    they now call `unstable_rethrow`.
  - The worker imported `next/navigation` through `errors.ts`; the wrappers moved to `server/handlers.ts`.
  - Dev logs inside the project caused a reload loop (documented in README).
  - A retried payout reused its Paystack transfer reference; it now gets a new one.