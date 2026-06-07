-- Click tracking. Every time a user taps "Visit retailer" on a product page
-- we log a row here before redirecting them to the affiliate URL. The
-- aggregated counts power the Trending section on the home page.
--
-- IP is hashed at write-time so we can dedupe abusive bots without storing
-- PII. user_agent is kept verbatim for spam-detection (e.g. requests with
-- no UA, or obvious crawlers, can be filtered out of the trending count).

create table if not exists public.product_clicks (
  id          bigserial primary key,
  product_id  text references public.products(id) on delete cascade,
  retailer_id text references public.retailers(id) on delete set null,
  clicked_at  timestamptz not null default now(),
  user_agent  text,
  ip_hash     text
);

-- Recency-first index — every trending query is "rows where clicked_at >
-- now() - interval '7 days'", and Postgres can answer that straight from
-- this index without touching the heap.
create index if not exists product_clicks_recent_idx
  on public.product_clicks (clicked_at desc);

-- For per-product breakdowns (e.g. "which retailer do users prefer for
-- the Magic Clip?") — composite keeps both lookups in the same B-tree.
create index if not exists product_clicks_product_idx
  on public.product_clicks (product_id, clicked_at desc);

-- The clicks table is write-mostly from the public anon key (the click
-- endpoint runs without auth). Block reads from anon so click data can't
-- be exfiltrated, and allow inserts via the service role only.
alter table public.product_clicks enable row level security;

create policy "anon may insert clicks"
  on public.product_clicks for insert
  to anon
  with check (true);
