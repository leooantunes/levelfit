import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HealthProofView } from '@/components/HealthProof';
import { ReactionBar } from '@/components/ProofCard';
import { Avatar, Button, Card, haptic, Row, Txt } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { formatTime, periodLabel } from '@/domain/dates';
import { getHabit } from '@/domain/habits';
import { usePlayers, useToday } from '@/hooks/useScoreBook';
import { useActiveCheckins, useActiveDuel, useGame } from '@/store/useGame';
import type { ReportReason } from '@/sync/supabase';

const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'ofensiva', label: 'Ofensivo ou abusivo' },
  { id: 'nudez', label: 'Nudez ou conteúdo sexual' },
  { id: 'spam', label: 'Spam ou não é uma prova' },
  { id: 'outro', label: 'Outro motivo' },
];

export default function ProofScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const checkin = useActiveCheckins().find((c) => c.id === id);
  const duel = useActiveDuel();
  const react = useGame((s) => s.react);
  const toggleDispute = useGame((s) => s.toggleDispute);
  const deleteCheckin = useGame((s) => s.deleteCheckin);
  const reportProof = useGame((s) => s.reportProof);
  const blockRival = useGame((s) => s.blockRival);
  const { me } = usePlayers();
  const today = useToday();
  const [reporting, setReporting] = useState(false);
  const [sending, setSending] = useState(false);

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

  const block = async () => {
    try {
      await blockRival(duel.id);
      router.dismissTo('/');
    } catch (e) {
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    }
  };

  const report = async (reason: ReportReason) => {
    setSending(true);
    try {
      await reportProof(checkin.id, reason);
      setReporting(false);
      haptic('success');
      Alert.alert(
        'Denúncia enviada',
        `Obrigado! A equipe do Level Fit vai analisar em até 24 horas.\n\nSe não quer mais ver o conteúdo de ${owner?.name ?? 'este jogador'}, você pode bloquear: você sai do duelo, suas provas dele são apagadas e vocês não duelam mais.`,
        [
          { text: 'Continuar no duelo', style: 'cancel' },
          { text: 'Bloquear', style: 'destructive', onPress: block },
        ],
      );
    } catch (e) {
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

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
        {checkin.health ? (
          <HealthProofView proof={checkin.health} dim={checkin.disputed} />
        ) : (
          <Image source={{ uri: checkin.photoUri, cacheKey: checkin.id }} style={styles.photo} contentFit="contain" transition={200} />
        )}
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
        {!isMine && !reporting && !checkin.health ? (
          <Pressable onPress={() => setReporting(true)} hitSlop={10} style={{ alignSelf: 'center' }} accessibilityRole="button">
            <Txt variant="dim">🚩 Denunciar conteúdo impróprio</Txt>
          </Pressable>
        ) : null}
        {!isMine && reporting ? (
          <Card>
            <Txt variant="h3">Por que você está denunciando?</Txt>
            {REPORT_REASONS.map((r) => (
              <Button key={r.id} title={r.label} variant="ghost" disabled={sending} onPress={() => report(r.id)} />
            ))}
            <Pressable onPress={() => setReporting(false)} hitSlop={10} style={{ alignSelf: 'center' }}>
              <Txt variant="dim">Cancelar</Txt>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: S.lg },
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: R.lg, backgroundColor: C.surface },
});
