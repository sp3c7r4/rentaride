import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ApiResult } from "@/lib/types";
import { AppError, publicMessage } from "./errors";

/*
 * Wrappers for Server Actions and Route Handlers. Kept apart from errors.ts so
 * the worker (plain Node) never imports next/navigation.
 */

export { AppError, forbidden, notFound, unauthorized } from "./errors";

/** Run a Server Action body and convert errors to `{ ok: false, error }`. */
export async function action<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<ApiResult<T>> {
  try {
    const data = await fn();
    return (
      data === undefined ? { ok: true } : { ok: true, data }
    ) as ApiResult<T>;
  } catch (e) {
    // Let Next.js handle its own control-flow errors (redirect, dynamic bailout).
    unstable_rethrow(e);
    return { ok: false, error: publicMessage(e, `action:${name}`) };
  }
}

/** Run a Route Handler body and convert errors to JSON responses. */
export async function handle(
  name: string,
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    const status = e instanceof AppError ? e.status : 500;
    return Response.json(
      { error: publicMessage(e, `route:${name}`) },
      { status },
    );
  }
}
