import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { C, hardShadow, R, S, STROKE } from '@/constants/theme';
import { CATEGORY_LABEL, GOAL_PRESETS, HABITS } from '@/domain/habits';
import type { HabitCategory } from '@/domain/types';

import { haptic, Row, Txt } from './ui';

export const MAX_GOALS = 8;

export function GoalPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => {
    haptic();
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < MAX_GOALS) onChange([...selected, id]);
  };
  const categories = Object.keys(CATEGORY_LABEL) as HabitCategory[];
  const dailyMax = selected.reduce((sum, id) => {
    const h = HABITS.find((x) => x.id === id);
    return sum + (h ? h.points * h.maxPerDay : 0);
  }, 0);

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Txt variant="label">✨ Sugestões do Level Fit</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
          {GOAL_PRESETS.map((p) => {
            const active = p.habitIds.length === selected.length && p.habitIds.every((id) => selected.includes(id));
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  haptic();
                  onChange(p.habitIds);
                }}
                style={[styles.preset, active && { backgroundColor: C.primary + '22', boxShadow: hardShadow(4, C.primary) }]}>
                <Txt style={{ fontSize: 26 }}>{p.emoji}</Txt>
                <Txt variant="h3">{p.title}</Txt>
                <Txt variant="small">{p.description}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="dim">
          {selected.length}/{MAX_GOALS} metas
        </Txt>
        <Txt variant="dim" color={C.leafDark}>
          até {dailyMax} pts/dia
        </Txt>
      </Row>

      {categories.map((cat) => (
        <View key={cat} style={{ gap: S.sm }}>
          <Txt variant="label">{CATEGORY_LABEL[cat]}</Txt>
          {HABITS.filter((h) => h.category === cat).map((h) => {
            const on = selected.includes(h.id);
            return (
              <Pressable key={h.id} onPress={() => toggle(h.id)} style={[styles.item, on && styles.itemOn]}>
                <Txt style={{ fontSize: 24 }}>{h.emoji}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt variant="h3">{h.title}</Txt>
                  <Txt variant="small">
                    +{h.points} pts{h.maxPerDay > 1 ? ` (até ${h.maxPerDay}x/dia)` : ''}
                  </Txt>
                </View>
                <View style={[styles.check, on && { backgroundColor: C.leaf, borderColor: C.ink }]}>
                  {on ? <Txt style={{ color: C.onColor, fontWeight: '900' }}>✓</Txt> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  preset: {
    width: 170,
    padding: S.md,
    gap: 4,
    borderRadius: R.md,
    backgroundColor: C.surface,
    borderWidth: STROKE,
    borderColor: C.ink,
    boxShadow: hardShadow(4),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.hairline,
  },
  itemOn: { borderColor: C.ink, backgroundColor: '#EFFAEF', boxShadow: hardShadow(3, C.leaf) },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: C.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
