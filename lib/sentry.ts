/**
 * Sentry — error tracking for the app.
 *
 * Setup:
 *   1. Create account at https://sentry.io  (free tier: 5k errors/mo)
 *   2. Create a new React Native project — copy the DSN it gives you
 *   3. Paste the DSN into SENTRY_DSN below (or as an env var)
 *
 * Once configured, every uncaught error in the app gets reported with
 * stack trace, breadcrumbs, device info, and the user's actions leading
 * up to the crash. Without this, you have no idea when users hit bugs.
 */

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = '';  // ← paste your DSN here once you have it

export function initSentry() {
  if (!SENTRY_DSN) {
    if (__DEV__) console.log('[Sentry] No DSN configured — skipping init');
    return;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    // Send 10% of normal traces in production; 100% in dev.
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Don't spam Sentry while developing locally.
    enabled: !__DEV__,
    // Strip sensitive data before sending — supabase URLs, auth tokens, etc.
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
}

export { Sentry };
