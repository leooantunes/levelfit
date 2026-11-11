import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Txt } from '@/components/ui';
import { C, R, STROKE } from '@/constants/theme';
import { formatHealthValue } from '@/domain/healthGoals';
import type { Checkin, HealthProof } from '@/domain/types';

/** Cartão no lugar da foto: "⌚ 10.432 passos · Apple Health". */
export function HealthProofView({ proof, style, dim }: { proof: HealthProof; style?: StyleProp<ViewStyle>; dim?: boolean }) {
  return (
    <View style={[styles.box, dim && { opacity: 0.4 }, style]}>
      <Txt style={{ fontSize: 44 }}>⌚</Txt>
      <Txt variant="title" style={{ textAlign: 'center' }}>
        {formatHealthValue(proof)}
      </Txt>
      <Txt variant="small">Confirmado pelo relógio · {proof.source}</Txt>
    </View>
  );
}

/** Miniatura de uma prova: a foto, ou o relógio para provas automáticas. */
export function ProofThumb({ checkin, style }: { checkin: Checkin; style: StyleProp<ViewStyle> }) {
  if (checkin.health) {
    return (
      <View style={[style, styles.thumbHealth]}>
        <Txt style={{ fontSize: 16 }}>⌚</Txt>
      </View>
    );
  }
  return <Image source={{ uri: checkin.photoUri, cacheKey: checkin.id }} style={style as object} contentFit="cover" />;
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: R.md,
    backgroundColor: C.leaf + '22',
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
  },
  thumbHealth: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.leaf + '33', borderWidth: STROKE / 2, borderColor: C.ink },
});
