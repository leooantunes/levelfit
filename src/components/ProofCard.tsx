import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, R, S } from '@/constants/theme';
import { formatTime } from '@/domain/dates';
import { getHabit } from '@/domain/habits';
import type { Checkin, Player } from '@/domain/types';

import { Avatar, Chip, haptic, Row, Txt } from './ui';

export const REACTIONS = ['🔥', '💪', '👏', '😂', '🤨'];

export function ReactionBar({
  checkin,
  viewerId,
  onReact,
}: {
  checkin: Checkin;
  viewerId: string;
  onReact: (emoji: string | null) => void;
}) {
  const mine = checkin.reactions[viewerId];
  const counts = Object.values(checkin.reactions).reduce<Record<string, number>>((acc, e) => {
    acc[e] = (acc[e] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <Row gap={6}>
      {REACTIONS.map((e) => (
        <Pressable
          key={e}
          onPress={() => {
            haptic();
            onReact(mine === e ? null : e);
          }}
          style={[styles.reaction, mine === e && styles.reactionActive]}>
          <Txt style={{ fontSize: 18 }}>{e}</Txt>
          {counts[e] ? <Txt variant="small">{counts[e]}</Txt> : null}
        </Pressable>
      ))}
    </Row>
  );
}

export function ProofCard({
  checkin,
  player,
  viewerId,
  onReact,
}: {
  checkin: Checkin;
  player: Player | undefined;
  viewerId: string;
  onReact: (emoji: string | null) => void;
}) {
  const habit = getHabit(checkin.habitId);
  return (
    <View style={[styles.card, checkin.disputed && { borderColor: C.danger }]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Avatar emoji={player?.avatar ?? '❔'} color={player?.color ?? C.textMuted} size={36} />
          <View>
            <Txt variant="h3">{player?.name ?? 'Jogador'}</Txt>
            <Txt variant="small">
              {habit?.emoji} {habit?.title} · {formatTime(checkin.createdAt)}
            </Txt>
          </View>
        </Row>
        {checkin.disputed ? <Chip label="⚠️ Contestada" color={C.danger + '33'} textColor={C.danger} /> : null}
      </Row>
      <Pressable onPress={() => router.push({ pathname: '/proof/[id]', params: { id: checkin.id } })}>
        <Image
          source={{ uri: checkin.photoUri }}
          style={[styles.photo, checkin.disputed && { opacity: 0.4 }]}
          contentFit="cover"
          transition={200}
        />
      </Pressable>
      {checkin.note ? <Txt variant="body">{checkin.note}</Txt> : null}
      <ReactionBar checkin={checkin} viewerId={viewerId} onReact={onReact} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.md,
    gap: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: R.md, backgroundColor: C.surface2 },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.pill,
    backgroundColor: C.surface2,
  },
  reactionActive: { backgroundColor: C.primary + '33', borderWidth: 1, borderColor: C.primary },
});
