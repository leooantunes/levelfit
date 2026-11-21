import { router } from 'expo-router';
import { Alert, Linking, Platform } from 'react-native';

/** Site da SideQuest Studio, empresa que publica o Level Fit. */
export const COMPANY_NAME = 'SideQuest Studio';
export const COMPANY_URL = 'https://sidequeststud-io.netlify.app';

/** Página do Level Fit no site da empresa. */
export const APP_SITE_URL = `${COMPANY_URL}/apps/levelfit`;

/** Política de privacidade publicada no site (a mesma URL vai na App Store e no Google Play). */
export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || `${APP_SITE_URL}/privacidade`;

/** Como excluir a conta sem o app (o Google Play exige essa URL). */
export const ACCOUNT_DELETION_URL = `${APP_SITE_URL}/excluir-conta`;

/**
 * Termos de uso. O site ainda não tem página de termos: sem `EXPO_PUBLIC_TERMS_URL`,
 * usa os termos padrão da loja (EULA da Apple / termos do Google Play).
 */
export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ||
  (Platform.OS === 'ios'
    ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
    : 'https://play.google.com/intl/pt-BR/about/play-terms/');

export function openTerms() {
  Linking.openURL(TERMS_URL).catch(() => {});
}

/** Abre o site da empresa. */
export function openCompanySite() {
  Linking.openURL(COMPANY_URL).catch(() => {});
}

/** E-mail de suporte mostrado no app (a App Store exige um contato). */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'contato@sidequest.studio';

/** Abre a política no site da empresa; se não conseguir abrir o navegador, mostra a cópia que vem no app. */
export function openPrivacyPolicy() {
  Linking.openURL(PRIVACY_POLICY_URL).catch(() => router.push('/privacy'));
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
