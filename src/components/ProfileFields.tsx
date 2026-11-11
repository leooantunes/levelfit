import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { haptic, Row, Txt } from '@/components/ui';
import { AVATARS, C, PLAYER_COLORS, R, S } from '@/constants/theme';

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
            style={[styles.avatarCell, a === avatar && { borderColor: color, backgroundColor: color + '22' }]}>
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
    borderColor: C.border,
  },
  color: { width: 32, height: 32, borderRadius: 16 },
  colorOn: { borderWidth: 3, borderColor: '#fff' },
  input: {
    backgroundColor: C.surface,
    color: C.text,
    borderRadius: R.md,
    padding: S.lg,
    fontSize: 17,
    borderWidth: 1,
    borderColor: C.border,
  },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.surface2 },
});
