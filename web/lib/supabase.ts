/**
 * Supabase client for the Clipprr website.
 * Server-side only — uses anon key, public RLS policies allow reads.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
