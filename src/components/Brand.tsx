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

const BRASA = require('@/assets/brand/brasa.png');

/** Brasa, o mascote: um lutador de fogo que fica "gingando" em guarda. */
export function Mascot({ size = 120, idle = true }: { size?: number; idle?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!idle) return;
    t.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 450, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [idle, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -5 * t.value }, { rotate: `${-3 + 6 * t.value}deg` }],
  }));
  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Image source={BRASA} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}

/** Logotipo de pôster: "LEVEL" em cacau + "FIT" em brasa, com sombra chapada. */
/** `dark`: versão para fundo escuro (ex.: arte do Story), com "LEVEL" claro. */
export function Wordmark({ size = 44, dark = false }: { size?: number; dark?: boolean }) {
  const shadow = { textShadowColor: C.ink, textShadowOffset: { width: 0, height: size / 14 }, textShadowRadius: 0.01 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={{ fontFamily: F.display, fontSize: size, color: dark ? C.nightText : C.ink }}>LEVEL</Text>
      <Text style={{ fontFamily: F.display, fontSize: size, color: C.primary, marginLeft: size * 0.2, ...shadow }}>
        FIT
      </Text>
    </View>
  );
}
