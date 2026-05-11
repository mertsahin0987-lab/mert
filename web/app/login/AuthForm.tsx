'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { signIn, signUp } from '@/app/auth/actions';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await (mode === 'login' ? signIn(formData) : signUp(formData));
      if (result && 'error' in result && result.error) {
        setError(result.error);
      }
      if (result && 'success' in result && result.success) {
        setSuccess(result.success);
      }
    });
  }

  const isSignup = mode === 'signup';

  return (
    <form action={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-ink mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-line rounded-md px-4 py-3 text-ink bg-paper focus:outline-none focus:border-ink"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-ink mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          minLength={isSignup ? 8 : undefined}
          className="w-full border border-line rounded-md px-4 py-3 text-ink bg-paper focus:outline-none focus:border-ink"
          placeholder={isSignup ? 'At least 8 characters' : ''}
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
        {isPending ? '...' : isSignup ? 'Create account' : 'Sign in'}
      </button>

      <p className="text-sm text-muted text-center pt-2">
        {isSignup ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-ink underline">Sign in</Link>
          </>
        ) : (
          <>
            New to Clipprr?{' '}
            <Link href="/signup" className="text-ink underline">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
