import { useEffect } from 'react';
import { Platform } from 'react-native';

import { periodKey } from '@/domain/dates';
import { getHabit } from '@/domain/habits';
import { leaderOf } from '@/domain/scoring';
import { usePlayers, useScoreBook, useToday } from '@/hooks/useScoreBook';
import { useGame } from '@/store/useGame';

import DuelWidget from './DuelWidget';

/** Mantém o widget da tela inicial em dia com o placar. */
export function useWidgetSync() {
  const book = useScoreBook();
  const today = useToday();
  const duel = useGame((s) => s.duel);
  const deviceOwnerId = useGame((s) => s.meId);
  const { me: acting } = usePlayers();

  useEffect(() => {
    if (Platform.OS === 'web' || !book || !duel) return;
    // O widget sempre mostra o ponto de vista do dono do aparelho.
    const me = duel.players.find((p) => p.id === deviceOwnerId) ?? acting;
    if (!me) return;
    const opp = duel.players.find((p) => p.id !== me.id);
    const myDay = book.day(me.id, today);
    const mePoints = myDay.total;
    const oppPoints = opp ? book.day(opp.id, today).total : 0;
    const done = duel.habitIds.filter((id) => (myDay.counts[id] ?? 0) >= (getHabit(id)?.maxPerDay ?? 1)).length;
    const diff = mePoints - oppPoints;
    const status =
      diff > 0 ? `Liderando por ${diff}!` : diff < 0 ? `Faltam ${-diff} pts!` : mePoints > 0 ? 'Empatados!' : 'Bora começar!';
    const week = book.standings('week', periodKey('week', today));
    const weekLeader = leaderOf(week);

    try {
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
  }, [book, duel, today, deviceOwnerId, acting]);
}
