import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { File } from 'expo-file-system';

import type { Checkin, Duel, Player } from '@/domain/types';

import type { Backend } from './backend';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isOnlineAvailable = !!URL && !!KEY;

const BUCKET = 'proofs';
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 dias

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!client) {
    if (!URL || !KEY) throw new Error('Supabase não configurado.');
    client = createClient(URL, KEY, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  }
  return client;
}

/** Cada aparelho entra com login anônimo; o uid vira o id do jogador. */
async function ensureUser(): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signIn, error } = await sb.auth.signInAnonymously();
  if (error || !signIn.user) throw error ?? new Error('Falha no login anônimo.');
  return signIn.user.id;
}

type DuelRow = { id: string; code: string; name: string; habit_ids: string[]; stake: string | null; created_at: string };
type PlayerRow = { duel_id: string; player_id: string; name: string; avatar: string; color: string };
type CheckinRow = {
  id: string;
  duel_id: string;
  player_id: string;
  habit_id: string;
  date_key: string;
  created_at: string;
  photo_path: string;
  note: string | null;
  reactions: Record<string, string> | null;
  disputed: boolean;
};

const toPlayer = (r: PlayerRow): Player => ({ id: r.player_id, name: r.name, avatar: r.avatar, color: r.color });
const toDuel = (r: DuelRow, players: Player[]): Duel => ({
  id: r.id,
  code: r.code,
  name: r.name,
  habitIds: r.habit_ids,
  stake: r.stake ?? undefined,
  createdAt: r.created_at,
  players,
});

async function loadDuel(duelId: string): Promise<Duel> {
  const sb = supabase();
  const [{ data: duel, error: e1 }, { data: players, error: e2 }] = await Promise.all([
    sb.from('duels').select('*').eq('id', duelId).single<DuelRow>(),
    sb.from('duel_players').select('*').eq('duel_id', duelId).order('joined_at').returns<PlayerRow[]>(),
  ]);
  if (e1 || !duel) throw e1 ?? new Error('Duelo não encontrado.');
  if (e2) throw e2;
  return toDuel(duel, (players ?? []).map(toPlayer));
}

export const supabaseBackend: Backend = {
  kind: 'online',

  async createDuel(input) {
    const meId = await ensureUser();
    const { data, error } = await supabase().rpc('create_duel', {
      p_name: input.name,
      p_habit_ids: input.habitIds,
      p_stake: input.stake ?? null,
      p_player_name: input.me.name,
      p_avatar: input.me.avatar,
      p_color: input.me.color,
    });
    if (error) throw error;
    return { meId, duel: await loadDuel((data as DuelRow).id) };
  },

  async joinDuel(code, me) {
    const meId = await ensureUser();
    const { data, error } = await supabase().rpc('join_duel', {
      p_code: code.trim().toUpperCase(),
      p_player_name: me.name,
      p_avatar: me.avatar,
      p_color: me.color,
    });
    if (error) throw new Error(error.message);
    return { meId, duel: await loadDuel((data as DuelRow).id) };
  },

  async fetch(duelId) {
    const sb = supabase();
    await ensureUser();
    const duel = await loadDuel(duelId);
    const { data, error } = await sb
      .from('checkins')
      .select('*')
      .eq('duel_id', duelId)
      .order('created_at', { ascending: false })
      .returns<CheckinRow[]>();
    if (error) throw error;
    const rows = data ?? [];
    const paths = rows.map((r) => r.photo_path).filter(Boolean);
    const urls = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
      for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
    }
    const checkins: Checkin[] = rows.map((r) => ({
      id: r.id,
      duelId: r.duel_id,
      playerId: r.player_id,
      habitId: r.habit_id,
      dateKey: r.date_key,
      createdAt: r.created_at,
      photoUri: urls.get(r.photo_path) ?? '',
      note: r.note ?? undefined,
      reactions: r.reactions ?? {},
      disputed: r.disputed,
    }));
    return { duel, checkins };
  },

  async addCheckin(c) {
    const sb = supabase();
    const path = `${c.duelId}/${c.id}.jpg`;
    const bytes = await new File(c.photoUri).arrayBuffer();
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg' });
    // Em uma nova tentativa o arquivo pode já existir: segue para o insert.
    if (upErr && !/exists|duplicate/i.test(upErr.message)) throw upErr;
    const { error } = await sb.from('checkins').insert({
      id: c.id,
      duel_id: c.duelId,
      player_id: c.playerId,
      habit_id: c.habitId,
      date_key: c.dateKey,
      created_at: c.createdAt,
      photo_path: path,
      note: c.note ?? null,
      reactions: c.reactions,
      disputed: false,
    });
    if (error) throw error;
    return c;
  },

  async updateCheckin(id, patch) {
    const { error } = await supabase().from('checkins').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteCheckin(c) {
    const sb = supabase();
    const { error } = await sb.from('checkins').delete().eq('id', c.id);
    if (error) throw error;
    await sb.storage.from(BUCKET).remove([`${c.duelId}/${c.id}.jpg`]);
  },

  async updateDuel(duelId, patch) {
    const row: Partial<DuelRow> = {};
    if (patch.habitIds) row.habit_ids = patch.habitIds;
    if (patch.name) row.name = patch.name;
    if (patch.stake !== undefined) row.stake = patch.stake ?? null;
    const { error } = await supabase().from('duels').update(row).eq('id', duelId);
    if (error) throw error;
  },

  subscribe(duelId, onChange) {
    const sb = supabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(onChange, 400);
    };
    const channel = sb
      .channel(`duel:${duelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins', filter: `duel_id=eq.${duelId}` }, debounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_players', filter: `duel_id=eq.${duelId}` }, debounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `id=eq.${duelId}` }, debounced)
      .subscribe();
    return () => {
      clearTimeout(timer);
      sb.removeChannel(channel);
    };
  },
};
