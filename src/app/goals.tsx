import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalPicker } from '@/components/GoalPicker';
import { Button, Card, haptic, Row, Txt } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useActiveDuel, useGame } from '@/store/useGame';

export default function GoalsScreen() {
  const duel = useActiveDuel();
  const updateDuel = useGame((s) => s.updateDuel);
  const [habitIds, setHabitIds] = useState(duel?.habitIds ?? []);
  const [stake, setStake] = useState(duel?.stake ?? '');

  const save = async () => {
    haptic('success');
    await updateDuel({ habitIds, stake: stake.trim() || undefined });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: 140 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Txt variant="dim">Cancelar</Txt>
          </Pressable>
          <Txt variant="h3">Metas do duelo</Txt>
          <View style={{ width: 60 }} />
        </Row>
        <Card>
          <Txt variant="dim">
            As metas valem para os dois jogadores e o placar é recalculado com as metas atuais — combine a mudança com seu rival! 🤝
          </Txt>
        </Card>
        <View style={{ gap: S.sm }}>
          <Txt variant="label">💸 Aposta (semana/mês)</Txt>
          <TextInput
            value={stake}
            onChangeText={setStake}
            placeholder="ex.: um açaí, o jantar, lavar a louça…"
            placeholderTextColor={C.textMuted}
            style={{ backgroundColor: C.surface, color: C.text, borderRadius: R.md, padding: S.lg, borderWidth: 1, borderColor: C.border }}
          />
        </View>
        <GoalPicker selected={habitIds} onChange={setHabitIds} />
      </ScrollView>
      <View style={{ position: 'absolute', left: S.lg, right: S.lg, bottom: S.xl }}>
        <Button title="Salvar metas" onPress={save} disabled={habitIds.length === 0} />
      </View>
    </SafeAreaView>
  );
}
