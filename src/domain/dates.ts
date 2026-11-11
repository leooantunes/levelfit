const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Semana começa na segunda-feira. A chave da semana é o dateKey da segunda. */
export function weekKey(dateKey: string): string {
  const d = fromDateKey(dateKey);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dow);
  return toDateKey(d);
}

export function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function periodKey(period: 'day' | 'week' | 'month', dateKey: string): string {
  if (period === 'day') return dateKey;
  if (period === 'week') return weekKey(dateKey);
  return monthKey(dateKey);
}

/** Último dia (inclusive) do período. */
export function periodEnd(period: 'day' | 'week' | 'month', key: string): string {
  if (period === 'day') return key;
  if (period === 'week') return addDays(key, 6);
  const [y, m] = key.split('-').map(Number);
  return toDateKey(new Date(y, m, 0));
}

export function periodContains(period: 'day' | 'week' | 'month', key: string, dateKey: string) {
  return periodKey(period, dateKey) === key;
}

/** Chave do período anterior ao que contém `dateKey`. */
export function previousPeriodKey(period: 'day' | 'week' | 'month', dateKey: string): string {
  if (period === 'day') return addDays(dateKey, -1);
  if (period === 'week') return addDays(weekKey(dateKey), -7);
  const d = fromDateKey(`${monthKey(dateKey)}-01`);
  d.setMonth(d.getMonth() - 1);
  return monthKey(toDateKey(d));
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function periodLabel(period: 'day' | 'week' | 'month', key: string, today = todayKey()): string {
  if (period === 'day') {
    if (key === today) return 'Hoje';
    if (key === addDays(today, -1)) return 'Ontem';
    const d = fromDateKey(key);
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}/${pad(d.getMonth() + 1)}`;
  }
  if (period === 'week') {
    const end = fromDateKey(periodEnd('week', key));
    const start = fromDateKey(key);
    return `Semana ${start.getDate()}/${pad(start.getMonth() + 1)} – ${end.getDate()}/${pad(end.getMonth() + 1)}`;
  }
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
