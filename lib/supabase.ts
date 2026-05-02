/**
 * Supabase client for MySection.
 *
 * The publishable (anon) key is safe to embed in the app — it only allows
 * the operations permitted by Row-Level Security policies (public SELECT on
 * products/brands/prices, nothing else).
 *
 * The secret (service_role) key must NEVER be in the app bundle. Keep it on
 * the server / in scraper scripts only.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // App doesn't use Supabase auth yet — disable session persistence to
    // avoid AsyncStorage warnings on React Native.
    persistSession: false,
    autoRefreshToken: false,
  },
});
