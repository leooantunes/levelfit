import { Bungee_400Regular } from '@expo-google-fonts/bungee';
import { Rubik_500Medium, Rubik_600SemiBold, Rubik_800ExtraBold, useFonts } from '@expo-google-fonts/rubik';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { C } from '@/constants/theme';
import { forgetPurchaser, hasPro, identifyPurchaser, onCustomerInfoChange } from '@/lib/premium';
import { syncReminders } from '@/lib/reminders';
import { useGame } from '@/store/useGame';
import { api } from '@/sync/supabase';
import { useWidgetSync } from '@/widgets/useWidgetSync';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg, card: C.surface, primary: C.primary, text: C.text, border: C.hairline },
};

/** Confere a sessão ao abrir e sai da conta se ela for encerrada. */
function useSession() {
  const hydrated = useGame((s) => s.hydrated);
  const restoreSession = useGame((s) => s.restoreSession);
  const signOut = useGame((s) => s.signOut);

  useEffect(() => {
    if (hydrated) restoreSession();
  }, [hydrated, restoreSession]);

  useEffect(() => api.onSignedOut(() => useGame.getState().account && signOut()), [signOut]);
}

/** A conta da loja (RevenueCat) segue a conta do app: o appUserID é o id do usuário. */
function usePurchaser() {
  const accountId = useGame((s) => s.account?.id);
  useEffect(() => {
    if (!accountId) {
      forgetPurchaser();
      return;
    }
    let unsubscribe = () => {};
    identifyPurchaser(accountId).then(() => {
      // Assinatura mudou fora do app (renovou, expirou, comprou em outro aparelho):
      // se o RevenueCat discorda do plano em cache, o servidor relê e corrige.
      unsubscribe = onCustomerInfoChange((info) => {
        const { plan, syncPlanFromStore } = useGame.getState();
        if (hasPro(info) !== plan.premium) syncPlanFromStore().catch(() => {});
      });
    });
    return () => unsubscribe();
  }, [accountId]);
}

/** Mantém todos os duelos sincronizados: ao abrir, ao voltar pro app e em tempo real. */
function useOnlineSync() {
  const accountId = useGame((s) => s.account?.id);
  const duelKey = useGame((s) => s.duelOrder.join(','));
  const refreshAll = useGame((s) => s.refreshAll);
  const refreshDuel = useGame((s) => s.refreshDuel);

  useEffect(() => {
    if (!accountId) return;
    refreshAll();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshAll());
    return () => sub.remove();
  }, [accountId, refreshAll]);

  useEffect(() => {
    if (!accountId || !duelKey) return;
    const unsubs = duelKey.split(',').map((id) => api.subscribe(id, () => refreshDuel(id)));
    return () => unsubs.forEach((u) => u());
  }, [accountId, duelKey, refreshDuel]);
}

function useReminders() {
  const { enabled, hour, minute } = useGame((s) => s.reminders);
  const hasDuel = useGame((s) => s.duelOrder.length > 0);
  useEffect(() => {
    if (hasDuel) syncReminders(enabled, hour, minute).catch(() => {});
  }, [enabled, hour, minute, hasDuel]);
}

export default function RootLayout() {
  const hydrated = useGame((s) => s.hydrated);
  const signedIn = useGame((s) => !!s.account);
  const [fontsLoaded, fontError] = useFonts({ Bungee_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_800ExtraBold });
  const ready = hydrated && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useSession();
  usePurchaser();
  useOnlineSync();
  useReminders();
  useWidgetSync();

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="index" />
            <Stack.Screen name="new-duel" options={{ presentation: 'modal' }} />
            <Stack.Screen name="join" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
            {/* Estas telas usam o duelo aberto; sem ele, voltam para a lista. */}
            <Stack.Screen name="duel" />
            <Stack.Screen name="checkin/[habitId]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="proof/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="goals" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="auth" />
          </Stack.Protected>
          {/* Aberta com ou sem conta (link no cadastro e em Minha conta). */}
          <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
