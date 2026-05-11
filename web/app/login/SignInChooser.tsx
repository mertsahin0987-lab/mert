'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { signIn, signUp } from '@/app/auth/actions';
import { createBrowserSupabase } from '@/lib/supabase-browser';

type Mode = 'choose' | 'email-signup' | 'email-login';

export function SignInChooser({ defaultMode = 'choose' }: { defaultMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleOAuth(provider: 'google' | 'facebook' | 'apple') {
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  function handleEmailSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const isSignup = mode === 'email-signup';
      const result = await (isSignup ? signUp(formData) : signIn(formData));
      if (result && 'error' in result && result.error) setError(result.error);
      if (result && 'success' in result && result.success) setSuccess(result.success);
    });
  }

  const isEmailForm = mode === 'email-signup' || mode === 'email-login';

  return (
    <div className="bg-paper border border-line rounded-xl shadow-sm p-8 md:p-10">
      <h1 className="text-xl md:text-2xl font-bold text-ink text-center mb-3">
        {isEmailForm
          ? mode === 'email-signup'
            ? 'Create your account'
            : 'Sign in to your account'
          : 'Sign in to access your Clipprr profile'}
      </h1>
      <p className="text-sm text-muted text-center mb-8 leading-relaxed max-w-sm mx-auto">
        Be notified when prices drop on your favourite tools, get restock alerts, and save your most-used clippers.
      </p>

      {mode === 'choose' && (
        <>
          {/* Social options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="flex items-center justify-center gap-2 border border-line rounded-md px-4 py-3 text-sm font-semibold text-ink bg-paper hover:bg-cream transition-colors"
            >
              <GoogleIcon />
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('facebook')}
              className="flex items-center justify-center gap-2 border border-line rounded-md px-4 py-3 text-sm font-semibold text-ink bg-paper hover:bg-cream transition-colors"
            >
              <FacebookIcon />
              Facebook
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              className="flex items-center justify-center gap-2 border border-line rounded-md px-4 py-3 text-sm font-semibold text-ink bg-paper hover:bg-cream transition-colors"
            >
              <AppleIcon />
              Apple
            </button>
          </div>

          {/* Email options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={() => { setMode('email-signup'); setError(null); setSuccess(null); }}
              className="flex items-center justify-center gap-2 bg-ink text-paper font-semibold py-3 rounded-md hover:bg-ink/90 transition-colors"
            >
              <MailIcon />
              Sign up with email
            </button>
            <button
              type="button"
              onClick={() => { setMode('email-login'); setError(null); setSuccess(null); }}
              className="flex items-center justify-center gap-2 border border-ink text-ink font-semibold py-3 rounded-md hover:bg-cream transition-colors"
            >
              <MailIcon />
              Log in with email
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md px-4 py-3">
              {error}
            </div>
          )}
        </>
      )}

      {isEmailForm && (
        <form action={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-dim mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              className="w-full border border-line rounded-md px-4 py-3 text-ink bg-paper focus:outline-none focus:border-ink"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-dim mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={mode === 'email-signup' ? 'new-password' : 'current-password'}
              minLength={mode === 'email-signup' ? 8 : undefined}
              className="w-full border border-line rounded-md px-4 py-3 text-ink bg-paper focus:outline-none focus:border-ink"
              placeholder={mode === 'email-signup' ? 'At least 8 characters' : ''}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-md px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-md px-4 py-3">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-ink text-paper font-semibold py-3 rounded-md hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {isPending ? '...' : mode === 'email-signup' ? 'Create account' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => { setMode('choose'); setError(null); setSuccess(null); }}
            className="w-full text-sm text-muted hover:text-ink underline pt-1"
          >
            ← Back to all sign-in options
          </button>
        </form>
      )}

      <p className="text-[11px] text-dim text-center mt-6 leading-relaxed">
        By continuing you agree to our{' '}
        <Link href="/terms" className="underline hover:text-ink">Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-10 5L2 7"/>
    </svg>
  );
}
