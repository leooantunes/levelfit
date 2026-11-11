import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#7CFF6B', '#FFD447', '#38BDF8', '#F472B6', '#8B5CF6', '#FB923C'];

function Piece({ x, delay, color, size, duration, height, sway, round }: {
  x: number;
  delay: number;
  color: string;
  size: number;
  duration: number;
  height: number;
  sway: number;
  round: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, [delay, duration, t]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + Math.sin(t.value * Math.PI * 4) * sway },
      { translateY: -40 + t.value * (height + 80) },
      { rotate: `${t.value * 720}deg` },
      { rotateX: `${t.value * 540}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: round ? size : size * 0.45, backgroundColor: color, borderRadius: round ? size : 2 },
        style,
      ]}
    />
  );
}

/** PRNG determinístico (mulberry32): mantém o render puro. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Confetti({ count = 60, seed = 42 }: { count?: number; seed?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => {
    const rand = rng(seed);
    return Array.from({ length: count }).map((_, i) => ({
      key: i,
      x: rand() * width,
      delay: rand() * 1500,
      color: COLORS[i % COLORS.length],
      size: 8 + rand() * 8,
      duration: 2600 + rand() * 2000,
      sway: 10 + rand() * 25,
      round: rand() > 0.7,
    }));
  }, [count, width, seed]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map(({ key, ...p }) => (
        <Piece key={key} {...p} height={height} />
      ))}
    </View>
  );
}
