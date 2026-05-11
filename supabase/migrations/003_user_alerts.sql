-- user_alerts: lets a signed-in user "bell" a product so they get notified
-- when its price drops or it comes back in stock.
--
-- One row per (user, product). We use ON CONFLICT to make "toggle bell"
-- a single roundtrip from the client.
--
-- target_price is optional — if NULL the user wants any price change;
-- if set, they only want a notification when the cheapest price drops below it.

CREATE TABLE IF NOT EXISTS user_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price  NUMERIC(10,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_price NUMERIC(10,2),    -- snapshot at creation, used to detect drops later
  notified_at   TIMESTAMPTZ,        -- last time we sent a notification for this alert

  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_product ON user_alerts(product_id);

-- Row-Level Security: users can only see and modify their own alerts.
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own alerts" ON user_alerts;
CREATE POLICY "Users can read their own alerts"
  ON user_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own alerts" ON user_alerts;
CREATE POLICY "Users can insert their own alerts"
  ON user_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own alerts" ON user_alerts;
CREATE POLICY "Users can delete their own alerts"
  ON user_alerts FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own alerts" ON user_alerts;
CREATE POLICY "Users can update their own alerts"
  ON user_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
