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

-- ─────────────────────────────────────────────────────────────────────────────
-- AI arama kotası
--
-- "AI ile Ara" ucu, site sahibinin Anthropic hesabına vekillik eder. Uç açık
-- bırakılırsa faturayı herkes yazabilir; bu yüzden çağrılar giriş yapmış
-- kullanıcıya bağlı ve kişi başı günlük tavanlı.
--
-- Tablo YALNIZCA service_role tarafından yazılır (edge function). RLS açık ve
-- hiçbir politika tanımlı değil → anon/authenticated erişemez. İstemcinin
-- kotayı okuması gerekmez; uç kalan hakkı yanıtta döndürür.
create table if not exists public.ai_search_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  used    int  not null default 0,
  primary key (user_id, day)
);

alter table public.ai_search_usage enable row level security;

-- Kotayı ATOMİK tüketir: sayaç ancak tavanın altındaysa artar. Okuyup-sonra-
-- yazmak eşzamanlı iki sekmede tavanı aşabilirdi; buradaki ON CONFLICT ... WHERE
-- tek ifadede hem kontrol hem artırım yapar.
create or replace function public.ai_search_consume(p_user uuid, p_limit int)
returns table (allowed boolean, used int, quota int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day  date := (now() at time zone 'utc')::date;
  v_used int;
begin
  insert into public.ai_search_usage as u (user_id, day, used)
  values (p_user, v_day, 1)
  on conflict (user_id, day) do update
    set used = u.used + 1
    where u.used < p_limit
  returning u.used into v_used;

  if v_used is null then
    -- Artırım tavana takıldı: mevcut sayacı olduğu gibi bildir.
    select c.used into v_used
      from public.ai_search_usage c
     where c.user_id = p_user and c.day = v_day;
    return query select false, coalesce(v_used, p_limit), p_limit;
  else
    return query select true, v_used, p_limit;
  end if;
end;
$$;

-- Kotayı istemci doğrudan çağırıp atlayamasın.
revoke all on function public.ai_search_consume(uuid, int) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Keep-alive (uyku/suspend önleme)
--
-- Supabase ücretsiz planında bir proje 7 gün boyunca HİÇ istek almazsa duraklatılır
-- ("paused") ve DB erişimi kesilir. Site az ziyaret aldığında bu kolayca olur.
-- Duraklatma yalnızca DIŞARIDAN gelen istekle önlenir: proje durunca içerideki
-- pg_cron da durduğu için DB'nin kendi kendini uyandırması mümkün değildir.
--
-- Bu yüzden .github/workflows/supabase-keepalive.yml her gün aşağıdaki fonksiyonu
-- çağırır. Çağrı PostgREST üzerinden Postgres'e ulaşır → proje "aktif" sayılır.
create table if not exists public.keepalive (
  id        smallint primary key default 1 check (id = 1),  -- tek satır
  last_ping timestamptz not null default now(),
  pings     bigint not null default 0
);

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

-- Tabloya doğrudan erişim yok: RLS açık ve hiçbir politika tanımlı değil →
-- anon/authenticated okuyup yazamaz. Tek giriş kapısı aşağıdaki fonksiyondur.
alter table public.keepalive enable row level security;

-- Heartbeat'i yazar ve son ping zamanını döndürür.
-- Saatte en fazla bir kez YAZAR: uç herkese açık olduğu için (anon anahtarı zaten
-- publictir) sınırsız UPDATE ile tabloyu şişirmek istemiyoruz. Kısıt yalnızca yazmayı
-- kısar; çağrının kendisi her hâlükârda DB'ye gittiği için proje aktif sayılmaya
-- devam eder.
create or replace function public.keepalive_ping()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
begin
  update public.keepalive
     set last_ping = now(),
         pings     = pings + 1
   where id = 1
     and last_ping < now() - interval '1 hour'
  returning last_ping into v_last;

  if v_last is null then
    -- Bu saat içinde zaten yazılmış: mevcut damgayı olduğu gibi bildir.
    select k.last_ping into v_last from public.keepalive k where k.id = 1;
  end if;

  return v_last;
end;
$$;

revoke all on function public.keepalive_ping() from public;
grant execute on function public.keepalive_ping() to anon, authenticated;

-- PostgREST şema önbelleğini tazele — yeni fonksiyon RPC olarak hemen görünsün.
notify pgrst, 'reload schema';
