import { Box, Column, LinearProgressIndicator, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
  paddingAll,
  size,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

import type { DuelWidgetProps } from './types';

const DuelWidget = (props: DuelWidgetProps) => {
  'widget';
  // Tudo precisa estar declarado aqui dentro: o widget roda em um runtime isolado.
  // O Glance ignora spaceBetween/spacedBy e weight, então o alinhamento à direita
  // é feito sobrepondo Boxes de largura total com contentAlignment diferente.
  const BG = '#24160F';
  const CHIP = '#3D2720';
  const TRACK = '#4A2E26';
  const GOLD = '#F7B928';
  const EMBER = '#F26B1D';
  const GREEN = '#3FAE5A';
  const RED = '#FF5A47';
  const BLUE = '#4C9BFF';
  const RED_TINT = '#5A231C';
  const BLUE_TINT = '#1C3054';
  const TEXT = '#FFE9D6';
  const DIM = '#B89A8C';

  const progress = props.total > 0 ? Math.min(1, props.done / props.total) : 0;
  const allDone = props.total > 0 && props.done >= props.total;
  const meLeads = props.mePoints > props.oppPoints;
  const oppLeads = props.oppPoints > props.mePoints;
  const short = (name: string) => (name.length > 10 ? `${name.slice(0, 9)}…` : name);

  const avatar = (emoji: string, tintColor: string) => (
    <Box contentAlignment="center" modifiers={[size(38, 38), cornerRadius(19), background(tintColor)]}>
      <Text style={{ fontSize: 19 }}>{emoji}</Text>
    </Box>
  );

  return (
    <Column modifiers={[fillMaxSize(), background(BG), cornerRadius(28), paddingAll(16)]}>
      {/* Cabeçalho */}
      <Box contentAlignment="centerStart" modifiers={[fillMaxWidth()]}>
        <Row verticalAlignment="center">
          <Box modifiers={[size(8, 8), cornerRadius(4), background(EMBER)]} />
          <Spacer modifiers={[width(6)]} />
          <Text color={GOLD} style={{ fontSize: 12, fontWeight: '900', letterSpacing: 1.5 }}>
            LEVEL FIT
          </Text>
        </Row>
        <Box contentAlignment="centerEnd" modifiers={[fillMaxWidth()]}>
          <Box modifiers={[background(CHIP), cornerRadius(12), padding(10, 4, 10, 4)]}>
            <Text color={TEXT} style={{ fontSize: 11, fontWeight: '700' }}>
              {`🔥 ${props.streak} dias`}
            </Text>
          </Box>
        </Box>
      </Box>

      <Spacer modifiers={[height(12)]} />

      {/* Placar: canto vermelho x canto azul */}
      <Box contentAlignment="center" modifiers={[fillMaxWidth()]}>
        <Box contentAlignment="centerStart" modifiers={[fillMaxWidth()]}>
          <Row verticalAlignment="center">
            {avatar(props.meAvatar, RED_TINT)}
            <Spacer modifiers={[width(8)]} />
            <Column>
              <Text color={DIM} maxLines={1} style={{ fontSize: 11, fontWeight: '600' }}>
                {`${short(props.meName)}${meLeads ? ' 👑' : ''}`}
              </Text>
              <Text color={RED} style={{ fontSize: 28, fontWeight: '900' }}>
                {String(props.mePoints)}
              </Text>
            </Column>
          </Row>
        </Box>
        <Box contentAlignment="centerEnd" modifiers={[fillMaxWidth()]}>
          <Row verticalAlignment="center">
            <Column horizontalAlignment="end">
              <Text color={DIM} maxLines={1} style={{ fontSize: 11, fontWeight: '600' }}>
                {`${oppLeads ? '👑 ' : ''}${short(props.oppName)}`}
              </Text>
              <Text color={BLUE} style={{ fontSize: 28, fontWeight: '900' }}>
                {String(props.oppPoints)}
              </Text>
            </Column>
            <Spacer modifiers={[width(8)]} />
            {avatar(props.oppAvatar, BLUE_TINT)}
          </Row>
        </Box>
        <Box contentAlignment="center" modifiers={[size(30, 30), cornerRadius(15), background(EMBER)]}>
          <Text color="#FFFFFF" style={{ fontSize: 11, fontWeight: '900' }}>
            VS
          </Text>
        </Box>
      </Box>

      <Spacer modifiers={[height(12)]} />

      {/* Metas do dia */}
      <LinearProgressIndicator
        progress={progress}
        color={allDone ? GREEN : EMBER}
        trackColor={TRACK}
        modifiers={[fillMaxWidth(), height(8), cornerRadius(4)]}
      />
      <Spacer modifiers={[height(8)]} />
      <Box contentAlignment="centerStart" modifiers={[fillMaxWidth()]}>
        <Text color={TEXT} style={{ fontSize: 12, fontWeight: '700' }}>
          {allDone ? 'Metas fechadas! ✅' : `${props.done}/${props.total} metas hoje`}
        </Text>
        <Box contentAlignment="centerEnd" modifiers={[fillMaxWidth()]}>
          <Text color={GOLD} maxLines={1} style={{ fontSize: 12, fontWeight: '700' }}>
            {props.status}
          </Text>
        </Box>
      </Box>
    </Column>
  );
};

export default createWidget('DuelWidget', DuelWidget);
