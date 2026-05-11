/**
 * Server actions for the alerts (bell) feature.
 *
 * toggleAlert — flips a bell on/off for a (user, product). Called from
 * BellButton when a signed-in user clicks. RLS ensures users can only
 * touch their own rows even though the action uses a server client.
 *
 * removeAlert — explicit "stop tracking" from /account/alerts.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';

export async function toggleAlert(productId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Not signed in — bounce to login, send them back to the same page after
    redirect('/login');
  }

  // Is there already a bell for this (user, product)?
  const { data: existing } = await supabase
    .from('user_alerts')
    .select('id, last_seen_price')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    // Already tracked — remove it (toggle off)
    await supabase.from('user_alerts').delete().eq('id', existing.id);
    revalidatePath('/account/alerts');
    return { tracking: false };
  }

  // Get the current cheapest price so we have a baseline to detect drops later
  const { data: product } = await supabase
    .from('products')
    .select('base_price')
    .eq('id', productId)
    .single();

  const { error } = await supabase.from('user_alerts').insert({
    user_id: user.id,
    product_id: productId,
    last_seen_price: product?.base_price ?? null,
  });

  if (error) {
    return { tracking: false, error: error.message };
  }

  revalidatePath('/account/alerts');
  return { tracking: true };
}

export async function removeAlert(alertId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('user_alerts').delete().eq('id', alertId).eq('user_id', user.id);
  revalidatePath('/account/alerts');
}
