import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Card, Row, Screen, Txt } from '@/components/ui';
import { C } from '@/constants/theme';
import { contactSupport, SUPPORT_EMAIL } from '@/lib/links';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED_AT } from '@/lib/privacyPolicy';

export default function PrivacyScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="title">Privacidade</Txt>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Txt variant="dim">✕ Fechar</Txt>
        </Pressable>
      </Row>
      <Txt variant="small">Atualizada em {PRIVACY_UPDATED_AT}</Txt>

      {PRIVACY_SECTIONS.map((s) => (
        <Card key={s.title}>
          <Txt variant="h3">{s.title}</Txt>
          <Txt variant="dim">{s.body}</Txt>
        </Card>
      ))}

      {SUPPORT_EMAIL ? (
        <Card>
          <Txt variant="h3">Contato</Txt>
          <Pressable onPress={() => contactSupport('Privacidade no Level Fit')} hitSlop={8}>
            <Txt color={C.primaryDark}>{SUPPORT_EMAIL}</Txt>
          </Pressable>
        </Card>
      ) : null}
    </Screen>
  );
}
