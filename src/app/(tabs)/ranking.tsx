import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useCelebration } from '@/components/CelebrationHost';
import { Avatar, Button, Card, Chip, haptic, Row, Screen, Segmented, Txt } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { periodKey } from '@/domain/dates';
import type { Period, PeriodResult } from '@/domain/types';
import { useScoreBook, useToday } from '@/hooks/useScoreBook';
import { useGame } from '@/store/useGame';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Diário' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensal' },
];
const TROPHY = { day: '🥇', week: '🏆', month: '👑' } as const;

function Podium({ result }: { result: PeriodResult }) {
  const [first, second] = result.standings;
  const max = Math.max(1, first?.points ?? 0);
  const leaderId = result.winner?.id ?? null;
  const cols = [second, first].filter(Boolean);
  return (
    <View style={styles.podium}>
      {cols.map((s, i) => {
        const isLeader = s.player.id === leaderId;
        const h = 60 + 110 * (s.points / max);
        return (
          <Animated.View key={s.player.id} entering={FadeInUp.delay(150 * i).springify()} style={styles.podiumCol}>
            <Txt style={{ fontSize: 28 }}>{isLeader ? '👑' : ' '}</Txt>
            <Avatar emoji={s.player.avatar} color={s.player.color} size={isLeader ? 64 : 52} />
            <Txt variant="h3" numberOfLines={1}>
              {s.player.name}
            </Txt>
            <View style={[styles.block, { height: h, backgroundColor: s.player.color + (isLeader ? 'DD' : '66') }]}>
              <Txt variant="number" color={C.bg}>
                {s.points}
              </Txt>
              <Txt variant="small" color={C.bg}>
                pts
              </Txt>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

export default function RankingScreen() {
  const [period, setPeriod] = useState<Period>('day');
  const book = useScoreBook()!;
  const today = useToday();
  const duel = useGame((s) => s.duel)!;
  const show = useCelebration((s) => s.show);

  const current = book.result(period, periodKey(period, today), today);
  const history = book.closedResults(period, today).reverse();
  const wins = Object.fromEntries(duel.players.map((p) => [p.id, history.filter((r) => r.winner?.id === p.id).length]));
  const ties = history.filter((r) => r.tie).length;

  return (
    <Screen>
      <Txt variant="title">Ranking</Txt>
      <Segmented options={PERIODS} value={period} onChange={setPeriod} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="label">{current.label} · em andamento</Txt>
          {current.winner ? <Chip label={`${current.winner.avatar} lidera`} color={current.winner.color + '33'} textColor={current.winner.color} /> : null}
        </Row>
        <Podium result={current} />
        <Row style={{ justifyContent: 'space-around' }}>
          {current.standings.map((s) => (
            <View key={s.player.id} style={{ alignItems: 'center' }}>
              <Txt variant="small">{s.player.name}</Txt>
              <Txt variant="dim">
                {s.checkins} provas · {s.perfectDays} 💯
              </Txt>
            </View>
          ))}
        </Row>
        {duel.stake && period !== 'day' ? (
          <View style={styles.stake}>
            <Txt variant="small" color={C.gold}>
              💸 Aposta: quem perder paga {duel.stake}
            </Txt>
          </View>
        ) : null}
      </Card>

      <Card>
        <Txt variant="label">Placar de vitórias ({PERIODS.find((p) => p.value === period)?.label.toLowerCase()})</Txt>
        <Row style={{ justifyContent: 'space-around' }}>
          {duel.players.map((p) => (
            <View key={p.id} style={{ alignItems: 'center', gap: 4 }}>
              <Avatar emoji={p.avatar} color={p.color} />
              <Txt variant="number" color={p.color}>
                {wins[p.id] ?? 0}
              </Txt>
              <Txt variant="small">{TROPHY[period]} vitórias</Txt>
            </View>
          ))}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Txt style={{ fontSize: 30 }}>🤝</Txt>
            <Txt variant="number">{ties}</Txt>
            <Txt variant="small">empates</Txt>
          </View>
        </Row>
      </Card>

      <Txt variant="h2">Histórico</Txt>
      {history.length === 0 ? (
        <Card>
          <Txt variant="dim">Nenhum período encerrado ainda. O primeiro resultado aparece quando este {period === 'day' ? 'dia' : period === 'week' ? 'semana' : 'mês'} acabar — com animação de vitória! 🎉</Txt>
        </Card>
      ) : (
        history.slice(0, 30).map((r, i) => (
          <Animated.View key={r.key} entering={FadeInDown.delay(i * 40)}>
            <Pressable
              onPress={() => {
                haptic();
                show(r);
              }}
              style={({ pressed }) => [styles.histRow, pressed && { opacity: 0.7 }]}>
              <Txt style={{ fontSize: 24 }}>{r.winner ? TROPHY[period] : r.tie ? '🤝' : '😴'}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{r.label}</Txt>
                <Txt variant="small">
                  {r.standings.map((s) => `${s.player.avatar} ${s.points}`).join('  x  ')}
                </Txt>
              </View>
              <Txt variant="dim" color={r.winner?.color}>
                {r.winner ? r.winner.name : r.tie ? 'Empate' : '—'}
              </Txt>
              <Txt variant="small">▶︎</Txt>
            </Pressable>
          </Animated.View>
        ))
      )}

      {current.standings.some((s) => s.points > 0) ? (
        <Button title="Prévia da comemoração" icon="🎉" variant="ghost" onPress={() => show(current)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: S.lg, paddingTop: S.sm },
  podiumCol: { alignItems: 'center', gap: 6, width: 120 },
  block: { width: '100%', borderTopLeftRadius: R.md, borderTopRightRadius: R.md, alignItems: 'center', paddingTop: S.sm },
  stake: { backgroundColor: C.gold + '1A', borderRadius: R.sm, padding: S.sm, alignItems: 'center' },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
});
