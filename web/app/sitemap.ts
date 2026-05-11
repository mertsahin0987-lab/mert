/**
 * Auto-generated sitemap. Next.js serves this at /sitemap.xml.
 * Includes:
 *   - All static pages (home, products, sale, search, legal pages)
 *   - Every product detail page (/products/{slug})
 *   - Every brand page (/brands/{slug})
 *   - Every category page (/categories/{slug})
 *
 * Google fetches this on a schedule and uses it to know which URLs exist
 * and which have recently updated.
 */

import type { MetadataRoute } from 'next';
import { getAllProducts, getBrands } from '@/lib/data';

const SITE = 'https://clipprr.co.uk';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands] = await Promise.all([getAllProducts(), getBrands()]);
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/sale`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = ['clippers', 'trimmers', 'shavers'].map(
    (slug) => ({
      url: `${SITE}/categories/${slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    })
  );

  const brandPages: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${SITE}/brands/${b.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE}/products/${p.slug}`,
    lastModified: now,
    changeFrequency: 'daily', // prices change frequently
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...brandPages, ...productPages];
}
