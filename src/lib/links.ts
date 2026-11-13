import { router } from 'expo-router';
import { Alert, Linking, Platform } from 'react-native';

/** Política de privacidade publicada (a mesma URL vai no App Store Connect). */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || null;

/**
 * Termos de uso publicados (docs/index.html#termos).
 * Sem URL configurada, usa os termos padrão da loja (EULA da Apple / termos do Google Play).
 */
export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ||
  (Platform.OS === 'ios'
    ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
    : 'https://play.google.com/intl/pt-BR/about/play-terms/');

export function openTerms() {
  Linking.openURL(TERMS_URL).catch(() => {});
}

/** E-mail de suporte mostrado no app (a App Store exige um contato). */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || null;

/** Abre a política publicada; sem URL configurada, mostra a versão que vem no app. */
export function openPrivacyPolicy() {
  if (PRIVACY_POLICY_URL) {
    Linking.openURL(PRIVACY_POLICY_URL).catch(() => router.push('/privacy'));
  } else {
    router.push('/privacy');
  }
}

export async function contactSupport(subject = 'Ajuda com o Level Fit') {
  if (!SUPPORT_EMAIL) return;
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  try {
    await Linking.openURL(url);
  } catch {
    // Sem app de e-mail configurado (comum no simulador): mostra o endereço.
    Alert.alert('Fale com a gente', `Escreva para ${SUPPORT_EMAIL}`);
  }
}
