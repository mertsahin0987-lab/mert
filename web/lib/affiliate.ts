/**
 * Affiliate link wrapping.
 *
 * Retailer URLs are stored clean in the database (no tracking params). This
 * module appends the right affiliate parameters at render time so we can
 * change tags later without rewriting every row in the database.
 *
 * Current programmes:
 *   - Amazon Associates UK — tag=clipprr-21
 *   - Awin (Salons Direct etc.) — pending approval, will use awinmid/awinaffid
 *   - Skimlinks — wraps client-side, no URL change needed
 *   - Direct retailer programmes — no tag, plain URLs for now
 */

const AMAZON_TAG = 'clipprr-21';

function isAmazonUk(url: URL): boolean {
  return /(^|\.)amazon\.co\.uk$/i.test(url.hostname);
}

/**
 * Returns the URL with affiliate parameters added, or the original URL
 * untouched if no programme applies (or the URL is invalid).
 */
export function affiliateUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '#';

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  if (isAmazonUk(parsed)) {
    parsed.searchParams.set('tag', AMAZON_TAG);
    // Amazon recommends `linkCode=ll1` and `language=en_GB` for proper attribution
    parsed.searchParams.set('linkCode', 'll1');
    return parsed.toString();
  }

  // No programme matched — return as-is
  return parsed.toString();
}
