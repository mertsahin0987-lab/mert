import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type AlertSettings = {
  // Alert types
  priceDrops: boolean;
  newReleases: boolean;
  backInStock: boolean;
  comingSoon: boolean;
  weeklyDigest: boolean;
  // Retailer-wide events
  vatFreeDays: boolean;
  flashSales: boolean;
  // Delivery channels
  pushEnabled: boolean;
  emailEnabled: boolean;
  // Quiet hours (24h format, "HH:MM")
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const DEFAULT_SETTINGS: AlertSettings = {
  priceDrops: true,
  newReleases: true,
  backInStock: true,
  comingSoon: true,
  weeklyDigest: false,
  vatFreeDays: true,   // ON by default — too valuable to miss
  flashSales: true,    // ON by default — these are rare and time-sensitive
  pushEnabled: true,
  emailEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

type AlertSettingsContextValue = {
  settings: AlertSettings;
  setSetting: <K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) => void;
  resetToDefaults: () => void;
};

const STORAGE_KEY = 'mysection:alert-settings';

const AlertSettingsContext = createContext<AlertSettingsContextValue | undefined>(undefined);

function readPersisted(): AlertSettings {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function writePersisted(settings: AlertSettings) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {}
}

export function AlertSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readPersisted());
  }, []);

  const setSetting = <K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      writePersisted(next);
      return next;
    });
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    writePersisted(DEFAULT_SETTINGS);
  };

  return (
    <AlertSettingsContext.Provider value={{ settings, setSetting, resetToDefaults }}>
      {children}
    </AlertSettingsContext.Provider>
  );
}

export function useAlertSettings() {
  const ctx = useContext(AlertSettingsContext);
  if (!ctx) throw new Error('useAlertSettings must be used inside AlertSettingsProvider');
  return ctx;
}
