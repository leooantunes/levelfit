import { Gauge, HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { DuelWidgetProps } from './types';

const DuelWidget = (props: DuelWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  // Tudo precisa estar declarado aqui dentro: o widget roda em um runtime isolado.
  const BG = '#0A0E1A';
  const GREEN = '#7CFF6B';
  const BLUE = '#38BDF8';
  const PINK = '#F472B6';
  const DIM = '#9AA3BF';
  const progress = props.total > 0 ? props.done / props.total : 0;
  const family = environment.widgetFamily;

  if (family === 'accessoryCircular') {
    return (
      <Gauge
        value={progress}
        modifiers={[containerBackground('clear', 'widget'), widgetURL('levelfit://')]}
        currentValueLabel={<Text>{`${props.done}/${props.total}`}</Text>}
      />
    );
  }

  if (family === 'accessoryRectangular' || family === 'accessoryInline') {
    return (
      <VStack alignment="leading" modifiers={[containerBackground('clear', 'widget'), widgetURL('levelfit://')]}>
        <Text modifiers={[font({ weight: 'bold', size: 14 })]}>{`🏆 ${props.mePoints} x ${props.oppPoints}`}</Text>
        <Text modifiers={[font({ size: 12 })]}>{`Metas ${props.done}/${props.total} · 🔥${props.streak}`}</Text>
      </VStack>
    );
  }

  if (family === 'systemSmall') {
    return (
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[containerBackground(BG, 'widget'), widgetURL('levelfit://')]}>
        <Text modifiers={[font({ weight: 'heavy', size: 12, design: 'rounded' }), foregroundStyle(GREEN)]}>LEVEL FIT</Text>
        <HStack spacing={4}>
          <Text modifiers={[font({ weight: 'black', size: 26, design: 'rounded' }), foregroundStyle(BLUE)]}>
            {String(props.mePoints)}
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(DIM)]}>x</Text>
          <Text modifiers={[font({ weight: 'black', size: 26, design: 'rounded' }), foregroundStyle(PINK)]}>
            {String(props.oppPoints)}
          </Text>
        </HStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(DIM)]}>{`${props.meAvatar} vs ${props.oppAvatar} · hoje`}</Text>
        <Spacer />
        <ProgressView value={progress} modifiers={[foregroundStyle(GREEN)]} />
        <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle('#FFFFFF')]}>
          {`${props.done}/${props.total} metas · 🔥${props.streak}`}
        </Text>
      </VStack>
    );
  }

  // systemMedium / systemLarge
  return (
    <VStack alignment="leading" spacing={8} modifiers={[containerBackground(BG, 'widget'), widgetURL('levelfit://')]}>
      <HStack>
        <Text modifiers={[font({ weight: 'heavy', size: 13, design: 'rounded' }), foregroundStyle(GREEN)]}>⚡ LEVEL FIT</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(DIM)]}>{`🔥 ${props.streak} dias`}</Text>
      </HStack>
      <HStack spacing={12}>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 1000, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 13 }), foregroundStyle('#FFFFFF')]}>{`${props.meAvatar} ${props.meName}`}</Text>
          <Text modifiers={[font({ weight: 'black', size: 30, design: 'rounded' }), foregroundStyle(BLUE)]}>
            {String(props.mePoints)}
          </Text>
        </VStack>
        <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle(DIM)]}>VS</Text>
        <VStack alignment="trailing" spacing={2} modifiers={[frame({ maxWidth: 1000, alignment: 'trailing' })]}>
          <Text modifiers={[font({ size: 13 }), foregroundStyle('#FFFFFF')]}>{`${props.oppName} ${props.oppAvatar}`}</Text>
          <Text modifiers={[font({ weight: 'black', size: 30, design: 'rounded' }), foregroundStyle(PINK)]}>
            {String(props.oppPoints)}
          </Text>
        </VStack>
      </HStack>
      <ProgressView value={progress} modifiers={[foregroundStyle(GREEN)]} />
      <HStack>
        <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle('#FFFFFF')]}>
          {`Metas de hoje: ${props.done}/${props.total}`}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(GREEN)]}>{props.status}</Text>
      </HStack>
      {family === 'systemLarge' && props.weekLeader ? (
        <Text modifiers={[font({ size: 13 }), foregroundStyle(DIM), padding({ top: 8 })]}>{props.weekLeader}</Text>
      ) : null}
    </VStack>
  );
};

export default createWidget('DuelWidget', DuelWidget);
