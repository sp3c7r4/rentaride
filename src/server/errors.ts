import "server-only";
import { logger } from "./logger";

/**
 * An error that is safe to show the user. Anything else is logged and
 * replaced with a generic message, so internals never reach the client.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "bad_request",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "That item") =>
  new AppError(`${what} wasn't found.`, 404, "not_found");
export const forbidden = (message = "You can't do that.") =>
  new AppError(message, 403, "forbidden");
export const unauthorized = () =>
  new AppError("Your session expired. Sign in again.", 401, "unauthorized");

const GENERIC = "Something went wrong. Try again in a moment.";

/** Map any thrown value to a user-safe message, logging unexpected ones. */
export function publicMessage(e: unknown, context: string): string {
  if (e instanceof AppError) return e.message;
  logger.error(context, { error: e });
  return GENERIC;
}
