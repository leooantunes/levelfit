import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CelebrationHost } from '@/components/CelebrationHost';
import { C } from '@/constants/theme';
import { syncReminders } from '@/lib/reminders';
import { backendFor, useGame } from '@/store/useGame';
import { useWidgetSync } from '@/widgets/useWidgetSync';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.primary, text: C.text, border: C.border },
};

function useOnlineSync() {
  const mode = useGame((s) => s.mode);
  const duelId = useGame((s) => s.duel?.id);
  const refresh = useGame((s) => s.refresh);

  useEffect(() => {
    if (mode !== 'online' || !duelId) return;
    refresh();
    const unsubscribe = backendFor(mode).subscribe(duelId, refresh);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [mode, duelId, refresh]);
}

function useReminders() {
  const { enabled, hour, minute } = useGame((s) => s.reminders);
  const hasDuel = useGame((s) => !!s.duel);
  useEffect(() => {
    if (hasDuel) syncReminders(enabled, hour, minute).catch(() => {});
  }, [enabled, hour, minute, hasDuel]);
}

export default function RootLayout() {
  const hydrated = useGame((s) => s.hydrated);
  const hasDuel = useGame((s) => !!s.duel);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  useOnlineSync();
  useReminders();
  useWidgetSync();

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={hasDuel}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="checkin/[habitId]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="proof/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="goals" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!hasDuel}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
        </Stack>
        {hasDuel ? <CelebrationHost /> : null}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
