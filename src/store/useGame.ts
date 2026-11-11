import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CryptoDigestAlgorithm,
  digestStringAsync,
  randomUUID,
} from "expo-crypto";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { addDays, fromDateKey, todayKey } from "@/domain/dates";
import { getHabit } from "@/domain/habits";
import { HEALTH_GOALS } from "@/domain/healthGoals";
import type { Checkin, Duel, Period } from "@/domain/types";
import {
  HEALTH_SOURCE,
  readDay,
  requestHealthAccess,
  SUPPORTED_METRICS,
} from "@/lib/health";
import {
  deleteLocalPhoto,
  persistPhoto,
  resolveLocalPhoto,
} from "@/lib/photos";
import { FREE_DUEL_LIMIT, presentPaywall, restorePurchases, type PaywallOutcome } from "@/lib/premium";
import {
  api,
  FREE_PLAN,
  type Account,
  type CreateDuelInput,
  type Plan,
  type Profile,
  type ReportReason,
  type Snapshot,
} from "@/sync/supabase";

type Reminders = { enabled: boolean; hour: number; minute: number };
type DuelPatch = Partial<Pick<Duel, "habitIds" | "stake" | "name">>;

type GameState = {
  hydrated: boolean;
  account: Account | null;
  /** Plano da conta (grátis ou Premium). Só o servidor decide; aqui é a cópia para a tela. */
  plan: Plan;
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
  /** Ler o relógio (Apple Health / Health Connect) e registrar metas batidas sozinho. */
  healthEnabled: boolean;
  /** Provas do relógio que a pessoa apagou: não são recriadas. */
  healthDismissed: string[];
  syncing: boolean;
  syncError: string | null;

  restoreSession: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    profile: Profile,
  ) => Promise<"signed-in" | "confirm-email">;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Exclui a conta no servidor e limpa tudo deste aparelho. */
  deleteAccount: () => Promise<void>;
  updateProfile: (profile: Profile) => Promise<void>;
  reportProof: (
    checkinId: string,
    reason: ReportReason,
    details?: string,
  ) => Promise<void>;

  refreshAll: () => Promise<void>;
  refreshDuel: (duelId: string) => Promise<void>;
  openDuel: (duelId: string) => void;
  createDuel: (input: Omit<CreateDuelInput, "me">) => Promise<string>;
  joinDuel: (code: string) => Promise<string>;
  leaveDuel: (duelId: string) => Promise<void>;
  /** Bloqueia o rival: sai do duelo, apaga as suas provas dele e impede novos duelos entre vocês. */
  blockRival: (duelId: string) => Promise<void>;
  updateDuel: (patch: DuelPatch) => Promise<void>;

  addCheckin: (
    habitId: string,
    photoUri: string,
    note?: string,
  ) => Promise<Checkin>;
  deleteCheckin: (id: string) => Promise<void>;
  react: (checkinId: string, emoji: string | null) => Promise<void>;
  toggleDispute: (checkinId: string) => Promise<void>;
  markCelebrated: (period: Period, key: string) => void;
  setReminders: (r: Partial<Reminders>) => void;
  /** Pede a permissão do app de saúde e liga a leitura automática. */
  enableHealth: () => Promise<boolean>;
  disableHealth: () => void;
  /** Lê o relógio (hoje e ontem) e registra as metas batidas em cada duelo. */
  syncHealth: () => Promise<number>;

  refreshPlan: () => Promise<void>;
  /** Compra o Premium na loja e confirma no servidor. Retorna false se a pessoa cancelou. */
  /** Mostra o Paywall do RevenueCat e, se comprou/restaurou, confirma no servidor. */
  openPaywall: () => Promise<PaywallOutcome>;
  restorePremium: () => Promise<boolean>;
  /** Pede ao servidor para reler a assinatura no RevenueCat (depois de comprar, restaurar ou mudar). */
  syncPlanFromStore: () => Promise<void>;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

/** UUID determinístico (formato v4) a partir de um texto, para provas do relógio. */
async function healthCheckinId(seed: string): Promise<string> {
  const hex = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    `levelfit-health:${seed}`,
  );
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export const celebrationTag = (duelId: string, period: Period, key: string) =>
  `${duelId}:${period}:${key}`;

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
          checkins: {
            ...s.checkins,
            [c.duelId]: (s.checkins[c.duelId] ?? []).map((x) =>
              x.id === c.id ? { ...x, ...patch } : x,
            ),
          },
        }));

      /** Junta o que veio do servidor com as provas locais (fotos offline e pendentes). */
      const mergeSnapshot = (s: GameState, snap: Snapshot) => {
        const local = s.checkins[snap.duel.id] ?? [];
        const localById = new Map(local.map((c) => [c.id, c]));
        const remoteIds = new Set(snap.checkins.map((c) => c.id));
        const merged = snap.checkins.map((c) => {
          const l = localById.get(c.id);
          // Prefere a foto local (abre offline e não expira), se o arquivo ainda existir.
          const localUri = l?.photoUri.startsWith("file://")
            ? resolveLocalPhoto(l.photoUri)
            : null;
          return localUri ? { ...c, photoUri: localUri } : c;
        });
        const pending = local
          .filter((c) => s.pendingSync.includes(c.id) && !remoteIds.has(c.id))
          .map((c) => ({
            ...c,
            photoUri: resolveLocalPhoto(c.photoUri) ?? c.photoUri,
          }));
        return [...pending, ...merged].sort(byNewest);
      };

      /**
       * Envia as provas da fila. Cada uma é tentada separadamente: se uma falhar, ela fica na fila
       * para a próxima vez e as outras (e o resto da sincronização) seguem normalmente.
       */
      const pushPending = async () => {
        let firstError: unknown = null;
        for (const id of get().pendingSync) {
          const c = findCheckin(id);
          try {
            if (c?.health) {
              await api.addCheckin(c);
            } else if (c) {
              const photoUri = resolveLocalPhoto(c.photoUri);
              if (!photoUri)
                throw new Error("a foto não está mais no aparelho");
              await api.addCheckin({ ...c, photoUri });
            }
            set((s) => ({
              pendingSync: s.pendingSync.filter((p) => p !== id),
            }));
          } catch (e) {
            firstError ??= e;
          }
        }
        if (firstError)
          set({ syncError: `Prova não enviada: ${errorText(firstError)}` });
      };

      const removeDuelLocally = (duelId: string) => {
        for (const c of get().checkins[duelId] ?? [])
          deleteLocalPhoto(c.photoUri);
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
        for (const list of Object.values(get().checkins))
          for (const c of list) deleteLocalPhoto(c.photoUri);
        set({ account: null, plan: FREE_PLAN, ...EMPTY_DATA });
      };

      const addDuel = (duel: Duel, checkins: Checkin[] = []) =>
        set((s) => ({
          duels: { ...s.duels, [duel.id]: duel },
          checkins: { ...s.checkins, [duel.id]: checkins },
          duelOrder: [duel.id, ...s.duelOrder.filter((id) => id !== duel.id)],
        }));

      let healthRun: Promise<number> | null = null;

      const activeDuel = () => {
        const { activeDuelId, duels } = get();
        const duel = activeDuelId ? duels[activeDuelId] : undefined;
        if (!duel) throw new Error("Nenhum duelo aberto.");
        return duel;
      };

      return {
        hydrated: false,
        account: null,
        plan: FREE_PLAN,
        ...EMPTY_DATA,
        reminders: { enabled: true, hour: 20, minute: 0 },
        healthEnabled: false,
        healthDismissed: [],
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
            if (get().account && get().account!.id !== account.id)
              clearLocalData();
            set({ account });
          } catch {
            // Sem rede: segue com a conta em cache.
          }
        },

        async signUp(email, password, profile) {
          const account = await api.signUp(email, password, profile);
          if (!account) return "confirm-email";
          clearLocalData();
          set({ account });
          return "signed-in";
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

        async deleteAccount() {
          await api.deleteAccount();
          clearLocalData();
        },

        async reportProof(checkinId, reason, details) {
          const c = findCheckin(checkinId);
          if (!c) throw new Error("Prova não encontrada.");
          await api.reportProof(c, reason, details);
        },

        async updateProfile(profile) {
          const account = await api.updateProfile(profile);
          set((s) => {
            const duels: Record<string, Duel> = {};
            for (const [id, d] of Object.entries(s.duels)) {
              duels[id] = {
                ...d,
                players: d.players.map((p) =>
                  p.id === account.id ? { ...p, ...profile } : p,
                ),
              };
            }
            return { account, duels };
          });
        },

        async refreshPlan() {
          if (!get().account) return;
          try {
            set({ plan: await api.getPlan() });
          } catch {
            // Sem rede: mantém o plano em cache (o servidor confere de novo ao criar/entrar em duelo).
          }
        },

        async openPaywall() {
          const outcome = await presentPaywall();
          if (outcome === 'purchased' || outcome === 'restored' || outcome === 'already-pro') {
            // A loja confirmou; o servidor confere no RevenueCat e libera os duelos.
            await get().syncPlanFromStore();
          }
          return outcome;
        },

        async restorePremium() {
          await restorePurchases();
          await get().syncPlanFromStore();
          return get().plan.premium;
        },

        async syncPlanFromStore() {
          if (!get().account) return;
          set({ plan: await api.syncPlan() });
        },

        async refreshAll() {
          if (!get().account) return;
          set({ syncing: true, syncError: null });
          get().refreshPlan();
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
              const ordered = snaps
                .map((x) => x.duel)
                .sort(byNewest)
                .map((d) => d.id);
              return {
                duels,
                checkins,
                duelOrder: ordered,
                activeDuelId:
                  s.activeDuelId && duels[s.activeDuelId]
                    ? s.activeDuelId
                    : null,
              };
            });
          } catch (e) {
            set({ syncError: errorText(e) });
          } finally {
            set({ syncing: false });
          }
          // Depois de ter as provas do servidor (evita criar de novo o que já subiu).
          await get()
            .syncHealth()
            .catch(() => {});
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
          if (!account) throw new Error("Entre na sua conta primeiro.");
          const { name, avatar, color } = account;
          const duel = await api.createDuel({
            ...input,
            me: { name, avatar, color },
          });
          addDuel(duel);
          return duel.id;
        },

        async joinDuel(code) {
          const { account } = get();
          if (!account) throw new Error("Entre na sua conta primeiro.");
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

        async blockRival(duelId) {
          const me = get().account?.id;
          const mine = (get().checkins[duelId] ?? [])
            .filter((c) => c.playerId === me)
            .map((c) => c.id);
          await api.blockRival(duelId, mine);
          removeDuelLocally(duelId);
        },

        async updateDuel(patch) {
          const duel = activeDuel();
          set((s) => ({
            duels: { ...s.duels, [duel.id]: { ...duel, ...patch } },
          }));
          await api
            .updateDuel(duel.id, patch)
            .catch((e) => set({ syncError: errorText(e) }));
        },

        async addCheckin(habitId, photoUri, note) {
          const duel = activeDuel();
          const { account } = get();
          if (!account) throw new Error("Entre na sua conta primeiro.");
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
            checkins: {
              ...s.checkins,
              [duel.id]: [checkin, ...(s.checkins[duel.id] ?? [])],
            },
            pendingSync: [...s.pendingSync, id],
          }));
          try {
            await api.addCheckin(checkin);
            set((s) => ({
              pendingSync: s.pendingSync.filter((p) => p !== id),
            }));
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
            checkins: {
              ...s.checkins,
              [c.duelId]: (s.checkins[c.duelId] ?? []).filter(
                (x) => x.id !== id,
              ),
            },
            pendingSync: s.pendingSync.filter((p) => p !== id),
          }));
          if (c.health)
            set((s) => ({
              healthDismissed: [...s.healthDismissed, c.id].slice(-200),
            }));
          else deleteLocalPhoto(c.photoUri);
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
          try {
            // O servidor devolve as reações atuais (inclui a do rival, se ele reagiu ao mesmo tempo).
            patchCheckin(c, {
              reactions: await api.setReaction(checkinId, emoji),
            });
          } catch (e) {
            patchCheckin(c, { reactions: c.reactions });
            set({ syncError: errorText(e) });
          }
        },

        async toggleDispute(checkinId) {
          const c = findCheckin(checkinId);
          if (!c) return;
          patchCheckin(c, { disputed: !c.disputed });
          try {
            await api.updateCheckin(checkinId, { disputed: !c.disputed });
          } catch (e) {
            patchCheckin(c, { disputed: c.disputed });
            set({ syncError: errorText(e) });
          }
        },

        markCelebrated(period, key) {
          const duelId = get().activeDuelId;
          if (!duelId) return;
          const tag = celebrationTag(duelId, period, key);
          set((s) =>
            s.celebrated.includes(tag)
              ? s
              : { celebrated: [...s.celebrated, tag].slice(-500) },
          );
        },

        setReminders(r) {
          set((s) => ({ reminders: { ...s.reminders, ...r } }));
        },

        async enableHealth() {
          const ok = await requestHealthAccess();
          if (!ok) return false;
          set({ healthEnabled: true });
          await get().syncHealth();
          return true;
        },

        disableHealth() {
          set({ healthEnabled: false });
        },

        syncHealth() {
          // Uma leitura por vez: refreshAll roda ao voltar ao app e ao puxar a tela.
          healthRun ??= readHealthGoals().finally(() => {
            healthRun = null;
          });
          return healthRun;
        },
      };

      async function readHealthGoals(): Promise<number> {
        const { account, healthEnabled } = get();
        if (!account || !healthEnabled || !HEALTH_SOURCE) return 0;
        const source = HEALTH_SOURCE;
        const today = todayKey();
        const habitIds = [
          ...new Set(Object.values(get().duels).flatMap((d) => d.habitIds)),
        ].filter((id) => {
          const goal = HEALTH_GOALS[id];
          return goal && SUPPORTED_METRICS.includes(goal.metric);
        });
        let created = 0;
        // Ontem também: quem não abriu o app antes da meia-noite não perde a meta batida.
        for (const dateKey of [addDays(today, -1), today]) {
          for (const habitId of habitIds) {
            const goal = HEALTH_GOALS[habitId];
            const value = await readDay(goal.metric, dateKey);
            if (value === null || value < goal.target) continue;
            const maxPerDay = getHabit(habitId)?.maxPerDay ?? 1;
            for (const duel of Object.values(get().duels)) {
              if (!duel.habitIds.includes(habitId)) continue;
              const list = get().checkins[duel.id] ?? [];
              const mine = list.filter(
                (c) =>
                  c.playerId === account.id &&
                  c.habitId === habitId &&
                  c.dateKey === dateKey,
              );
              if (mine.length >= maxPerDay) continue; // já pontuou (com foto ou pelo relógio)
              // Id fixo por duelo/pessoa/meta/dia: outro aparelho ou nova tentativa não duplica.
              const id = await healthCheckinId(
                `${duel.id}:${account.id}:${habitId}:${dateKey}`,
              );
              if (
                list.some((c) => c.id === id) ||
                get().healthDismissed.includes(id)
              )
                continue;
              const checkin: Checkin = {
                id,
                duelId: duel.id,
                playerId: account.id,
                habitId,
                dateKey,
                createdAt:
                  dateKey === today
                    ? new Date().toISOString()
                    : new Date(
                        fromDateKey(today).getTime() - 60_000,
                      ).toISOString(),
                photoUri: "",
                health: {
                  metric: goal.metric,
                  value: Math.round(value),
                  source,
                },
                reactions: {},
              };
              set((s) => ({
                checkins: {
                  ...s.checkins,
                  [duel.id]: [checkin, ...(s.checkins[duel.id] ?? [])].sort(
                    byNewest,
                  ),
                },
                pendingSync: [...s.pendingSync, id],
              }));
              created++;
              try {
                await api.addCheckin(checkin);
                set((s) => ({
                  pendingSync: s.pendingSync.filter((p) => p !== id),
                }));
              } catch (e) {
                set({ syncError: errorText(e) });
              }
            }
          }
        }
        return created;
      }
    },
    {
      name: "levelfit-game",
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
  return useGame((s) =>
    s.activeDuelId ? (s.duels[s.activeDuelId] ?? null) : null,
  );
}

/** Provas do duelo aberto. */
export function useActiveCheckins(): Checkin[] {
  return useGame((s) =>
    s.activeDuelId ? (s.checkins[s.activeDuelId] ?? NO_CHECKINS) : NO_CHECKINS,
  );
}

/** Id do jogador logado (é o mesmo em todos os duelos). */
export function useMyId(): string | null {
  return useGame((s) => s.account?.id ?? null);
}

/** Pode criar ou entrar em mais um duelo? (Premium, ou abaixo do limite do plano grátis.) */
export function useCanAddDuel(): boolean {
  return useGame((s) => s.plan.premium || s.duelOrder.length < FREE_DUEL_LIMIT);
}
