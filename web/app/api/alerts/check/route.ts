/**
 * Daily alert check — finds tracked products whose price has dropped
 * since the user belled them (or since the last notification) and emails
 * the user. Runs via Vercel Cron, configured in vercel.json.
 *
 * Auth: protected by a shared CRON_SECRET so only the cron runner can
 * trigger it. The header `Authorization: Bearer ${CRON_SECRET}` must match.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { affiliateUrl } from '@/lib/affiliate';
import { priceDropEmailHtml, sendEmail } from '@/lib/email';

const SUPABASE_URL = 'https://xgoiabfbetftjomtvcgb.supabase.co';

// Hard timeout — protect against runaway loops
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // 1. Auth check
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const got = request.headers.get('authorization');
  if (got !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Use service role — we need to read across all users and send emails
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }
  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Fetch all alerts joined with products
  const { data: alerts, error: alertsErr } = await sb
    .from('user_alerts')
    .select(`
      id,
      user_id,
      product_id,
      last_seen_price,
      notified_at,
      products ( id, name, brand_id, image_key, base_price )
    `);

  if (alertsErr) {
    return NextResponse.json({ error: alertsErr.message }, { status: 500 });
  }

  let drops = 0;
  let sent = 0;
  let skipped = 0;

  const brandCache: Record<string, string> = {};
  async function brandName(id: string): Promise<string> {
    if (brandCache[id]) return brandCache[id];
    const { data } = await sb.from('brands').select('name').eq('id', id).maybeSingle();
    brandCache[id] = data?.name ?? '';
    return brandCache[id];
  }

  for (const alert of alerts ?? []) {
    const p: any = alert.products;
    if (!p) continue;

    const baseline = alert.last_seen_price != null ? Number(alert.last_seen_price) : null;
    const current = Number(p.base_price);

    // Only notify if price has dropped vs. baseline (or no baseline yet)
    if (baseline != null && current >= baseline) {
      continue;
    }
    drops++;

    // De-dupe — don't email same alert more than once in 24h
    if (alert.notified_at) {
      const hoursAgo = (Date.now() - new Date(alert.notified_at).getTime()) / 36e5;
      if (hoursAgo < 24) {
        skipped++;
        continue;
      }
    }

    // Find which retailer has the cheapest current price (so the email links there)
    const { data: prices } = await sb
      .from('prices')
      .select('retailer_id, price, url, retailers(name)')
      .eq('product_id', p.id)
      .gt('price', 0)
      .order('price', { ascending: true })
      .limit(1);

    const top: any = prices?.[0];
    if (!top) {
      skipped++;
      continue;
    }

    // Get the user's email (auth.admin.getUserById is service-role only)
    const { data: userRes } = await sb.auth.admin.getUserById(alert.user_id);
    const userEmail = userRes?.user?.email;
    if (!userEmail) {
      skipped++;
      continue;
    }

    const brand = await brandName(p.brand_id);
    const slug = String(p.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const result = await sendEmail({
      to: userEmail,
      subject: `🔻 ${brand} ${p.name} just dropped to £${current.toFixed(2)}`,
      html: priceDropEmailHtml({
        productName: p.name,
        brandName: brand,
        imageKey: p.image_key,
        oldPrice: baseline ?? current,
        newPrice: current,
        retailerName: top.retailers?.name ?? top.retailer_id,
        retailerUrl: affiliateUrl(top.url),
        productUrl: `https://clipprr.co.uk/products/${slug}`,
      }),
    });

    if (result.ok) {
      sent++;
      // Mark as notified and update baseline so we only re-notify on FURTHER drops
      await sb
        .from('user_alerts')
        .update({ notified_at: new Date().toISOString(), last_seen_price: current })
        .eq('id', alert.id);
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ checked: alerts?.length ?? 0, drops, sent, skipped });
}
