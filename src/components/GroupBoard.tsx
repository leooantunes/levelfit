import { Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { C, F, R, S, STROKE } from '@/constants/theme';
import type { Duel, Standing } from '@/domain/types';

import { Avatar, Button, Chip, ProgressBar, Row, Txt } from './ui';

const MEDAL = ['🥇', '🥈', '🥉'];

/** Placar de um duelo em grupo (3 a 6 jogadores): ranking do dia com barra de força. */
export function GroupBoard({ duel, standings, myId }: { duel: Duel; standings: Standing[]; myId: string }) {
  const max = Math.max(1, standings[0]?.points ?? 0);
  const free = (duel.maxPlayers ?? 2) - duel.players.length;
  const myPos = standings.findIndex((s) => s.player.id === myId);
  const leader = standings[0];
  const caption =
    !leader || leader.points === 0
      ? 'Ninguém pontuou ainda. Quem abre o placar? 👀'
      : myPos === 0
        ? standings[1] && standings[1].points === leader.points
          ? 'Empate na liderança! 😤'
          : 'Você lidera o grupo! Segura a coroa 👑'
        : `Você está em ${myPos + 1}º. Faltam ${leader.points - standings[myPos].points} pts para ${leader.player.name}.`;

  return (
    <View style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="label">Placar do grupo · hoje</Txt>
        <Chip label={`👥 ${duel.players.length}/${duel.maxPlayers ?? 2}`} />
      </Row>
      {standings.map((s, i) => {
        const me = s.player.id === myId;
        const pro = duel.proPlayerIds?.includes(s.player.id);
        return (
          <Animated.View key={s.player.id} entering={FadeInDown.delay(i * 50)} style={[styles.row, me && styles.me]}>
            <Txt style={styles.pos}>{s.points > 0 ? (MEDAL[i] ?? `${i + 1}º`) : `${i + 1}º`}</Txt>
            <Avatar emoji={s.player.avatar} color={s.player.color} size={34} />
            <View style={{ flex: 1, gap: 4 }}>
              <Row gap={6}>
                <Txt variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {me ? `${s.player.name} (você)` : s.player.name}
                </Txt>
                {pro ? <Chip label="👑 PRO" color={C.gold} textColor={C.ink} /> : null}
              </Row>
              <ProgressBar value={s.points / max} color={s.player.color} height={10} />
            </View>
            <Txt style={styles.points} color={s.player.color}>
              {s.points}
            </Txt>
          </Animated.View>
        );
      })}
      {free > 0 ? (
        <Button
          title={`Chamar mais ${free} (código ${duel.code})`}
          icon="📣"
          variant="ghost"
          onPress={() =>
            Share.share({ message: `Entra no meu grupo "${duel.name}" no Level Fit! 🥊 Código: ${duel.code}` })
          }
        />
      ) : null}
      <Txt variant="dim" style={{ textAlign: 'center' }}>
        {caption}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.sm,
    borderRadius: R.md,
    borderWidth: 2,
    borderColor: C.hairline,
    backgroundColor: C.surface,
  },
  me: { borderColor: C.ink, borderWidth: STROKE, backgroundColor: C.surface2 },
  pos: { width: 30, textAlign: 'center', fontSize: 18 },
  points: { fontFamily: F.display, fontSize: 22, minWidth: 44, textAlign: 'right' },
});
