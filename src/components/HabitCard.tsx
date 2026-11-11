import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { C, hardShadow, R, S, STROKE } from '@/constants/theme';
import { CHALLENGE_MULTIPLIER } from '@/domain/habits';
import type { Checkin, Habit, Player } from '@/domain/types';

import { ProofThumb } from './HealthProof';
import { Chip, haptic, Row, Txt } from './ui';

function Dots({ count, max, color }: { count: number; max: number; color: string }) {
  return (
    <Row gap={4}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, { borderColor: color, backgroundColor: i < count ? color : 'transparent' }]}
        />
      ))}
    </Row>
  );
}

export function HabitCard({
  habit,
  me,
  opponent,
  myCheckins,
  oppCheckins,
  challenge,
  index = 0,
}: {
  habit: Habit;
  me: Player;
  opponent: Player | null;
  myCheckins: Checkin[];
  oppCheckins: Checkin[];
  challenge?: boolean;
  index?: number;
}) {
  const myValid = myCheckins.filter((c) => !c.disputed).length;
  const done = myValid >= habit.maxPerDay;
  const pts = habit.points * (challenge ? CHALLENGE_MULTIPLIER : 1);
  const thumbs = [...myCheckins, ...oppCheckins].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        onPress={() => {
          haptic();
          router.push({ pathname: '/checkin/[habitId]', params: { habitId: habit.id } });
        }}
        style={({ pressed }) => [
          styles.card,
          challenge && styles.challenge,
          done && styles.done,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}>
        <View style={[styles.emojiBox, done && { backgroundColor: C.leaf + '40' }]}>
          <Txt style={{ fontSize: 28 }}>{done ? '✅' : habit.emoji}</Txt>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>
              {habit.title}
            </Txt>
            <Chip
              label={challenge ? `⚡ ${pts} pts` : `+${pts}`}
              color={challenge ? C.gold : C.primary + '22'}
              textColor={challenge ? C.ink : C.primaryDark}
            />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={S.md}>
              <Row gap={4}>
                <Txt variant="small">{me.avatar}</Txt>
                <Dots count={Math.min(myValid, habit.maxPerDay)} max={habit.maxPerDay} color={me.color} />
              </Row>
              {opponent ? (
                <Row gap={4}>
                  <Txt variant="small">{opponent.avatar}</Txt>
                  <Dots
                    count={Math.min(oppCheckins.filter((c) => !c.disputed).length, habit.maxPerDay)}
                    max={habit.maxPerDay}
                    color={opponent.color}
                  />
                </Row>
              ) : null}
            </Row>
            <Row gap={-8}>
              {thumbs.map((c) => (
                <ProofThumb key={c.id} checkin={c} style={styles.thumb} />
              ))}
            </Row>
          </Row>
          {challenge ? <Txt variant="small">Golpe especial do dia — vale {CHALLENGE_MULTIPLIER}x pontos!</Txt> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: S.md,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: STROKE,
    borderColor: C.ink,
    boxShadow: hardShadow(4),
  },
  challenge: { backgroundColor: '#FFF4CC', boxShadow: hardShadow(4, C.gold) },
  done: { backgroundColor: '#EFFAEF', boxShadow: hardShadow(4, C.leaf) },
  emojiBox: {
    width: 56,
    height: 56,
    borderRadius: R.md,
    backgroundColor: C.surface2,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  thumb: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.ink, marginLeft: -8 },
});
