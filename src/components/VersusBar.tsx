import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { C, R, S } from '@/constants/theme';
import type { Player } from '@/domain/types';

import { Avatar, Txt } from './ui';

/** Placar cabo-de-guerra: a barra pende para quem tem mais pontos. */
export function VersusBar({
  left,
  right,
  leftPoints,
  rightPoints,
  caption,
}: {
  left: Player;
  right: Player | null;
  leftPoints: number;
  rightPoints: number;
  caption?: string;
}) {
  const total = leftPoints + rightPoints;
  const share = total === 0 ? 0.5 : leftPoints / total;
  const sv = useSharedValue(0.5);
  useEffect(() => {
    sv.value = withSpring(Math.min(0.92, Math.max(0.08, share)), { damping: 14 });
  }, [share, sv]);
  const leftStyle = useAnimatedStyle(() => ({ flex: sv.value }));
  const rightStyle = useAnimatedStyle(() => ({ flex: 1 - sv.value }));
  const rightColor = right?.color ?? C.textMuted;

  return (
    <View style={{ gap: S.md }}>
      <View style={styles.row}>
        <View style={styles.side}>
          <Avatar emoji={left.avatar} color={left.color} />
          <View>
            <Txt variant="h3" numberOfLines={1}>
              {left.name}
            </Txt>
            <Txt variant="number" color={left.color}>
              {leftPoints}
            </Txt>
          </View>
        </View>
        <Txt variant="label" style={{ color: C.textMuted }}>
          VS
        </Txt>
        <View style={[styles.side, { justifyContent: 'flex-end' }]}>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="h3" numberOfLines={1}>
              {right?.name ?? 'Aguardando…'}
            </Txt>
            <Txt variant="number" color={rightColor}>
              {right ? rightPoints : '–'}
            </Txt>
          </View>
          <Avatar emoji={right?.avatar ?? '❔'} color={rightColor} />
        </View>
      </View>
      <View style={styles.bar}>
        <Animated.View style={[{ backgroundColor: left.color }, leftStyle]} />
        <View style={styles.divider} />
        <Animated.View style={[{ backgroundColor: rightColor }, rightStyle]} />
      </View>
      {caption ? (
        <Txt variant="dim" style={{ textAlign: 'center' }}>
          {caption}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  side: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 },
  bar: { flexDirection: 'row', height: 18, borderRadius: R.pill, overflow: 'hidden', backgroundColor: C.surface2, borderWidth: 2.5, borderColor: C.ink },
  divider: { width: 3, backgroundColor: C.ink },
});
