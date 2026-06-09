/**
 * Affiliate link wrapping for the mobile app.
 *
 * Mirror of web/lib/affiliate.ts — retailer URLs are stored clean in Supabase
 * and we append the affiliate tag at open time. Anything that hands a URL to
 * Linking.openURL or WebBrowser.openBrowserAsync should run it through
 * affiliateUrl() first so we don't leak commission.
 */

const AMAZON_TAG = 'clipprr-21';

function isAmazonUk(host: string): boolean {
  return /(^|\.)amazon\.co\.uk$/i.test(host);
}

export function affiliateUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '';

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  if (isAmazonUk(parsed.hostname)) {
    parsed.searchParams.set('tag', AMAZON_TAG);
    // Amazon recommends linkCode=ll1 + language=en_GB for proper attribution
    parsed.searchParams.set('linkCode', 'll1');
    return parsed.toString();
  }

  return parsed.toString();
}
