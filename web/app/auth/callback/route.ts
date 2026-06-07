/**
 * Email confirmation handler. When a user clicks the confirm link in their
 * email, Supabase redirects them here with a `code` query param. We exchange
 * the code for a session, then send them to /account.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Same `next` whitelist as the form action — must be a same-origin path
  const rawNext = searchParams.get('next');
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/account';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Bad / expired code — send them back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
