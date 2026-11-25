# RentARide backend: design

The backend lives inside the Next.js app. No separate server framework.

## Shape

| Concern | Where | Notes |
|---|---|---|
| Reads from client pages | Route Handlers, `src/app/api/**/route.ts` (GET) | Next docs: don't use Server Functions for reads (they run one at a time per client). |
| Mutations | Server Actions, `src/server/actions/*.ts` (`"use server"`) | Every action verifies the session and ownership itself. |
| Webhooks, uploads, files | Route Handlers | Paystack webhook reads the raw body to check the HMAC signature. |
| Business logic | `src/server/services/*` (`import "server-only"`) | Called by both handlers and actions. Returns DTOs, never raw rows. |
| Database | Postgres 18, Drizzle ORM, `pg` | Schema in `src/server/db/schema.ts`, migrations in `drizzle/`. |
| Background jobs | BullMQ on Redis, worker process `src/worker/index.ts` | Emails, daily repayment status, monthly payouts. Runs beside `next start` on EC2. |
| Client SDK | `src/lib/api/*`, `src/lib/auth.ts`, `src/lib/session.ts` | Same names and signatures the pages already use; now call `fetch` and Server Actions. |
| Optimistic redirects | `src/proxy.ts` | Only checks a session cookie exists. Real checks happen in the services. |

## Decisions

- **Sessions:** database sessions. A random 32-byte token in an httpOnly, `SameSite=Lax`, `Secure` (in production) cookie `rr_session`; only its SHA-256 hash is stored. 30 days, extended on use. Sign-out deletes the row. Rejected: JWTs (can't be revoked).
- **Passwords:** `@node-rs/argon2` (argon2id).
- **Email codes:** 6 digits, stored hashed, 10-minute expiry, 5 attempts, resend cooldown 45 s. Signup keeps the unverified user id in a short-lived httpOnly cookie so the email never appears in a URL.
- **IDs:** prefixed nanoid text ids (`usr_…`, `veh_…`), matching the frontend.
- **Money:** whole naira as integers in the database; multiplied by 100 (kobo) only at the Paystack boundary.
- **Payments (Paystack):** the server initialises a transaction and the browser goes to Paystack's hosted checkout (channels: card, bank transfer, USSD). Paystack redirects back to the lease page, which verifies the reference. The `charge.success` webhook is the source of truth; both paths are idempotent on the reference. The first payment on a lease includes the refundable deposit.
- **Account-name lookup and bank list:** Paystack `GET /bank/resolve` and `GET /bank?currency=NGN` (list cached in Redis for 24 h).
- **Owner payouts:** each collected repayment adds 80 % to the owner's scheduled payout for that month. On the 5th a job creates a Paystack transfer recipient (once per account) and a transfer; `transfer.success` / `transfer.failed` webhooks settle it.
- **Files:** uploads go through `POST /api/uploads` (multipart). Images are re-encoded with `sharp` (strips metadata, caps size). Objects go to S3 (MinIO in development). Public files (vehicle photos) are served from `/files/<key>`; private files (licences, registration, evidence) only to the owner, the other party where relevant, and staff.
- **Email:** `nodemailer` with `handlebars` templates. Mailpit in development, SES SMTP in production.
- **Rate limits:** Redis counters on sign-in, signup, code verify/resend and password reset.
- **Validation:** zod 4 on every input.

## Local services (`docker-compose.yml`)

| Service | Port | Purpose |
|---|---|---|
| Postgres 18 | 5435 | Database `rentaride` (+ `rentaride_test` for tests) |
| Redis 8 | 6383 | BullMQ, rate limits, caches |
| Mailpit | 1026 SMTP, 8026 web | Catches development email |
| MinIO | 9010 API, 9011 console | S3-compatible storage |

Ports avoid the containers other local projects already use (5432, 5434, 6379, 6380, 6382).

## Production (EC2)

`next build` then `next start` and the worker under a process manager (or the same images in Docker), behind nginx with proxy buffering off. Postgres can be RDS; Redis ElastiCache or a container; S3 and SES real.
