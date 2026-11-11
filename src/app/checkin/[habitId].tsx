import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { BounceIn, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/components/Confetti';
import { Button, Card, Chip, haptic, Row, Txt } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { formatTime } from '@/domain/dates';
import { CHALLENGE_MULTIPLIER, dailyChallenge, getHabit } from '@/domain/habits';
import { usePlayers, useToday } from '@/hooks/useScoreBook';
import { pickProofPhoto, takeProofPhoto } from '@/lib/photos';
import { useGame } from '@/store/useGame';

export default function CheckinScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const habit = getHabit(habitId);
  const duel = useGame((s) => s.duel)!;
  const checkins = useGame((s) => s.checkins);
  const addCheckin = useGame((s) => s.addCheckin);
  const today = useToday();
  const { me, opponent } = usePlayers();
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!habit || !me) return null;

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

  const submit = async () => {
    if (!photo) return;
    setSaving(true);
    try {
      await addCheckin(habit.id, photo, note);
      haptic('success');
      setSuccess(true);
      setTimeout(() => router.back(), 1600);
    } catch (e) {
      Alert.alert('Não foi possível salvar', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
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
              {isChallenge ? <Chip label="⚡ Desafio 2x" color={C.gold} textColor={C.bg} /> : null}
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
                      <Image source={{ uri: c.photoUri }} style={styles.thumb} contentFit="cover" />
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
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.success} pointerEvents="none">
          <Confetti count={40} />
          <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: S.sm }}>
            <Txt style={{ fontSize: 80 }}>{habit.emoji}</Txt>
            <Txt variant="title" color={C.primary} style={{ fontSize: 44 }}>
              +{pts} pts!
            </Txt>
            <Txt variant="h3">Prova registrada 💪</Txt>
          </Animated.View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: S.lg, gap: S.lg, paddingBottom: 48 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.border },
  preview: { width: '100%', aspectRatio: 4 / 5, borderRadius: R.md, backgroundColor: C.surface2 },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: S.sm, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border },
  input: {
    backgroundColor: C.surface,
    color: C.text,
    borderRadius: R.md,
    padding: S.lg,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  thumb: { width: 48, height: 48, borderRadius: R.sm },
  success: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,8,16,0.92)', alignItems: 'center', justifyContent: 'center' },
});
