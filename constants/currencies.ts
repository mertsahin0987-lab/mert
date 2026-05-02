// Currency data. Rates are approximate conversions from USD.
// In production, fetch these from an exchange-rate API and cache daily.
export type Currency = {
  code: string;
  symbol: string;
  name: string;
  rate: number; // how many units of this currency = 1 USD
  position: 'before' | 'after'; // symbol placement
  decimals: number;
};

export const CURRENCIES: Currency[] = [
  // Major western currencies
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1, position: 'before', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79, position: 'before', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92, position: 'before', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.37, position: 'before', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 1.52, position: 'before', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', rate: 1.66, position: 'before', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rate: 0.88, position: 'before', decimals: 2 },

  // Nordic
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', rate: 10.5, position: 'after', decimals: 2 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', rate: 10.8, position: 'after', decimals: 2 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', rate: 6.85, position: 'after', decimals: 2 },

  // Asia
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 155, position: 'before', decimals: 0 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 7.25, position: 'before', decimals: 2 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', rate: 1380, position: 'before', decimals: 0 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83.5, position: 'before', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rate: 1.35, position: 'before', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', rate: 7.82, position: 'before', decimals: 2 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', rate: 36, position: 'before', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rate: 4.7, position: 'before', decimals: 2 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', rate: 57, position: 'before', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rate: 16100, position: 'before', decimals: 0 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', rate: 25400, position: 'after', decimals: 0 },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', rate: 278, position: 'before', decimals: 0 },

  // Middle East & Africa
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67, position: 'before', decimals: 2 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', rate: 3.75, position: 'before', decimals: 2 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rate: 34.5, position: 'before', decimals: 2 },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', rate: 3.8, position: 'before', decimals: 2 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', rate: 49, position: 'before', decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', rate: 18.8, position: 'before', decimals: 2 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rate: 1600, position: 'before', decimals: 0 },

  // Americas
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', rate: 20, position: 'before', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rate: 5.8, position: 'before', decimals: 2 },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', rate: 990, position: 'before', decimals: 0 },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', rate: 970, position: 'before', decimals: 0 },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', rate: 4000, position: 'before', decimals: 0 },

  // Other European
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', rate: 4, position: 'after', decimals: 2 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', rate: 23, position: 'after', decimals: 2 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', rate: 355, position: 'after', decimals: 0 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', rate: 93, position: 'after', decimals: 2 },
];

export const DEFAULT_CURRENCY_CODE = 'GBP';

export function getCurrency(code: string): Currency {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
}
