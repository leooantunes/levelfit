import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mascot } from '@/components/Brand';
import { IconBadge } from '@/components/IconBadge';
import { Button, Card, haptic, Row, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { openPrivacyPolicy } from '@/lib/links';
import { FREE_DUEL_LIMIT, getMonthlyPackage, openManageSubscriptions, purchasesAvailable } from '@/lib/premium';
import { useGame } from '@/store/useGame';

// Termos padrão da Apple para assinaturas (EULA) e política de privacidade do app.
const TERMS_URL =
  Platform.OS === 'ios'
    ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
    : 'https://play.google.com/intl/pt-BR/about/play-terms/';

const BENEFITS = [
  { icon: { ios: 'figure.boxing', android: 'sports_mma', web: 'sports_mma' }, color: C.redCorner, title: 'Duelos ilimitados', desc: 'Desafie quantos amigos quiser ao mesmo tempo' },
  { icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' }, color: C.blueCorner, title: 'Um duelo por rival', desc: 'Cada amigo com suas metas e sua aposta' },
  { icon: { ios: 'arrow.uturn.backward.circle.fill', android: 'event_repeat', web: 'event_repeat' }, color: C.leaf, title: 'Cancele quando quiser', desc: 'Direto nos ajustes da loja, sem multa' },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function PremiumScreen() {
  const plan = useGame((s) => s.plan);
  const subscribePremium = useGame((s) => s.subscribePremium);
  const restorePremium = useGame((s) => s.restorePremium);

  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(purchasesAvailable);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    if (!purchasesAvailable) return;
    getMonthlyPackage()
      .then(setPkg)
      .catch(() => setPkg(null))
      .finally(() => setLoading(false));
  }, []);

  const buy = async () => {
    if (!pkg) return;
    setBusy('buy');
    try {
      if (await subscribePremium(pkg)) {
        haptic('success');
        Alert.alert('Bem-vindo ao Premium! 🏆', 'Agora você pode ter quantos duelos quiser.', [{ text: 'Bora!', onPress: () => router.back() }]);
      }
    } catch (e) {
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const premium = await restorePremium();
      Alert.alert(premium ? 'Assinatura restaurada 🏆' : 'Nenhuma assinatura encontrada', premium ? 'Seu Premium está ativo de novo.' : 'Não achamos uma assinatura ativa nesta conta da loja.');
    } catch (e) {
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: 48 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-start' }} accessibilityRole="button">
          <Txt variant="dim">✕ Fechar</Txt>
        </Pressable>

        <Animated.View entering={FadeInDown.springify()} style={{ alignItems: 'center', gap: S.sm }}>
          <Mascot size={130} />
          <Txt variant="title" style={{ textAlign: 'center' }}>
            Level Fit Premium
          </Txt>
          <Txt variant="dim" style={{ textAlign: 'center' }}>
            No plano grátis você tem {FREE_DUEL_LIMIT} duelo por vez. Com o Premium, o ringue é seu.
          </Txt>
        </Animated.View>

        <View style={{ gap: S.md }}>
          {BENEFITS.map((b) => (
            <Row key={b.title} gap={S.md}>
              <IconBadge name={b.icon} color={b.color} size={44} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{b.title}</Txt>
                <Txt variant="small">{b.desc}</Txt>
              </View>
            </Row>
          ))}
        </View>

        {plan.premium ? (
          <Card style={{ alignItems: 'center' }}>
            <Txt variant="h3">Você é Premium 🏆</Txt>
            <Txt variant="dim" style={{ textAlign: 'center' }}>
              {plan.isLifetime || !plan.premiumUntil ? 'Assinatura ativa.' : `Renova ou termina em ${formatDate(plan.premiumUntil)}.`}
            </Txt>
            <Button title="Gerenciar assinatura" variant="ghost" onPress={openManageSubscriptions} style={{ alignSelf: 'stretch' }} />
          </Card>
        ) : loading ? (
          <ActivityIndicator color={C.primary} />
        ) : pkg ? (
          <View style={{ gap: S.sm }}>
            <Card style={{ alignItems: 'center', gap: S.xs }}>
              <Txt variant="label">Assinatura mensal</Txt>
              <Txt variant="title" color={C.primaryDark}>
                {pkg.product.priceString}
                <Txt variant="h3"> /mês</Txt>
              </Txt>
            </Card>
            <Button title="Assinar o Premium" onPress={buy} loading={busy === 'buy'} disabled={!!busy} />
          </View>
        ) : (
          <Card>
            <Txt variant="h3">Assinatura indisponível no momento</Txt>
            <Txt variant="dim">
              {__DEV__ && !purchasesAvailable
                ? 'Configure EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY no .env e gere um novo build (o SDK de compras é nativo).'
                : 'Não conseguimos falar com a loja agora. Tente de novo em instantes.'}
            </Txt>
          </Card>
        )}

        {purchasesAvailable ? (
          <Pressable onPress={restore} disabled={!!busy} hitSlop={10} style={{ alignSelf: 'center' }} accessibilityRole="button">
            <Txt variant="dim" color={C.primaryDark}>
              {busy === 'restore' ? 'Restaurando…' : 'Restaurar compras'}
            </Txt>
          </Pressable>
        ) : null}

        <Txt variant="small" style={styles.legal}>
          Assinatura de renovação automática: a cobrança é feita na sua conta da {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} na
          confirmação e se renova todo mês pelo mesmo valor, a menos que seja cancelada pelo menos 24 horas antes do fim do período.
          Gerencie ou cancele nos ajustes da sua conta da loja.
        </Txt>
        <Row style={{ justifyContent: 'center', flexWrap: 'wrap' }} gap={S.lg}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
            <Txt variant="small" color={C.primaryDark}>
              Termos de uso
            </Txt>
          </Pressable>
          <Pressable onPress={openPrivacyPolicy} hitSlop={8}>
            <Txt variant="small" color={C.primaryDark}>
              Política de privacidade
            </Txt>
          </Pressable>
        </Row>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  legal: { textAlign: 'center' },
});
