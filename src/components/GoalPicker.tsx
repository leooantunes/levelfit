import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { C, F, hardShadow, R, S, STROKE } from '@/constants/theme';
import {
  CATEGORY_LABEL,
  CUSTOM_POINTS,
  customToHabit,
  GOAL_PRESETS,
  HABITS,
  MAX_CUSTOM_HABITS,
  newCustomHabitId,
} from '@/domain/habits';
import type { CustomHabit, HabitCategory } from '@/domain/types';

import { Button, haptic, Row, Txt } from './ui';

export const MAX_GOALS = 8;

const EMOJI_IDEAS = ['💊', '🥤', '🧗', '🚴', '🏊', '🥊', '🎸', '🧹', '🐶', '🌿', '📝', '🙏'];

/** Criar e escolher metas personalizadas (Premium). */
function CustomGoals({
  custom,
  selected,
  onToggle,
  onCustomChange,
}: {
  custom: CustomHabit[];
  selected: string[];
  onToggle: (id: string) => void;
  onCustomChange: (c: CustomHabit[], select?: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_IDEAS[0]);
  const [points, setPoints] = useState(10);
  const full = custom.length >= MAX_CUSTOM_HABITS;

  const add = () => {
    const t = title.trim();
    if (!t || full) return;
    haptic('success');
    const id = newCustomHabitId();
    onCustomChange([...custom, { id, title: t, emoji, points }], id);
    setTitle('');
  };

  return (
    <View style={{ gap: S.sm }}>
      {custom.map((c) => {
        const on = selected.includes(c.id);
        const h = customToHabit(c);
        return (
          <Pressable key={c.id} onPress={() => onToggle(c.id)} style={[styles.item, on && styles.itemOn]}>
            <Txt style={{ fontSize: 24 }}>{h.emoji}</Txt>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{h.title}</Txt>
              <Txt variant="small">+{h.points} pts</Txt>
            </View>
            <Pressable
              hitSlop={10}
              accessibilityLabel={`Apagar a meta ${h.title}`}
              onPress={() => {
                haptic();
                onCustomChange(custom.filter((x) => x.id !== c.id));
              }}>
              <Txt variant="small">🗑️</Txt>
            </Pressable>
            <View style={[styles.check, on && { backgroundColor: C.leaf, borderColor: C.ink }]}>
              {on ? <Txt style={{ color: C.onColor, fontWeight: '900' }}>✓</Txt> : null}
            </View>
          </Pressable>
        );
      })}
      {full ? (
        <Txt variant="small">Limite de {MAX_CUSTOM_HABITS} metas personalizadas por duelo.</Txt>
      ) : (
        <View style={styles.form}>
          <Row gap={S.sm}>
            <View style={styles.emojiBox}>
              <Txt style={{ fontSize: 26 }}>{emoji}</Txt>
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Nova meta (ex.: Tomar creatina)"
              placeholderTextColor={C.textMuted}
              maxLength={40}
              style={styles.input}
              onSubmitEditing={add}
            />
          </Row>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {EMOJI_IDEAS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.pill, e === emoji && styles.pillOn]}>
                <Txt style={{ fontSize: 20 }}>{e}</Txt>
              </Pressable>
            ))}
          </ScrollView>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {CUSTOM_POINTS.map((p) => (
              <Pressable key={p} onPress={() => setPoints(p)} style={[styles.pill, p === points && styles.pillOn]}>
                <Txt variant="small" color={p === points ? C.onColor : C.ink}>
                  +{p} pts
                </Txt>
              </Pressable>
            ))}
          </Row>
          <Button title="Adicionar meta" icon="✏️" variant="secondary" onPress={add} disabled={!title.trim()} />
        </View>
      )}
    </View>
  );
}

export function GoalPicker({
  selected,
  onChange,
  custom = [],
  onCustomChange,
  canCustom = false,
  onLocked,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Metas personalizadas do duelo. */
  custom?: CustomHabit[];
  onCustomChange?: (custom: CustomHabit[]) => void;
  /** Duelo Pro: pode criar metas personalizadas. */
  canCustom?: boolean;
  /** Toque na seção bloqueada (leva ao Premium). */
  onLocked?: () => void;
}) {
  const toggle = (id: string) => {
    haptic();
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < MAX_GOALS) onChange([...selected, id]);
  };
  const changeCustom = (next: CustomHabit[], select?: string) => {
    onCustomChange?.(next);
    const ids = new Set(next.map((c) => c.id));
    // Tira das metas as personalizadas apagadas e já marca a recém-criada.
    let sel = selected.filter((id) => !id.startsWith('custom-') || ids.has(id));
    if (select && sel.length < MAX_GOALS) sel = [...sel, select];
    onChange(sel);
  };
  const categories = (Object.keys(CATEGORY_LABEL) as HabitCategory[]).filter((c) => c !== 'personalizado');
  const dailyMax = selected.reduce((sum, id) => {
    const c = custom.find((x) => x.id === id);
    const h = c ? customToHabit(c) : HABITS.find((x) => x.id === id);
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

      {onCustomChange ? (
        <View style={{ gap: S.sm }}>
          <Txt variant="label">✏️ Metas personalizadas {canCustom ? '' : '· Premium'}</Txt>
          {canCustom ? (
            <CustomGoals custom={custom} selected={selected} onToggle={toggle} onCustomChange={changeCustom} />
          ) : (
            <Pressable onPress={onLocked} style={[styles.item, styles.locked]} accessibilityRole="button">
              <Txt style={{ fontSize: 24 }}>🔒</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">Crie suas próprias metas</Txt>
                <Txt variant="small">“Tomar creatina”, “Pular corda”… com o Premium, do seu jeito.</Txt>
              </View>
            </Pressable>
          )}
        </View>
      ) : null}

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
  locked: { backgroundColor: C.gold + '22', borderColor: C.ink, borderStyle: 'dashed' },
  form: { gap: S.sm, padding: S.md, borderRadius: R.md, borderWidth: 2, borderColor: C.ink, borderStyle: 'dashed', backgroundColor: C.surface },
  emojiBox: { width: 48, height: 48, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2, borderWidth: 2, borderColor: C.ink },
  input: { flex: 1, height: 48, borderRadius: R.sm, borderWidth: 2, borderColor: C.ink, paddingHorizontal: S.md, color: C.text, fontFamily: F.medium, fontSize: 15, backgroundColor: C.surface },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, borderWidth: 2, borderColor: C.hairline, backgroundColor: C.surface },
  pillOn: { borderColor: C.ink, backgroundColor: C.primary },
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
