/**
 * Refreshes the Supabase auth session on every request before it reaches
 * a Server Component. Without this, expired access tokens would cause
 * intermittent 401s.
 *
 * Also acts as the OUTER gate for /admin. Even if a future refactor breaks
 * the in-page auth check, this middleware drops anyone who isn't a signed-in
 * admin at the edge — the admin code never runs for them, no service-role
 * client is ever instantiated, no data leak surface exists.
 *
 * Excludes static assets and image optimisation routes so we don't pay
 * the auth round-trip on every PNG.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

// Mirror of lib/admin.ts so this file can stay edge-runtime compatible
// without pulling in any 'server-only' imports.
const ADMIN_EMAILS = new Set(['mert@clipprr.co.uk']);

// How long since last sign-in is "fresh enough" for the admin dashboard.
// After this, we 404 even valid admins until they re-authenticate. Stops
// a stolen-cookie session from being useful for very long.
const ADMIN_SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 60 minutes

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touch the session — refreshes the access token if it's about to expire
  const { data: { user } } = await supabase.auth.getUser();

  // Outer admin gate: covers /admin and any /api/admin endpoints we add later.
  // We return a stock 404 page rather than 401/403 so the route is
  // indistinguishable from a non-existent page to any unauthorised visitor.
  const path = request.nextUrl.pathname;
  if (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin')) {
    const email = user?.email?.toLowerCase().trim();
    if (!email || !ADMIN_EMAILS.has(email)) {
      return new NextResponse(null, { status: 404 });
    }
    // Session freshness check — last_sign_in_at must be within the window
    const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if (Date.now() - lastSignIn > ADMIN_SESSION_MAX_AGE_MS) {
      // Stale session: bounce to login with a return-to so we land back here.
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      url.searchParams.set('reason', 'session-expired');
      return NextResponse.redirect(url);
    }
    // Cache-bust: prevent any CDN/proxy from caching admin responses
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (svg|png|jpg|jpeg|gif|webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
