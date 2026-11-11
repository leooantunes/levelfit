import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { C, F, R, S } from '@/constants/theme';

export function haptic(kind: 'light' | 'success' | 'heavy' | 'warning' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
}

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'h2' | 'h3' | 'body' | 'dim' | 'small' | 'label' | 'number';

export function Txt({ variant = 'body', style, color, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  return <Text {...rest} style={[styles[variant], color ? { color } : null, style as StyleProp<TextStyle>]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  ...rest
}: Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bg = { primary: C.primary, secondary: C.surface2, ghost: 'transparent', danger: C.danger }[variant];
  const fg = variant === 'primary' ? '#06210A' : variant === 'danger' ? '#fff' : C.text;
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      onPressIn={() => scale.set(withSpring(0.95))}
      onPressOut={() => scale.set(withSpring(1))}
      onPress={(e) => {
        haptic();
        onPress?.(e);
      }}>
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: bg, opacity: disabled ? 0.45 : 1 },
          variant === 'ghost' && { borderWidth: 1, borderColor: C.border },
          anim,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text style={[styles.buttonText, { color: fg }]}>
            {icon ? `${icon}  ` : ''}
            {title}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function ProgressBar({
  value,
  color = C.primary,
  height = 10,
  track = C.surface2,
}: {
  value: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 700 });
  }, [value, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: height, backgroundColor: color }, anim]} />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => {
              haptic();
              onChange(o.value);
            }}>
            <Text style={[styles.segmentText, active && { color: C.bg }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ emoji, color, size = 44 }: { emoji: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '33',
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

export function Chip({ label, color = C.surface2, textColor = C.text }: { label: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style, gap = S.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  // Na web as abas ficam no topo; no celular ficam embaixo.
  content: { padding: S.lg, paddingTop: Platform.OS === 'web' ? 72 : S.lg, paddingBottom: 120, gap: S.lg },
  title: { color: C.text, fontSize: 30, fontWeight: '900', fontFamily: F.rounded, letterSpacing: -0.5 },
  h2: { color: C.text, fontSize: 22, fontWeight: '800', fontFamily: F.rounded },
  h3: { color: C.text, fontSize: 17, fontWeight: '700' },
  body: { color: C.text, fontSize: 15, lineHeight: 21 },
  dim: { color: C.textDim, fontSize: 14, lineHeight: 20 },
  small: { color: C.textMuted, fontSize: 12 },
  label: { color: C.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  number: { color: C.text, fontSize: 28, fontWeight: '900', fontFamily: F.rounded, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.border, gap: S.md },
  button: {
    minHeight: 52,
    borderRadius: R.md,
    paddingHorizontal: S.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '800' },
  segmented: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.pill, padding: 4, borderWidth: 1, borderColor: C.border },
  segment: { flex: 1, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: C.primary },
  segmentText: { color: C.textDim, fontWeight: '800', fontSize: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '700' },
});
