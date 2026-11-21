import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar, Card, Chip, haptic, ProgressBar, Row, Screen, Segmented, Txt } from '@/components/ui';
import { C, F, hardShadow, R, S, STROKE } from '@/constants/theme';
import { fromDateKey, periodLabel } from '@/domain/dates';
import { duelStats, type StatsRange } from '@/domain/stats';
import { useScoreBook, useToday } from '@/hooks/useScoreBook';
import { useActiveDuel, useDuelIsPro, useMyId } from '@/store/useGame';

type RangeKey = '7' | '30' | 'all';
const RANGES: { value: RangeKey; label: string }[] = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: 'all', label: 'Tudo' },
];
const CHART_H = 140;

/** Pontos por dia de cada jogador, em colunas agrupadas. */
function DailyChart({ stats }: { stats: StatsRange }) {
  const max = Math.max(1, ...stats.players.flatMap((p) => p.daily));
  const n = stats.players.length;
  const barW = Math.max(4, Math.min(14, Math.floor(36 / n)));
  const every = stats.days.length > 14 ? 5 : 1;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: S.sm }}>
      <View style={styles.chart}>
        {stats.days.map((d, i) => (
          <View key={d} style={styles.dayCol}>
            <View style={[styles.bars, { height: CHART_H }]}>
              {stats.players.map((p) => (
                <View
                  key={p.player.id}
                  style={{
                    width: barW,
                    height: Math.max(2, (p.daily[i] / max) * CHART_H),
                    backgroundColor: p.daily[i] > 0 ? p.player.color : C.hairline,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
              ))}
            </View>
            <Txt variant="small" style={{ opacity: i % every === 0 ? 1 : 0 }}>
              {fromDateKey(d).getDate()}
            </Txt>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function StatsScreen() {
  const duel = useActiveDuel();
  const book = useScoreBook();
  const today = useToday();
  const myId = useMyId();
  const pro = useDuelIsPro(duel);
  const [range, setRange] = useState<RangeKey>('7');
  if (!duel || !book) return null;

  const effective: RangeKey = pro ? range : '7';
  const stats = duelStats(book, today, effective === 'all' ? null : Number(effective));
  const me = stats.players.find((p) => p.player.id === myId);
  // Meta mais forte e mais fraca de quem está vendo.
  const ranked = me ? [...stats.goals].sort((a, b) => (me.habitCounts[b.id] ?? 0) - (me.habitCounts[a.id] ?? 0)) : [];
  const topCount = Math.max(1, ...stats.players.flatMap((p) => Object.values(p.habitCounts)));

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="title">Números</Txt>
        {pro ? <Chip label="👑 PRO" color={C.gold} textColor={C.ink} /> : null}
      </Row>
      <Segmented
        options={RANGES}
        value={effective}
        onChange={(v) => {
          if (!pro && v !== '7') {
            haptic('warning');
            router.push('/premium');
            return;
          }
          setRange(v);
        }}
      />

      <Animated.View entering={FadeIn} key={effective}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="label">Pontos por dia</Txt>
            <Txt variant="small">{stats.days.length} dias</Txt>
          </Row>
          <DailyChart stats={stats} />
          <Row style={{ flexWrap: 'wrap' }} gap={S.md}>
            {stats.players.map((p) => (
              <Row key={p.player.id} gap={6}>
                <View style={[styles.dot, { backgroundColor: p.player.color }]} />
                <Txt variant="small" color={C.ink}>
                  {p.player.name}
                </Txt>
              </Row>
            ))}
          </Row>
        </Card>
      </Animated.View>

      <View style={{ gap: S.md }}>
        <Txt variant="h2">Quem está melhor</Txt>
        {stats.players.map((p, i) => (
          <Card key={p.player.id} style={p.player.id === myId ? { backgroundColor: C.surface2 } : undefined}>
            <Row>
              <Txt style={{ width: 28, fontSize: 18 }}>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}º`}</Txt>
              <Avatar emoji={p.player.avatar} color={p.player.color} size={36} />
              <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>
                {p.player.name}
              </Txt>
              <Txt style={styles.big} color={p.player.color}>
                {p.total}
              </Txt>
            </Row>
            <View style={styles.grid}>
              <Stat label="média/dia" value={p.average} />
              <Stat label="dias vencidos" value={p.dayWins} />
              <Stat label="dias ativos" value={`${p.activeDays}/${stats.days.length}`} />
              <Stat label="dias perfeitos" value={p.perfectDays} />
            </View>
            {p.bestDay ? (
              <Txt variant="small">
                🏅 Melhor dia: {periodLabel('day', p.bestDay.dateKey, today)}, com {p.bestDay.points} pts
              </Txt>
            ) : null}
          </Card>
        ))}
      </View>

      <Card>
        <Txt variant="h3">Golpes por meta</Txt>
        {stats.goals.map((h) => (
          <View key={h.id} style={{ gap: 4 }}>
            <Txt variant="small" color={C.ink}>
              {h.emoji} {h.title}
            </Txt>
            {stats.players.map((p) => (
              <Row key={p.player.id} gap={S.sm}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={(p.habitCounts[h.id] ?? 0) / topCount} color={p.player.color} height={10} />
                </View>
                <Txt variant="small" style={{ width: 28, textAlign: 'right' }}>
                  {p.habitCounts[h.id] ?? 0}x
                </Txt>
              </Row>
            ))}
          </View>
        ))}
        {me && ranked.length > 1 ? (
          <Txt variant="dim">
            💪 Seu forte: {ranked[0].emoji} {ranked[0].title}. Pra melhorar: {ranked[ranked.length - 1].emoji}{' '}
            {ranked[ranked.length - 1].title}.
          </Txt>
        ) : null}
      </Card>

      {!pro ? (
        <Pressable onPress={() => router.push('/premium')} style={styles.upsell} accessibilityRole="button">
          <Txt style={{ fontSize: 28 }}>🔒</Txt>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Histórico completo é Premium</Txt>
            <Txt variant="small" color={C.textDim}>
              Veja 30 dias, o duelo inteiro e a evolução de cada um. Se alguém do duelo assinar, todo mundo aqui ganha.
            </Txt>
          </View>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Txt style={styles.statValue}>{value}</Txt>
      <Txt variant="small">{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingTop: S.sm },
  dayCol: { alignItems: 'center', gap: 4 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: 2, borderColor: C.ink },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: C.ink },
  big: { fontFamily: F.display, fontSize: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stat: {
    flexGrow: 1,
    width: '45%',
    padding: S.sm,
    borderRadius: R.sm,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.hairline,
    alignItems: 'center',
  },
  statValue: { fontFamily: F.display, fontSize: 18, color: C.ink },
  upsell: {
    flexDirection: 'row',
    gap: S.md,
    alignItems: 'center',
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.gold + '33',
    borderWidth: STROKE,
    borderColor: C.ink,
    boxShadow: hardShadow(4),
  },
});
