/**
 * Integração com relógio / app de saúde. Implementações por plataforma:
 * health.ios.ts (Apple Health) e health.android.ts (Health Connect).
 * Este arquivo vale para a web: nada disponível.
 */
import type { HealthMetric } from '@/domain/types';

/** Nome do app de saúde da plataforma, ou null se não houver. */
export const HEALTH_SOURCE: string | null = null;

/** Medidas que esta plataforma consegue ler. */
export const SUPPORTED_METRICS: readonly HealthMetric[] = [];

export async function isHealthAvailable(): Promise<boolean> {
  return false;
}

/** Abre o pedido de permissão. Retorna false se não deu para pedir. */
export async function requestHealthAccess(): Promise<boolean> {
  return false;
}

/** Valor do dia (passos ou minutos). null = sem dado ou sem permissão. */
export async function readDay(_metric: HealthMetric, _dateKey: string): Promise<number | null> {
  return null;
}

/** Abre os ajustes de permissão do app de saúde. */
export function openHealthSettings(): void {}
