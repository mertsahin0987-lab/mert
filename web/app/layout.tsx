import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: { default: 'Clipprr — UK Barber Tool Price Comparison', template: '%s · Clipprr' },
  description:
    'Compare prices on professional clippers, trimmers and shavers across every UK retailer. Real-time prices and alerts on Wahl, BaByliss PRO, Andis, JRL, StyleCraft and more.',
  metadataBase: new URL('https://clipprr.co.uk'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://clipprr.co.uk',
    siteName: 'Clipprr',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Inter only — single sans-serif used at every weight, drives the entire visual system */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
