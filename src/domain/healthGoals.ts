import type { HealthMetric, HealthProof } from './types';

/** Metas que o relógio confirma sozinho: hábito -> medida e alvo do dia. */
export const HEALTH_GOALS: Record<string, { metric: HealthMetric; target: number }> = {
  passos: { metric: 'steps', target: 10_000 },
  exercicio: { metric: 'exercise', target: 30 },
  sono: { metric: 'sleep', target: 7 * 60 },
  meditacao: { metric: 'mindful', target: 10 },
  'ar-livre': { metric: 'daylight', target: 20 },
};

export const METRIC_LABEL: Record<HealthMetric, string> = {
  steps: 'passos',
  exercise: 'de treino',
  sleep: 'de sono',
  mindful: 'de meditação',
  daylight: 'ao ar livre',
};

function minutes(m: number) {
  const total = Math.round(m);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${h}h${String(rest).padStart(2, '0')}` : `${h}h`;
}

/** "10.432 passos", "7h40 de sono", "35 min de treino". */
export function formatHealthValue(p: Pick<HealthProof, 'metric' | 'value'>): string {
  const n = p.metric === 'steps' ? Math.round(p.value).toLocaleString('pt-BR') : minutes(p.value);
  return `${n} ${METRIC_LABEL[p.metric]}`;
}
