-- Level Fit — schema (Supabase)
-- 1. Crie um projeto em https://supabase.com
-- 2. Authentication > Sign In / Providers: deixe "Email" habilitado.
--    Para testar sem confirmar e-mail, desligue "Confirm email".
-- 3. Rode este arquivo no SQL Editor (pode rodar de novo com segurança).
--    Já aplicado no projeto gdphzklxmxcckavamfyx como a migração "levelfit_initial_schema".
-- 4. Copie a URL e a publishable key para o .env (veja .env.example)
--
-- Cada conta pode participar de vários duelos (1 linha em duel_players por duelo).
-- Cada duelo tem no máximo 2 jogadores.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null check (char_length(name) between 1 and 60),
  habit_ids text[] not null default '{}',
  stake text check (stake is null or char_length(stake) <= 80),
  created_at timestamptz not null default now()
);

create table if not exists public.duel_players (
  duel_id uuid not null references public.duels(id) on delete cascade,
  player_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 32),
  avatar text not null default '🙂' check (char_length(avatar) <= 16),
  color text not null default '#38BDF8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  joined_at timestamptz not null default now(),
  primary key (duel_id, player_id)
);
create index if not exists duel_players_player_idx on public.duel_players(player_id);

create table if not exists public.checkins (
  id uuid primary key,
  duel_id uuid not null references public.duels(id) on delete cascade,
  player_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id text not null,
  date_key text not null check (date_key ~ '^\d{4}-\d{2}-\d{2}$'),
  created_at timestamptz not null default now(),
  photo_path text not null,
  note text check (note is null or char_length(note) <= 280),
  reactions jsonb not null default '{}'::jsonb,
  disputed boolean not null default false
);
create index if not exists checkins_duel_idx on public.checkins(duel_id, date_key);
create index if not exists checkins_player_idx on public.checkins(player_id);

-- ---------------------------------------------------------------------------
-- Helper fora do schema exposto: o usuário atual participa do duelo?
-- (security definer para não entrar em recursão no RLS de duel_players)
-- ---------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_member(d uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.duel_players where duel_id = d and player_id = (select auth.uid())
  );
$$;
revoke all on function private.is_member(uuid) from public, anon;
grant execute on function private.is_member(uuid) to authenticated;

-- Versão antiga (public.is_member) ficava exposta na API.
drop function if exists public.is_member(uuid) cascade;

-- ---------------------------------------------------------------------------
-- Permissões da Data API (só usuários logados; anon não acessa nada)
-- Colunas editáveis são limitadas para que ninguém troque dono, código ou foto.
-- ---------------------------------------------------------------------------

revoke all on public.duels, public.duel_players, public.checkins from anon, authenticated;

grant select on public.duels to authenticated;
grant update (name, habit_ids, stake) on public.duels to authenticated;

grant select, delete on public.duel_players to authenticated;
grant update (name, avatar, color) on public.duel_players to authenticated;

grant select, insert, delete on public.checkins to authenticated;
grant update (reactions, disputed) on public.checkins to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.duels enable row level security;
alter table public.duel_players enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "members read duel" on public.duels;
create policy "members read duel" on public.duels for select to authenticated
  using (private.is_member(id));
drop policy if exists "members update duel" on public.duels;
create policy "members update duel" on public.duels for update to authenticated
  using (private.is_member(id)) with check (private.is_member(id));

drop policy if exists "members read players" on public.duel_players;
create policy "members read players" on public.duel_players for select to authenticated
  using (private.is_member(duel_id));
drop policy if exists "player updates self" on public.duel_players;
create policy "player updates self" on public.duel_players for update to authenticated
  using (player_id = (select auth.uid())) with check (player_id = (select auth.uid()));
drop policy if exists "player leaves duel" on public.duel_players;
create policy "player leaves duel" on public.duel_players for delete to authenticated
  using (player_id = (select auth.uid()));

drop policy if exists "members read checkins" on public.checkins;
create policy "members read checkins" on public.checkins for select to authenticated
  using (private.is_member(duel_id));
drop policy if exists "player inserts own checkin" on public.checkins;
create policy "player inserts own checkin" on public.checkins for insert to authenticated
  with check (player_id = (select auth.uid()) and private.is_member(duel_id));
-- Reações e contestação são feitas pelo adversário, então membros podem atualizar
-- (só as colunas reactions e disputed, pelos grants acima).
drop policy if exists "members update checkins" on public.checkins;
create policy "members update checkins" on public.checkins for update to authenticated
  using (private.is_member(duel_id)) with check (private.is_member(duel_id));
drop policy if exists "player deletes own checkin" on public.checkins;
create policy "player deletes own checkin" on public.checkins for delete to authenticated
  using (player_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RPCs (precisam de security definer: criam o duelo e o primeiro jogador,
-- ou acham um duelo pelo código antes de a pessoa ser membro)
-- ---------------------------------------------------------------------------

create or replace function public.create_duel(
  p_name text, p_habit_ids text[], p_stake text, p_player_name text, p_avatar text, p_color text
) returns public.duels language plpgsql security definer set search_path = '' as $$
declare
  v_duel public.duels;
  v_code text;
begin
  if (select auth.uid()) is null then raise exception 'Não autenticado'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.duels where code = v_code);
  end loop;
  insert into public.duels (code, name, habit_ids, stake)
    values (v_code, p_name, p_habit_ids, p_stake) returning * into v_duel;
  insert into public.duel_players (duel_id, player_id, name, avatar, color)
    values (v_duel.id, (select auth.uid()), p_player_name, p_avatar, p_color);
  return v_duel;
end;
$$;

create or replace function public.join_duel(
  p_code text, p_player_name text, p_avatar text, p_color text
) returns public.duels language plpgsql security definer set search_path = '' as $$
declare
  v_duel public.duels;
  v_count int;
begin
  if (select auth.uid()) is null then raise exception 'Não autenticado'; end if;
  select * into v_duel from public.duels where code = upper(trim(p_code)) for update;
  if v_duel.id is null then raise exception 'Código inválido'; end if;
  if exists (select 1 from public.duel_players where duel_id = v_duel.id and player_id = (select auth.uid())) then
    return v_duel;
  end if;
  select count(*) into v_count from public.duel_players where duel_id = v_duel.id;
  if v_count >= 2 then raise exception 'Este duelo já tem 2 jogadores'; end if;
  insert into public.duel_players (duel_id, player_id, name, avatar, color)
    values (v_duel.id, (select auth.uid()), p_player_name, p_avatar, p_color);
  return v_duel;
end;
$$;

revoke all on function public.create_duel(text, text[], text, text, text, text) from public, anon;
revoke all on function public.join_duel(text, text, text, text) from public, anon;
grant execute on function public.create_duel(text, text[], text, text, text, text) to authenticated;
grant execute on function public.join_duel(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (ignora tabelas que já estão publicadas)
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['checkins', 'duel_players', 'duels'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: fotos de prova (bucket privado, pasta = id do duelo)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('proofs', 'proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

drop policy if exists "members read proofs" on storage.objects;
create policy "members read proofs" on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and private.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "members upload proofs" on storage.objects;
create policy "members upload proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and private.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "owner deletes proofs" on storage.objects;
create policy "owner deletes proofs" on storage.objects for delete to authenticated
  using (bucket_id = 'proofs' and owner_id = (select auth.uid())::text);
