-- ═════════════════════════════════════════════════════════════════════════════
-- Trading Hub — Supabase schema
-- Run this in the Supabase SQL editor (SQL → New query → paste → Run).
-- ═════════════════════════════════════════════════════════════════════════════
-- This schema is intentionally single-user friendly. If you later add auth,
-- tighten the RLS policies to `auth.uid() = user_id`.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Trading days: one row per calendar day of trading ────────────────────────
create table if not exists public.trading_days (
  date          date primary key,
  instrument    text,
  bias          text,                    -- 'bull' | 'bear' | 'neut'
  daily_context text,
  key_level     text,
  notes         text,
  updated_at    timestamptz not null default now()
);

-- ── Trades: individual executions, PnL tracked as R multiple ─────────────────
create table if not exists public.trades (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  entry_time   text,
  instrument   text,
  direction    text,                     -- 'LONG' | 'SHORT'
  entry_price  numeric,
  stop_price   numeric,
  target_price numeric,
  exit_price   numeric,
  contracts    numeric,
  points       numeric,                  -- points captured (optional, auto if prices present)
  rr           numeric,                  -- realised R multiple (auto if prices present)
  dollar_pnl   numeric,                  -- optional $ result
  outcome      text,                     -- 'win' | 'loss' | 'be'
  model        text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists trades_date_idx on public.trades (date);

-- ── Chart links & screenshots, grouped by year/day ───────────────────────────
create table if not exists public.chart_links (
  id           uuid primary key default gen_random_uuid(),
  date         date,
  year         int not null,
  title        text,
  url          text,                     -- TradingView (or any) link
  kind         text not null default 'link', -- 'link' | 'screenshot'
  storage_path text,                     -- path inside the screenshots bucket
  created_at   timestamptz not null default now()
);
create index if not exists chart_links_year_idx on public.chart_links (year);

-- ── Journal entries: stores the full state (jsonb) of each journaling tool ────
-- type: 'premarket' | 'postmarket' | 'live' | 'ooda' | 'committee' | 'sequence'
create table if not exists public.journal_entries (
  date       date not null,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (date, type)
);

-- ═════════════════════════════════════════════════════════════════════════════
-- Row Level Security — permissive (single user / anon). Tighten if you add auth.
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.trading_days     enable row level security;
alter table public.trades           enable row level security;
alter table public.chart_links      enable row level security;
alter table public.journal_entries  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['trading_days','trades','chart_links','journal_entries']
  loop
    execute format('drop policy if exists "anon_all_%s" on public.%I;', t, t);
    execute format(
      'create policy "anon_all_%s" on public.%I for all using (true) with check (true);',
      t, t);
  end loop;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- Storage bucket for screenshots
-- ═════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

drop policy if exists "anon_screenshots_all" on storage.objects;
create policy "anon_screenshots_all" on storage.objects
  for all using (bucket_id = 'screenshots') with check (bucket_id = 'screenshots');
