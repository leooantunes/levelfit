/**
 * RevenueCat: assinatura Level Fit Pro (mensal, anual e vitalício).
 *
 * - O app compra pelo Paywall do RevenueCat (configurado no painel, offering "default").
 * - "Pro" = entitlement `levelfit_pro` ativo. Os 3 produtos dão esse entitlement.
 * - Quem libera os duelos ilimitados é o servidor (Edge Function premium-sync grava
 *   public.entitlements). O app só pede a sincronização depois de comprar/restaurar.
 * - appUserID = id do usuário no Supabase, para a compra seguir a conta.
 */
import { Linking, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type CustomerInfoUpdateListener } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

/** Duelos ativos permitidos no plano grátis (o banco também confere, em create_duel/join_duel). */
export const FREE_DUEL_LIMIT = 1;

/** Entitlement que libera o Pro. Mesmo nome no painel do RevenueCat e na função premium-sync. */
export const PRO_ENTITLEMENT = 'levelfit_pro';

/**
 * Chave pública do SDK. Em produção, a de cada loja (appl_ / goog_).
 * A chave da Test Store (test_) só vale em desenvolvimento: o RevenueCat não aceita em build de loja.
 */
const STORE_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});
const TEST_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY;
const API_KEY = STORE_KEY || (__DEV__ ? TEST_KEY : undefined);

/** Compras só existem no app nativo com uma chave configurada. */
export const purchasesAvailable = Platform.OS !== 'web' && !!API_KEY;

let configured = false;

export function hasPro(info: CustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}

/** Liga o RevenueCat à conta (chamado ao entrar). Configura uma vez; depois só troca de usuário. */
export async function identifyPurchaser(userId: string) {
  if (!purchasesAvailable) return;
  try {
    if (!configured) {
      if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey: API_KEY!, appUserID: userId });
      configured = true;
    } else {
      await Purchases.logIn(userId);
    }
  } catch {
    // Sem rede/loja: as compras ficam indisponíveis, o resto do app segue.
  }
}

/** Ao sair da conta: volta para um usuário anônimo (a próxima conta não herda a compra). */
export async function forgetPurchaser() {
  if (!configured) return;
  await Purchases.logOut().catch(() => {});
}

/** Avisa quando a assinatura muda (renovou, expirou, comprou em outro aparelho). */
export function onCustomerInfoChange(cb: (info: CustomerInfo) => void): () => void {
  if (!purchasesAvailable) return () => {};
  const listener: CustomerInfoUpdateListener = (info) => cb(info);
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export type PaywallOutcome = 'purchased' | 'restored' | 'cancelled' | 'already-pro' | 'error';

/**
 * Mostra o Paywall do RevenueCat (offering atual) só se a pessoa ainda não tem o Pro.
 * Compra e restauração acontecem dentro do Paywall.
 */
export async function presentPaywall(): Promise<PaywallOutcome> {
  if (!configured) throw new Error('Assinaturas indisponíveis neste aparelho.');
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PRO_ENTITLEMENT,
    displayCloseButton: true,
  });
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return 'purchased';
    case PAYWALL_RESULT.RESTORED:
      return 'restored';
    case PAYWALL_RESULT.NOT_PRESENTED:
      return 'already-pro';
    case PAYWALL_RESULT.ERROR:
      return 'error';
    default:
      return 'cancelled';
  }
}

/** Restaura compras feitas com a mesma conta da loja. Retorna se o Pro voltou. */
export async function restorePurchases(): Promise<boolean> {
  if (!configured) throw new Error('Assinaturas indisponíveis neste aparelho.');
  return hasPro(await Purchases.restorePurchases());
}

/**
 * Customer Center do RevenueCat: cancelar, trocar de plano, pedir reembolso, restaurar.
 * Se não der (sem configuração), cai na página de assinaturas da loja.
 */
export async function openManageSubscriptions(onRestored?: () => void) {
  if (configured) {
    try {
      await RevenueCatUI.presentCustomerCenter({ callbacks: { onRestoreCompleted: () => onRestored?.() } });
      return;
    } catch {
      // cai no link da loja
    }
  }
  await Linking.openURL(
    Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions',
  );
}
