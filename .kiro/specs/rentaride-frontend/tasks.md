# RentARide frontend: tasks

Status: `[x]` done, `[-]` in progress, `[ ]` not started.
Every task ends with: `tsc`, `biome` on touched files, `next build`, and an
end-to-end browser pass through Chrome DevTools MCP (desktop and 390 px).

## Phase 0: foundation
- [x] 0.1 Domain types, NGN/date formatting, pricing maths (R6, R7, R8)
- [x] 0.2 localStorage mock DB with seed data and demo accounts (R1.6)
- [x] 0.3 Session store and `useSession()`; wire signup, verify, login, onboarding, sign-out to the DB (R1, R2.2)

## Phase 1: app shell and overview
- [x] 1.1 Dashboard layout: sidebar, mobile sheet, user menu, auth guard, KYC badge (R3, R1.3, R1.4)
- [x] 1.2 Driver overview (R4.1, R4.3)
- [x] 1.3 Owner overview (R4.2, R4.3)

### Phase 0 and 1 test notes
- Signed-out `/dashboard` redirects to `/login?next=%2Fdashboard` (R1.3).
- Demo driver and owner sign in; overviews render seeded data with no console errors (R4).
- Account menu opens; sign-out clears the session and returns to `/login` (R1.5).
- Mobile (390 px): top bar, navigation sheet, 2-column stat grid.
- Fixed during testing: page segment dropped while the session loads (instant-navigation insight),
  links rendered as `role=button`, dev indicator covering the account menu.

## Phase 2: marketplace
- [x] 2.1 `/browse` with URL-synced filters and sorting (R5.1, R5.2)
- [x] 2.2 `/vehicles/[id]` detail page (R5.3), with a photo gallery (thumbnails, arrows, keyboard, full-screen)
- [x] 2.3 Lease request panel with deposit and repayment preview, sign-in redirect (R5.4, R6.1)

## Phase 3: requests and leases
- [x] 3.1 Requests page: driver (pending, withdraw) and owner (approve, decline) (R6.2 to R6.4)
- [x] 3.2 Leases list and lease detail with repayment schedule (R7.1)
- [x] 3.3 Mock checkout for repayments and payment history (R7.2, R7.3)

### Phase 2 and 3 test notes
- Browse filters and sort survive reload (URL state); vehicle detail gallery advances by arrow, thumbnail and keyboard.
- New driver (signup, OTP, onboarding) requested the GT-R; owner approved; the lease was created,
  the vehicle marked leased and competing requests auto-declined (R6.3).
- Repayments 1 (bank transfer) and 2 (USSD) paid in order; the success screen stays open after the
  schedule advances; references show in the schedule and on `/dashboard/payments`.
- Fixed during testing: checkout dialog closing on success, deprecated `priority` image prop (Next 16 uses `loading="eager"`).

## Phase 4: owner operations
- [x] 4.1 Vehicles page: add, edit, unlist and relist (R8.1). Uses a dedicated listing dialog
  (more fields than onboarding: fuel, seats, mileage, city, up to 8 photos with a cover) instead of the onboarding dialog.
- [x] 4.2 Payouts page and payout account card (R8.2)

### Phase 4 test notes
- Listed a 2020 Corolla with 3 photos and a PDF registration; validation flagged every missing field first.
  It saved as "Pending review" with derived daily and monthly prices. Promote-to-cover and photo removal work.
- Edited price and photos; unlisted then relisted the Expedition (unlisting declines pending requests).
- Changed the payout account; the account name auto-resolved and the card updated.
- A driver repayment of ₦150,000 added ₦120,000 (80%) to the owner's scheduled payout.
- Fixed during testing: tab strip scrollbar, `next build` failing on `/dashboard/leases/[id]` because
  `usePathname` ran outside Suspense in the shell (moved into a suspended `SessionRedirect`).

## Phase 5: disputes, notifications, settings
- [x] 5.1 Disputes list, new dispute form with evidence upload, dispute thread (R9)
- [x] 5.2 Notifications store, bell with unread count, notifications page (R10)
- [x] 5.3 Settings: profile, password, KYC documents, payout account (R11)

### Phase 5 test notes
- DB v4 migration added the demo dispute to existing browser data.
- Bell (sidebar on desktop, top bar on mobile) shows the unread count; "Mark all read" clears it; opening an item marks it read.
- Opened a dispute from a lease's "Report a problem" link (lease preselected) with a PDF; validation checks every field.
  Replied with a photo; the owner got a notification. Marking resolved closes the thread.
- Settings: invalid phone rejected, profile saved; password mismatch caught; replacing the licence sets KYC to pending.
- Fixed during testing: own avatar initials in the thread.

## Phase 6: public content
- [x] 6.1 About, pricing (with owner earnings calculator), contact (form), help/FAQ (searchable accordion) (R12)
- [x] 6.2 Terms, privacy, cookies (R12). Text is marked as a draft for legal review.
- [x] 6.3 Wire every landing and footer link to a real route; removed Blog and Careers (R12)

### Phase 6 test notes
- Every public route and footer link returns 200. Calculator: ₦60,000/week gives a ₦208,000 monthly payout.
- FAQ search filters and expands matches; `/help#verification` anchors. `/contact?topic=listing` preselects the topic
  and pre-fills name and email for signed-in users.

## Phase 7: reviewer console
- [x] 7.1 `/review` queues for KYC and listings with approve and reject (R13)

### Phase 7 test notes
- Reviewer `review@demo.rentaride.ng` (staff flag, DB v5 migration) lands on `/review`; staff are sent away from
  `/dashboard`, and members are sent away from `/review`.
- Verified one driver, sent another back (short reasons rejected); the note shows in their Settings.
- Sent a listing back, the owner saw the note, uploaded a document and resubmitted; approving it put it live on `/browse`.

## Phase 8: hardening
- [x] 8.1 Loading, error and not-found states for every route (R14.1). Added `error.tsx` boundaries
  (root, dashboard, review) and `global-error.tsx`; pages already had loading skeletons and empty states.
- [x] 8.2 Accessibility pass: keyboard, labels, focus, contrast (R14.2)
- [x] 8.3 Responsive pass 360 to 1920 px (R14.3)
- [x] 8.4 Full end-to-end regression: driver journey and owner journey (R14.5)

### Phase 8 test notes
- Lighthouse accessibility: dashboard 100, owner vehicles 100, vehicle detail 97, home 96, lease 96.
  Fixed: low-contrast greys on the dark hero and footer, footer `h4` heading order, invalid `<dl>` markup
  on the vehicle page and request panel, muted avatar initials. Added a "Skip to content" link in the dashboard.
  The only remaining flag is the decorative footer wordmark (aria-hidden, kept by design).
- Keyboard: tab order runs logo, bell, nav, account menu, then page content, with a visible focus ring on each.
- 360 px: no page scrolls sideways. Payout, payment and repayment tables now fit without inner scrolling
  (secondary columns hidden below `sm`).
- Regression on fresh data: new driver signed up, verified the OTP, onboarded with a licence; reviewer verified
  her; she requested the Mustang; the owner approved (lease created, vehicle leased); she paid ₦100,000 and
  the owner's scheduled payout rose by ₦80,000. No console errors.
