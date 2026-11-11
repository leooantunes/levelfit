import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { haptic, Row, Txt } from '@/components/ui';
import { AVATARS, C, F, hardShadow, PLAYER_COLORS, R, S, STROKE } from '@/constants/theme';

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={C.textMuted} {...props} style={[styles.input, props.style]} />;
}

export function AvatarPicker({
  avatar,
  color,
  onAvatar,
  onColor,
}: {
  avatar: string;
  color: string;
  onAvatar: (a: string) => void;
  onColor: (c: string) => void;
}) {
  return (
    <View style={{ gap: S.md }}>
      <View style={styles.grid}>
        {AVATARS.map((a) => (
          <Pressable
            key={a}
            accessibilityLabel={`Avatar ${a}`}
            onPress={() => {
              haptic();
              onAvatar(a);
            }}
            style={[styles.avatarCell, a === avatar && { borderColor: C.ink, backgroundColor: color + '40', boxShadow: hardShadow(3) }]}>
            <Txt style={{ fontSize: 28 }}>{a}</Txt>
          </Pressable>
        ))}
      </View>
      <Row style={{ justifyContent: 'center' }} gap={S.md}>
        {PLAYER_COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityLabel={`Cor ${c}`}
            onPress={() => {
              haptic();
              onColor(c);
            }}
            style={[styles.color, { backgroundColor: c }, c === color && styles.colorOn]}
          />
        ))}
      </Row>
    </View>
  );
}

export function SuggestionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.suggestion}>
      <Txt variant="small" color={C.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  avatarCell: {
    width: 56,
    height: 56,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.hairline,
  },
  color: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.ink },
  colorOn: { borderWidth: 4, transform: [{ scale: 1.15 }], boxShadow: hardShadow(3) },
  input: {
    backgroundColor: C.surface,
    color: C.text,
    borderRadius: R.md,
    padding: S.lg,
    fontSize: 17,
    fontFamily: F.medium,
    borderWidth: STROKE,
    borderColor: C.ink,
  },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink },
});
