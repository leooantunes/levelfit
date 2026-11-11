import type { ComponentRef, Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { Mascot, Wordmark } from '@/components/Brand';
import { Avatar, Row, Txt } from '@/components/ui';
import { C, hardShadow, R, S, STROKE } from '@/constants/theme';
import type { PeriodResult } from '@/domain/types';

/** Tamanho lógico do cartão (9:16). A captura sai em 1080x1920, o tamanho do Story. */
export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;

const TROPHY = { day: '🥊', week: '🏆', month: '👑' } as const;
const PERIOD_NAME = { day: 'DO ROUND', week: 'DA SEMANA', month: 'DO MÊS' } as const;

/**
 * Arte do resultado para o Story do Instagram. Fica fora da tela e é capturada
 * como imagem (react-native-view-shot): sem animações, tudo estático.
 */
export type StoryCardRef = ComponentRef<typeof View>;

export function StoryCard({
  result,
  duelName,
  stake,
  ref,
}: {
  result: PeriodResult;
  duelName: string;
  stake?: string;
  ref: Ref<StoryCardRef>;
}) {
  const { winner, tie, standings, period, label } = result;
  const loser = winner ? standings.find((s) => s.player.id !== winner.id)?.player : null;
  let headline = 'NINGUÉM LUTOU';
  if (winner) headline = `${winner.name.toUpperCase()} VENCEU!`;
  else if (tie) headline = 'EMPATE NO RINGUE!';

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Wordmark size={30} dark />

      <View style={{ alignItems: 'center', gap: S.xs }}>
        <View style={[styles.glow, { backgroundColor: (winner?.color ?? C.gold) + '55' }]} />
        <Txt style={{ fontSize: 96, lineHeight: 116 }}>{winner ? TROPHY[period] : tie ? '🤝' : '😴'}</Txt>
        <Txt variant="label" color={C.gold}>
          CAMPEÃO {PERIOD_NAME[period]}
        </Txt>
        <Txt variant="title" color={C.nightText} style={styles.headline} numberOfLines={2}>
          {headline}
        </Txt>
        <Txt variant="small" color={C.nightText} style={{ opacity: 0.8 }}>
          {duelName} · {label}
        </Txt>
      </View>

      <View style={styles.score}>
        {standings.map((s, i) => (
          <Row key={s.player.id} style={{ justifyContent: 'space-between' }}>
            <Row>
              <Txt style={{ width: 26 }}>{i === 0 && winner ? '👑' : `${i + 1}º`}</Txt>
              <Avatar emoji={s.player.avatar} color={s.player.color} size={34} />
              <Txt variant="h3" numberOfLines={1} style={{ maxWidth: 130 }}>
                {s.player.name}
              </Txt>
            </Row>
            <Txt variant="h3" color={s.player.color}>
              {s.points} pts
            </Txt>
          </Row>
        ))}
      </View>

      {winner && loser && stake ? (
        <View style={styles.stake}>
          <Txt variant="small" color={C.ink} style={{ textAlign: 'center' }}>
            💸 {loser.name} paga: {stake}
          </Txt>
        </View>
      ) : null}

      <Row style={{ alignItems: 'flex-end' }}>
        <Mascot size={70} idle={false} />
        <Txt variant="small" color={C.nightText} style={{ flex: 1 }}>
          Duelo de hábitos no Level Fit. Bora encarar? 🥊
        </Txt>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    backgroundColor: C.night,
    paddingHorizontal: S.xl,
    paddingVertical: S.xxl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glow: { position: 'absolute', top: 0, width: 150, height: 150, borderRadius: 75 },
  headline: {
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
    color: C.gold,
    textShadowColor: C.ink,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0.01,
  },
  score: {
    alignSelf: 'stretch',
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.md,
    gap: S.sm,
    borderWidth: STROKE,
    borderColor: C.ink,
    boxShadow: hardShadow(5),
  },
  stake: {
    alignSelf: 'stretch',
    backgroundColor: C.gold,
    borderRadius: R.md,
    padding: S.sm,
    borderWidth: STROKE,
    borderColor: C.ink,
  },
});
