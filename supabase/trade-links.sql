-- ═════════════════════════════════════════════════════════════════════════════
-- Trading Hub — attach chart_links to a specific trade (run once)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.chart_links add column if not exists trade_id uuid;
create index if not exists chart_links_trade_idx on public.chart_links (trade_id);
