# 0006 — Tailwind compiles through PostCSS, not a Turbopack rule

**Status:** accepted (fixes an infinite dev reload)

## Context

The project had no `postcss.config.mjs`; Tailwind was wired in through
`next.config.ts`:

```ts
turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } }
```

With that rule, every request made Turbopack restart the CSS chunk build. The
HMR client received `{"type":"reloadPage","data":"HMR hash mismatch"}` and
reloaded the page, which requested the route again: an endless restart, request
and compile loop that read like an auth redirect loop in the logs and eventually
took the dev server down.

## Decision

Use the setup the Next.js docs describe for Tailwind v4:

- `postcss.config.mjs` with `@tailwindcss/postcss`;
- `@tailwindcss/postcss` as a dev dependency;
- no `turbopack.rules` entry — Turbopack runs PostCSS natively.

`@tailwindcss/turbopack` is removed from the dependency tree.

## Consequences

- Dev HMR is stable again (verified: zero extra requests with a browser open).
- One dependency swap; CSS output is equivalent (`@import "tailwindcss"`,
  `tw-animate-css` and `shadcn/tailwind.css` all still resolve).
- If a future Next version genuinely needs a Turbopack CSS loader, re-test the
  reload behaviour before switching back — this ADR is the reason to be wary.
