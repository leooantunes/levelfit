import { router } from 'expo-router';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { HabitCard } from '@/components/HabitCard';
import { Avatar, Card, Chip, haptic, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { VersusBar } from '@/components/VersusBar';
import { C, R, S } from '@/constants/theme';
import { addDays, daysBetween, periodLabel, toDateKey } from '@/domain/dates';
import { dailyChallenge, getHabit } from '@/domain/habits';
import { PERFECT_DAY_BONUS, streakMultiplier } from '@/domain/scoring';
import { usePlayers, useScoreBook, useToday } from '@/hooks/useScoreBook';
import { useGame } from '@/store/useGame';

function taunt(diff: number, oppName: string, done: number, total: number) {
  if (total > 0 && done === total) return 'Dia perfeito! Você é uma máquina 🤖';
  if (diff > 30) return `Você está atropelando ${oppName}! 🚀`;
  if (diff > 0) return `Na frente por ${diff} pts. Não relaxa! 😤`;
  if (diff < -30) return `${oppName} está voando… reage! 🆘`;
  if (diff < 0) return `${oppName} está ${-diff} pts na frente. Bora virar! 🔥`;
  return 'Tudo empatado. Quem posta a próxima prova? 👀';
}

export default function TodayScreen() {
  const duel = useGame((s) => s.duel)!;
  const checkins = useGame((s) => s.checkins);
  const mode = useGame((s) => s.mode);
  const syncing = useGame((s) => s.syncing);
  const syncError = useGame((s) => s.syncError);
  const refresh = useGame((s) => s.refresh);
  const setActivePlayer = useGame((s) => s.setActivePlayer);
  const book = useScoreBook()!;
  const today = useToday();
  const { me, opponent } = usePlayers();
  if (!me) return null;

  const myDay = book.day(me.id, today);
  const oppDay = opponent ? book.day(opponent.id, today) : null;
  const goals = duel.habitIds.map(getHabit).filter((h) => !!h);
  const challenge = dailyChallenge(duel.id, today, duel.habitIds);
  const done = goals.filter((h) => (myDay.counts[h.id] ?? 0) >= h.maxPerDay).length;
  const streak = book.currentStreak(me.id, today);
  // Combo que vale para os pontos de hoje (sequência até ontem + hoje).
  const nextMultiplier = streakMultiplier(book.streakEndingAt(me.id, addDays(today, -1)) + 1);

  const todays = checkins.filter((c) => c.dateKey === today);
  const forHabit = (playerId: string | undefined, habitId: string) =>
    todays.filter((c) => c.playerId === playerId && c.habitId === habitId);

  return (
    <Screen
      refreshControl={
        mode === 'online' ? <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={C.primary} /> : undefined
      }>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Txt variant="label" color={C.primaryDark}>
            🥊 Level Fit · {duel.name}
          </Txt>
          <Txt variant="title">Round {daysBetween(toDateKey(new Date(duel.createdAt)), today) + 1}</Txt>
          <Txt variant="dim">{periodLabel('day', today, today)}</Txt>
        </View>
        {mode === 'online' ? (
          <Chip
            label={syncError ? '⚠️ offline' : syncing ? '⟳ sincronizando' : '● online'}
            color={syncError ? C.warning + '33' : C.leaf + '33'}
            textColor={C.ink}
          />
        ) : null}
      </Row>

      {mode === 'local' && duel.players.length > 1 ? (
        <Card style={{ paddingVertical: S.md }}>
          <Txt variant="label">Quem está no ringue?</Txt>
          <Row gap={S.md}>
            {duel.players.map((p) => {
              const active = p.id === me.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    haptic();
                    setActivePlayer(p.id);
                  }}
                  style={[styles.playerPick, active && { borderColor: p.color, backgroundColor: p.color + '22' }]}>
                  <Avatar emoji={p.avatar} color={p.color} size={32} />
                  <Txt variant="h3" style={{ opacity: active ? 1 : 0.6 }}>
                    {p.name}
                  </Txt>
                </Pressable>
              );
            })}
          </Row>
        </Card>
      ) : null}

      <Card>
        <VersusBar
          left={me}
          right={opponent}
          leftPoints={myDay.total}
          rightPoints={oppDay?.total ?? 0}
          caption={opponent ? taunt(myDay.total - (oppDay?.total ?? 0), opponent.name, done, goals.length) : `Convide seu rival com o código ${duel.code}`}
        />
      </Card>

      <Animated.View entering={FadeIn}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">Metas de hoje</Txt>
            <Txt variant="h3" color={C.primary}>
              {done}/{goals.length}
            </Txt>
          </Row>
          <ProgressBar value={goals.length ? done / goals.length : 0} />
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Chip label={streak === 1 ? '🔥 1 dia de sequência' : `🔥 ${streak} dias seguidos`} color={C.warning + '33'} textColor={C.ink} />
            <Chip label={`Combo x${nextMultiplier}`} color={C.accent + '33'} textColor={C.accent} />
            <Chip
              label={myDay.perfect ? '💯 Bônus garantido' : `💯 +${PERFECT_DAY_BONUS} se completar tudo`}
              color={C.gold + '55'}
              textColor={C.ink}
            />
          </Row>
        </Card>
      </Animated.View>

      <View style={{ gap: S.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h2">Seus golpes de hoje</Txt>
          <Pressable onPress={() => router.push('/goals')} hitSlop={10}>
            <Txt variant="h3" color={C.primaryDark}>
              Editar
            </Txt>
          </Pressable>
        </Row>
        {goals.map((h, i) => (
          <HabitCard
            key={h.id}
            index={i}
            habit={h}
            me={me}
            opponent={opponent}
            myCheckins={forHabit(me.id, h.id)}
            oppCheckins={forHabit(opponent?.id, h.id)}
          />
        ))}
      </View>

      <View style={{ gap: S.md }}>
        <Txt variant="h2">⚡ Golpe especial</Txt>
        <HabitCard
          habit={challenge}
          me={me}
          opponent={opponent}
          myCheckins={forHabit(me.id, challenge.id)}
          oppCheckins={forHabit(opponent?.id, challenge.id)}
          challenge
          index={goals.length}
        />
      </View>

      <View style={styles.tip}>
        <Txt variant="small">
          Toque em uma meta para postar a foto de prova. Seu rival pode reagir ou contestar a prova — prova contestada não pontua.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  playerPick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.sm,
    borderRadius: R.md,
    borderWidth: 2,
    borderColor: C.hairline,
  },
  tip: { padding: S.md, borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 2, borderColor: C.hairline, borderStyle: 'dashed' },
});
