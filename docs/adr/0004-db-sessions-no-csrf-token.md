# 0004 — Sessions live in Postgres, and nothing trusts the proxy

**Status:** accepted

## Context

The app is one Next.js process behind nginx on EC2, with a worker beside it.
Sessions must survive a deploy, be revocable on sign-out, and must not be
forgeable from a stolen cookie value.

## Decision

- A session is a row in `sessions`: `id = sha256(token)`, `user_id`,
  `expires_at`, `last_seen_at`, `user_agent`, `ip`. The cookie (`rr_session`)
  carries the raw 32-byte token, `httpOnly`, `SameSite=Lax`, `Secure` in
  production, 30-day sliding expiry refreshed at most once a day.
- A database leak gives no usable token (only its SHA-256).
- Sign-out deletes the row; a password reset can therefore revoke access by
  deleting rows for that user.
- No CSRF token: `SameSite=Lax` keeps the cookie off cross-site form posts, and
  Next.js rejects Server Action requests whose `Origin` doesn't match the host
  (nginx forwards `Host`/`X-Forwarded-Host` for exactly this check). Route
  handlers that mutate (`/api/uploads`) require the session cookie the same way;
  the one unauthenticated POST, the Paystack webhook, is verified by HMAC-SHA512.
- `proxy.ts` may only do an optimistic redirect when the cookie is missing.
  Authorization always happens in the data access layer (`requireUser`,
  `requireMember`, `requireStaff`) inside the action or handler that needs it.

## Consequences

- One extra indexed read per authenticated request; acceptable at this size.
- Scaling horizontally is free (shared Postgres); no sticky sessions.
- Adding a new mutation means adding an explicit `require*` call — the proxy is
  never the guard, so a misconfigured matcher can't grant access.
