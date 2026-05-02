-- Scraper bookkeeping columns on the `prices` table.
-- Safe to run multiple times — uses IF NOT EXISTS.

ALTER TABLE prices ADD COLUMN IF NOT EXISTS last_seen_at    TIMESTAMPTZ;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS last_error      TEXT;

-- Helpful indexes for monitoring (which prices are stale? which broke?)
CREATE INDEX IF NOT EXISTS idx_prices_last_seen_at ON prices(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_prices_last_error   ON prices(last_error) WHERE last_error IS NOT NULL;
