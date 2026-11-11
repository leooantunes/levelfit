import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';

import { periodEnd, previousPeriodKey, toDateKey } from '@/domain/dates';
import type { Period, PeriodResult } from '@/domain/types';
import { useScoreBook, useToday } from '@/hooks/useScoreBook';
import { celebrationTag, useActiveDuel, useGame, useMyId } from '@/store/useGame';

import { Celebration } from './Celebration';

/** Permite reabrir a animação de qualquer resultado (ex.: botão no ranking). */
export const useCelebration = create<{ manual: PeriodResult | null; show: (r: PeriodResult) => void; hide: () => void }>(
  (set) => ({
    manual: null,
    show: (r) => set({ manual: r }),
    hide: () => set({ manual: null }),
  }),
);

const ORDER: Period[] = ['day', 'week', 'month'];

/**
 * Ao abrir o app, verifica se ontem / semana passada / mês passado terminaram
 * e ainda não foram comemorados, e mostra as animações de vitória em sequência.
 */
export function CelebrationHost() {
  const book = useScoreBook();
  const today = useToday();
  const celebrated = useGame((s) => s.celebrated);
  const markCelebrated = useGame((s) => s.markCelebrated);
  const duel = useActiveDuel();
  const viewerId = useMyId();
  const { manual, hide } = useCelebration();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const pending = useMemo(() => {
    if (!book || !duel) return [];
    const startedOn = toDateKey(new Date(duel.createdAt));
    return ORDER.map((period) => {
      const key = previousPeriodKey(period, today);
      if (periodEnd(period, key) < startedOn) return null;
      if (celebrated.includes(celebrationTag(duel.id, period, key))) return null;
      const r = book.result(period, key, today);
      return r.standings.some((s) => s.points > 0) ? r : null;
    }).filter((r): r is PeriodResult => !!r);
  }, [book, duel, today, celebrated]);

  // Períodos sem ninguém pontuando são marcados silenciosamente.
  useEffect(() => {
    if (!book || !duel) return;
    for (const period of ORDER) {
      const key = previousPeriodKey(period, today);
      if (!celebrated.includes(celebrationTag(duel.id, period, key)) &&!book.result(period, key, today).standings.some((s) => s.points > 0)) {
        markCelebrated(period, key);
      }
    }
  }, [book, duel, today, celebrated, markCelebrated]);

  const current = manual ?? pending[0] ?? null;
  const currentTag = current && duel ? celebrationTag(duel.id, current.period, current.key) : null;

  return (
    <Celebration
      result={current && currentTag !== dismissed ? current : null}
      viewerId={viewerId}
      stake={duel?.stake}
      onClose={() => {
        if (manual) return hide();
        if (current) {
          setDismissed(currentTag);
          markCelebrated(current.period, current.key);
        }
      }}
    />
  );
}
