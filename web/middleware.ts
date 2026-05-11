/**
 * Refreshes the Supabase auth session on every request before it reaches
 * a Server Component. Without this, expired access tokens would cause
 * intermittent 401s.
 *
 * Excludes static assets and image optimisation routes so we don't pay
 * the auth round-trip on every PNG.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

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
  await supabase.auth.getUser();
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
