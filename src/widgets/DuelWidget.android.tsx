import { Column, LinearProgressIndicator, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

import type { DuelWidgetProps } from './types';

const DuelWidget = (props: DuelWidgetProps) => {
  'widget';
  // Tudo precisa estar declarado aqui dentro: o widget roda em um runtime isolado.
  const BG = '#0A0E1A';
  const TRACK = '#1C2540';
  const GREEN = '#7CFF6B';
  const BLUE = '#38BDF8';
  const PINK = '#F472B6';
  const DIM = '#9AA3BF';
  const WHITE = '#FFFFFF';
  const progress = props.total > 0 ? props.done / props.total : 0;

  return (
    <Column
      verticalArrangement={{ spacedBy: 6 }}
      modifiers={[fillMaxSize(), background(BG), cornerRadius(24), paddingAll(14)]}>
      <Row horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
        <Text color={GREEN} style={{ fontSize: 13, fontWeight: '900' }}>
          ⚡ LEVEL FIT
        </Text>
        <Text color={DIM} style={{ fontSize: 12 }}>
          {`🔥 ${props.streak} dias`}
        </Text>
      </Row>
      <Row horizontalArrangement="spaceBetween" verticalAlignment="center" modifiers={[fillMaxWidth()]}>
        <Column>
          <Text color={WHITE} style={{ fontSize: 13 }}>
            {`${props.meAvatar} ${props.meName}`}
          </Text>
          <Text color={BLUE} style={{ fontSize: 28, fontWeight: '900' }}>
            {String(props.mePoints)}
          </Text>
        </Column>
        <Text color={DIM} style={{ fontSize: 14, fontWeight: '700' }}>
          VS
        </Text>
        <Column horizontalAlignment="end">
          <Text color={WHITE} style={{ fontSize: 13 }}>
            {`${props.oppName} ${props.oppAvatar}`}
          </Text>
          <Text color={PINK} style={{ fontSize: 28, fontWeight: '900' }}>
            {String(props.oppPoints)}
          </Text>
        </Column>
      </Row>
      <Spacer modifiers={[height(2)]} />
      <LinearProgressIndicator progress={progress} color={GREEN} trackColor={TRACK} modifiers={[fillMaxWidth()]} />
      <Row horizontalArrangement="spaceBetween" modifiers={[fillMaxWidth()]}>
        <Text color={WHITE} style={{ fontSize: 12, fontWeight: '600' }}>
          {`Metas: ${props.done}/${props.total}`}
        </Text>
        <Text color={GREEN} style={{ fontSize: 12 }} maxLines={1}>
          {props.status}
        </Text>
      </Row>
    </Column>
  );
};

export default createWidget('DuelWidget', DuelWidget);
