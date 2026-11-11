import type { Checkin, Duel, Player } from '@/domain/types';

export type CreateDuelInput = {
  name: string;
  habitIds: string[];
  stake?: string;
  me: Omit<Player, 'id'>;
  /** Só no modo local: o adversário joga no mesmo aparelho. */
  opponent?: Omit<Player, 'id'>;
};

export type Snapshot = { duel: Duel; checkins: Checkin[] };

export interface Backend {
  readonly kind: 'local' | 'online';
  createDuel(input: CreateDuelInput): Promise<{ duel: Duel; meId: string }>;
  joinDuel(code: string, me: Omit<Player, 'id'>): Promise<{ duel: Duel; meId: string }>;
  fetch(duelId: string): Promise<Snapshot>;
  addCheckin(checkin: Checkin): Promise<Checkin>;
  updateCheckin(id: string, patch: Partial<Pick<Checkin, 'reactions' | 'disputed'>>): Promise<void>;
  deleteCheckin(checkin: Checkin): Promise<void>;
  updateDuel(duelId: string, patch: Partial<Pick<Duel, 'habitIds' | 'stake' | 'name'>>): Promise<void>;
  subscribe(duelId: string, onChange: () => void): () => void;
}
