/**
 * Apple Health (HealthKit). Recebe dados do Apple Watch e de outros relógios
 * (Garmin, Fitbit, Amazfit…) cujos apps sincronizam com o Saúde do iPhone.
 * Dados digitados à mão no app Saúde não contam (HKWasUserEntered).
 */
import {
  isHealthDataAvailable,
  queryCategorySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

import type { HealthMetric } from '@/domain/types';
import { mergedMinutes, windowFor } from './healthShared';

export const HEALTH_SOURCE: string | null = 'Apple Health';

export const SUPPORTED_METRICS: readonly HealthMetric[] = ['steps', 'exercise', 'sleep', 'mindful', 'daylight'];

const USER_ENTERED = 'HKWasUserEntered';
/** asleepUnspecified, asleepCore, asleepDeep, asleepREM (HKCategoryValueSleepAnalysis). */
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKQuantityTypeIdentifierTimeInDaylight',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKCategoryTypeIdentifierMindfulSession',
  'HKWorkoutTypeIdentifier',
] as const;

export async function isHealthAvailable(): Promise<boolean> {
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

/**
 * A Apple não conta ao app se a leitura foi permitida (privacidade): só sabemos que o
 * pedido foi mostrado. Sem permissão, as consultas voltam vazias.
 */
export async function requestHealthAccess(): Promise<boolean> {
  if (!(await isHealthAvailable())) return false;
  try {
    return await requestAuthorization({ toRead: READ_TYPES });
  } catch {
    return false;
  }
}

const notUserEntered = (m: unknown) => !(m && typeof m === 'object' && (m as Record<string, unknown>)[USER_ENTERED]);

async function sumQuantity(
  identifier: 'HKQuantityTypeIdentifierStepCount' | 'HKQuantityTypeIdentifierAppleExerciseTime' | 'HKQuantityTypeIdentifierTimeInDaylight',
  unit: 'count' | 'min',
  start: Date,
  end: Date,
): Promise<number> {
  const res = await queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
    unit,
    filter: { date: { startDate: start, endDate: end }, NOT: [{ metadata: { withMetadataKey: USER_ENTERED } }] },
  });
  return res.sumQuantity?.quantity ?? 0;
}

async function categoryMinutes(
  identifier: 'HKCategoryTypeIdentifierSleepAnalysis' | 'HKCategoryTypeIdentifierMindfulSession',
  start: Date,
  end: Date,
  accept: (value: number) => boolean,
): Promise<number> {
  const samples = await queryCategorySamples(identifier, { limit: 0, filter: { date: { startDate: start, endDate: end } } });
  return mergedMinutes(
    samples
      .filter((s) => accept(Number(s.value)) && notUserEntered(s.metadata))
      .map((s) => ({ start: Math.max(s.startDate.getTime(), start.getTime()), end: Math.min(s.endDate.getTime(), end.getTime()) })),
  );
}

export async function readDay(metric: HealthMetric, dateKey: string): Promise<number | null> {
  const { start, end } = windowFor(metric, dateKey);
  if (end <= start) return null;
  try {
    switch (metric) {
      case 'steps':
        return await sumQuantity('HKQuantityTypeIdentifierStepCount', 'count', start, end);
      case 'daylight':
        return await sumQuantity('HKQuantityTypeIdentifierTimeInDaylight', 'min', start, end);
      case 'exercise': {
        // Apple Watch grava "minutos de exercício"; outros relógios gravam treinos. Vale o maior.
        const [ring, workouts] = await Promise.all([
          sumQuantity('HKQuantityTypeIdentifierAppleExerciseTime', 'min', start, end),
          queryWorkoutSamples({ limit: 0, filter: { date: { startDate: start, endDate: end } } }),
        ]);
        const fromWorkouts = mergedMinutes(
          workouts
            .filter((w) => notUserEntered(w.metadata))
            .map((w) => ({ start: w.startDate.getTime(), end: w.endDate.getTime() })),
        );
        return Math.max(ring, fromWorkouts);
      }
      case 'sleep':
        return await categoryMinutes('HKCategoryTypeIdentifierSleepAnalysis', start, end, (v) => ASLEEP_VALUES.has(v));
      case 'mindful':
        return await categoryMinutes('HKCategoryTypeIdentifierMindfulSession', start, end, () => true);
    }
  } catch {
    return null;
  }
}

/** No iOS as permissões ficam em Saúde → Compartilhamento → Apps; o mais perto é o app Saúde. */
export function openHealthSettings(): void {
  Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
}
