/**
 * Server Actions for authentication — called from <form action={...}> in
 * the login / signup / logout components.
 *
 * Each action returns either {error: string} for the form to render, or
 * redirects to /account on success.
 */

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase-server';

/**
 * Where to send the user after a successful sign-in. Honours a `next`
 * form field if the caller passed one (e.g. middleware bouncing the user
 * to /login from a protected route), falling back to /account.
 *
 * Strict whitelist: only same-origin paths starting with '/' are allowed,
 * never a full URL or a path beginning with '//' (which browsers treat as
 * a protocol-relative redirect to another origin).
 */
function safeNextPath(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return '/account';
  if (next.startsWith('//')) return '/account';
  return next;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNextPath(formData.get('next'));

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  const supabase = await createServerSupabase();
  const origin = (await headers()).get('origin') ?? 'https://clipprr.co.uk';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase sends a confirmation email — user must verify before /account works
  return { success: 'Check your email — we sent a confirmation link.' };
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
