import type { ScoreBook } from './scoring';
import type { Checkin } from './types';

const TITLES = [
  'Saco de Pancada',
  'Novato',
  'Amador',
  'Peso-Pena',
  'Peso-Médio',
  'Peso-Pesado',
  'Campeão',
  'Lenda do Ringue',
];

/** XP necessário para alcançar o nível `level` (nível 1 = 0 XP). */
export function xpForLevel(level: number): number {
  return Math.round(60 * (level - 1) ** 1.6);
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))],
    xpInLevel: xp - current,
    xpToNext: next - current,
    progress: (xp - current) / (next - current),
  };
}

export type Achievement = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
};

export function achievementsFor(book: ScoreBook, playerId: string, checkins: Checkin[]): Achievement[] {
  const mine = checkins.filter((c) => c.playerId === playerId && !c.disputed);
  const countOf = (habitId: string) => mine.filter((c) => c.habitId === habitId).length;
  const days = book.activeDays(playerId);
  const perfectDays = days.filter((d) => book.day(playerId, d).perfect).length;
  const bestStreak = book.bestStreak(playerId);
  const dayWins = book.winCount(playerId, 'day');
  const weekWins = book.winCount(playerId, 'week');
  const monthWins = book.winCount(playerId, 'month');
  const earlyBird = mine.some((c) => new Date(c.createdAt).getHours() < 7);
  const reactionsReceived = mine.reduce((n, c) => n + Object.keys(c.reactions ?? {}).length, 0);

  const list: (Omit<Achievement, 'unlocked'> & { ok: boolean })[] = [
    { id: 'first', emoji: '🎯', title: 'Primeiro passo', description: 'Faça seu primeiro check-in.', ok: mine.length >= 1 },
    { id: 'perfect', emoji: '💯', title: 'Dia perfeito', description: 'Complete todas as metas em um dia.', ok: perfectDays >= 1 },
    { id: 'perfect-5', emoji: '🌟', title: 'Perfeccionista', description: '5 dias perfeitos.', ok: perfectDays >= 5 },
    { id: 'streak-3', emoji: '🔥', title: 'Pegando fogo', description: 'Sequência de 3 dias.', ok: bestStreak >= 3 },
    { id: 'streak-7', emoji: '⚡', title: 'Semana invicta', description: 'Sequência de 7 dias.', ok: bestStreak >= 7 },
    { id: 'streak-30', emoji: '🏔️', title: 'Inabalável', description: 'Sequência de 30 dias.', ok: bestStreak >= 30 },
    { id: 'reader', emoji: '📖', title: 'Rato de biblioteca', description: '20 sessões de leitura.', ok: countOf('leitura') >= 20 },
    { id: 'water', emoji: '🐳', title: 'Hidratado', description: '30 dias batendo 2L de água.', ok: countOf('agua') >= 30 },
    { id: 'gym', emoji: '🦾', title: 'Rato de academia', description: '20 treinos registrados.', ok: countOf('exercicio') >= 20 },
    { id: 'chef', emoji: '👨‍🍳', title: 'Chef fit', description: '50 refeições da dieta.', ok: countOf('refeicao') >= 50 },
    { id: 'early', emoji: '🐓', title: 'Madrugador', description: 'Check-in antes das 7h.', ok: earlyBird },
    { id: 'day-win', emoji: '🥇', title: 'Vencedor do dia', description: 'Vença um dia.', ok: dayWins >= 1 },
    { id: 'week-win', emoji: '🏆', title: 'Campeão da semana', description: 'Vença uma semana.', ok: weekWins >= 1 },
    { id: 'month-win', emoji: '👑', title: 'Rei do mês', description: 'Vença um mês.', ok: monthWins >= 1 },
    { id: 'popular', emoji: '❤️‍🔥', title: 'Inspiração', description: 'Receba 10 reações.', ok: reactionsReceived >= 10 },
  ];
  return list.map(({ ok, ...a }) => ({ ...a, unlocked: ok }));
}
