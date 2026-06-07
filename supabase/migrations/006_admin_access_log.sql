-- Audit log for every /admin hit, success or denied.
--
-- The point isn't to stop attackers — middleware already does that — but to
-- make any anomaly visible. If the admin email's session ever leaks, the log
-- shows the new IP / user agent the moment it shows up.

create table if not exists public.admin_access_log (
  id          bigserial primary key,
  email       text,                   -- null if unauthenticated
  path        text not null,
  outcome     text not null,          -- 'allowed' | 'denied' | 'stale-session'
  ip_hash     text,
  user_agent  text,
  occurred_at timestamptz not null default now()
);

create index if not exists admin_access_log_recent_idx
  on public.admin_access_log (occurred_at desc);

alter table public.admin_access_log enable row level security;
-- Locked down completely from the anon role. Only the service-role client
-- (used by the /admin page itself) can read or write.
