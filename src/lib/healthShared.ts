import { addDays, fromDateKey } from '@/domain/dates';
import type { HealthMetric } from '@/domain/types';

export type Interval = { start: number; end: number };

/**
 * Soma os minutos cobertos pelos intervalos, sem contar duas vezes o que se sobrepõe
 * (o relógio e o celular costumam registrar o mesmo sono ou treino).
 */
export function mergedMinutes(intervals: Interval[]): number {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let cur: Interval | null = null;
  for (const i of sorted) {
    if (cur && i.start <= cur.end) {
      cur.end = Math.max(cur.end, i.end);
    } else {
      if (cur) total += cur.end - cur.start;
      cur = { ...i };
    }
  }
  if (cur) total += cur.end - cur.start;
  return total / 60_000;
}

/**
 * Janela de leitura de cada medida para um dia (YYYY-MM-DD, horário local).
 * Sono: a noite que termina naquele dia (18h do dia anterior até 14h do dia).
 */
export function windowFor(metric: HealthMetric, dateKey: string): { start: Date; end: Date } {
  const dayStart = fromDateKey(dateKey);
  const dayEnd = fromDateKey(addDays(dateKey, 1));
  if (metric === 'sleep') {
    const start = new Date(dayStart);
    start.setHours(start.getHours() - 6);
    const end = new Date(dayStart);
    end.setHours(14);
    return { start, end: end < new Date() ? end : new Date() };
  }
  return { start: dayStart, end: dayEnd < new Date() ? dayEnd : new Date() };
}
