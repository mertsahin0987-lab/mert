/**
 * Click tracker. Every retailer button on the site is rewritten to point at
 *
 *   /api/click?p=<productId>&r=<retailerId>&u=<encoded-retailer-url>
 *
 * When the user taps it we (a) log the click for the trending counter and
 * (b) 302 them to the affiliate-wrapped retailer URL. The redirect is fast
 * — we log fire-and-forget so the user never waits on Supabase.
 *
 * If logging fails (e.g. the product_clicks table doesn't exist yet),
 * the redirect still happens. Click tracking is best-effort, never a
 * blocker for the actual click-through.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { affiliateUrl } from '@/lib/affiliate';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HT7yIuwX7DUyERoMk0JryQ_hMchkSR1';

// Per-runtime client, anon key. RLS allows inserts.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const productId = sp.get('p');
  const retailerId = sp.get('r');
  const rawUrl = sp.get('u');

  // Bad request — bounce to home rather than 400ing in the user's face
  if (!productId || !retailerId || !rawUrl) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Decode the retailer URL (was encoded by the link generator)
  let url: string;
  try {
    url = decodeURIComponent(rawUrl);
    new URL(url); // validate
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Hash the IP so we can dedupe abusive bots without storing PII. Salt
  // changes daily so the same IP can't be tracked across days.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  const salt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const ipHash = createHash('sha256').update(`${ip}:${salt}`).digest('hex').slice(0, 16);

  // Fire-and-forget log — do not await. If this fails (table missing,
  // network blip), the redirect still happens.
  supabase
    .from('product_clicks')
    .insert({
      product_id: productId,
      retailer_id: retailerId,
      user_agent: request.headers.get('user-agent')?.slice(0, 500),
      ip_hash: ipHash,
    })
    .then(({ error }) => {
      if (error) console.error('[click] log failed', error.message);
    });

  // Wrap with affiliate tag (Amazon clipprr-21, etc.) before redirecting
  const wrapped = affiliateUrl(url);
  return NextResponse.redirect(wrapped, 302);
}
