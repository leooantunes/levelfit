import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { todayKey } from '@/domain/dates';
import { ScoreBook } from '@/domain/scoring';
import { useActiveCheckins, useActiveDuel, useMyId } from '@/store/useGame';

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

/** Placar do duelo aberto. */
export function useScoreBook(): ScoreBook | null {
  const duel = useActiveDuel();
  const checkins = useActiveCheckins();
  return useMemo(() => (duel ? new ScoreBook(duel, checkins) : null), [duel, checkins]);
}

/** Você e o adversário no duelo aberto. */
export function usePlayers() {
  const duel = useActiveDuel();
  const myId = useMyId();
  const me = duel?.players.find((p) => p.id === myId) ?? null;
  const opponent = duel?.players.find((p) => p.id !== myId) ?? null;
  return { me, opponent };
}
