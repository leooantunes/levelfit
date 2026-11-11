import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReactionBar } from '@/components/ProofCard';
import { Avatar, Button, Card, haptic, Row, Txt } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { formatTime, periodLabel } from '@/domain/dates';
import { getHabit } from '@/domain/habits';
import { usePlayers, useToday } from '@/hooks/useScoreBook';
import { useActiveCheckins, useActiveDuel, useGame } from '@/store/useGame';

export default function ProofScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const checkin = useActiveCheckins().find((c) => c.id === id);
  const duel = useActiveDuel();
  const react = useGame((s) => s.react);
  const toggleDispute = useGame((s) => s.toggleDispute);
  const deleteCheckin = useGame((s) => s.deleteCheckin);
  const { me } = usePlayers();
  const today = useToday();

  if (!checkin || !duel || !me) {
    return (
      <SafeAreaView style={styles.center}>
        <Txt variant="dim">Prova não encontrada.</Txt>
        <Button title="Voltar" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const habit = getHabit(checkin.habitId);
  const owner = duel.players.find((p) => p.id === checkin.playerId);
  const isMine = checkin.playerId === me.id;
  const canDelete = isMine;

  const dispute = () => {
    if (checkin.disputed) {
      toggleDispute(checkin.id);
      return;
    }
    Alert.alert(
      'Contestar prova?',
      `Se você acha que ${owner?.name} está de migué, a prova deixa de pontuar até ser liberada novamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Contestar 🤨',
          style: 'destructive',
          onPress: () => {
            haptic('warning');
            toggleDispute(checkin.id);
          },
        },
      ],
    );
  };

  const remove = () =>
    Alert.alert('Apagar prova?', 'Os pontos desta prova serão removidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await deleteCheckin(checkin.id);
          router.back();
        },
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Txt variant="dim">Fechar</Txt>
          </Pressable>
          <Txt variant="small">
            {periodLabel('day', checkin.dateKey, today)} · {formatTime(checkin.createdAt)}
          </Txt>
        </Row>
        <Row>
          <Avatar emoji={owner?.avatar ?? '❔'} color={owner?.color ?? C.textMuted} />
          <View>
            <Txt variant="h2">{owner?.name}</Txt>
            <Txt variant="dim">
              {habit?.emoji} {habit?.title}
            </Txt>
          </View>
        </Row>
        <Image source={{ uri: checkin.photoUri }} style={styles.photo} contentFit="contain" transition={200} />
        {checkin.note ? (
          <Card>
            <Txt>{checkin.note}</Txt>
          </Card>
        ) : null}
        <ReactionBar checkin={checkin} viewerId={me.id} onReact={(e) => react(checkin.id, e)} />
        {checkin.disputed ? (
          <Card style={{ borderColor: C.danger }}>
            <Txt variant="h3" color={C.danger}>
              ⚠️ Prova contestada
            </Txt>
            <Txt variant="dim">Esta prova não está valendo pontos.</Txt>
          </Card>
        ) : null}
        {!isMine ? (
          <Button
            title={checkin.disputed ? 'Aceitar prova' : 'Contestar prova'}
            icon={checkin.disputed ? '✅' : '🤨'}
            variant={checkin.disputed ? 'primary' : 'ghost'}
            onPress={dispute}
          />
        ) : null}
        {canDelete ? <Button title="Apagar prova" icon="🗑️" variant="danger" onPress={remove} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: S.lg },
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: R.lg, backgroundColor: C.surface },
});
