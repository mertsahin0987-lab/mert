/**
 * Browser-side Supabase client. Use this in client components ("use client")
 * for things like signing up, logging in, signing out, or subscribing to
 * realtime updates.
 *
 * The session is stored in cookies (set by the SSR helper) so the same
 * login persists across server and client.
 */

import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
