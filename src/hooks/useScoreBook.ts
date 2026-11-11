import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { todayKey } from '@/domain/dates';
import { ScoreBook } from '@/domain/scoring';
import { useActingPlayerId, useGame } from '@/store/useGame';

/** Chave do dia atual que se atualiza quando o app volta ao foreground ou vira a meia-noite. */
export function useToday(): string {
  const [today, setToday] = useState(todayKey());
  useEffect(() => {
    const update = () => setToday(todayKey());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && update());
    const timer = setInterval(update, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return today;
}

export function useScoreBook(): ScoreBook | null {
  const duel = useGame((s) => s.duel);
  const checkins = useGame((s) => s.checkins);
  return useMemo(() => (duel ? new ScoreBook(duel, checkins) : null), [duel, checkins]);
}

/** Jogador atual (quem age) e o adversário. */
export function usePlayers() {
  const duel = useGame((s) => s.duel);
  const actingId = useActingPlayerId();
  const me = duel?.players.find((p) => p.id === actingId) ?? duel?.players[0] ?? null;
  const opponent = duel?.players.find((p) => p.id !== me?.id) ?? null;
  return { me, opponent };
}
