import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalPicker } from '@/components/GoalPicker';
import { Input, SuggestionChip } from '@/components/ProfileFields';
import { Button, Card, haptic, ProgressBar, Row, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { DEFAULT_HABIT_IDS } from '@/domain/habits';
import { useGame } from '@/store/useGame';
import { PremiumRequiredError } from '@/sync/supabase';

const STAKES = ['um açaí 🍧', 'o jantar 🍝', 'o cinema 🎬', 'lavar a louça 🧽', 'um café ☕'];

export default function NewDuelScreen() {
  const createDuel = useGame((s) => s.createDuel);
  const openDuel = useGame((s) => s.openDuel);
  const myName = useGame((s) => s.account?.name ?? 'Eu');

  const [step, setStep] = useState(0);
  const [habitIds, setHabitIds] = useState<string[]>(DEFAULT_HABIT_IDS);
  const [name, setName] = useState('');
  const [stake, setStake] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    try {
      const id = await createDuel({
        name: name.trim() || `Duelo de ${myName}`,
        habitIds,
        stake: stake.trim() || undefined,
      });
      haptic('success');
      openDuel(id);
      router.replace('/duel');
    } catch (e) {
      if (e instanceof PremiumRequiredError) router.replace('/premium');
      else Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    <View key="goals" style={{ gap: S.lg }}>
      <Txt variant="title">Regras da luta</Txt>
      <Txt variant="dim">Sugerimos um pacote equilibrado. Ajuste do seu jeito. Todo dia também aparece um ⚡ desafio bônus valendo 2x.</Txt>
      <GoalPicker selected={habitIds} onChange={setHabitIds} />
      <Button
        title="Continuar"
        onPress={() => {
          haptic();
          setStep(1);
        }}
        disabled={habitIds.length === 0}
      />
    </View>,

    <View key="stake" style={{ gap: S.lg }}>
      <Txt variant="title">Valendo o quê? 💸</Txt>
      <Txt variant="dim">Opcional, mas deixa tudo mais divertido: quem perder a semana ou o mês paga a aposta.</Txt>
      <Input value={name} onChangeText={setName} placeholder={`Nome do duelo (ex.: ${myName} x Ana)`} maxLength={30} />
      <Input value={stake} onChangeText={setStake} placeholder="Aposta (ex.: um açaí 🍧)" maxLength={40} />
      <Row style={{ flexWrap: 'wrap' }}>
        {STAKES.map((s) => (
          <SuggestionChip key={s} label={s} onPress={() => setStake(s)} />
        ))}
      </Row>
      <Card>
        <Txt variant="label">Como pontua</Txt>
        <Txt variant="dim">
          • Cada prova vale os pontos da meta{'\n'}• Dia perfeito (todas as metas): +30{'\n'}• Combo: 3 dias seguidos x1.1, 7 dias x1.25, 14
          dias x1.5{'\n'}• Prova contestada pelo rival não pontua
        </Txt>
      </Card>
      <Txt variant="small">Depois de criar, você recebe um código de 6 letras para mandar pro seu rival.</Txt>
      <Button title="Soar o gongo! 🔔" onPress={finish} loading={busy} />
    </View>,
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, gap: S.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable onPress={() => (step === 0 ? router.back() : setStep(0))} hitSlop={12}>
              <Txt variant="dim">{step === 0 ? '✕ Cancelar' : '← Voltar'}</Txt>
            </Pressable>
            <Txt variant="small">{step + 1}/2</Txt>
          </Row>
          <ProgressBar value={(step + 1) / 2} height={6} />
        </View>
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Animated.View key={step} entering={FadeInRight.springify().damping(18)}>
            {steps[step]}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
