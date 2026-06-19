-- StreamTR — cihazlar arası favoriler tablosu + Row Level Security.
-- Supabase Dashboard → SQL Editor'a yapıştırıp "Run" deyin. Tekrar çalıştırılabilir (idempotent).

create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,            -- favKey(): 'tmdb:movie:27205' veya 'title:Ad:2010'
  item       jsonb not null,           -- kart için yeterli snapshot (başlık, tür, puanlar, poster…)
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);

-- Her kullanıcı yalnızca kendi favorilerini görebilir/değiştirebilir.
alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_update_own" on public.favorites;
create policy "favorites_update_own" on public.favorites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);
