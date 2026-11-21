import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalPicker } from '@/components/GoalPicker';
import { Button, Card, haptic, Row, Txt } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useActiveDuel, useDuelIsPro, useGame } from '@/store/useGame';

export default function GoalsScreen() {
  const duel = useActiveDuel();
  const updateDuel = useGame((s) => s.updateDuel);
  const pro = useDuelIsPro(duel);
  const [habitIds, setHabitIds] = useState(duel?.habitIds ?? []);
  const [customHabits, setCustomHabits] = useState(duel?.customHabits ?? []);
  const [stake, setStake] = useState(duel?.stake ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const kept = customHabits.filter((c) => habitIds.includes(c.id));
      const changedCustom = JSON.stringify(kept) !== JSON.stringify(duel?.customHabits ?? []);
      // Só mexe nas personalizadas se mudaram (o servidor recusa fora de um duelo Pro).
      await updateDuel({ habitIds, stake: stake.trim() || undefined, ...(changedCustom ? { customHabits: kept } : {}) });
      haptic('success');
      router.back();
    } catch (e) {
      Alert.alert('Não foi possível salvar', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
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
            As metas valem para todos os jogadores e o placar é recalculado com as metas atuais — combine a mudança com seu rival! 🤝
          </Txt>
        </Card>
        <View style={{ gap: S.sm }}>
          <Txt variant="label">💸 Aposta (semana/mês)</Txt>
          <TextInput
            value={stake}
            onChangeText={setStake}
            placeholder="ex.: um açaí, o jantar, lavar a louça…"
            placeholderTextColor={C.textMuted}
            style={{ backgroundColor: C.surface, color: C.text, borderRadius: R.md, padding: S.lg, borderWidth: 2.5, borderColor: C.ink }}
          />
        </View>
        <GoalPicker
          selected={habitIds}
          onChange={setHabitIds}
          custom={customHabits}
          onCustomChange={setCustomHabits}
          canCustom={pro}
          onLocked={() => router.push('/premium')}
        />
      </ScrollView>
      <View style={{ position: 'absolute', left: S.lg, right: S.lg, bottom: S.xl }}>
        <Button title="Salvar metas" onPress={save} loading={saving} disabled={habitIds.length === 0} />
      </View>
    </SafeAreaView>
  );
}
