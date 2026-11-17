import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { BounceIn, FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/Confetti';
import { ProofThumb } from '@/components/HealthProof';
import { Button, Card, Chip, haptic, Row, Txt } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { formatTime } from '@/domain/dates';
import { CHALLENGE_MULTIPLIER, dailyChallenge, getHabit } from '@/domain/habits';
import { formatHealthValue, HEALTH_GOALS } from '@/domain/healthGoals';
import type { Checkin, Duel, Habit } from '@/domain/types';
import { usePlayers, useToday } from '@/hooks/useScoreBook';
import { HEALTH_SOURCE, SUPPORTED_METRICS } from '@/lib/health';
import { pickProofPhoto, takeProofPhoto } from '@/lib/photos';
import { useActiveCheckins, useActiveDuel, useGame } from '@/store/useGame';

/** Outros duelos meus com esta mesma meta (fixa ou desafio do dia) ainda aberta hoje. */
function duelsSharingGoal(args: {
  duelOrder: string[];
  duels: Record<string, Duel>;
  checkins: Record<string, Checkin[]>;
  currentId: string;
  myId: string;
  habit: Habit;
  today: string;
}): Duel[] {
  const { duelOrder, duels, checkins, currentId, myId, habit, today } = args;
  return duelOrder
    .map((id) => duels[id])
    .filter((d): d is Duel => {
      if (!d || d.id === currentId || !d.players.some((p) => p.id === myId)) return false;
      const hasHabit = d.habitIds.includes(habit.id) || dailyChallenge(d.id, today, d.habitIds).id === habit.id;
      if (!hasHabit) return false;
      const done = (checkins[d.id] ?? []).filter(
        (c) => c.dateKey === today && c.habitId === habit.id && c.playerId === myId && !c.disputed,
      ).length;
      return done < habit.maxPerDay;
    });
}

export default function CheckinScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const habit = getHabit(habitId);
  const duel = useActiveDuel();
  const checkins = useActiveCheckins();
  const addCheckin = useGame((s) => s.addCheckin);
  const today = useToday();
  const { me, opponent } = usePlayers();
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const healthEnabled = useGame((s) => s.healthEnabled);
  const enableHealth = useGame((s) => s.enableHealth);
  const [connecting, setConnecting] = useState(false);
  const [sharedCount, setSharedCount] = useState(0);
  const myId = useGame((s) => s.account?.id);
  const duels = useGame((s) => s.duels);
  const duelOrder = useGame((s) => s.duelOrder);
  const allCheckins = useGame((s) => s.checkins);

  if (!habit || !duel || !me) return null;

  const otherDuels = myId
    ? duelsSharingGoal({ duelOrder, duels, checkins: allCheckins, currentId: duel.id, myId, habit, today })
    : [];

  const goal = HEALTH_GOALS[habit.id];
  const healthGoal = HEALTH_SOURCE && goal && SUPPORTED_METRICS.includes(goal.metric) ? goal : null;

  const connect = async () => {
    setConnecting(true);
    try {
      const ok = await enableHealth();
      if (ok) haptic('success');
      else Alert.alert('Relógio', `Não foi possível conectar ao ${HEALTH_SOURCE}. Confira as permissões e tente de novo.`);
    } finally {
      setConnecting(false);
    }
  };

  const isChallenge = !duel.habitIds.includes(habit.id) && dailyChallenge(duel.id, today, duel.habitIds).id === habit.id;
  const pts = habit.points * (isChallenge ? CHALLENGE_MULTIPLIER : 1);
  const todays = checkins.filter((c) => c.dateKey === today && c.habitId === habit.id);
  const mine = todays.filter((c) => c.playerId === me.id && !c.disputed);
  const full = mine.length >= habit.maxPerDay;

  const grab = async (source: 'camera' | 'library') => {
    try {
      const uri = source === 'camera' ? await takeProofPhoto() : await pickProofPhoto();
      if (uri) {
        haptic();
        setPhoto(uri);
      }
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : String(e));
    }
  };

  const post = async (extraDuelIds: string[]) => {
    if (!photo) return;
    setSaving(true);
    try {
      await addCheckin(habit.id, photo, note);
      // Uma falha em outro duelo não desfaz a prova deste.
      const results = await Promise.allSettled(extraDuelIds.map((id) => addCheckin(habit.id, photo, note, id)));
      const shared = results.filter((r) => r.status === 'fulfilled').length;
      setSharedCount(shared);
      if (shared < extraDuelIds.length) {
        Alert.alert('Quase lá', 'A prova entrou neste duelo, mas não deu para postar em todos os outros.');
      }
      haptic('success');
      setSuccess(true);
      setTimeout(() => router.back(), 1600);
    } catch (e) {
      Alert.alert('Não foi possível salvar', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const submit = () => {
    if (!photo) return;
    if (otherDuels.length === 0) {
      void post([]);
      return;
    }
    const names = otherDuels.map((d) => `• ${d.name}`).join('\n');
    Alert.alert(
      'Usar a foto em outros duelos?',
      `"${habit.title}" também é meta hoje em:\n${names}\n\nQuer que esta prova valha em todos ou só em "${duel.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Só neste duelo', onPress: () => post([]) },
        { text: `Em todos (${otherDuels.length + 1})`, onPress: () => post(otherDuels.map((d) => d.id)) },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.grabber} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Txt variant="dim">Fechar</Txt>
            </Pressable>
            <Chip label={`${me.avatar} ${me.name}`} color={me.color + '33'} textColor={me.color} />
          </Row>

          <View style={{ alignItems: 'center', gap: S.sm }}>
            <Animated.Text entering={BounceIn} style={{ fontSize: 64 }}>
              {habit.emoji}
            </Animated.Text>
            <Txt variant="title" style={{ textAlign: 'center' }}>
              {habit.title}
            </Txt>
            <Txt variant="dim" style={{ textAlign: 'center' }}>
              {habit.description}
            </Txt>
            <Row>
              <Chip label={`+${pts} pts`} color={C.primary + '22'} textColor={C.primary} />
              {isChallenge ? <Chip label="⚡ Desafio 2x" color={C.gold} textColor={C.ink} /> : null}
              {habit.maxPerDay > 1 ? <Chip label={`${mine.length}/${habit.maxPerDay} hoje`} /> : null}
            </Row>
          </View>

          {full ? (
            <Card style={{ alignItems: 'center' }}>
              <Txt style={{ fontSize: 40 }}>✅</Txt>
              <Txt variant="h3">Meta concluída hoje!</Txt>
              <Txt variant="dim" style={{ textAlign: 'center' }}>
                Você já registrou o máximo para este hábito. Volte amanhã!
              </Txt>
            </Card>
          ) : (
            <>
              {healthGoal ? (
                <Card style={{ backgroundColor: C.leaf + '18' }}>
                  <Txt variant="label">⌚ Pelo relógio</Txt>
                  {healthEnabled ? (
                    <Txt variant="dim">
                      Bateu {formatHealthValue({ metric: healthGoal.metric, value: healthGoal.target })} no {HEALTH_SOURCE}? A prova entra
                      sozinha quando você abrir o app. Ou mande uma foto agora.
                    </Txt>
                  ) : (
                    <>
                      <Txt variant="dim">
                        Conecte o {HEALTH_SOURCE} e esta meta conta sozinha quando seu relógio registrar{' '}
                        {formatHealthValue({ metric: healthGoal.metric, value: healthGoal.target })}.
                      </Txt>
                      <Button
                        title="Conectar relógio"
                        size="sm"
                        variant="secondary"
                        loading={connecting}
                        onPress={connect}
                        style={{ alignSelf: 'flex-start' }}
                      />
                    </>
                  )}
                </Card>
              ) : null}
              <Card>
                <Txt variant="label">📸 Foto de prova</Txt>
                <Txt variant="dim">{habit.proofHint}</Txt>
                {photo ? (
                  <Animated.View entering={ZoomIn}>
                    <Image source={{ uri: photo }} style={styles.preview} contentFit="cover" />
                  </Animated.View>
                ) : (
                  <View style={[styles.preview, styles.placeholder]}>
                    <Txt style={{ fontSize: 40 }}>📷</Txt>
                    <Txt variant="dim">Sem foto, sem pontos!</Txt>
                  </View>
                )}
                <Row>
                  {Platform.OS !== 'web' ? (
                    <Button title={photo ? 'Refazer' : 'Câmera'} icon="📸" onPress={() => grab('camera')} style={{ flex: 1 }} variant="secondary" />
                  ) : null}
                  <Button title="Galeria" icon="🖼️" onPress={() => grab('library')} style={{ flex: 1 }} variant="secondary" />
                </Row>
              </Card>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Legenda (opcional) — ex.: 12 páginas de Hábitos Atômicos"
                placeholderTextColor={C.textMuted}
                style={styles.input}
                maxLength={140}
              />

              <Button
                title={photo ? `Postar prova (+${pts} pts)` : 'Adicione uma foto'}
                onPress={submit}
                disabled={!photo}
                loading={saving}
              />
            </>
          )}

          {todays.length > 0 ? (
            <Card>
              <Txt variant="label">Provas de hoje</Txt>
              {todays.map((c) => {
                const who = c.playerId === me.id ? me : opponent;
                return (
                  <Pressable key={c.id} onPress={() => router.push({ pathname: '/proof/[id]', params: { id: c.id } })}>
                    <Row>
                      <ProofThumb checkin={c} style={styles.thumb} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="h3">
                          {who?.avatar} {who?.name}
                        </Txt>
                        <Txt variant="small">
                          {formatTime(c.createdAt)} {c.disputed ? '· ⚠️ contestada' : ''}
                        </Txt>
                      </View>
                    </Row>
                  </Pressable>
                );
              })}
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {success ? (
        <Animated.View entering={FadeIn} style={styles.success} pointerEvents="none">
          <Confetti count={40} />
          <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: S.sm }}>
            <Txt style={{ fontSize: 80 }}>{habit.emoji}</Txt>
            <Txt variant="title" color={C.primary} style={{ fontSize: 44, lineHeight: 54 }}>
              +{pts} pts!
            </Txt>
            <Txt variant="h3">Golpe certeiro! Prova registrada 🥊</Txt>
            {sharedCount > 0 ? (
              <Txt variant="dim">{`Valendo também em ${sharedCount} ${sharedCount === 1 ? 'outro duelo' : 'outros duelos'}`}</Txt>
            ) : null}
          </Animated.View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: S.lg, gap: S.lg, paddingBottom: 48 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.hairline },
  preview: { width: '100%', aspectRatio: 4 / 5, borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 2, borderColor: C.ink },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: S.sm, borderWidth: 2, borderStyle: 'dashed', borderColor: C.textMuted },
  input: {
    backgroundColor: C.surface,
    color: C.text,
    borderRadius: R.md,
    padding: S.lg,
    fontSize: 15,
    borderWidth: 2,
    borderColor: C.ink,
  },
  thumb: { width: 48, height: 48, borderRadius: R.sm },
  success: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,243,227,0.97)', alignItems: 'center', justifyContent: 'center' },
});
