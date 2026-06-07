/**
 * Supabase client for the Clipprr mobile app.
 *
 * The publishable (anon) key is safe to embed in the app — it only allows
 * the operations permitted by Row-Level Security policies (public SELECT on
 * products / brands / prices, authenticated writes to user_alerts).
 *
 * The secret (service_role) key must NEVER be in the app bundle. Keep it on
 * the server / in scraper scripts only.
 *
 * Auth sessions are persisted via AsyncStorage so a sign-in survives app
 * restarts. autoRefreshToken keeps the access token alive in the background.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // disabled on RN — there's no browser URL
  },
});
