import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  Currency,
  CURRENCIES,
  DEFAULT_CURRENCY_CODE,
  getCurrency,
} from '@/constants/currencies';

type CurrencyContextValue = {
  currency: Currency;
  currencyCode: string;
  setCurrency: (code: string) => void;
  // Format a price in USD (the canonical storage unit) using the selected
  // currency's symbol, decimals and conversion rate.
  formatPrice: (usdAmount: number) => string;
};

const STORAGE_KEY = 'mysection:currency';

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function readPersisted(): string {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = window.localStorage.getItem(STORAGE_KEY);
      if (val && CURRENCIES.some(c => c.code === val)) return val;
    }
  } catch {}
  return DEFAULT_CURRENCY_CODE;
}

function writePersisted(code: string) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, code);
    }
  } catch {}
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<string>(DEFAULT_CURRENCY_CODE);

  useEffect(() => {
    setCurrencyCode(readPersisted());
  }, []);

  const currency = getCurrency(currencyCode);

  const setCurrency = (code: string) => {
    setCurrencyCode(code);
    writePersisted(code);
  };

  const formatPrice = (usdAmount: number) => {
    const converted = usdAmount * currency.rate;
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    });
    return currency.position === 'before'
      ? `${currency.symbol}${formatted}`
      : `${formatted} ${currency.symbol}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, currencyCode, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
