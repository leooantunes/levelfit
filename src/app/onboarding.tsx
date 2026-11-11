import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mascot, Wordmark } from '@/components/Brand';
import { GoalPicker } from '@/components/GoalPicker';
import { Avatar, Button, Card, haptic, ProgressBar, Row, Txt } from '@/components/ui';
import { AVATARS, C, F, hardShadow, PLAYER_COLORS, R, S, STROKE } from '@/constants/theme';
import { DEFAULT_HABIT_IDS } from '@/domain/habits';
import { isOnlineAvailable } from '@/sync/supabase';
import { useGame, type Mode } from '@/store/useGame';

type Flow = 'local' | 'create' | 'join';

function AvatarPicker({
  avatar,
  color,
  onAvatar,
  onColor,
}: {
  avatar: string;
  color: string;
  onAvatar: (a: string) => void;
  onColor: (c: string) => void;
}) {
  return (
    <View style={{ gap: S.md }}>
      <View style={styles.grid}>
        {AVATARS.map((a) => (
          <Pressable
            key={a}
            onPress={() => {
              haptic();
              onAvatar(a);
            }}
            style={[styles.avatarCell, a === avatar && { borderColor: C.ink, backgroundColor: color + '40', boxShadow: hardShadow(3) }]}>
            <Txt style={{ fontSize: 28 }}>{a}</Txt>
          </Pressable>
        ))}
      </View>
      <Row style={{ justifyContent: 'center' }} gap={S.md}>
        {PLAYER_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              haptic();
              onColor(c);
            }}
            style={[styles.color, { backgroundColor: c }, c === color && styles.colorOn]}
          />
        ))}
      </Row>
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={C.textMuted} {...props} style={[styles.input, props.style]} />;
}

export default function Onboarding() {
  const createDuel = useGame((s) => s.createDuel);
  const joinDuel = useGame((s) => s.joinDuel);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(PLAYER_COLORS[0]);
  const [flow, setFlow] = useState<Flow>(isOnlineAvailable ? 'create' : 'local');
  const [oppName, setOppName] = useState('');
  const [oppAvatar, setOppAvatar] = useState(AVATARS[1]);
  const [oppColor, setOppColor] = useState(PLAYER_COLORS[1]);
  const [code, setCode] = useState('');
  const [habitIds, setHabitIds] = useState<string[]>(DEFAULT_HABIT_IDS);
  const [duelName, setDuelName] = useState('');
  const [stake, setStake] = useState('');
  const [busy, setBusy] = useState(false);

  const totalSteps = flow === 'join' ? 3 : 5;
  const next = () => {
    haptic();
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setBusy(true);
    try {
      const me = { name: name.trim(), avatar, color };
      if (flow === 'join') {
        await joinDuel(code, me);
      } else {
        const mode: Mode = flow === 'local' ? 'local' : 'online';
        await createDuel(mode, {
          name: duelName.trim() || `${me.name} x ${oppName.trim() || 'Rival'}`,
          habitIds,
          stake: stake.trim() || undefined,
          me,
          opponent: flow === 'local' ? { name: oppName.trim(), avatar: oppAvatar, color: oppColor } : undefined,
        });
      }
      haptic('success');
    } catch (e) {
      Alert.alert('Ops!', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    // 0 — boas-vindas
    <View key="welcome" style={{ gap: S.xl, alignItems: 'center', paddingTop: S.xxl }}>
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
          ['🎯', 'O app sugere metas: água, leitura, dieta, treino e mais.'],
          ['📸', 'Cumpriu? Poste uma foto de prova para pontuar.'],
          ['🥊', 'Cada dia é um round: ranking diário, semanal e mensal com festa pro vencedor.'],
          ['🔥', 'Sequências dão combo, dia perfeito dá bônus.'],
          ['📱', 'Acompanhe o placar pelo widget na tela inicial.'],
        ].map(([e, t]) => (
          <Row key={t} gap={S.md}>
            <Txt style={{ fontSize: 24 }}>{e}</Txt>
            <Txt variant="dim" style={{ flex: 1 }}>
              {t}
            </Txt>
          </Row>
        ))}
      </Animated.View>
      <Button title="Entrar no ringue" onPress={next} style={{ alignSelf: 'stretch' }} />
    </View>,

    // 1 — perfil
    <View key="me" style={{ gap: S.lg }}>
      <Txt variant="title">Quem é o lutador?</Txt>
      <Row style={{ justifyContent: 'center' }}>
        <Avatar emoji={avatar} color={color} size={88} />
      </Row>
      <Input value={name} onChangeText={setName} placeholder="Seu nome ou apelido" maxLength={16} autoFocus />
      <AvatarPicker avatar={avatar} color={color} onAvatar={setAvatar} onColor={setColor} />
      <Button title="Continuar" onPress={next} disabled={!name.trim()} />
    </View>,

    // 2 — modo de jogo
    <View key="mode" style={{ gap: S.lg }}>
      <Txt variant="title">Como vai ser a luta?</Txt>
      {(
        [
          { id: 'create', emoji: '🌐', title: 'Criar duelo online', desc: 'Cada um no seu celular. Você recebe um código para convidar o rival.', online: true },
          { id: 'join', emoji: '🔑', title: 'Entrar com código', desc: 'Seu rival já criou o duelo? Digite o código dele.', online: true },
          { id: 'local', emoji: '📱', title: 'No mesmo celular', desc: 'Os dois usam este aparelho e alternam quem posta. Funciona offline.', online: false },
        ] as const
      ).map((o) => {
        const disabled = o.online && !isOnlineAvailable;
        const active = flow === o.id;
        return (
          <Pressable
            key={o.id}
            disabled={disabled}
            onPress={() => {
              haptic();
              setFlow(o.id);
            }}
            style={[styles.option, active && { backgroundColor: C.primary + '22', boxShadow: hardShadow(4, C.primary) }, disabled && { opacity: 0.4 }]}>
            <Txt style={{ fontSize: 30 }}>{o.emoji}</Txt>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h3">{o.title}</Txt>
              <Txt variant="small">{disabled ? 'Requer configurar o Supabase (veja o README).' : o.desc}</Txt>
            </View>
          </Pressable>
        );
      })}

      {flow === 'local' ? (
        <Animated.View entering={FadeInDown} style={{ gap: S.md }}>
          <Txt variant="label">Seu adversário</Txt>
          <Input value={oppName} onChangeText={setOppName} placeholder="Nome do rival" maxLength={16} />
          <AvatarPicker avatar={oppAvatar} color={oppColor} onAvatar={setOppAvatar} onColor={setOppColor} />
        </Animated.View>
      ) : null}
      {flow === 'join' ? (
        <Animated.View entering={FadeInDown} style={{ gap: S.md }}>
          <Input
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="CÓDIGO"
            autoCapitalize="characters"
            maxLength={6}
            style={{ fontSize: 28, textAlign: 'center', letterSpacing: 8, fontWeight: '900' }}
          />
        </Animated.View>
      ) : null}

      {flow === 'join' ? (
        <Button title="Entrar no duelo" onPress={finish} loading={busy} disabled={code.trim().length < 6} />
      ) : (
        <Button title="Continuar" onPress={next} disabled={flow === 'local' && !oppName.trim()} />
      )}
    </View>,

    // 3 — metas
    <View key="goals" style={{ gap: S.lg }}>
      <Txt variant="title">Regras da luta</Txt>
      <Txt variant="dim">Sugerimos um pacote equilibrado — ajuste do seu jeito. Todo dia também aparece um ⚡ desafio bônus valendo 2x.</Txt>
      <GoalPicker selected={habitIds} onChange={setHabitIds} />
      <Button title="Continuar" onPress={next} disabled={habitIds.length === 0} />
    </View>,

    // 4 — aposta
    <View key="stake" style={{ gap: S.lg }}>
      <Txt variant="title">Valendo o quê? 💸</Txt>
      <Txt variant="dim">Opcional, mas deixa tudo mais divertido: quem perder a semana ou o mês paga a aposta.</Txt>
      <Input value={duelName} onChangeText={setDuelName} placeholder={`Nome do duelo (ex.: ${name || 'Eu'} x ${oppName || 'Rival'})`} maxLength={30} />
      <Input value={stake} onChangeText={setStake} placeholder="Aposta (ex.: um açaí 🍧)" maxLength={40} />
      <Row style={{ flexWrap: 'wrap' }}>
        {['um açaí 🍧', 'o jantar 🍝', 'o cinema 🎬', 'lavar a louça 🧽', 'um café ☕'].map((s) => (
          <Pressable key={s} onPress={() => setStake(s)} style={styles.suggestion}>
            <Txt variant="small" color={C.text}>
              {s}
            </Txt>
          </Pressable>
        ))}
      </Row>
      <Card>
        <Txt variant="label">Como pontua</Txt>
        <Txt variant="dim">• Cada prova vale os pontos da meta{'\n'}• Dia perfeito (todas as metas): +30{'\n'}• Combo: 3 dias seguidos x1.1, 7 dias x1.25, 14 dias x1.5{'\n'}• Prova contestada pelo rival não pontua</Txt>
      </Card>
      <Button title="Soar o gongo! 🔔" onPress={finish} loading={busy} />
    </View>,
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step > 0 ? (
          <View style={{ paddingHorizontal: S.lg, paddingTop: S.sm, gap: S.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Pressable onPress={back} hitSlop={12}>
                <Txt variant="dim">← Voltar</Txt>
              </Pressable>
              <Txt variant="small">
                {step}/{totalSteps - 1}
              </Txt>
            </Row>
            <ProgressBar value={step / (totalSteps - 1)} height={6} />
          </View>
        ) : null}
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Animated.View key={step} entering={FadeInRight.springify().damping(18)}>
            {steps[step]}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  avatarCell: {
    width: 56,
    height: 56,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.hairline,
  },
  color: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: C.ink },
  colorOn: { borderWidth: 4, transform: [{ scale: 1.15 }], boxShadow: hardShadow(3) },
  input: {
    backgroundColor: C.surface,
    color: C.text,
    borderRadius: R.md,
    padding: S.lg,
    fontSize: 17,
    fontFamily: F.medium,
    borderWidth: STROKE,
    borderColor: C.ink,
  },
  option: {
    flexDirection: 'row',
    gap: S.md,
    alignItems: 'center',
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: STROKE,
    borderColor: C.ink,
    boxShadow: hardShadow(4),
  },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink },
});
