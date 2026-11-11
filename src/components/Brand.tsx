import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { C, F } from '@/constants/theme';

const KETTU = require('@/assets/brand/kettu.png');

/** Kettu, o mascote: um kettlebell determinado que fica "respirando". */
export function Kettu({ size = 120, idle = true }: { size?: number; idle?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!idle) return;
    t.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [idle, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * t.value }, { scaleX: 1 + 0.03 * t.value }, { scaleY: 1 - 0.02 * t.value }],
  }));
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Image source={KETTU} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}

/** Logotipo: "LEVEL" em tinta + "FIT" em azul aura, com sombra chapada. */
export function Wordmark({ size = 44 }: { size?: number }) {
  const shadow = { textShadowColor: C.ink, textShadowOffset: { width: 0, height: size / 14 }, textShadowRadius: 0.01 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ fontFamily: F.display, fontSize: size, color: C.ink, letterSpacing: 1 }}>LEVEL</Text>
      <Text style={{ fontFamily: F.display, fontSize: size, color: C.primary, letterSpacing: 1, marginLeft: size * 0.18, ...shadow }}>
        FIT
      </Text>
    </View>
  );
}
