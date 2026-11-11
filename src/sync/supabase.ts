import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { File } from 'expo-file-system';

import type { Checkin, Duel, Player } from '@/domain/types';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isOnlineAvailable = !!URL && !!KEY;

const BUCKET = 'proofs';
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 dias

export type Profile = Omit<Player, 'id'>;
export type Account = Profile & { id: string; email: string };
export type CreateDuelInput = { name: string; habitIds: string[]; stake?: string; me: Profile };
export type Snapshot = { duel: Duel; checkins: Checkin[] };

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!client) {
    if (!URL || !KEY) throw new Error('Supabase não configurado (veja o README).');
    client = createClient(URL, KEY, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  }
  return client;
}

function toAccount(user: User): Account {
  const m = (user.user_metadata ?? {}) as Partial<Profile>;
  return {
    id: user.id,
    email: user.email ?? '',
    name: m.name ?? (user.email ?? 'Jogador').split('@')[0],
    avatar: m.avatar ?? '🦁',
    color: m.color ?? '#38BDF8',
  };
}

const AUTH_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
  [/already registered|already exists/i, 'Já existe uma conta com este e-mail. Tente entrar.'],
  [/password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/invalid.*email|email.*invalid/i, 'E-mail inválido.'],
  [/rate limit/i, 'Muitas tentativas. Espere um pouco e tente de novo.'],
];
function authError(e: { message: string }): Error {
  const hit = AUTH_ERRORS.find(([re]) => re.test(e.message));
  return new Error(hit ? hit[1] : e.message);
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new Error('Sua sessão expirou. Entre novamente.');
  return data.session.user.id;
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

export const api = {
  // ---------- Conta ----------
  async currentAccount(): Promise<Account | null> {
    if (!isOnlineAvailable) return null;
    const { data } = await supabase().auth.getSession();
    return data.session ? toAccount(data.session.user) : null;
  },

  async signUp(email: string, password: string, profile: Profile): Promise<Account | null> {
    const { data, error } = await supabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: profile },
    });
    if (error) throw authError(error);
    // Sem sessão = o projeto exige confirmação por e-mail.
    return data.session && data.user ? toAccount(data.user) : null;
  },

  async signIn(email: string, password: string): Promise<Account> {
    const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw authError(error);
    return toAccount(data.user);
  },

  async signOut() {
    await supabase().auth.signOut();
  },

  async resetPassword(email: string) {
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw authError(error);
  },

  /** Atualiza o perfil da conta e o nome/avatar em todos os duelos. */
  async updateProfile(profile: Profile): Promise<Account> {
    const sb = supabase();
    const { data, error } = await sb.auth.updateUser({ data: profile });
    if (error) throw authError(error);
    const { error: e2 } = await sb.from('duel_players').update(profile).eq('player_id', data.user.id);
    if (e2) throw e2;
    return toAccount(data.user);
  },

  // ---------- Duelos ----------
  async myDuelIds(): Promise<string[]> {
    const uid = await requireUserId();
    const { data, error } = await supabase().from('duel_players').select('duel_id').eq('player_id', uid);
    if (error) throw error;
    return (data ?? []).map((r: { duel_id: string }) => r.duel_id);
  },

  async createDuel(input: CreateDuelInput): Promise<Duel> {
    await requireUserId();
    const { data, error } = await supabase().rpc('create_duel', {
      p_name: input.name,
      p_habit_ids: input.habitIds,
      p_stake: input.stake ?? null,
      p_player_name: input.me.name,
      p_avatar: input.me.avatar,
      p_color: input.me.color,
    });
    if (error) throw new Error(error.message);
    return loadDuel((data as DuelRow).id);
  },

  async joinDuel(code: string, me: Profile): Promise<Duel> {
    await requireUserId();
    const { data, error } = await supabase().rpc('join_duel', {
      p_code: code.trim().toUpperCase(),
      p_player_name: me.name,
      p_avatar: me.avatar,
      p_color: me.color,
    });
    if (error) throw new Error(error.message);
    return loadDuel((data as DuelRow).id);
  },

  async leaveDuel(duelId: string) {
    const uid = await requireUserId();
    const { error } = await supabase().from('duel_players').delete().eq('duel_id', duelId).eq('player_id', uid);
    if (error) throw error;
  },

  async updateDuel(duelId: string, patch: Partial<Pick<Duel, 'habitIds' | 'stake' | 'name'>>) {
    const row: Partial<DuelRow> = {};
    if (patch.habitIds) row.habit_ids = patch.habitIds;
    if (patch.name) row.name = patch.name;
    if ('stake' in patch) row.stake = patch.stake ?? null;
    const { error } = await supabase().from('duels').update(row).eq('id', duelId);
    if (error) throw error;
  },

  async fetch(duelId: string): Promise<Snapshot> {
    const sb = supabase();
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

  // ---------- Provas ----------
  async addCheckin(c: Checkin) {
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
    if (error && !/duplicate key/i.test(error.message)) throw error;
  },

  async updateCheckin(id: string, patch: Partial<Pick<Checkin, 'reactions' | 'disputed'>>) {
    const { error } = await supabase().from('checkins').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteCheckin(c: Checkin) {
    const sb = supabase();
    const { error } = await sb.from('checkins').delete().eq('id', c.id);
    if (error) throw error;
    await sb.storage.from(BUCKET).remove([`${c.duelId}/${c.id}.jpg`]);
  },

  /** Escuta mudanças em um duelo (provas, jogadores e configurações). */
  subscribe(duelId: string, onChange: () => void): () => void {
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

  /** Avisa quando a sessão termina (logout em outro lugar, token revogado). */
  onSignedOut(cb: () => void): () => void {
    if (!isOnlineAvailable) return () => {};
    const { data } = supabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') cb();
    });
    return () => data.subscription.unsubscribe();
  },
};
