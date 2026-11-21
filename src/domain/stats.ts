import { addDays, daysBetween, toDateKey } from './dates';
import { duelGoals } from './habits';
import type { ScoreBook } from './scoring';
import type { Habit, Player } from './types';

export type PlayerStats = {
  player: Player;
  total: number;
  /** Pontos por dia, alinhados com `StatsRange.days`. */
  daily: number[];
  average: number;
  bestDay: { dateKey: string; points: number } | null;
  activeDays: number;
  perfectDays: number;
  /** Dias em que foi o único com mais pontos. */
  dayWins: number;
  /** Check-ins válidos por meta. */
  habitCounts: Record<string, number>;
};

export type StatsRange = {
  days: string[];
  players: PlayerStats[];
  goals: Habit[];
};

/** Dias de `from` a `to` (inclusive), sem passar do início do duelo. */
export function rangeDays(duelStart: string, to: string, lastN: number | null): string[] {
  const from = lastN === null ? duelStart : addDays(to, -(lastN - 1));
  const start = from < duelStart ? duelStart : from;
  const n = Math.max(0, daysBetween(start, to) + 1);
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}

/** Estatísticas do duelo no período: pontos por dia, médias, recordes, vitórias e metas. */
export function duelStats(book: ScoreBook, today: string, lastN: number | null): StatsRange {
  const duel = book.duel;
  const days = rangeDays(toDateKey(new Date(duel.createdAt)), today, lastN);
  const goals = duelGoals(duel);

  const players = duel.players.map<PlayerStats>((player) => {
    const daily = days.map((d) => book.day(player.id, d).total);
    let best: PlayerStats['bestDay'] = null;
    let activeDays = 0;
    let perfectDays = 0;
    const habitCounts: Record<string, number> = {};
    days.forEach((d, i) => {
      const b = book.day(player.id, d);
      if (daily[i] > 0) activeDays++;
      if (b.perfect) perfectDays++;
      if (daily[i] > 0 && (!best || daily[i] > best.points)) best = { dateKey: d, points: daily[i] };
      for (const [id, n] of Object.entries(b.counts)) habitCounts[id] = (habitCounts[id] ?? 0) + n;
    });
    const total = daily.reduce((a, b) => a + b, 0);
    return {
      player,
      total,
      daily,
      average: days.length ? Math.round(total / days.length) : 0,
      bestDay: best,
      activeDays,
      perfectDays,
      dayWins: 0,
      habitCounts,
    };
  });

  // Vitória do dia: o único com mais pontos (empate não conta). Hoje ainda não acabou.
  days.forEach((d, i) => {
    if (d >= today) return;
    const pts = players.map((p) => p.daily[i]);
    const max = Math.max(...pts);
    if (max <= 0 || pts.filter((x) => x === max).length > 1) return;
    players[pts.indexOf(max)].dayWins++;
  });

  return { days, players: players.sort((a, b) => b.total - a.total), goals };
}
