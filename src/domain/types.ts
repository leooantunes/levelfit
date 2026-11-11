export type HabitCategory = 'mente' | 'corpo' | 'nutricao' | 'bem-estar';

export type Habit = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  /** Pontos base por check-in. */
  points: number;
  category: HabitCategory;
  /** Quantas vezes por dia o hábito pode pontuar (ex.: 3 refeições). */
  maxPerDay: number;
  /** Dica do que mostrar na foto de prova. */
  proofHint: string;
};

export type Player = {
  id: string;
  name: string;
  avatar: string;
  color: string;
};

export type Checkin = {
  id: string;
  duelId: string;
  playerId: string;
  habitId: string;
  /** Dia local no formato YYYY-MM-DD. */
  dateKey: string;
  createdAt: string;
  /** URI local (file://) ou URL remota da foto de prova. */
  photoUri: string;
  note?: string;
  /** Reações dos jogadores: playerId -> emoji. */
  reactions: Record<string, string>;
  /** Prova contestada pelo adversário (não pontua). */
  disputed?: boolean;
};

export type Duel = {
  id: string;
  /** Código de convite (modo online). */
  code: string;
  name: string;
  createdAt: string;
  habitIds: string[];
  /** Aposta: o que o perdedor da semana/mês paga. */
  stake?: string;
  players: Player[];
};

export type Period = 'day' | 'week' | 'month';

export type Standing = {
  player: Player;
  points: number;
  checkins: number;
  perfectDays: number;
};

export type PeriodResult = {
  period: Period;
  key: string;
  label: string;
  standings: Standing[];
  /** null = empate ou ninguém pontuou. */
  winner: Player | null;
  tie: boolean;
};
