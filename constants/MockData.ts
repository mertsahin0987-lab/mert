import { ImageSourcePropType } from 'react-native';

// =========================================================================
// Types — shared across the app. Edit freely.
// =========================================================================

export type ColorVariant = {
  name: string;
  hex: string;
  image?: ImageSourcePropType; // thumbnail of the product in this colorway
  productId?: string; // optional link to a related product if it's a separate listing
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image: ImageSourcePropType;
  stores: { name: string; url: string; inStock: boolean; price: number }[];
  trending: boolean;
  isNew: boolean;
  releaseDate?: string;
  upcomingRelease?: boolean;
  description?: string;
  colors?: ColorVariant[];
};

export type Brand = {
  id: string;
  name: string;
  logo: ImageSourcePropType;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  date: string;
  type:
    | 'release'        // new product released
    | 'update'         // generic / app updates / back in stock
    | 'promo'          // generic price drop
    | 'price_drop'     // specific product price drop
    | 'back_in_stock'  // sold-out item available again
    | 'coming_soon'    // upcoming release reminder
    | 'vat_free'       // retailer-wide VAT-free day
    | 'flash_sale';    // retailer-wide flash sale / weekend event
  read: boolean;
  // Retailer-wide events (vat_free, flash_sale) — optional metadata
  retailer?: string;        // e.g. "Salons Direct"
  endsAt?: string;          // ISO datetime — used for countdown
  urgent?: boolean;         // surface at top of feed
  discountLabel?: string;   // e.g. "20% OFF", "VAT FREE", "16.67% OFF"
};

// =========================================================================
// Products & Brands
// --------------------------
// These come from CSVs in the data/ folder. To add/edit products:
//   1. Open data/products.csv (or prices.csv / colors.csv / brands.csv)
//      in Numbers, Excel, or Google Sheets
//   2. Edit / add rows / save as CSV
//   3. Run: npm run sync-data
//   4. Restart the app
// =========================================================================

export { generatedProducts as products, generatedBrands as brands } from './generatedData';

// =========================================================================
// Categories — static, edit in code.
// =========================================================================

export const categories: Category[] = [
  { id: '1', name: 'Clippers', icon: 'scissors' },
  { id: '2', name: 'Trimmers', icon: 'scissors' },
  { id: '3', name: 'Shavers', icon: 'scissors' },
  { id: '4', name: 'Guards', icon: 'th-list' },
  { id: '5', name: 'Blades', icon: 'flash' },
  { id: '6', name: 'Styling', icon: 'magic' },
  { id: '7', name: 'Sprays', icon: 'tint' },
  { id: '8', name: 'Capes & Aprons', icon: 'user' },
  { id: '9', name: 'Brushes', icon: 'paint-brush' },
  { id: '10', name: 'Charging Docks', icon: 'bolt' },
];

// =========================================================================
// Notifications — mock feed for the Alerts tab.
// These will eventually come from your backend / scraper.
// =========================================================================

export const notifications: Notification[] = [
  // === Live retailer-wide events (urgent, time-sensitive) ===
  {
    id: 'vat-1',
    title: 'Salons Direct — VAT-Free Weekend',
    message: 'No VAT on all clippers, trimmers and shears. Save 16.67% on every order until Sunday 11pm.',
    date: '2026-04-23',
    endsAt: '2026-04-26T23:00:00Z',
    type: 'vat_free',
    retailer: 'Salons Direct',
    urgent: true,
    discountLabel: 'VAT FREE',
    read: false,
  },
  {
    id: 'flash-1',
    title: 'Coolblades — 15% Off BaByliss PRO',
    message: 'Flash sale on the entire BaByliss PRO range. Ends midnight tonight.',
    date: '2026-04-23',
    endsAt: '2026-04-23T23:59:00Z',
    type: 'flash_sale',
    retailer: 'Coolblades',
    urgent: true,
    discountLabel: '15% OFF',
    read: false,
  },
  {
    id: 'flash-2',
    title: 'Chris & Sons — Trade Day Tuesday',
    message: '20% off all clippers and trimmers. In-store and online.',
    date: '2026-04-22',
    endsAt: '2026-04-28T23:59:00Z',
    type: 'flash_sale',
    retailer: 'Chris & Sons',
    discountLabel: '20% OFF',
    read: false,
  },

  // === Product-specific alerts ===
  {
    id: '1',
    title: 'New Release: Saber Trimmer',
    message: 'StyleCraft just dropped the all-new Saber Trimmer. Check it out now!',
    date: '2026-04-15',
    type: 'release',
    read: false,
  },
  {
    id: '2',
    title: 'Price Drop Alert',
    message: 'BaByliss Skeleton FX is now available at BarberStock for $139.99',
    date: '2026-04-14',
    type: 'price_drop',
    read: false,
  },
  {
    id: '3',
    title: 'Coming Soon: X-Ergo Trimmer',
    message: 'Gamma+ X-Ergo Trimmer is set to release on May 1st, 2026. Stay tuned!',
    date: '2026-04-12',
    type: 'release',
    read: true,
  },
  {
    id: '4',
    title: 'Back in Stock',
    message: 'The Andis GTX-Z is back in stock at BarberStock.',
    date: '2026-04-10',
    type: 'back_in_stock',
    read: true,
  },
  {
    id: '5',
    title: 'App Update v1.1',
    message: 'We\'ve added new filters and improved search. Update now for the best experience.',
    date: '2026-04-08',
    type: 'update',
    read: true,
  },
  {
    id: '6',
    title: 'Coming Soon: JRL FF2020T',
    message: 'JRL is releasing the FF2020T Trimmer on June 15th. Pre-order info coming soon.',
    date: '2026-04-05',
    type: 'coming_soon',
    read: true,
  },
];
