import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AvatarPicker, Input } from '@/components/ProfileFields';
import { Avatar, Button, Card, haptic, Row, Screen, Txt } from '@/components/ui';
import { C, R } from '@/constants/theme';
import { getHabit } from '@/domain/habits';
import { formatHealthValue, HEALTH_GOALS } from '@/domain/healthGoals';
import { HEALTH_SOURCE, openHealthSettings, SUPPORTED_METRICS } from '@/lib/health';
import { contactSupport, openPrivacyPolicy, SUPPORT_EMAIL } from '@/lib/links';
import { FREE_DUEL_LIMIT, openManageSubscriptions } from '@/lib/premium';
import { useGame } from '@/store/useGame';
import { api, type BlockedPlayer } from '@/sync/supabase';

const HOURS = [18, 19, 20, 21, 22];

/** Liga a leitura do relógio (Apple Health / Health Connect). */
function HealthCard() {
  const enabled = useGame((s) => s.healthEnabled);
  const enableHealth = useGame((s) => s.enableHealth);
  const disableHealth = useGame((s) => s.disableHealth);
  const syncHealth = useGame((s) => s.syncHealth);
  const [busy, setBusy] = useState(false);

  const metas = Object.entries(HEALTH_GOALS)
    .filter(([, g]) => SUPPORTED_METRICS.includes(g.metric))
    .map(([id, g]) => `${getHabit(id)?.emoji ?? ''} ${formatHealthValue({ metric: g.metric, value: g.target })}`);

  const toggle = async (on: boolean) => {
    if (!on) {
      disableHealth();
      return;
    }
    setBusy(true);
    try {
      const ok = await enableHealth();
      if (ok) haptic('success');
      else
        Alert.alert(
          'Não deu para conectar',
          `Confira se o ${HEALTH_SOURCE} está instalado e se o Level Fit tem permissão para ler seus dados.`,
          [{ text: 'OK' }, { text: 'Abrir ajustes', onPress: openHealthSettings }],
        );
    } finally {
      setBusy(false);
    }
  };

  const checkNow = async () => {
    setBusy(true);
    try {
      const n = await syncHealth();
      if (n === 0) {
        Alert.alert('Relógio', 'Nenhuma meta nova batida por enquanto.');
        return;
      }
      haptic('success');
      const label = n === 1 ? 'meta registrada' : 'metas registradas';
      Alert.alert('Relógio', `${n} ${label} pelo relógio! ⌚`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt variant="h3">⌚ Relógio</Txt>
          <Txt variant="small">
            Via {HEALTH_SOURCE}: {Platform.OS === 'ios' ? 'Apple Watch, Garmin, Fitbit' : 'Galaxy Watch, Pixel Watch, Garmin, Fitbit'} e outros
          </Txt>
        </View>
        <Switch value={enabled} disabled={busy} onValueChange={toggle} trackColor={{ true: C.leaf, false: C.hairline }} />
      </Row>
      <Txt variant="small">
        Bateu a meta no relógio, a prova entra sozinha (o rival ainda pode contestar). Dados digitados à mão no app de saúde não contam.
      </Txt>
      <Txt variant="small">{metas.join('  ·  ')}</Txt>
      {enabled ? (
        <>
          <Button title="Conferir agora" icon="⌚" variant="secondary" loading={busy} onPress={checkNow} />
          <Pressable onPress={openHealthSettings} hitSlop={8} style={{ alignSelf: 'center' }}>
            <Txt variant="small" color={C.primaryDark}>
              Gerenciar permissões no {HEALTH_SOURCE}
            </Txt>
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}

/** Pessoas que você bloqueou (não podem duelar com você). Carrega do servidor ao abrir. */
function BlockedCard() {
  const [list, setList] = useState<BlockedPlayer[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .listBlocked()
      .then(setList)
      .catch(() => setError(true));
  }, []);

  const unblock = (p: BlockedPlayer) =>
    Alert.alert(`Desbloquear ${p.name}?`, 'Vocês poderão duelar de novo se um entrar no duelo do outro.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: async () => {
          try {
            await api.unblock(p.id);
            setList((l) => (l ?? []).filter((x) => x.id !== p.id));
            haptic('success');
          } catch (e) {
            Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  // Lista vazia ou sem rede: não ocupa espaço na tela.
  if (error || !list?.length) return null;
  return (
    <Card>
      <Txt variant="h3">Bloqueados</Txt>
      {list.map((p) => (
        <Row key={p.id} style={{ justifyContent: 'space-between' }}>
          <Txt>
            {p.avatar} {p.name}
          </Txt>
          <Pressable onPress={() => unblock(p)} hitSlop={8}>
            <Txt variant="small" color={C.primaryDark}>
              Desbloquear
            </Txt>
          </Pressable>
        </Row>
      ))}
    </Card>
  );
}

export default function SettingsScreen() {
  const account = useGame((s) => s.account);
  const updateProfile = useGame((s) => s.updateProfile);
  const signOut = useGame((s) => s.signOut);
  const reminders = useGame((s) => s.reminders);
  const plan = useGame((s) => s.plan);
  const setReminders = useGame((s) => s.setReminders);

  const [name, setName] = useState(account?.name ?? '');
  const [avatar, setAvatar] = useState(account?.avatar ?? '🦁');
  const [color, setColor] = useState(account?.color ?? C.primary);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteAccount = useGame((s) => s.deleteAccount);

  if (!account) return null;
  const dirty = name.trim() !== account.name || avatar !== account.avatar || color !== account.color;

  const save = async () => {
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), avatar, color });
      haptic('success');
    } catch (e) {
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      haptic('success');
    } catch (e) {
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  };

  // Duas confirmações: a exclusão não tem volta.
  const confirmDelete = () =>
    Alert.alert('Excluir sua conta?', 'Sua conta, provas, fotos e pontos serão apagados para sempre. Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Continuar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Tem certeza?', `A conta ${account.email} será excluída agora.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir para sempre', style: 'destructive', onPress: runDelete },
          ]),
      },
    ]);

  const logout = () => {
    // Provas tiradas sem internet ainda não subiram; sair da conta apaga a fila local.
    const unsent = useGame.getState().pendingSync.length;
    const message = unsent
      ? `Você tem ${unsent} ${unsent === 1 ? 'prova que ainda não foi enviada e será perdida' : 'provas que ainda não foram enviadas e serão perdidas'}. Conecte-se à internet e abra o app antes de sair para não perder.`
      : 'Seus duelos continuam salvos. É só entrar de novo para voltar.';
    Alert.alert('Sair da conta?', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: unsent ? 'Sair mesmo assim' : 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="title">Minha conta</Txt>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Txt variant="dim">✕ Fechar</Txt>
        </Pressable>
      </Row>

      <Card>
        <Row style={{ justifyContent: 'center' }}>
          <Avatar emoji={avatar} color={color} size={88} />
        </Row>
        <Txt variant="small" style={{ textAlign: 'center' }}>
          {account.email}
        </Txt>
        <Input value={name} onChangeText={setName} placeholder="Seu nome ou apelido" maxLength={16} />
        <AvatarPicker avatar={avatar} color={color} onAvatar={setAvatar} onColor={setColor} />
        <Button title="Salvar perfil" onPress={save} loading={busy} disabled={!dirty || !name.trim()} />
        <Txt variant="small">O novo nome e avatar aparecem em todos os seus duelos.</Txt>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h3">Plano</Txt>
          <Txt variant="h3" color={plan.premium ? C.primaryDark : C.textDim}>
            {plan.premium ? '🏆 Premium' : 'Grátis'}
          </Txt>
        </Row>
        <Txt variant="small">
          {plan.premium ? 'Duelos ilimitados.' : `${FREE_DUEL_LIMIT} duelo por vez. Assine o Premium para ter duelos ilimitados.`}
        </Txt>
        {plan.premium ? (
          <Button title="Gerenciar assinatura" variant="ghost" onPress={openManageSubscriptions} />
        ) : (
          <Button title="Conhecer o Premium" icon="🏆" onPress={() => router.push('/premium')} />
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Lembretes diários</Txt>
            <Txt variant="small">12:30 e no horário da noite</Txt>
          </View>
          <Switch
            value={reminders.enabled}
            onValueChange={(v) => setReminders({ enabled: v })}
            trackColor={{ true: C.leaf, false: C.hairline }}
          />
        </Row>
        {reminders.enabled ? (
          <Row style={{ justifyContent: 'space-between' }}>
            {HOURS.map((h) => (
              <Pressable
                key={h}
                onPress={() => {
                  haptic();
                  setReminders({ hour: h, minute: 0 });
                }}
                style={[styles.hour, reminders.hour === h && { backgroundColor: C.primary }]}>
                <Txt variant="h3" color={reminders.hour === h ? C.onColor : C.text}>
                  {h}h
                </Txt>
              </Pressable>
            ))}
          </Row>
        ) : null}
      </Card>

      {HEALTH_SOURCE ? <HealthCard /> : null}

      <Card>
        <Txt variant="h3">📱 Widget</Txt>
        <Txt variant="dim">
          Segure a tela inicial do celular, toque em “Widgets” e adicione o Level Fit. Ele mostra o placar do último duelo que você abriu.
        </Txt>
      </Card>

      <BlockedCard />

      <Card>
        <Txt variant="h3">Privacidade e ajuda</Txt>
        <Button title="Política de privacidade" icon="🔒" variant="secondary" onPress={openPrivacyPolicy} />
        {SUPPORT_EMAIL ? (
          <>
            <Button title="Fale com a gente" icon="✉️" variant="secondary" onPress={() => contactSupport()} />
            <Txt variant="small">Dúvidas, problemas ou denúncias: {SUPPORT_EMAIL}</Txt>
          </>
        ) : null}
      </Card>

      <Button title="Sair da conta" variant="ghost" onPress={logout} />

      <Card>
        <Txt variant="h3">Excluir conta</Txt>
        <Txt variant="small">
          Apaga para sempre sua conta, suas provas e fotos, e os duelos em que você joga sozinho. Seus rivais deixam de ver você nos duelos.
        </Txt>
        {plan.premium ? (
          <Txt variant="small" color={C.danger}>
            Excluir a conta não cancela a assinatura Premium. Cancele antes em “Gerenciar assinatura” para não ser cobrado de novo.
          </Txt>
        ) : null}
        <Button title="Excluir minha conta" variant="danger" loading={deleting} onPress={confirmDelete} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hour: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.surface2 },
});
