# RentARide frontend: requirements

Goal: a complete, clickable, end-to-end frontend for RentARide that runs with no
backend. All data comes from a mock API layer that can later be swapped for real
HTTP calls without changing pages or components.

## Roles

- **Driver**: leases a verified vehicle and repays daily, weekly or monthly.
- **Owner**: lists vehicles, approves lease requests, receives monthly payouts.
- **Reviewer** (platform staff): approves KYC and vehicle listings. Phase 7.

## Requirements

Each requirement uses EARS-style acceptance criteria.

### R1. Accounts and session
1. WHEN a visitor signs up and verifies their email, THE SYSTEM SHALL create a user and sign them in.
2. WHEN a user signs in with an existing email, THE SYSTEM SHALL start a session and route them to `/dashboard`.
3. WHEN a signed-out visitor opens any `/dashboard` route, THE SYSTEM SHALL redirect to `/login?next=<path>`.
4. WHEN a signed-in user has not finished onboarding, THE SYSTEM SHALL route them to `/onboarding`.
5. WHEN a user signs out, THE SYSTEM SHALL clear the session and return to `/login`.
6. THE SYSTEM SHALL provide demo accounts for a driver and an owner.

### R2. Onboarding (shipped)
1. Role choice, basic details, licence (driver), vehicle (owner, optional), payout account (owner).
2. WHEN onboarding finishes, THE SYSTEM SHALL persist the profile, licence, vehicles and payout account, and route to `/dashboard`.

### R3. App shell
1. THE SYSTEM SHALL show a sidebar with role-specific navigation, the user's name and a sign-out action.
2. ON screens narrower than `md`, THE SYSTEM SHALL collapse the sidebar into a sheet opened from a top bar.
3. THE SYSTEM SHALL show the KYC status (pending, verified, action needed) in the shell.

### R4. Dashboard overview
1. Driver: active lease summary, next repayment (amount and due date), outstanding balance, recent activity.
2. Owner: monthly earnings, next payout, vehicles by status, pending lease requests, recent activity.
3. WHEN the user has no data yet, THE SYSTEM SHALL show an empty state with the next action.

### R5. Browse and vehicle detail (public)
1. `/browse` SHALL list live vehicles with filters for type, city and schedule, plus sorting by price.
2. Filters SHALL be reflected in the URL query so results can be shared.
3. `/vehicles/[id]` SHALL show photos, specs, pricing per schedule, owner rating and a request-lease panel.
4. WHEN a signed-out visitor requests a lease, THE SYSTEM SHALL send them to sign in and return them afterwards.

### R6. Lease requests
1. A driver SHALL request a lease by choosing schedule, term (3, 6 or 12 months) and start date, and SHALL see the deposit and repayment amount before submitting.
2. An owner SHALL see incoming requests and approve or decline them, with an optional decline reason.
3. WHEN an owner approves, THE SYSTEM SHALL create an active lease with a generated repayment schedule and mark the vehicle as leased.
4. A driver SHALL be able to withdraw a pending request.

### R7. Driver leases and repayments
1. A driver SHALL see their lease, vehicle, repayment schedule and progress.
2. A driver SHALL pay the next repayment (mock checkout) and see it marked paid.
3. A driver SHALL see their full payment history.

### R8. Owner vehicles and payouts
1. An owner SHALL add, edit and unlist vehicles. New vehicles start as "Pending review".
2. An owner SHALL see payouts (scheduled and paid) and the payout account on file.

### R9. Disputes and support
1. Drivers and owners SHALL open a dispute on a lease with a category, description and evidence files.
2. Users SHALL see dispute status and the message thread.

### R10. Notifications
1. THE SYSTEM SHALL record notifications for key events (request received, approved, payment due, payout sent).
2. The shell SHALL show an unread count and a notifications list.

### R11. Settings
1. Users SHALL edit profile details, change password and see their KYC documents.
2. Owners SHALL change their payout account (with account-name resolution).

### R12. Public content pages
About, pricing, contact, help/FAQ, terms, privacy and cookies SHALL exist so no landing or footer link 404s.

### R13. Reviewer console (Phase 7)
1. A reviewer SHALL see queues for KYC and vehicle listings and approve or reject with a reason.

### R14. Quality bar (all phases)
1. Every route SHALL have loading, empty and error states.
2. Every interactive control SHALL be keyboard accessible and labelled.
3. Layouts SHALL work from 360 px to 1920 px wide.
4. `tsc`, `biome` (on touched files) and `next build` SHALL pass at the end of every task.
5. Each task SHALL be verified end to end in a real browser through the Chrome DevTools MCP server.
