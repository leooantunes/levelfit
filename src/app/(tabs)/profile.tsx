import { router } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Avatar, Button, Card, Chip, haptic, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { C, hardShadow, R, S, STROKE } from '@/constants/theme';
import { achievementsFor, levelInfo } from '@/domain/progression';
import { usePlayers, useScoreBook, useToday } from '@/hooks/useScoreBook';
import { useGame } from '@/store/useGame';

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

const HOURS = [18, 19, 20, 21, 22];

export default function ProfileScreen() {
  const duel = useGame((s) => s.duel)!;
  const checkins = useGame((s) => s.checkins);
  const mode = useGame((s) => s.mode);
  const reminders = useGame((s) => s.reminders);
  const setReminders = useGame((s) => s.setReminders);
  const leaveDuel = useGame((s) => s.leaveDuel);
  const book = useScoreBook()!;
  const today = useToday();
  const { me, opponent } = usePlayers();
  if (!me) return null;

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
    Alert.alert('Sair do duelo?', 'Os dados deste duelo serão removidos deste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: leaveDuel },
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
          <Txt variant="dim">Modo</Txt>
          <Txt>{mode === 'online' ? '🌐 Online' : '📱 Mesmo celular'}</Txt>
        </Row>
        {duel.stake ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="dim">Aposta</Txt>
            <Txt>{duel.stake}</Txt>
          </Row>
        ) : null}
        {mode === 'online' ? (
          <Pressable onPress={share} style={styles.code}>
            <Txt variant="label">Código de convite</Txt>
            <Txt variant="title" color={C.primaryDark} style={{ letterSpacing: 6 }}>
              {duel.code}
            </Txt>
            <Txt variant="small">Toque para compartilhar</Txt>
          </Pressable>
        ) : null}
        <Button title="Editar metas e aposta" icon="🎯" variant="secondary" onPress={() => router.push('/goals')} />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Lembretes diários</Txt>
            <Txt variant="small">12:30 e no horário da noite</Txt>
          </View>
          <Switch
            value={reminders.enabled}
            onValueChange={(v) => setReminders({ enabled: v })}
            trackColor={{ true: C.leaf, false: C.hairline }}
          />
        </Row>
        {reminders.enabled ? (
          <Row style={{ justifyContent: 'space-between' }}>
            {HOURS.map((h) => (
              <Pressable
                key={h}
                onPress={() => {
                  haptic();
                  setReminders({ hour: h, minute: 0 });
                }}
                style={[styles.hour, reminders.hour === h && { backgroundColor: C.primary }]}>
                <Txt variant="h3" color={reminders.hour === h ? C.onColor : C.text}>
                  {h}h
                </Txt>
              </Pressable>
            ))}
          </Row>
        ) : null}
      </Card>

      <Card>
        <Txt variant="h3">📱 Widget</Txt>
        <Txt variant="dim">
          Segure a tela inicial do celular, toque em “Widgets” e adicione o Level Fit para ver o placar do dia sem abrir o app.
        </Txt>
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
  hour: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.surface2 },
});
