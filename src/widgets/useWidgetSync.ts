import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { periodKey } from '@/domain/dates';
import { getHabit } from '@/domain/habits';
import { leaderOf, ScoreBook } from '@/domain/scoring';
import type { Checkin } from '@/domain/types';
import { useToday } from '@/hooks/useScoreBook';
import { useGame } from '@/store/useGame';

import DuelWidget from './DuelWidget';
import { EMPTY_WIDGET_PROPS } from './types';

const NO_CHECKINS: Checkin[] = [];

/** Mantém o widget da tela inicial em dia com o placar do último duelo aberto (ou do mais recente). */
export function useWidgetSync() {
  const myId = useGame((s) => s.account?.id ?? null);
  const duelId = useGame((s) => (s.activeDuelId && s.duels[s.activeDuelId] ? s.activeDuelId : (s.duelOrder[0] ?? null)));
  const duel = useGame((s) => (duelId ? (s.duels[duelId] ?? null) : null));
  const checkins = useGame((s) => (duelId ? (s.checkins[duelId] ?? NO_CHECKINS) : NO_CHECKINS));
  const today = useToday();
  const book = useMemo(() => (duel ? new ScoreBook(duel, checkins) : null), [duel, checkins]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const me = duel?.players.find((p) => p.id === myId);
    try {
      if (!book || !duel || !me) {
        DuelWidget.updateSnapshot(EMPTY_WIDGET_PROPS);
        return;
      }
      const opp = duel.players.find((p) => p.id !== me.id);
      const myDay = book.day(me.id, today);
      const mePoints = myDay.total;
      const oppPoints = opp ? book.day(opp.id, today).total : 0;
      const done = duel.habitIds.filter((id) => (myDay.counts[id] ?? 0) >= (getHabit(id)?.maxPerDay ?? 1)).length;
      const diff = mePoints - oppPoints;
      const status = !opp
        ? `Código: ${duel.code}`
        : diff > 0
          ? `Liderando por ${diff}!`
          : diff < 0
            ? `Faltam ${-diff} pts!`
            : mePoints > 0
              ? 'Empatados!'
              : 'Bora começar!';
      const weekLeader = leaderOf(book.standings('week', periodKey('week', today)));

      DuelWidget.updateSnapshot({
        meName: me.name,
        meAvatar: me.avatar,
        mePoints,
        oppName: opp?.name ?? 'Rival',
        oppAvatar: opp?.avatar ?? '❔',
        oppPoints,
        done,
        total: duel.habitIds.length,
        streak: book.currentStreak(me.id, today),
        status,
        weekLeader: weekLeader ? `Semana: ${weekLeader.avatar} ${weekLeader.name} na frente` : 'Semana empatada',
      });
    } catch {
      // Em Expo Go o módulo nativo de widgets não existe.
    }
  }, [book, duel, today, myId]);
}
