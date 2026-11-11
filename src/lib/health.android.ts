/**
 * Health Connect (Android). Recebe dados de Galaxy Watch, Pixel Watch, Garmin, Fitbit
 * e outros apps que sincronizam com o Health Connect.
 * Registros digitados à mão (RECORDING_METHOD_MANUAL_ENTRY) não contam.
 */
import { Linking } from 'react-native';
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import type { HealthMetric } from '@/domain/types';
import { mergedMinutes, windowFor, type Interval } from './healthShared';

export const HEALTH_SOURCE: string | null = 'Health Connect';

export const SUPPORTED_METRICS: readonly HealthMetric[] = ['steps', 'exercise', 'sleep', 'mindful'];

const MANUAL_ENTRY = 3; // RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY
/** SleepStageType: SLEEPING, LIGHT, DEEP, REM. */
const ASLEEP_STAGES = new Set([2, 4, 5, 6]);

type ReadableType = 'Steps' | 'ExerciseSession' | 'SleepSession' | 'MindfulnessSession';
const RECORD_FOR: Record<Exclude<HealthMetric, 'daylight'>, ReadableType> = {
  steps: 'Steps',
  exercise: 'ExerciseSession',
  sleep: 'SleepSession',
  mindful: 'MindfulnessSession',
};

let ready: Promise<boolean> | null = null;
function ensureReady(): Promise<boolean> {
  ready ??= (async () => {
    try {
      if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
      return await initialize();
    } catch {
      return false;
    }
  })().then((ok) => {
    if (!ok) ready = null; // tenta de novo depois (ex.: instalou o Health Connect)
    return ok;
  });
  return ready;
}

export async function isHealthAvailable(): Promise<boolean> {
  return ensureReady();
}

export async function requestHealthAccess(): Promise<boolean> {
  if (!(await ensureReady())) {
    // Sem o Health Connect (Android antigo): abre a loja para instalar.
    Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() => {});
    return false;
  }
  try {
    const granted = await requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ExerciseSession' },
      { accessType: 'read', recordType: 'SleepSession' },
    ]);
    // Meditação depende de uma versão mais nova do Health Connect: pede à parte.
    await requestPermission([{ accessType: 'read', recordType: 'MindfulnessSession' }]).catch(() => []);
    return granted.length > 0;
  } catch {
    return false;
  }
}

async function hasRead(recordType: ReadableType) {
  const granted = await getGrantedPermissions();
  return granted.some((p) => 'recordType' in p && p.recordType === recordType && p.accessType === 'read');
}

/** Lê todas as páginas de registros do intervalo, sem os digitados à mão. */
async function readAll<T extends ReadableType>(recordType: T, start: Date, end: Date) {
  const out = [];
  let pageToken: string | undefined;
  do {
    const res = await readRecords(recordType, {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      pageToken,
    });
    out.push(...res.records.filter((r) => r.metadata?.recordingMethod !== MANUAL_ENTRY));
    pageToken = res.pageToken || undefined;
  } while (pageToken);
  return out;
}

const clip = (s: string, e: string, start: Date, end: Date): Interval => ({
  start: Math.max(new Date(s).getTime(), start.getTime()),
  end: Math.min(new Date(e).getTime(), end.getTime()),
});

export async function readDay(metric: HealthMetric, dateKey: string): Promise<number | null> {
  if (metric === 'daylight' || !(await ensureReady())) return null;
  const recordType = RECORD_FOR[metric];
  const { start, end } = windowFor(metric, dateKey);
  if (end <= start) return null;
  try {
    if (!(await hasRead(recordType))) return null;
    switch (metric) {
      case 'steps': {
        // Celular e relógio gravam os mesmos passos: soma por app de origem e fica com o maior.
        const byOrigin = new Map<string, number>();
        for (const r of await readAll('Steps', start, end)) {
          const origin = r.metadata?.dataOrigin ?? '?';
          byOrigin.set(origin, (byOrigin.get(origin) ?? 0) + r.count);
        }
        return Math.max(0, ...byOrigin.values());
      }
      case 'exercise':
        return mergedMinutes((await readAll('ExerciseSession', start, end)).map((r) => clip(r.startTime, r.endTime, start, end)));
      case 'mindful':
        return mergedMinutes((await readAll('MindfulnessSession', start, end)).map((r) => clip(r.startTime, r.endTime, start, end)));
      case 'sleep': {
        const intervals: Interval[] = [];
        for (const s of await readAll('SleepSession', start, end)) {
          const stages = s.stages ?? [];
          if (stages.length) {
            for (const st of stages) if (ASLEEP_STAGES.has(st.stage)) intervals.push(clip(st.startTime, st.endTime, start, end));
          } else {
            intervals.push(clip(s.startTime, s.endTime, start, end));
          }
        }
        return mergedMinutes(intervals);
      }
    }
  } catch {
    return null;
  }
}

export function openHealthSettings(): void {
  try {
    openHealthConnectSettings();
  } catch {
    Linking.openSettings();
  }
}
