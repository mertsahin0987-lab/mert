/**
 * Admin allowlist. Anything inside /admin is gated to these email addresses.
 * Anyone else (including signed-in regular users) gets a 404 — the page
 * never reveals it exists.
 *
 * Keep this list tight. Adding an email here gives that account the keys
 * to every signup, click, and bell alert in the system.
 */

const ADMIN_EMAILS = ['mert@clipprr.co.uk'];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Service-role Supabase client. Bypasses RLS, can read auth.users, can do
 * anything. Only ever import this from server-only contexts inside /admin
 * or trusted scrapers — exposing the service key to the client would be a
 * total compromise of the database.
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';

export function adminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
