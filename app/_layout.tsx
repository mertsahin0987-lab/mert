import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/components/AuthContext';
import { FavouritesProvider } from '@/components/FavouritesContext';
import { ThemeProvider } from '@/components/ThemeContext';
import { OnboardingProvider, useOnboarding } from '@/components/OnboardingContext';
import { CurrencyProvider } from '@/components/CurrencyContext';
import { AlertSettingsProvider } from '@/components/AlertSettingsContext';
import { DataProvider } from '@/lib/DataContext';
import { initSentry } from '@/lib/sentry';

// Initialise crash reporting before anything else runs.
initSentry();

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AlertSettingsProvider>
          <OnboardingProvider>
            <AuthProvider>
              <FavouritesProvider>
                <DataProvider>
                  <RootLayoutNav />
                </DataProvider>
              </FavouritesProvider>
            </AuthProvider>
          </OnboardingProvider>
        </AlertSettingsProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { hasCompletedOnboarding, isReady } = useOnboarding();

  // Onboarding is native-only — skip it entirely on web.
  useEffect(() => {
    if (!isReady || Platform.OS === 'web') return;
    const onOnboarding = segments[0] === 'onboarding';
    if (!hasCompletedOnboarding && !onOnboarding) {
      router.replace('/onboarding');
    } else if (hasCompletedOnboarding && onOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isReady, hasCompletedOnboarding, segments, router]);

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="brand/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="currency" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="alert-settings" options={{ headerShown: false }} />
        <Stack.Screen
          name="sign-in"
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack>
    </NavThemeProvider>
  );
}
