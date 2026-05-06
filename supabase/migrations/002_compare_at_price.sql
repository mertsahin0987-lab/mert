-- Adds compare_at_price for displaying sale strikethrough pricing.
-- If compare_at_price is set AND > base_price, the product shows as "on sale".

ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2);

-- Helpful index for the /sale page that filters on this
CREATE INDEX IF NOT EXISTS idx_products_compare_at_price
  ON products(compare_at_price)
  WHERE compare_at_price IS NOT NULL;
