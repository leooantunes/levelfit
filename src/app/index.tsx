import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar, Button, Card, Chip, haptic, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { getHabit } from '@/domain/habits';
import { ScoreBook } from '@/domain/scoring';
import type { Checkin, Duel } from '@/domain/types';
import { useToday } from '@/hooks/useScoreBook';
import { useGame } from '@/store/useGame';

const NO_CHECKINS: Checkin[] = [];

function DuelCard({ duel, myId, index }: { duel: Duel; myId: string; index: number }) {
  const checkins = useGame((s) => s.checkins[duel.id] ?? NO_CHECKINS);
  const pending = useGame((s) => s.pendingSync.some((id) => checkins.some((c) => c.id === id)));
  const openDuel = useGame((s) => s.openDuel);
  const today = useToday();
  const book = useMemo(() => new ScoreBook(duel, checkins), [duel, checkins]);

  const me = duel.players.find((p) => p.id === myId);
  const opp = duel.players.find((p) => p.id !== myId) ?? null;
  if (!me) return null;

  const myDay = book.day(me.id, today);
  const oppPoints = opp ? book.day(opp.id, today).total : 0;
  const goals = duel.habitIds.filter((id) => getHabit(id));
  const done = goals.filter((id) => (myDay.counts[id] ?? 0) >= (getHabit(id)?.maxPerDay ?? 1)).length;
  const diff = myDay.total - oppPoints;
  const streak = book.currentStreak(me.id, today);

  const open = () => {
    haptic();
    openDuel(duel.id);
    router.push('/duel');
  };

  const invite = () =>
    Share.share({ message: `Bora duelar no Level Fit? ⚡ Entre no duelo "${duel.name}" com o código ${duel.code}` });

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(18)}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Abrir duelo ${duel.name}`}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>
              {duel.name}
            </Txt>
            {pending ? <Chip label="⟳ enviando" color={C.warning + '22'} textColor={C.warning} /> : null}
            {streak > 1 ? <Chip label={`🔥 ${streak}`} color={C.warning + '22'} textColor={C.warning} /> : null}
          </Row>

          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={S.sm} style={{ flex: 1 }}>
              <Avatar emoji={me.avatar} color={me.color} size={36} />
              <Txt variant="number" style={{ fontSize: 26 }} color={me.color}>
                {myDay.total}
              </Txt>
            </Row>
            <Txt variant="label">VS</Txt>
            {opp ? (
              <Row gap={S.sm} style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Txt variant="number" style={{ fontSize: 26 }} color={opp.color}>
                  {oppPoints}
                </Txt>
                <Avatar emoji={opp.avatar} color={opp.color} size={36} />
              </Row>
            ) : (
              <Row gap={S.sm} style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Txt variant="small">aguardando rival</Txt>
                <Avatar emoji="❔" color={C.hairline} size={36} />
              </Row>
            )}
          </Row>

          {opp ? (
            <>
              <ProgressBar value={goals.length ? done / goals.length : 0} height={6} />
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="small">
                  Metas hoje: {done}/{goals.length}
                </Txt>
                <Txt variant="small" color={diff > 0 ? C.leafDark : diff < 0 ? C.danger : C.textDim}>
                  {diff > 0 ? `Liderando por ${diff}` : diff < 0 ? `${opp.name} +${-diff}` : 'Empatados'}
                </Txt>
              </Row>
            </>
          ) : (
            <Pressable onPress={invite} style={styles.invite} hitSlop={6}>
              <Txt variant="small">Convide com o código</Txt>
              <Txt variant="h3" color={C.primaryDark} style={{ letterSpacing: 4 }}>
                {duel.code}
              </Txt>
              <Txt variant="small" color={C.primaryDark}>
                Compartilhar ↗
              </Txt>
            </Pressable>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const account = useGame((s) => s.account)!;
  const duels = useGame((s) => s.duels);
  const order = useGame((s) => s.duelOrder);
  const syncing = useGame((s) => s.syncing);
  const syncError = useGame((s) => s.syncError);
  const refreshAll = useGame((s) => s.refreshAll);

  const list = order.map((id) => duels[id]).filter((d): d is Duel => !!d);

  return (
    <Screen refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshAll} tintColor={C.primary} />}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt variant="label" color={C.primaryDark}>
            🥊 Level Fit
          </Txt>
          <Txt variant="title" numberOfLines={1}>
            Olá, {account.name}!
          </Txt>
        </View>
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Minha conta" hitSlop={8}>
          <Avatar emoji={account.avatar} color={account.color} size={48} />
        </Pressable>
      </Row>

      {syncError ? (
        <Chip label={`⚠️ ${syncError}`} color={C.warning + '22'} textColor={C.warning} />
      ) : null}

      <Row gap={S.sm}>
        <Button title="Novo duelo" icon="⚔️" onPress={() => router.push('/new-duel')} style={{ flex: 1 }} />
        <Button title="Entrar" icon="🔑" variant="secondary" onPress={() => router.push('/join')} style={{ flex: 1 }} />
      </Row>

      {list.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: S.xxl }}>
          <Txt style={{ fontSize: 56 }}>🥊</Txt>
          <Txt variant="h3">Nenhum duelo ainda</Txt>
          <Txt variant="dim" style={{ textAlign: 'center' }}>
            Crie um duelo e mande o código para um amigo, ou entre com o código que alguém te mandou. Você pode ter vários duelos ao mesmo tempo.
          </Txt>
        </Card>
      ) : (
        <View style={{ gap: S.md }}>
          <Txt variant="h2">Seus duelos ({list.length})</Txt>
          {list.map((d, i) => (
            <DuelCard key={d.id} duel={d} myId={account.id} index={i} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  invite: { alignItems: 'center', padding: S.md, borderRadius: R.md, backgroundColor: C.surface2, gap: 2 },
});
