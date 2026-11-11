import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mascot } from '@/components/Brand';
import { IconBadge } from '@/components/IconBadge';
import { Button, Card, haptic, Row, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { openPrivacyPolicy } from '@/lib/links';
import { FREE_DUEL_LIMIT, openManageSubscriptions, purchasesAvailable } from '@/lib/premium';
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

function premiumStatus(plan: { isLifetime: boolean; premiumUntil: string | null }) {
  if (plan.isLifetime) return 'Plano vitalício: é seu para sempre.';
  if (!plan.premiumUntil) return 'Assinatura ativa.';
  return `Renova ou termina em ${formatDate(plan.premiumUntil)}.`;
}

export default function PremiumScreen() {
  const plan = useGame((s) => s.plan);
  const openPaywall = useGame((s) => s.openPaywall);
  const restorePremium = useGame((s) => s.restorePremium);
  const syncPlanFromStore = useGame((s) => s.syncPlanFromStore);

  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const buy = async () => {
    setBusy('buy');
    try {
      const outcome = await openPaywall();
      if (outcome === 'purchased' || outcome === 'restored' || outcome === 'already-pro') {
        haptic('success');
        Alert.alert('Bem-vindo ao Premium! 🏆', 'Agora você pode ter quantos duelos quiser.', [{ text: 'Bora!', onPress: () => router.back() }]);
      } else if (outcome === 'error') {
        Alert.alert('Ops!', 'Não foi possível concluir a compra. Nenhuma cobrança foi feita. Tente de novo em instantes.');
      }
    } catch (e) {
      // Comprou na loja, mas o servidor não confirmou ainda: "Restaurar compras" resolve depois.
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const manage = () => openManageSubscriptions(() => syncPlanFromStore().catch(() => {}));

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
              {premiumStatus(plan)}
            </Txt>
            {plan.isLifetime ? null : (
              <Button title="Gerenciar assinatura" variant="ghost" onPress={manage} style={{ alignSelf: 'stretch' }} />
            )}
          </Card>
        ) : purchasesAvailable ? (
          <View style={{ gap: S.sm }}>
            <Card style={{ alignItems: 'center', gap: S.xs }}>
              <Txt variant="label">Escolha seu plano</Txt>
              <Txt variant="h3" style={{ textAlign: 'center' }}>
                Mensal · Anual · Vitalício
              </Txt>
            </Card>
            <Button title="Ver planos" icon="🏆" onPress={buy} loading={busy === 'buy'} disabled={!!busy} />
          </View>
        ) : (
          <Card>
            <Txt variant="h3">Assinatura indisponível no momento</Txt>
            <Txt variant="dim">
              {__DEV__
                ? 'Configure EXPO_PUBLIC_REVENUECAT_TEST_KEY (ou as chaves das lojas) no .env e gere um novo build (o SDK de compras é nativo).'
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
          Os planos mensal e anual são assinaturas de renovação automática: a cobrança é feita na sua conta da{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} na confirmação e se renova pelo mesmo valor a cada período, a menos que seja
          cancelada pelo menos 24 horas antes do fim dele. Gerencie ou cancele nos ajustes da sua conta da loja. O plano vitalício é um
          pagamento único, sem renovação.
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
