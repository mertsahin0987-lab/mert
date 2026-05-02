import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

type OnboardingContextValue = {
  hasCompletedOnboarding: boolean;
  isReady: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

const STORAGE_KEY = 'mysection:onboarding-complete';

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

// Simple persistence: localStorage on web, in-memory on native for now.
// Swap to @react-native-async-storage/async-storage when ready to ship.
function readPersisted(): boolean {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    }
  } catch {}
  return false;
}

function writePersisted(value: boolean) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (value) {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch {}
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setHasCompletedOnboarding(readPersisted());
    setIsReady(true);
  }, []);

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    writePersisted(true);
  };

  const resetOnboarding = () => {
    setHasCompletedOnboarding(false);
    writePersisted(false);
  };

  return (
    <OnboardingContext.Provider
      value={{ hasCompletedOnboarding, isReady, completeOnboarding, resetOnboarding }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
