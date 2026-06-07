-- Editorial news articles scraped from third-party barber blogs.
--
-- Right now the scraper only knows about Barber Beauty Supply UK's Atom
-- feed (https://barberbeautysupply.uk/blogs/blog.atom), but the table is
-- source-agnostic so new feeds can be added without a schema change.
--
-- We deliberately store title + excerpt + image_url + link only, not the
-- full body. That keeps us well clear of any copyright argument — visitors
-- read the headline on Clipprr, click through to read the actual article
-- on the source's site (which earns the source the traffic + ad revenue
-- they'd otherwise lose).

create table if not exists public.news_articles (
  id            bigserial primary key,
  source        text not null,           -- "Barber Beauty Supply UK"
  source_url    text not null,           -- root site, for attribution
  title         text not null,
  excerpt       text,                    -- first paragraph or summary
  image_url     text,                    -- hero image if present
  url           text not null unique,    -- canonical article URL (dedupe key)
  author        text,
  published_at  timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists news_articles_published_idx
  on public.news_articles (published_at desc);

alter table public.news_articles enable row level security;

-- Anon can read articles (they're shown on the public /news page).
-- Writes come from the service role only (the scraper).
create policy "anon can read articles"
  on public.news_articles for select
  to anon
  using (true);
