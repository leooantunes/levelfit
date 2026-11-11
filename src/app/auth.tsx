import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarPicker, Input } from '@/components/ProfileFields';
import { Mascot, Wordmark } from '@/components/Brand';
import { Avatar, Button, Card, haptic, Row, Txt } from '@/components/ui';
import { AVATARS, C, PLAYER_COLORS, S } from '@/constants/theme';
import { useGame } from '@/store/useGame';
import { api, isOnlineAvailable } from '@/sync/supabase';

type Step = 'welcome' | 'login' | 'signup' | 'profile';

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export default function AuthScreen() {
  const signIn = useGame((s) => s.signIn);
  const signUp = useGame((s) => s.signUp);

  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(PLAYER_COLORS[0]);
  const [busy, setBusy] = useState(false);

  const emailOk = EMAIL_RE.test(email.trim());
  const passwordOk = password.length >= 6;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const doLogin = () =>
    run(async () => {
      await signIn(email, password);
      haptic('success');
    });

  const doSignUp = () =>
    run(async () => {
      const result = await signUp(email, password, { name: name.trim(), avatar, color });
      if (result === 'confirm-email') {
        Alert.alert('Confirme seu e-mail 📬', `Enviamos um link para ${email.trim()}. Depois de confirmar, é só entrar.`);
        setStep('login');
      } else {
        haptic('success');
      }
    });

  const forgot = () =>
    run(async () => {
      if (!emailOk) throw new Error('Digite seu e-mail acima primeiro.');
      await api.resetPassword(email);
      Alert.alert('Pronto!', 'Enviamos um link para você criar uma nova senha.');
    });

  const back = () => setStep(step === 'profile' ? 'signup' : 'welcome');

  const screens: Record<Step, React.ReactNode> = {
    welcome: (
      <View style={{ gap: S.xl, alignItems: 'center', paddingTop: S.xxl }}>
        <Animated.View entering={FadeInDown.springify()}>
          <Mascot size={170} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150)} style={{ alignItems: 'center', gap: S.sm }}>
          <Wordmark size={40} />
          <Txt variant="h3" style={{ textAlign: 'center' }}>
            Hábitos saudáveis viram uma luta.
          </Txt>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300)} style={{ gap: S.md, alignSelf: 'stretch' }}>
          {[
            ['⚔️', 'Desafie várias pessoas ao mesmo tempo, cada uma numa luta.'],
            ['🎯', 'Metas sugeridas: água, leitura, dieta, treino e mais.'],
            ['📸', 'Cumpriu? Poste uma foto de prova para pontuar.'],
            ['🥊', 'Cada dia é um round: ranking diário, semanal e mensal com festa pro vencedor.'],
            ['🔥', 'Sequências dão combo, dia perfeito dá bônus.'],
          ].map(([e, t]) => (
            <Row key={t} gap={S.md}>
              <Txt style={{ fontSize: 24 }}>{e}</Txt>
              <Txt variant="dim" style={{ flex: 1 }}>
                {t}
              </Txt>
            </Row>
          ))}
        </Animated.View>
        {isOnlineAvailable ? (
          <View style={{ alignSelf: 'stretch', gap: S.sm }}>
            <Button title="Entrar no ringue" onPress={() => setStep('signup')} />
            <Button title="Já tenho conta" variant="ghost" onPress={() => setStep('login')} />
          </View>
        ) : (
          <Card style={{ alignSelf: 'stretch' }}>
            <Txt variant="h3">⚙️ Falta configurar o servidor</Txt>
            <Txt variant="dim">
              As contas e os duelos ficam no Supabase. Preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env
              (veja o README) e reinicie o app.
            </Txt>
          </Card>
        )}
      </View>
    ),

    login: (
      <View style={{ gap: S.lg }}>
        <Txt variant="title">Bem-vindo de volta 👋</Txt>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={() => emailOk && passwordOk && doLogin()}
        />
        <Button title="Entrar" onPress={doLogin} loading={busy} disabled={!emailOk || !passwordOk} />
        <Pressable onPress={forgot} hitSlop={10} style={{ alignSelf: 'center' }}>
          <Txt variant="dim" color={C.primaryDark}>
            Esqueci minha senha
          </Txt>
        </Pressable>
        <Pressable onPress={() => setStep('signup')} hitSlop={10} style={{ alignSelf: 'center' }}>
          <Txt variant="dim">
            Não tem conta? <Txt color={C.primaryDark}>Criar conta</Txt>
          </Txt>
        </Pressable>
      </View>
    ),

    signup: (
      <View style={{ gap: S.lg }}>
        <Txt variant="title">Crie sua conta</Txt>
        <Txt variant="dim">Com a conta você entra de qualquer celular e mantém todos os seus duelos.</Txt>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Senha (mínimo 6 caracteres)"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Button title="Continuar" onPress={() => setStep('profile')} disabled={!emailOk || !passwordOk} />
        <Pressable onPress={() => setStep('login')} hitSlop={10} style={{ alignSelf: 'center' }}>
          <Txt variant="dim">
            Já tem conta? <Txt color={C.primaryDark}>Entrar</Txt>
          </Txt>
        </Pressable>
      </View>
    ),

    profile: (
      <View style={{ gap: S.lg }}>
        <Txt variant="title">Quem é o lutador?</Txt>
        <Txt variant="dim">É assim que seus rivais vão te ver nos duelos.</Txt>
        <Row style={{ justifyContent: 'center' }}>
          <Avatar emoji={avatar} color={color} size={88} />
        </Row>
        <Input value={name} onChangeText={setName} placeholder="Seu nome ou apelido" maxLength={16} autoFocus />
        <AvatarPicker avatar={avatar} color={color} onAvatar={setAvatar} onColor={setColor} />
        <Button title="Criar conta ⚡" onPress={doSignUp} loading={busy} disabled={!name.trim()} />
      </View>
    ),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step !== 'welcome' ? (
          <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm }}>
            <Pressable onPress={back} hitSlop={12}>
              <Txt variant="dim">← Voltar</Txt>
            </Pressable>
          </View>
        ) : null}
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Animated.View key={step} entering={FadeInRight.springify().damping(18)}>
            {screens[step]}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
