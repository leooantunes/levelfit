import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayKey } from '@/domain/dates';
import type { Checkin, Duel, Period } from '@/domain/types';
import { deleteLocalPhoto, persistPhoto } from '@/lib/photos';
import { api, type Account, type CreateDuelInput, type Profile, type Snapshot } from '@/sync/supabase';

type Reminders = { enabled: boolean; hour: number; minute: number };
type DuelPatch = Partial<Pick<Duel, 'habitIds' | 'stake' | 'name'>>;

type GameState = {
  hydrated: boolean;
  account: Account | null;
  /** Duelos da conta, por id. */
  duels: Record<string, Duel>;
  /** Ordem de exibição na tela inicial (mais recente primeiro). */
  duelOrder: string[];
  /** Provas por duelo. */
  checkins: Record<string, Checkin[]>;
  /** Duelo aberto nas abas. */
  activeDuelId: string | null;
  /** Ids de provas que ainda não subiram para o servidor. */
  pendingSync: string[];
  /** Resultados de período já comemorados: `${duelId}:${period}:${key}`. */
  celebrated: string[];
  reminders: Reminders;
  syncing: boolean;
  syncError: string | null;

  restoreSession: () => Promise<void>;
  signUp: (email: string, password: string, profile: Profile) => Promise<'signed-in' | 'confirm-email'>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Profile) => Promise<void>;

  refreshAll: () => Promise<void>;
  refreshDuel: (duelId: string) => Promise<void>;
  openDuel: (duelId: string) => void;
  createDuel: (input: Omit<CreateDuelInput, 'me'>) => Promise<string>;
  joinDuel: (code: string) => Promise<string>;
  leaveDuel: (duelId: string) => Promise<void>;
  updateDuel: (patch: DuelPatch) => Promise<void>;

  addCheckin: (habitId: string, photoUri: string, note?: string) => Promise<Checkin>;
  deleteCheckin: (id: string) => Promise<void>;
  react: (checkinId: string, emoji: string | null) => Promise<void>;
  toggleDispute: (checkinId: string) => Promise<void>;
  markCelebrated: (period: Period, key: string) => void;
  setReminders: (r: Partial<Reminders>) => void;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const byNewest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);

export const celebrationTag = (duelId: string, period: Period, key: string) => `${duelId}:${period}:${key}`;

const EMPTY_DATA = {
  duels: {} as Record<string, Duel>,
  duelOrder: [] as string[],
  checkins: {} as Record<string, Checkin[]>,
  activeDuelId: null as string | null,
  pendingSync: [] as string[],
  celebrated: [] as string[],
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const findCheckin = (id: string) => {
        for (const list of Object.values(get().checkins)) {
          const c = list.find((x) => x.id === id);
          if (c) return c;
        }
        return undefined;
      };
      const patchCheckin = (c: Checkin, patch: Partial<Checkin>) =>
        set((s) => ({
          checkins: { ...s.checkins, [c.duelId]: (s.checkins[c.duelId] ?? []).map((x) => (x.id === c.id ? { ...x, ...patch } : x)) },
        }));

      /** Junta o que veio do servidor com as provas locais (fotos offline e pendentes). */
      const mergeSnapshot = (s: GameState, snap: Snapshot) => {
        const local = s.checkins[snap.duel.id] ?? [];
        const localById = new Map(local.map((c) => [c.id, c]));
        const remoteIds = new Set(snap.checkins.map((c) => c.id));
        const merged = snap.checkins.map((c) => {
          const l = localById.get(c.id);
          // Prefere a foto local (abre offline e não expira).
          return l?.photoUri.startsWith('file://') ? { ...c, photoUri: l.photoUri } : c;
        });
        const pending = local.filter((c) => s.pendingSync.includes(c.id) && !remoteIds.has(c.id));
        return [...pending, ...merged].sort(byNewest);
      };

      const pushPending = async () => {
        for (const id of get().pendingSync) {
          const c = findCheckin(id);
          if (c) await api.addCheckin(c);
          set((s) => ({ pendingSync: s.pendingSync.filter((p) => p !== id) }));
        }
      };

      const removeDuelLocally = (duelId: string) => {
        for (const c of get().checkins[duelId] ?? []) deleteLocalPhoto(c.photoUri);
        set((s) => {
          const { [duelId]: _d, ...duels } = s.duels;
          const { [duelId]: _c, ...checkins } = s.checkins;
          const gone = new Set((s.checkins[duelId] ?? []).map((c) => c.id));
          return {
            duels,
            checkins,
            duelOrder: s.duelOrder.filter((id) => id !== duelId),
            activeDuelId: s.activeDuelId === duelId ? null : s.activeDuelId,
            pendingSync: s.pendingSync.filter((id) => !gone.has(id)),
            celebrated: s.celebrated.filter((t) => !t.startsWith(`${duelId}:`)),
          };
        });
      };

      const clearLocalData = () => {
        for (const list of Object.values(get().checkins)) for (const c of list) deleteLocalPhoto(c.photoUri);
        set({ account: null, ...EMPTY_DATA });
      };

      const addDuel = (duel: Duel, checkins: Checkin[] = []) =>
        set((s) => ({
          duels: { ...s.duels, [duel.id]: duel },
          checkins: { ...s.checkins, [duel.id]: checkins },
          duelOrder: [duel.id, ...s.duelOrder.filter((id) => id !== duel.id)],
        }));

      const activeDuel = () => {
        const { activeDuelId, duels } = get();
        const duel = activeDuelId ? duels[activeDuelId] : undefined;
        if (!duel) throw new Error('Nenhum duelo aberto.');
        return duel;
      };

      return {
        hydrated: false,
        account: null,
        ...EMPTY_DATA,
        reminders: { enabled: true, hour: 20, minute: 0 },
        syncing: false,
        syncError: null,

        async restoreSession() {
          try {
            const account = await api.currentAccount();
            if (!account) {
              if (get().account) clearLocalData();
              return;
            }
            // Outra conta no mesmo aparelho: não mistura os dados.
            if (get().account && get().account!.id !== account.id) clearLocalData();
            set({ account });
          } catch {
            // Sem rede: segue com a conta em cache.
          }
        },

        async signUp(email, password, profile) {
          const account = await api.signUp(email, password, profile);
          if (!account) return 'confirm-email';
          clearLocalData();
          set({ account });
          return 'signed-in';
        },

        async signIn(email, password) {
          const account = await api.signIn(email, password);
          clearLocalData();
          set({ account });
          await get().refreshAll();
        },

        async signOut() {
          await api.signOut().catch(() => {});
          clearLocalData();
        },

        async updateProfile(profile) {
          const account = await api.updateProfile(profile);
          set((s) => {
            const duels: Record<string, Duel> = {};
            for (const [id, d] of Object.entries(s.duels)) {
              duels[id] = { ...d, players: d.players.map((p) => (p.id === account.id ? { ...p, ...profile } : p)) };
            }
            return { account, duels };
          });
        },

        async refreshAll() {
          if (!get().account) return;
          set({ syncing: true, syncError: null });
          try {
            await pushPending();
            const ids = await api.myDuelIds();
            const snaps = await Promise.all(ids.map((id) => api.fetch(id)));
            set((s) => {
              const duels: Record<string, Duel> = {};
              const checkins: Record<string, Checkin[]> = {};
              for (const snap of snaps) {
                duels[snap.duel.id] = snap.duel;
                checkins[snap.duel.id] = mergeSnapshot(s, snap);
              }
              const ordered = snaps.map((x) => x.duel).sort(byNewest).map((d) => d.id);
              return {
                duels,
                checkins,
                duelOrder: ordered,
                activeDuelId: s.activeDuelId && duels[s.activeDuelId] ? s.activeDuelId : null,
              };
            });
          } catch (e) {
            set({ syncError: errorText(e) });
          } finally {
            set({ syncing: false });
          }
        },

        async refreshDuel(duelId) {
          if (!get().account) return;
          try {
            await pushPending();
            const snap = await api.fetch(duelId);
            set((s) => ({
              duels: { ...s.duels, [duelId]: snap.duel },
              checkins: { ...s.checkins, [duelId]: mergeSnapshot(s, snap) },
              syncError: null,
            }));
          } catch (e) {
            set({ syncError: errorText(e) });
          }
        },

        openDuel(duelId) {
          set({ activeDuelId: duelId });
        },

        async createDuel(input) {
          const { account } = get();
          if (!account) throw new Error('Entre na sua conta primeiro.');
          const { name, avatar, color } = account;
          const duel = await api.createDuel({ ...input, me: { name, avatar, color } });
          addDuel(duel);
          return duel.id;
        },

        async joinDuel(code) {
          const { account } = get();
          if (!account) throw new Error('Entre na sua conta primeiro.');
          const { name, avatar, color } = account;
          const duel = await api.joinDuel(code, { name, avatar, color });
          addDuel(duel);
          await get().refreshDuel(duel.id);
          return duel.id;
        },

        async leaveDuel(duelId) {
          await api.leaveDuel(duelId);
          removeDuelLocally(duelId);
        },

        async updateDuel(patch) {
          const duel = activeDuel();
          set((s) => ({ duels: { ...s.duels, [duel.id]: { ...duel, ...patch } } }));
          await api.updateDuel(duel.id, patch).catch((e) => set({ syncError: errorText(e) }));
        },

        async addCheckin(habitId, photoUri, note) {
          const duel = activeDuel();
          const { account } = get();
          if (!account) throw new Error('Entre na sua conta primeiro.');
          const id = randomUUID();
          const checkin: Checkin = {
            id,
            duelId: duel.id,
            playerId: account.id,
            habitId,
            dateKey: todayKey(),
            createdAt: new Date().toISOString(),
            photoUri: persistPhoto(photoUri, id),
            note: note?.trim() || undefined,
            reactions: {},
          };
          set((s) => ({
            checkins: { ...s.checkins, [duel.id]: [checkin, ...(s.checkins[duel.id] ?? [])] },
            pendingSync: [...s.pendingSync, id],
          }));
          try {
            await api.addCheckin(checkin);
            set((s) => ({ pendingSync: s.pendingSync.filter((p) => p !== id) }));
          } catch (e) {
            // Fica pendente e sobe na próxima sincronização.
            set({ syncError: errorText(e) });
          }
          return checkin;
        },

        async deleteCheckin(id) {
          const c = findCheckin(id);
          if (!c) return;
          set((s) => ({
            checkins: { ...s.checkins, [c.duelId]: (s.checkins[c.duelId] ?? []).filter((x) => x.id !== id) },
            pendingSync: s.pendingSync.filter((p) => p !== id),
          }));
          deleteLocalPhoto(c.photoUri);
          await api.deleteCheckin(c).catch(() => {});
        },

        async react(checkinId, emoji) {
          const c = findCheckin(checkinId);
          const me = get().account?.id;
          if (!c || !me) return;
          const reactions = { ...c.reactions };
          if (emoji) reactions[me] = emoji;
          else delete reactions[me];
          patchCheckin(c, { reactions });
          await api.updateCheckin(checkinId, { reactions }).catch(() => {});
        },

        async toggleDispute(checkinId) {
          const c = findCheckin(checkinId);
          if (!c) return;
          patchCheckin(c, { disputed: !c.disputed });
          await api.updateCheckin(checkinId, { disputed: !c.disputed }).catch(() => {});
        },

        markCelebrated(period, key) {
          const duelId = get().activeDuelId;
          if (!duelId) return;
          const tag = celebrationTag(duelId, period, key);
          set((s) => (s.celebrated.includes(tag) ? s : { celebrated: [...s.celebrated, tag].slice(-500) }));
        },

        setReminders(r) {
          set((s) => ({ reminders: { ...s.reminders, ...r } }));
        },
      };
    },
    {
      name: 'levelfit-game',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 tinha um único duelo (e modo offline): começa do zero com conta.
      migrate: () => ({}) as GameState,
      partialize: ({ hydrated, syncing, syncError, ...rest }) => rest,
      onRehydrateStorage: () => () => {
        useGame.setState({ hydrated: true });
      },
    },
  ),
);

const NO_CHECKINS: Checkin[] = [];

/** Duelo aberto nas abas. */
export function useActiveDuel(): Duel | null {
  return useGame((s) => (s.activeDuelId ? (s.duels[s.activeDuelId] ?? null) : null));
}

/** Provas do duelo aberto. */
export function useActiveCheckins(): Checkin[] {
  return useGame((s) => (s.activeDuelId ? (s.checkins[s.activeDuelId] ?? NO_CHECKINS) : NO_CHECKINS));
}

/** Id do jogador logado (é o mesmo em todos os duelos). */
export function useMyId(): string | null {
  return useGame((s) => s.account?.id ?? null);
}
