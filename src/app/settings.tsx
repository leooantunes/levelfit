import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AvatarPicker, Input } from '@/components/ProfileFields';
import { Avatar, Button, Card, haptic, Row, Screen, Txt } from '@/components/ui';
import { C, R } from '@/constants/theme';
import { useGame } from '@/store/useGame';

const HOURS = [18, 19, 20, 21, 22];

export default function SettingsScreen() {
  const account = useGame((s) => s.account);
  const updateProfile = useGame((s) => s.updateProfile);
  const signOut = useGame((s) => s.signOut);
  const reminders = useGame((s) => s.reminders);
  const setReminders = useGame((s) => s.setReminders);

  const [name, setName] = useState(account?.name ?? '');
  const [avatar, setAvatar] = useState(account?.avatar ?? '🦁');
  const [color, setColor] = useState(account?.color ?? C.primary);
  const [busy, setBusy] = useState(false);

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

  const logout = () =>
    Alert.alert('Sair da conta?', 'Seus duelos continuam salvos. É só entrar de novo para voltar.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);

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
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Lembretes diários</Txt>
            <Txt variant="small">12:30 e no horário da noite</Txt>
          </View>
          <Switch
            value={reminders.enabled}
            onValueChange={(v) => setReminders({ enabled: v })}
            trackColor={{ true: C.primary, false: C.surface2 }}
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
                <Txt variant="h3" color={reminders.hour === h ? C.bg : C.text}>
                  {h}h
                </Txt>
              </Pressable>
            ))}
          </Row>
        ) : null}
      </Card>

      <Card>
        <Txt variant="h3">📱 Widget</Txt>
        <Txt variant="dim">
          Segure a tela inicial do celular, toque em “Widgets” e adicione o Level Fit. Ele mostra o placar do último duelo que você abriu.
        </Txt>
      </Card>

      <Button title="Sair da conta" variant="ghost" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hour: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.surface2 },
});
