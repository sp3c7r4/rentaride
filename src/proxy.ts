import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic redirect for private pages: no session cookie, go to sign-in.
 * This is only a fast path. Authorization happens in the data access layer
 * (`src/server/auth/dal.ts`) inside every Route Handler and Server Action.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("rr_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/review/:path*", "/review"],
};
