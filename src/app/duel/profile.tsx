import { router } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Avatar, Button, Card, Chip, haptic, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { C, hardShadow, R, S, STROKE } from '@/constants/theme';
import { achievementsFor, levelInfo } from '@/domain/progression';
import { usePlayers, useScoreBook, useToday } from '@/hooks/useScoreBook';
import { useActiveCheckins, useActiveDuel, useGame } from '@/store/useGame';

function Stat({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <View style={styles.stat}>
      <Txt style={{ fontSize: 20 }}>{emoji}</Txt>
      <Txt variant="number" style={{ fontSize: 22 }}>
        {value}
      </Txt>
      <Txt variant="small">{label}</Txt>
    </View>
  );
}

export default function ProfileScreen() {
  const duel = useActiveDuel();
  const checkins = useActiveCheckins();
  const leaveDuel = useGame((s) => s.leaveDuel);
  const book = useScoreBook();
  const today = useToday();
  const { me, opponent } = usePlayers();
  if (!duel || !book || !me) return null;

  const xp = book.totalPoints(me.id);
  const lvl = levelInfo(xp);
  const oppLvl = opponent ? levelInfo(book.totalPoints(opponent.id)) : null;
  const achievements = achievementsFor(book, me.id, checkins);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const myCheckins = checkins.filter((c) => c.playerId === me.id && !c.disputed).length;
  const perfectDays = book.activeDays(me.id).filter((d) => book.day(me.id, d).perfect).length;

  const share = () =>
    Share.share({
      message: `Bora duelar no Level Fit? ⚡ Entre no duelo "${duel.name}" com o código ${duel.code}`,
    });

  const leave = () =>
    Alert.alert('Sair do duelo?', `Você sai de "${duel.name}" e ele some da sua lista. Seus outros duelos continuam.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveDuel(duel.id);
            router.dismissTo('/');
          } catch (e) {
            Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  return (
    <Screen>
      <Animated.View entering={FadeIn} style={{ alignItems: 'center', gap: S.sm }}>
        <Animated.View entering={ZoomIn.springify()}>
          <Avatar emoji={me.avatar} color={me.color} size={96} />
        </Animated.View>
        <Txt variant="title">{me.name}</Txt>
        <Chip label={`Nível ${lvl.level} · ${lvl.title}`} color={C.accent + '33'} textColor={C.accent} />
      </Animated.View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="label">XP</Txt>
          <Txt variant="small">
            {lvl.xpInLevel}/{lvl.xpToNext} para o nível {lvl.level + 1}
          </Txt>
        </Row>
        <ProgressBar value={lvl.progress} color={C.accent} height={12} />
        {opponent && oppLvl ? (
          <Txt variant="small">
            {opponent.avatar} {opponent.name} está no nível {oppLvl.level} ({oppLvl.title})
          </Txt>
        ) : null}
      </Card>

      <View style={styles.stats}>
        <Stat emoji="⭐" label="pontos totais" value={xp} />
        <Stat emoji="🔥" label="sequência" value={book.currentStreak(me.id, today)} />
        <Stat emoji="🏔️" label="melhor seq." value={book.bestStreak(me.id)} />
        <Stat emoji="📸" label="provas" value={myCheckins} />
        <Stat emoji="💯" label="dias perfeitos" value={perfectDays} />
        <Stat emoji="🏆" label="semanas" value={book.winCount(me.id, 'week', today)} />
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h3">Conquistas</Txt>
          <Txt variant="dim">
            {unlocked}/{achievements.length}
          </Txt>
        </Row>
        <View style={styles.badges}>
          {achievements.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => {
                haptic();
                Alert.alert(`${a.emoji} ${a.title}`, `${a.description}\n\n${a.unlocked ? '✅ Desbloqueada!' : '🔒 Ainda bloqueada'}`);
              }}
              style={[styles.badge, !a.unlocked && { opacity: 0.3 }]}>
              <Txt style={{ fontSize: 30 }}>{a.unlocked ? a.emoji : '🔒'}</Txt>
              <Txt variant="small" numberOfLines={2} style={{ textAlign: 'center' }}>
                {a.title}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Txt variant="h3">Duelo</Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="dim">Nome</Txt>
          <Txt>{duel.name}</Txt>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="dim">Rival</Txt>
          <Txt>{opponent ? `${opponent.avatar} ${opponent.name}` : 'aguardando…'}</Txt>
        </Row>
        {duel.stake ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="dim">Aposta</Txt>
            <Txt>{duel.stake}</Txt>
          </Row>
        ) : null}
        {opponent ? null : (
          <Pressable onPress={share} style={styles.code}>
            <Txt variant="label">Código de convite</Txt>
            <Txt variant="title" color={C.primaryDark} style={{ letterSpacing: 6 }}>
              {duel.code}
            </Txt>
            <Txt variant="small">Toque para compartilhar</Txt>
          </Pressable>
        )}
        <Button title="Editar metas e aposta" icon="🎯" variant="secondary" onPress={() => router.push('/goals')} />
      </Card>

      <Button title="Sair do duelo" variant="ghost" onPress={leave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stat: {
    width: '31.5%',
    flexGrow: 1,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    alignItems: 'center',
    gap: 2,
    borderWidth: STROKE,
    borderColor: C.ink,
    boxShadow: hardShadow(4),
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  badge: { width: '30%', flexGrow: 1, alignItems: 'center', gap: 4, padding: S.sm, borderRadius: R.md, backgroundColor: C.surface2 },
  code: { alignItems: 'center', padding: S.md, borderRadius: R.md, backgroundColor: C.surface2, gap: 2 },
});
