# RentARide

Car-lease marketplace for Nigeria. One Next.js 16 app holds the frontend and
the backend: Route Handlers for reads and webhooks, Server Actions for
mutations, Postgres (Drizzle), Redis with a BullMQ worker, S3 storage,
email over SMTP and Paystack for payments and payouts.

## Run it locally

Needs Node 24 and Docker.

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET (command in the file)
docker compose up -d          # Postgres, Redis, Mailpit, SeaweedFS (S3)
npm run db:migrate
npm run db:seed               # demo accounts, password: rentaride-demo
npm run dev -- -p 3001        # app
npm run worker                # second terminal: emails and scheduled jobs
```

- App: http://localhost:3001
- Email inbox (Mailpit): http://localhost:8026. Verification codes and receipts land here.
- Demo accounts: `driver@demo.rentaride.ng`, `owner@demo.rentaride.ng`, `review@demo.rentaride.ng` (review console).

Without `PAYSTACK_SECRET_KEY`, development simulates payments, payouts and
account-name lookups. Add Paystack **test** keys to `.env` to use the real
checkout; for webhooks locally, expose the app with a tunnel and point the
Paystack test webhook at `https://<tunnel>/api/webhooks/paystack`.

Don't redirect the dev server's output to a file inside the project folder:
the file watcher sees every log write as a change and reloads the page in a loop.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run worker` | BullMQ worker: email queue, daily repayment status (06:00), payouts (09:00 on the 5th), Africa/Lagos |
| `npm run job -- repayments\|payouts` | Run a scheduled job now |
| `npm run db:generate` | New migration from `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (`-- --test` for the test database) |
| `npm run db:seed` / `db:reset` | Load demo data / wipe and reload it |
| `npm test` | vitest (uses `rentaride_test`; run `npm run db:migrate -- --test` once) |

## Layout

- `src/app` — pages, `api/**/route.ts` (reads, uploads, Paystack webhook), `files/[...key]` (access-checked downloads)
- `src/server` — server-only code: `db`, `auth` (sessions, data access layer), `services` (business rules), `actions` (Server Actions), `paystack.ts`, `storage.ts`, `mail`, `queue`
- `src/worker` — the worker process
- `src/lib` — client code; `lib/api/*` calls the server with the same function names the pages use
- `deploy/` — EC2 deployment (Dockerfile at the root, compose, nginx, guide)
