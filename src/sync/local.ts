import { randomUUID } from 'expo-crypto';

import type { Backend } from './backend';

/**
 * Backend local: tudo fica no aparelho (AsyncStorage via store).
 * Os dois jogadores usam o mesmo celular, alternando quem faz o check-in.
 */
export const localBackend: Backend = {
  kind: 'local',
  async createDuel(input) {
    const meId = randomUUID();
    const players = [{ ...input.me, id: meId }];
    if (input.opponent) players.push({ ...input.opponent, id: randomUUID() });
    return {
      meId,
      duel: {
        id: randomUUID(),
        code: randomUUID().slice(0, 6).toUpperCase(),
        name: input.name,
        createdAt: new Date().toISOString(),
        habitIds: input.habitIds,
        stake: input.stake,
        players,
      },
    };
  },
  async joinDuel() {
    throw new Error('Entrar com código exige o modo online (configure o Supabase).');
  },
  async fetch() {
    throw new Error('Modo local não sincroniza.');
  },
  async addCheckin(c) {
    return c;
  },
  async updateCheckin() {},
  async deleteCheckin() {},
  async updateDuel() {},
  subscribe() {
    return () => {};
  },
};
