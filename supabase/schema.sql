-- Level Fit — schema do modo online (Supabase)
-- 1. Crie um projeto em https://supabase.com
-- 2. Authentication > Providers: habilite "Anonymous sign-ins"
-- 3. Rode este arquivo no SQL Editor
-- 4. Copie URL e anon key para o .env (veja .env.example)

create extension if not exists pgcrypto;

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  habit_ids text[] not null default '{}',
  stake text,
  created_at timestamptz not null default now()
);

create table if not exists public.duel_players (
  duel_id uuid not null references public.duels(id) on delete cascade,
  player_id uuid not null default auth.uid(),
  name text not null,
  avatar text not null default '🙂',
  color text not null default '#38BDF8',
  joined_at timestamptz not null default now(),
  primary key (duel_id, player_id)
);

create table if not exists public.checkins (
  id uuid primary key,
  duel_id uuid not null references public.duels(id) on delete cascade,
  player_id uuid not null default auth.uid(),
  habit_id text not null,
  date_key text not null,
  created_at timestamptz not null default now(),
  photo_path text not null,
  note text,
  reactions jsonb not null default '{}'::jsonb,
  disputed boolean not null default false
);
create index if not exists checkins_duel_idx on public.checkins(duel_id, date_key);

-- Helper: o usuário atual participa do duelo?
create or replace function public.is_member(d uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.duel_players where duel_id = d and player_id = auth.uid());
$$;

alter table public.duels enable row level security;
alter table public.duel_players enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "members read duel" on public.duels;
create policy "members read duel" on public.duels for select using (public.is_member(id));
drop policy if exists "members update duel" on public.duels;
create policy "members update duel" on public.duels for update using (public.is_member(id));

drop policy if exists "members read players" on public.duel_players;
create policy "members read players" on public.duel_players for select using (public.is_member(duel_id));
drop policy if exists "player updates self" on public.duel_players;
create policy "player updates self" on public.duel_players for update using (player_id = auth.uid());

drop policy if exists "members read checkins" on public.checkins;
create policy "members read checkins" on public.checkins for select using (public.is_member(duel_id));
drop policy if exists "player inserts own checkin" on public.checkins;
create policy "player inserts own checkin" on public.checkins for insert
  with check (player_id = auth.uid() and public.is_member(duel_id));
-- Reações e contestação são feitas pelo adversário, então membros podem atualizar.
drop policy if exists "members update checkins" on public.checkins;
create policy "members update checkins" on public.checkins for update using (public.is_member(duel_id));
drop policy if exists "player deletes own checkin" on public.checkins;
create policy "player deletes own checkin" on public.checkins for delete using (player_id = auth.uid());

-- Criar duelo + entrar como primeiro jogador
create or replace function public.create_duel(
  p_name text, p_habit_ids text[], p_stake text, p_player_name text, p_avatar text, p_color text
) returns public.duels language plpgsql security definer set search_path = public as $$
declare
  v_duel public.duels;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  loop
    v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.duels where code = v_code);
  end loop;
  insert into public.duels (code, name, habit_ids, stake)
    values (v_code, p_name, p_habit_ids, p_stake) returning * into v_duel;
  insert into public.duel_players (duel_id, player_id, name, avatar, color)
    values (v_duel.id, auth.uid(), p_player_name, p_avatar, p_color);
  return v_duel;
end;
$$;

-- Entrar em um duelo pelo código (máx. 2 jogadores)
create or replace function public.join_duel(
  p_code text, p_player_name text, p_avatar text, p_color text
) returns public.duels language plpgsql security definer set search_path = public as $$
declare
  v_duel public.duels;
  v_count int;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  select * into v_duel from public.duels where code = upper(p_code);
  if v_duel.id is null then raise exception 'Código inválido'; end if;
  if exists (select 1 from public.duel_players where duel_id = v_duel.id and player_id = auth.uid()) then
    return v_duel;
  end if;
  select count(*) into v_count from public.duel_players where duel_id = v_duel.id;
  if v_count >= 2 then raise exception 'Este duelo já tem 2 jogadores'; end if;
  insert into public.duel_players (duel_id, player_id, name, avatar, color)
    values (v_duel.id, auth.uid(), p_player_name, p_avatar, p_color);
  return v_duel;
end;
$$;

grant execute on function public.create_duel(text, text[], text, text, text, text) to authenticated;
grant execute on function public.join_duel(text, text, text, text) to authenticated;

-- Realtime
alter publication supabase_realtime add table public.checkins;
alter publication supabase_realtime add table public.duel_players;
alter publication supabase_realtime add table public.duels;

-- Storage: fotos de prova (bucket privado, pasta = id do duelo)
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false)
  on conflict (id) do nothing;

drop policy if exists "members read proofs" on storage.objects;
create policy "members read proofs" on storage.objects for select
  using (bucket_id = 'proofs' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "members upload proofs" on storage.objects;
create policy "members upload proofs" on storage.objects for insert
  with check (bucket_id = 'proofs' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "owner deletes proofs" on storage.objects;
create policy "owner deletes proofs" on storage.objects for delete
  using (bucket_id = 'proofs' and owner = auth.uid());
