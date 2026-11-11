import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayKey } from '@/domain/dates';
import type { Checkin, Duel, Period, Player } from '@/domain/types';
import { deleteLocalPhoto, persistPhoto } from '@/lib/photos';
import type { Backend, CreateDuelInput } from '@/sync/backend';
import { localBackend } from '@/sync/local';
import { supabaseBackend } from '@/sync/supabase';

export type Mode = 'local' | 'online';

export const backendFor = (mode: Mode): Backend => (mode === 'online' ? supabaseBackend : localBackend);

type Reminders = { enabled: boolean; hour: number; minute: number };

type GameState = {
  hydrated: boolean;
  mode: Mode;
  duel: Duel | null;
  meId: string | null;
  /** Modo local: quem está com o celular na mão agora. */
  activePlayerId: string | null;
  checkins: Checkin[];
  /** Check-ins que ainda não subiram para o servidor. */
  pendingSync: string[];
  /** Resultados de período já comemorados: `${period}:${key}`. */
  celebrated: string[];
  reminders: Reminders;
  syncing: boolean;
  syncError: string | null;

  createDuel: (mode: Mode, input: CreateDuelInput) => Promise<void>;
  joinDuel: (code: string, me: Omit<Player, 'id'>) => Promise<void>;
  leaveDuel: () => void;
  refresh: () => Promise<void>;
  addCheckin: (habitId: string, photoUri: string, note?: string) => Promise<Checkin>;
  deleteCheckin: (id: string) => Promise<void>;
  react: (checkinId: string, emoji: string | null) => Promise<void>;
  toggleDispute: (checkinId: string) => Promise<void>;
  updateDuel: (patch: Partial<Pick<Duel, 'habitIds' | 'stake' | 'name'>>) => Promise<void>;
  updatePlayer: (playerId: string, patch: Partial<Omit<Player, 'id'>>) => void;
  setActivePlayer: (id: string) => void;
  markCelebrated: (period: Period, key: string) => void;
  setReminders: (r: Partial<Reminders>) => void;
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const backend = () => backendFor(get().mode);
      const actingId = () => {
        const s = get();
        return (s.mode === 'local' ? s.activePlayerId : null) ?? s.meId!;
      };
      const patchCheckin = (id: string, patch: Partial<Checkin>) =>
        set((s) => ({ checkins: s.checkins.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

      const pushPending = async () => {
        const { pendingSync, checkins } = get();
        for (const id of pendingSync) {
          const c = checkins.find((x) => x.id === id);
          if (!c) continue;
          await backend().addCheckin(c);
          set((s) => ({ pendingSync: s.pendingSync.filter((p) => p !== id) }));
        }
      };

      return {
        hydrated: false,
        mode: 'local',
        duel: null,
        meId: null,
        activePlayerId: null,
        checkins: [],
        pendingSync: [],
        celebrated: [],
        reminders: { enabled: true, hour: 20, minute: 0 },
        syncing: false,
        syncError: null,

        async createDuel(mode, input) {
          const { duel, meId } = await backendFor(mode).createDuel(input);
          set({ mode, duel, meId, activePlayerId: meId, checkins: [], pendingSync: [], celebrated: [] });
        },

        async joinDuel(code, me) {
          const { duel, meId } = await supabaseBackend.joinDuel(code, me);
          set({ mode: 'online', duel, meId, activePlayerId: meId, checkins: [], pendingSync: [], celebrated: [] });
          await get().refresh();
        },

        leaveDuel() {
          for (const c of get().checkins) deleteLocalPhoto(c.photoUri);
          set({ duel: null, meId: null, activePlayerId: null, checkins: [], pendingSync: [], celebrated: [] });
        },

        async refresh() {
          const { mode, duel } = get();
          if (mode !== 'online' || !duel) return;
          set({ syncing: true, syncError: null });
          try {
            await pushPending();
            const snap = await backend().fetch(duel.id);
            set((s) => {
              const localById = new Map(s.checkins.map((c) => [c.id, c]));
              const remoteIds = new Set(snap.checkins.map((c) => c.id));
              const merged = snap.checkins.map((c) => {
                const local = localById.get(c.id);
                // Prefere a foto local (abre offline e não expira).
                return local?.photoUri.startsWith('file://') ? { ...c, photoUri: local.photoUri } : c;
              });
              const pending = s.checkins.filter((c) => s.pendingSync.includes(c.id) && !remoteIds.has(c.id));
              return {
                duel: snap.duel,
                checkins: [...pending, ...merged].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
              };
            });
          } catch (e) {
            set({ syncError: e instanceof Error ? e.message : String(e) });
          } finally {
            set({ syncing: false });
          }
        },

        async addCheckin(habitId, photoUri, note) {
          const { duel } = get();
          if (!duel) throw new Error('Nenhum duelo ativo.');
          const id = randomUUID();
          const checkin: Checkin = {
            id,
            duelId: duel.id,
            playerId: actingId(),
            habitId,
            dateKey: todayKey(),
            createdAt: new Date().toISOString(),
            photoUri: persistPhoto(photoUri, id),
            note: note?.trim() || undefined,
            reactions: {},
          };
          set((s) => ({ checkins: [checkin, ...s.checkins], pendingSync: [...s.pendingSync, id] }));
          try {
            await backend().addCheckin(checkin);
            set((s) => ({ pendingSync: s.pendingSync.filter((p) => p !== id) }));
          } catch (e) {
            // Fica pendente e sobe no próximo refresh.
            set({ syncError: e instanceof Error ? e.message : String(e) });
          }
          return checkin;
        },

        async deleteCheckin(id) {
          const c = get().checkins.find((x) => x.id === id);
          if (!c) return;
          set((s) => ({ checkins: s.checkins.filter((x) => x.id !== id), pendingSync: s.pendingSync.filter((p) => p !== id) }));
          deleteLocalPhoto(c.photoUri);
          await backend().deleteCheckin(c).catch(() => {});
        },

        async react(checkinId, emoji) {
          const c = get().checkins.find((x) => x.id === checkinId);
          if (!c) return;
          const reactions = { ...c.reactions };
          const who = actingId();
          if (emoji) reactions[who] = emoji;
          else delete reactions[who];
          patchCheckin(checkinId, { reactions });
          await backend().updateCheckin(checkinId, { reactions }).catch(() => {});
        },

        async toggleDispute(checkinId) {
          const c = get().checkins.find((x) => x.id === checkinId);
          if (!c) return;
          patchCheckin(checkinId, { disputed: !c.disputed });
          await backend().updateCheckin(checkinId, { disputed: !c.disputed }).catch(() => {});
        },

        async updateDuel(patch) {
          const { duel } = get();
          if (!duel) return;
          set({ duel: { ...duel, ...patch } });
          await backend().updateDuel(duel.id, patch).catch(() => {});
        },

        updatePlayer(playerId, patch) {
          const { duel } = get();
          if (!duel) return;
          set({ duel: { ...duel, players: duel.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)) } });
        },

        setActivePlayer(id) {
          set({ activePlayerId: id });
        },

        markCelebrated(period, key) {
          const tag = `${period}:${key}`;
          set((s) => (s.celebrated.includes(tag) ? s : { celebrated: [...s.celebrated, tag].slice(-200) }));
        },

        setReminders(r) {
          set((s) => ({ reminders: { ...s.reminders, ...r } }));
        },
      };
    },
    {
      name: 'levelfit-game',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated, syncing, syncError, ...rest }) => rest,
      onRehydrateStorage: () => () => {
        useGame.setState({ hydrated: true });
      },
    },
  ),
);

/** Id do jogador que está agindo agora (no modo local pode alternar). */
export function useActingPlayerId(): string | null {
  return useGame((s) => (s.mode === 'local' ? s.activePlayerId : null) ?? s.meId);
}
