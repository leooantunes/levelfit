import { Linking, Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

/** Duelos ativos permitidos no plano grátis (o banco também confere, em create_duel/join_duel). */
export const FREE_DUEL_LIMIT = 1;

/** Chave pública do SDK do RevenueCat de cada loja (pode ir no app). */
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/** Compras só existem no app nativo com a chave da loja configurada. */
export const purchasesAvailable = Platform.OS !== 'web' && !!API_KEY;

let configured = false;

/** Liga o RevenueCat à conta: o appUserID é o id do usuário no Supabase. */
export async function identifyPurchaser(userId: string) {
  if (!purchasesAvailable) return;
  try {
    if (!configured) {
      Purchases.configure({ apiKey: API_KEY!, appUserID: userId });
      configured = true;
    } else {
      await Purchases.logIn(userId);
    }
  } catch {
    // Sem rede/loja: as compras ficam indisponíveis, o resto do app segue.
  }
}

export async function forgetPurchaser() {
  if (!configured) return;
  await Purchases.logOut().catch(() => {});
}

/** Pacote mensal da oferta atual (preço vem da loja, já no formato local). */
export async function getMonthlyPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current?.monthly ?? offerings.current?.availablePackages[0] ?? null;
}

/** Abre a compra da loja. Retorna false se a pessoa cancelou. */
export async function buyPackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    await Purchases.purchasePackage(pkg);
    return true;
  } catch (e) {
    if ((e as { userCancelled?: boolean | null }).userCancelled) return false;
    throw new Error('Não foi possível concluir a assinatura. Nenhuma cobrança foi feita.');
  }
}

export async function restorePurchases() {
  if (!configured) throw new Error('Assinaturas indisponíveis neste aparelho.');
  await Purchases.restorePurchases();
}

/** Tela da loja para cancelar ou trocar a assinatura. */
export async function openManageSubscriptions() {
  if (configured && Platform.OS === 'ios') {
    try {
      await Purchases.showManageSubscriptions();
      return;
    } catch {
      // cai no link
    }
  }
  await Linking.openURL(
    Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions',
  );
}
