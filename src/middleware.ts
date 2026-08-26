import { NextRequest, NextResponse } from "next/server";
import { verifyRequestOrigin } from "lucia";

/* Routes that require authentication */
const PROTECTED = [
  /^\/events/,
  /^\/admin/,
  /^\/vendor/,
  /^\/dashboard/,
  /^\/settings/,
  /^\/reports/,
];

/* Routes only for unauthenticated users */
const AUTH_ONLY = [/^\/login/, /^\/register/, /^\/forgot-password/, /^\/reset-password/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* CSRF protection for all state-changing API calls */
  if (req.method !== "GET" && pathname.startsWith("/api/")) {
    const originHeader  = req.headers.get("Origin");
    const hostHeader    = req.headers.get("Host");
    if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
      return new NextResponse(null, { status: 403 });
    }
  }

  /* Read session cookie */
  const sessionCookieName = "auth_session";
  const sessionId = req.cookies.get(sessionCookieName)?.value;

  const isProtected = PROTECTED.some(p => p.test(pathname));
  const isAuthOnly  = AUTH_ONLY.some(p => p.test(pathname));

  /* Unauthenticated user hitting a protected route → redirect to login */
  if (isProtected && !sessionId) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  /* Authenticated user hitting login/register → redirect to dashboard */
  if (isAuthOnly && sessionId) {
    const url = req.nextUrl.clone();
    url.pathname = "/events";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/v1/auth|api/v1/rsvp|scan|rsvp|uploads).*)",
  ],
};
