/**
 * App-wide auth state. Hydrates from AsyncStorage on mount, then keeps
 * itself fresh by subscribing to Supabase's onAuthStateChange events.
 *
 * Components grab the current user with `useAuth()`. Sign-in / sign-up /
 * sign-out actions also live here so screens don't have to import the
 * supabase client directly for auth flows.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Send a magic-link email. Returns null on success, or an error message. */
  signInWithEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signInWithEmail: async () => 'not initialised',
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Hydrate the current session from AsyncStorage on mount.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // 2) Subscribe to changes — sign-in via magic link, token refresh,
    //    sign-out from elsewhere all fire here so the UI stays in sync.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return 'Email is required';
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        // Email magic-link returns the user to the app via this scheme.
        // Configured in app.json under `expo.scheme`.
        emailRedirectTo: 'clipprr://auth/callback',
      },
    });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signInWithEmail,
      signOut,
    }),
    [session, loading, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
