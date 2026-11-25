# RentARide frontend: design

## Stack and conventions

- Next.js 16 App Router with `cacheComponents: true`, React 19, Tailwind v4.
- shadcn/ui (base-ui primitives, `base-maia` style), Hugeicons, GSAP for motion.
- Follow `.agents/skills/shadcn/SKILL.md`: use shadcn components first, `FieldGroup`/`Field` for forms, semantic tokens, `gap-*` not `space-*`.

## Mock backend

Pages never touch storage directly. They call async functions in `src/lib/api/*`
that mimic HTTP latency and return `ApiResult<T>`.

```
src/lib/types.ts          domain types (User, Vehicle, LeaseRequest, Lease, Repayment, Payout, Dispute, Notification)
src/lib/mock/db.ts        localStorage-backed store, versioned key, seeded on first run
src/lib/mock/seed.ts      demo users, vehicles, leases
src/lib/session.ts        current session + useSession() (useSyncExternalStore)
src/lib/api/*.ts          auth, vehicles, requests, leases, payments, payouts, disputes, notifications
src/lib/format.ts         NGN currency, dates, relative time
src/lib/pricing.ts        deposit and schedule maths
```

Swapping to a real backend means replacing the bodies of `src/lib/api/*` with
`fetch` calls and moving the session to an httpOnly cookie read in `proxy.ts`.

The mock store keeps no passwords. Sign-in accepts any password for an existing
email and says so in a dev-only hint.

## Routing

```
/                         landing (shipped)
/browse                   public vehicle search          R5
/vehicles/[id]            public vehicle detail          R5
/login /signup ...        auth (shipped)
/onboarding               onboarding (shipped)
/dashboard                role-aware overview            R4
/dashboard/vehicles       owner vehicles                 R8
/dashboard/requests       lease requests (both roles)    R6
/dashboard/leases         leases (both roles)            R7
/dashboard/leases/[id]    lease detail + repayments      R7
/dashboard/payments       driver payment history         R7
/dashboard/payouts        owner payouts                  R8
/dashboard/disputes       disputes (both roles)          R9
/dashboard/notifications  notifications                  R10
/dashboard/settings       profile, security, payout      R11
/about /pricing /contact /help /terms /privacy /cookies  R12
/review                   reviewer console               R13
```

The dashboard uses one route tree with role-aware pages instead of duplicate
`/driver` and `/owner` trees. Navigation items are filtered by role.

## Auth guard

`src/app/dashboard/layout.tsx` renders a client `AppShell` that reads the
session. With no session it redirects to `/login?next=…`. With an unfinished
onboarding it redirects to `/onboarding`. Pages render a skeleton until the
session is known, so nothing flashes.

## Domain rules

- Schedules: daily, weekly, monthly. Each vehicle stores a price per schedule (NGN).
- Terms: 3, 6 or 12 months.
- Deposit: two weeks of the weekly price, held by the platform.
- Owner payout: 80% of repayments collected in a calendar month, paid on the 5th.
- Statuses:
  - Vehicle: `pending_review`, `live`, `leased`, `unlisted`, `rejected`.
  - Request: `pending`, `approved`, `declined`, `withdrawn`.
  - Lease: `active`, `completed`, `terminated`.
  - Repayment: `upcoming`, `due`, `paid`, `overdue`.
  - Dispute: `open`, `in_review`, `resolved`.

## Testing

Each task ends with an end-to-end pass through Chrome DevTools MCP:
navigate, fill, click, read the accessibility snapshot, check console errors and
take a screenshot at 1440 px and 390 px. Results are written in the task notes.
