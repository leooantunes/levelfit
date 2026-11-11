import { addDays, periodEnd, periodKey, periodLabel, todayKey, toDateKey } from './dates';
import { CHALLENGE_MULTIPLIER, dailyChallenge, getHabit } from './habits';
import type { Checkin, Duel, Period, PeriodResult, Player, Standing } from './types';

export const PERFECT_DAY_BONUS = 30;

export type DayBreakdown = {
  dateKey: string;
  base: number;
  multiplier: number;
  perfect: boolean;
  total: number;
  /** habitId -> número de check-ins válidos (limitado a maxPerDay) */
  counts: Record<string, number>;
};

export function validCheckins(checkins: Checkin[]) {
  return checkins.filter((c) => !c.disputed);
}

/** Multiplicador de combo de acordo com a sequência de dias ativos. */
export function streakMultiplier(streak: number): number {
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1;
}

/**
 * Índice auxiliar: para cada jogador, os check-ins válidos agrupados por dia.
 * Construído uma vez e reaproveitado em todos os cálculos.
 */
export class ScoreBook {
  private byPlayerDay = new Map<string, Map<string, Checkin[]>>();
  private dayCache = new Map<string, DayBreakdown>();
  private streakCache = new Map<string, number>();

  constructor(
    public readonly duel: Duel,
    checkins: Checkin[],
  ) {
    for (const c of validCheckins(checkins)) {
      let days = this.byPlayerDay.get(c.playerId);
      if (!days) {
        days = new Map();
        this.byPlayerDay.set(c.playerId, days);
      }
      const list = days.get(c.dateKey) ?? [];
      list.push(c);
      days.set(c.dateKey, list);
    }
  }

  checkinsOn(playerId: string, dateKey: string): Checkin[] {
    return this.byPlayerDay.get(playerId)?.get(dateKey) ?? [];
  }

  activeDays(playerId: string): string[] {
    return [...(this.byPlayerDay.get(playerId)?.keys() ?? [])].sort();
  }

  isActive(playerId: string, dateKey: string) {
    return this.checkinsOn(playerId, dateKey).length > 0;
  }

  /** Sequência de dias ativos consecutivos terminando em `dateKey` (inclusive). */
  streakEndingAt(playerId: string, dateKey: string): number {
    const cacheKey = `${playerId}:${dateKey}`;
    const cached = this.streakCache.get(cacheKey);
    if (cached !== undefined) return cached;
    let streak = 0;
    let cursor = dateKey;
    while (this.isActive(playerId, cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    this.streakCache.set(cacheKey, streak);
    return streak;
  }

  /** Sequência atual: conta hoje se já fez algo, senão considera até ontem. */
  currentStreak(playerId: string, today = todayKey()): number {
    if (this.isActive(playerId, today)) return this.streakEndingAt(playerId, today);
    return this.streakEndingAt(playerId, addDays(today, -1));
  }

  bestStreak(playerId: string): number {
    let best = 0;
    for (const d of this.activeDays(playerId)) {
      best = Math.max(best, this.streakEndingAt(playerId, d));
    }
    return best;
  }

  day(playerId: string, dateKey: string): DayBreakdown {
    const cacheKey = `${playerId}:${dateKey}`;
    const cached = this.dayCache.get(cacheKey);
    if (cached) return cached;

    const goals = this.duel.habitIds;
    const challenge = dailyChallenge(this.duel.id, dateKey, goals);
    const raw: Record<string, number> = {};
    for (const c of this.checkinsOn(playerId, dateKey)) raw[c.habitId] = (raw[c.habitId] ?? 0) + 1;

    let base = 0;
    const counts: Record<string, number> = {};
    for (const [habitId, n] of Object.entries(raw)) {
      const habit = getHabit(habitId);
      if (!habit) continue;
      const isGoal = goals.includes(habitId);
      const isChallenge = habitId === challenge.id;
      if (!isGoal && !isChallenge) continue;
      const capped = Math.min(n, habit.maxPerDay);
      counts[habitId] = capped;
      base += capped * habit.points * (isChallenge && !isGoal ? CHALLENGE_MULTIPLIER : 1);
    }

    const perfect =
      goals.length > 0 &&
      goals.every((id) => (counts[id] ?? 0) >= (getHabit(id)?.maxPerDay ?? 1));
    // O combo usa a sequência até o dia anterior: entrar hoje não infla o próprio dia.
    const multiplier = base > 0 ? streakMultiplier(this.streakEndingAt(playerId, addDays(dateKey, -1)) + 1) : 1;
    const total = Math.round(base * multiplier) + (perfect ? PERFECT_DAY_BONUS : 0);

    const breakdown = { dateKey, base, multiplier, perfect, total, counts };
    this.dayCache.set(cacheKey, breakdown);
    return breakdown;
  }

  standings(period: Period, key: string): Standing[] {
    const end = periodEnd(period, key);
    const start = period === 'month' ? `${key}-01` : key;
    const rows = this.duel.players.map<Standing>((player) => {
      let points = 0;
      let checkins = 0;
      let perfectDays = 0;
      for (const d of this.activeDays(player.id)) {
        if (d < start || d > end) continue;
        const b = this.day(player.id, d);
        points += b.total;
        perfectDays += b.perfect ? 1 : 0;
        checkins += Object.values(b.counts).reduce((a, n) => a + n, 0);
      }
      return { player, points, checkins, perfectDays };
    });
    return rows.sort((a, b) => b.points - a.points || b.checkins - a.checkins);
  }

  result(period: Period, key: string, today = todayKey()): PeriodResult {
    const standings = this.standings(period, key);
    const [first, second] = standings;
    const tie = !!first && !!second && first.points === second.points && first.points > 0;
    const winner = first && first.points > 0 && !tie ? first.player : null;
    return { period, key, label: periodLabel(period, key, today), standings, winner, tie };
  }

  totalPoints(playerId: string): number {
    return this.activeDays(playerId).reduce((sum, d) => sum + this.day(playerId, d).total, 0);
  }

  /** Resultados de períodos já encerrados desde o início do duelo. */
  closedResults(period: Period, today = todayKey()): PeriodResult[] {
    const startKey = periodKey(period, toDateKey(new Date(this.duel.createdAt)));
    const currentKey = periodKey(period, today);
    const results: PeriodResult[] = [];
    let cursor = startKey;
    let guard = 0;
    while (cursor < currentKey && guard++ < 1000) {
      results.push(this.result(period, cursor, today));
      cursor = periodKey(period, addDays(periodEnd(period, cursor), 1));
    }
    return results;
  }

  winCount(playerId: string, period: Period, today = todayKey()): number {
    return this.closedResults(period, today).filter((r) => r.winner?.id === playerId).length;
  }
}

export function leaderOf(standings: Standing[]): Player | null {
  const [a, b] = standings;
  if (!a || a.points === 0) return null;
  if (b && a.points === b.points) return null;
  return a.player;
}
