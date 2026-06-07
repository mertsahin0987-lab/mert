/**
 * Sign-in screen. Email magic-link only for now — the user types an
 * email, we send them a one-time code by email, they enter the code to
 * complete sign-in. No password to remember, no Google OAuth setup
 * needed before TestFlight.
 *
 * Two-step UI: ask for email → ask for the 6-digit code we sent.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      Alert.alert('Email required', 'Enter a valid email address to continue.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      Alert.alert('Could not send code', error.message);
      return;
    }
    setStep('code');
  }

  async function verifyCode() {
    const trimmed = code.trim();
    if (trimmed.length < 6) {
      Alert.alert('Code required', 'Paste the 6-digit code from the email we sent.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: trimmed,
      type: 'email',
    });
    setBusy(false);
    if (error) {
      Alert.alert('Sign-in failed', error.message);
      return;
    }
    // Success — pop back to whatever screen sent us here
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.inner}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
          <Feather name="x" size={24} color={colors.text} />
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>
          {step === 'email' ? 'Sign in to Clipprr' : 'Enter the 6-digit code'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === 'email'
            ? 'No password. We email you a one-time code.'
            : `We sent a code to ${email.trim().toLowerCase()}. Paste it below.`}
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="send"
              onSubmitEditing={requestCode}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            />
            <Pressable
              onPress={requestCode}
              disabled={busy}
              style={[
                styles.cta,
                { backgroundColor: colors.text, opacity: busy ? 0.5 : 1 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.ctaText, { color: colors.background }]}>
                  Send me a code
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={verifyCode}
              style={[
                styles.input,
                styles.codeInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            />
            <Pressable
              onPress={verifyCode}
              disabled={busy}
              style={[
                styles.cta,
                { backgroundColor: colors.text, opacity: busy ? 0.5 : 1 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.ctaText, { color: colors.background }]}>
                  Verify and sign in
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setStep('email')} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>
                ← Use a different email
              </Text>
            </Pressable>
          </>
        )}

        <Text style={[styles.disclaimer, { color: colors.placeholder }]}>
          By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  closeBtn: { position: 'absolute', top: 60, right: 20, padding: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 28 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  codeInput: { fontSize: 22, letterSpacing: 8, textAlign: 'center' },
  cta: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontSize: 15, fontWeight: '700' },
  backLink: { alignItems: 'center', paddingVertical: 14 },
  backLinkText: { fontSize: 14 },
  disclaimer: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 'auto' },
});
