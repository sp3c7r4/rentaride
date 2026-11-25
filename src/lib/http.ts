/**
 * Browser helpers for talking to the RentARide API.
 * Reads go through Route Handlers (`apiGet`); writes are Server Actions,
 * after which callers `invalidate()` so open queries refetch.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Params = Record<string, string | number | boolean | null | undefined>;

export async function apiGet<T>(path: string, params?: Params): Promise<T> {
  const url = new URL(path, window.location.origin);
  for (const [k, v] of Object.entries(params ?? {}))
    if (v !== undefined && v !== null && v !== "")
      url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok)
    throw new ApiError(body?.error ?? "Something went wrong.", res.status);
  return body as T;
}

// ── Invalidation ────────────────────────────────────────────────────────────

const listeners = new Set<() => void>();
const channel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("rentaride:invalidate")
    : null;
channel?.addEventListener("message", () => {
  for (const l of listeners) l();
});

/** Tell every open query (in this tab and others) to refetch. */
export function invalidate() {
  for (const l of listeners) l();
  channel?.postMessage(Date.now());
}

export function subscribeInvalidate(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Run a Server Action result through invalidation when it succeeded. */
export async function mutate<R extends { ok: boolean }>(
  run: Promise<R>,
): Promise<R> {
  const res = await run;
  if (res.ok) invalidate();
  return res;
}
