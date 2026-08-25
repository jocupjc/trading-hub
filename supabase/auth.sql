-- ═════════════════════════════════════════════════════════════════════════════
-- Trading Hub — Auth migration (run AFTER schema.sql)
-- Adds per-user ownership + tightens Row Level Security so each account only
-- sees its own data. Run once in the Supabase SQL editor.
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. Add an owner column to every table, auto-filled with the caller's user id.
alter table public.trading_days    add column if not exists user_id uuid default auth.uid();
alter table public.trades          add column if not exists user_id uuid default auth.uid();
alter table public.chart_links     add column if not exists user_id uuid default auth.uid();
alter table public.journal_entries add column if not exists user_id uuid default auth.uid();

-- 2. Replace the permissive policies with owner-only policies.
do $$
declare t text;
begin
  foreach t in array array['trading_days','trades','chart_links','journal_entries']
  loop
    execute format('drop policy if exists "anon_all_%s" on public.%I;', t, t);
    execute format('drop policy if exists "own_%s" on public.%I;', t, t);
    execute format(
      'create policy "own_%s" on public.%I for all
         using (user_id = auth.uid())
         with check (user_id = auth.uid());', t, t);
  end loop;
end $$;

-- 3. Storage: restrict writes to each user''s own folder (screenshots/<uid>/...).
--    The bucket stays public-read so <img> tags work without signed URLs;
--    only the owner can upload / list / delete their objects.
drop policy if exists "anon_screenshots_all" on storage.objects;
drop policy if exists "own_screens_select"   on storage.objects;
drop policy if exists "own_screens_insert"   on storage.objects;
drop policy if exists "own_screens_update"   on storage.objects;
drop policy if exists "own_screens_delete"   on storage.objects;

create policy "own_screens_select" on storage.objects for select
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own_screens_insert" on storage.objects for insert
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own_screens_update" on storage.objects for update
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own_screens_delete" on storage.objects for delete
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL: if you already created rows before enabling auth, claim them for
-- your account. Replace the email, then uncomment and run once while logged in
-- to that user is not required — this uses the user id from auth.users directly.
-- ─────────────────────────────────────────────────────────────────────────────
-- do $$
-- declare uid uuid;
-- begin
--   select id into uid from auth.users where email = 'YOU@EXAMPLE.COM' limit 1;
--   update public.trading_days    set user_id = uid where user_id is null;
--   update public.trades          set user_id = uid where user_id is null;
--   update public.chart_links     set user_id = uid where user_id is null;
--   update public.journal_entries set user_id = uid where user_id is null;
-- end $$;
