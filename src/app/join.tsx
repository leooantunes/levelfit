import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ProfileFields';
import { Button, haptic, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useGame } from '@/store/useGame';
import { PremiumRequiredError } from '@/sync/supabase';

export default function JoinScreen() {
  const joinDuel = useGame((s) => s.joinDuel);
  const openDuel = useGame((s) => s.openDuel);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    try {
      const id = await joinDuel(code);
      haptic('success');
      openDuel(id);
      router.replace('/duel');
    } catch (e) {
      if (e instanceof PremiumRequiredError) router.replace('/premium');
      else Alert.alert('Não deu certo', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1, padding: S.lg, gap: S.lg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Txt variant="dim">✕ Cancelar</Txt>
        </Pressable>
        <View style={{ gap: S.sm }}>
          <Txt variant="title">Entrar num duelo 🔑</Txt>
          <Txt variant="dim">Digite o código de 6 letras que seu rival te mandou.</Txt>
        </View>
        <Input
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="CÓDIGO"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          autoFocus
          onSubmitEditing={() => code.length === 6 && join()}
          style={{ fontSize: 28, textAlign: 'center', letterSpacing: 8, fontWeight: '900' }}
        />
        <Button title="Entrar no duelo" onPress={join} loading={busy} disabled={code.length < 6} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
