import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { C, hardShadow, R, S, STROKE } from '@/constants/theme';
import type { PeriodResult } from '@/domain/types';

import { Confetti } from './Confetti';
import { Avatar, Button, haptic, Row, Txt } from './ui';

const TROPHY = { day: '🥇', week: '🏆', month: '👑' } as const;
const PERIOD_NAME = { day: 'do dia', week: 'da semana', month: 'do mês' } as const;

export function Celebration({
  result,
  viewerId,
  stake,
  onClose,
}: {
  result: PeriodResult | null;
  viewerId: string | null;
  stake?: string;
  onClose: () => void;
}) {
  const scale = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    if (!result) return;
    haptic(result.winner ? 'success' : 'light');
    scale.value = 0;
    scale.value = withDelay(200, withSpring(1, { damping: 6, stiffness: 120 }));
    wiggle.value = withDelay(
      900,
      withRepeat(withSequence(withTiming(-8, { duration: 120 }), withTiming(8, { duration: 120 }), withTiming(0, { duration: 120 })), 3),
    );
    glow.value = withRepeat(withTiming(1.15, { duration: 900 }), -1, true);
  }, [result, scale, wiggle, glow]);

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${wiggle.value}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }], opacity: 2 - glow.value * 1.2 }));

  if (!result) return null;
  const { winner, tie, standings, period, label } = result;
  const viewerWon = !!winner && winner.id === viewerId;
  const loser = winner ? standings.find((s) => s.player.id !== winner.id)?.player : null;

  const headline = winner ? (viewerWon ? 'VOCÊ VENCEU!' : `${winner.name.toUpperCase()} VENCEU!`) : tie ? 'EMPATE!' : 'SEM PONTOS';
  const sub = winner
    ? viewerWon
      ? `Campeão ${PERIOD_NAME[period]} — ${label}`
      : `Revanche valendo! ${label}`
    : tie
      ? `Ninguém cedeu — ${label}`
      : `Ninguém pontuou — ${label}`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn} style={styles.overlay}>
        {winner ? <Confetti count={period === 'month' ? 90 : period === 'week' ? 70 : 45} /> : null}
        <View style={styles.center}>
          <View style={styles.trophyWrap}>
            <Animated.View style={[styles.glow, { backgroundColor: (winner?.color ?? C.gold) + '55' }, glowStyle]} />
            <Animated.Text style={[styles.trophy, trophyStyle]}>{winner ? TROPHY[period] : tie ? '🤝' : '😴'}</Animated.Text>
          </View>

          <Animated.View entering={FadeInUp.delay(500)} style={{ alignItems: 'center', gap: S.sm }}>
            <Txt variant="title" style={{ fontSize: 34, textAlign: 'center' }} color={winner?.color ?? C.gold}>
              {headline}
            </Txt>
            <Txt variant="dim" style={{ textAlign: 'center' }}>
              {sub}
            </Txt>
          </Animated.View>

          <Animated.View entering={ZoomIn.delay(800)} style={styles.scoreCard}>
            {standings.map((s, i) => (
              <Row key={s.player.id} style={{ justifyContent: 'space-between' }}>
                <Row>
                  <Txt style={{ width: 24 }}>{i === 0 && winner ? '👑' : `${i + 1}º`}</Txt>
                  <Avatar emoji={s.player.avatar} color={s.player.color} size={36} />
                  <Txt variant="h3">{s.player.name}</Txt>
                </Row>
                <Txt variant="h3" color={s.player.color}>
                  {s.points} pts
                </Txt>
              </Row>
            ))}
          </Animated.View>

          {winner && loser && stake && period !== 'day' ? (
            <Animated.View entering={FadeInUp.delay(1100)} style={styles.stake}>
              <Txt variant="label" color={C.ink}>
                Aposta
              </Txt>
              <Txt variant="h3" color={C.ink} style={{ textAlign: 'center' }}>
                {loser.name} paga: {stake} 💸
              </Txt>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInUp.delay(1300)} style={{ alignSelf: 'stretch' }}>
            <Button title={viewerWon ? 'Bora manter! 💪' : 'Partiu revanche! 🔥'} onPress={onClose} />
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(255,247,230,0.97)', justifyContent: 'center' },
  center: { padding: S.xl, alignItems: 'center', gap: S.xl },
  trophyWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  trophy: { fontSize: 110 },
  scoreCard: {
    alignSelf: 'stretch',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    gap: S.md,
    borderWidth: STROKE,
    borderColor: C.ink,
    boxShadow: hardShadow(5),
  },
  stake: {
    backgroundColor: C.gold,
    borderRadius: R.md,
    padding: S.md,
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 2,
    borderWidth: STROKE,
    borderColor: C.ink,
    boxShadow: hardShadow(4),
  },
});
