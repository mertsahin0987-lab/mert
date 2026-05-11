/**
 * Server-side Supabase client with session cookies.
 * Use this in Server Components, Server Actions, and Route Handlers
 * whenever you need to know who the logged-in user is.
 *
 * For pure data fetching where authentication doesn't matter (product
 * catalogue, public prices), use `./supabase.ts` instead — it's cached
 * and doesn't need to touch cookies.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — can be ignored here because
          // middleware will refresh the session on the next request.
        }
      },
    },
  });
}
