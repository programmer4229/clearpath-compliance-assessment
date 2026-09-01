// Route protection — renamed from `middleware.ts` to `proxy.ts` in this
// Next.js version (see node_modules/next/dist/docs/.../file-conventions/
// proxy.md and middleware.md, which documents middleware.js as deprecated
// in favor of this file).
//
// This is the "optimistic" check from Next's authentication guide: it only
// looks at whether the session cookie is present, not whether it's actually
// valid (that requires a DB round trip, which Proxy runs on every request —
// see verifySession() in src/lib/session.ts for the real check). That's
// enough to redirect a logged-out visitor to /login before any page renders.
// It is NOT a substitute for checking auth in the Server Actions/Components
// that actually touch data — see the doc's own warning that a matcher
// change can silently remove Proxy coverage, so每 Server Function should
// verify for itself too — every Server Function should check independently.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSessionCookie && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSessionCookie && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on every page navigation except API routes (which authenticate
  // themselves — see the comment above), Next's own static/image assets,
  // and the generated favicon/icon routes (src/app/{icon,apple-icon}.tsx,
  // src/app/favicon.ico) — those need to load for a signed-out visitor too
  // (e.g. on /login itself), and without this exclusion they'd 307 to
  // /login instead of returning the image.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
};
