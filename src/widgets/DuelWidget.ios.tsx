import { Gauge, HStack, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  kerning,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  shapes,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { DuelWidgetProps } from './types';

const DuelWidget = (props: DuelWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  // Tudo precisa estar declarado aqui dentro: o widget roda em um runtime isolado.
  const BG = {
    type: 'linearGradient' as const,
    colors: ['#3B2219', '#1E1210'],
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 1, y: 1 },
  };
  const GOLD = '#F7B928';
  const EMBER = '#F26B1D';
  const RED = '#FF5A47';
  const BLUE = '#4C9BFF';
  const RED_CARD = '#4A1E18';
  const BLUE_CARD = '#172744';
  const CHIP = '#3D2720';
  const TEXT = '#FFE9D6';
  const DIM = '#B89A8C';
  const URL = 'levelfit://';

  const progress = props.total > 0 ? Math.min(1, props.done / props.total) : 0;
  const family = environment.widgetFamily;
  const meLeads = props.mePoints > props.oppPoints;
  const oppLeads = props.oppPoints > props.mePoints;
  const allDone = props.total > 0 && props.done >= props.total;
  const goalsLabel = allDone ? 'Metas fechadas! ✅' : `${props.done}/${props.total} metas`;

  // ── Tela de bloqueio ──────────────────────────────────────────────
  if (family === 'accessoryCircular') {
    return (
      <Gauge
        value={progress}
        modifiers={[gaugeStyle('circularCapacity'), containerBackground('clear', 'widget'), widgetURL(URL)]}
        currentValueLabel={<Text modifiers={[font({ weight: 'bold', design: 'rounded' })]}>{`${props.done}/${props.total}`}</Text>}>
        <Text>🥊</Text>
      </Gauge>
    );
  }

  if (family === 'accessoryRectangular' || family === 'accessoryInline') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[containerBackground('clear', 'widget'), widgetURL(URL)]}>
        <Text modifiers={[font({ weight: 'heavy', size: 11, design: 'rounded' }), kerning(1)]}>LEVEL FIT</Text>
        <Text modifiers={[font({ weight: 'black', size: 17, design: 'rounded' }), monospacedDigit()]}>
          {`${props.meAvatar} ${props.mePoints} × ${props.oppPoints} ${props.oppAvatar}`}
        </Text>
        <Text modifiers={[font({ size: 12, weight: 'medium' })]}>{`${goalsLabel} · 🔥${props.streak}`}</Text>
      </VStack>
    );
  }

  // ── Peças reutilizadas ────────────────────────────────────────────
  const header = (
    <HStack spacing={6}>
      <Text modifiers={[font({ weight: 'black', size: 11, design: 'rounded' }), kerning(1.5), foregroundStyle(GOLD)]}>
        LEVEL FIT
      </Text>
      <Spacer />
      <Text
        modifiers={[
          font({ weight: 'bold', size: 11, design: 'rounded' }),
          foregroundStyle(TEXT),
          padding({ horizontal: 8, vertical: 3 }),
          background(CHIP, shapes.capsule()),
        ]}>
        {`🔥 ${props.streak}`}
      </Text>
    </HStack>
  );

  const goalsBar = (
    <VStack alignment="leading" spacing={5}>
      <ProgressView value={progress} modifiers={[tint(allDone ? '#3FAE5A' : EMBER)]} />
      <HStack>
        <Text modifiers={[font({ weight: 'semibold', size: 11, design: 'rounded' }), foregroundStyle(TEXT)]}>{goalsLabel}</Text>
        <Spacer />
        <Text modifiers={[font({ weight: 'bold', size: 11, design: 'rounded' }), foregroundStyle(GOLD), lineLimit(1)]}>
          {props.status}
        </Text>
      </HStack>
    </VStack>
  );

  const corner = (
    avatar: string,
    name: string,
    points: number,
    color: string,
    card: string,
    leads: boolean,
    align: 'leading' | 'trailing',
    big: boolean,
  ) => (
    <VStack
      alignment={align}
      spacing={2}
      modifiers={[
        padding({ horizontal: 12, vertical: big ? 12 : 8 }),
        frame({ maxWidth: 1000, alignment: align }),
        background(card, shapes.roundedRectangle({ cornerRadius: 18, roundedCornerStyle: 'continuous' })),
      ]}>
      <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(DIM), lineLimit(1)]}>
        {align === 'leading' ? `${avatar} ${name}${leads ? ' 👑' : ''}` : `${leads ? '👑 ' : ''}${name} ${avatar}`}
      </Text>
      <Text
        modifiers={[
          font({ weight: 'black', size: big ? 40 : 30, design: 'rounded' }),
          monospacedDigit(),
          foregroundStyle(color),
          lineLimit(1),
          minimumScaleFactor(0.5),
        ]}>
        {String(points)}
      </Text>
    </VStack>
  );

  const vsBadge = (
    <ZStack>
      <Text
        modifiers={[
          font({ weight: 'black', size: 11, design: 'rounded' }),
          foregroundStyle('#FFFFFF'),
          frame({ width: 30, height: 30 }),
          background(EMBER, shapes.circle()),
        ]}>
        VS
      </Text>
    </ZStack>
  );

  // ── Pequeno ──────────────────────────────────────────────────────
  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={0} modifiers={[containerBackground(BG, 'widget'), widgetURL(URL)]}>
        {header}
        <Spacer />
        <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(DIM)]}>
          {`${props.meAvatar} você  vs  ${props.oppAvatar}`}
        </Text>
        <HStack alignment="firstTextBaseline" spacing={4}>
          <Text
            modifiers={[
              font({ weight: 'black', size: 34, design: 'rounded' }),
              monospacedDigit(),
              foregroundStyle(RED),
              minimumScaleFactor(0.5),
              lineLimit(1),
            ]}>
            {String(props.mePoints)}
          </Text>
          <Text modifiers={[font({ weight: 'heavy', size: 14, design: 'rounded' }), foregroundStyle(DIM)]}>×</Text>
          <Text
            modifiers={[
              font({ weight: 'black', size: 34, design: 'rounded' }),
              monospacedDigit(),
              foregroundStyle(BLUE),
              minimumScaleFactor(0.5),
              lineLimit(1),
            ]}>
            {String(props.oppPoints)}
          </Text>
        </HStack>
        <Spacer />
        <ProgressView value={progress} modifiers={[tint(allDone ? '#3FAE5A' : EMBER)]} />
        <Text modifiers={[font({ weight: 'semibold', size: 11, design: 'rounded' }), foregroundStyle(TEXT), padding({ top: 4 })]}>
          {goalsLabel}
        </Text>
      </VStack>
    );
  }

  const big = family === 'systemLarge';
  const scoreboard = (
    <ZStack>
      <HStack spacing={8}>
        {corner(props.meAvatar, props.meName, props.mePoints, RED, RED_CARD, meLeads, 'leading', big)}
        {corner(props.oppAvatar, props.oppName, props.oppPoints, BLUE, BLUE_CARD, oppLeads, 'trailing', big)}
      </HStack>
      {vsBadge}
    </ZStack>
  );

  // ── Médio ────────────────────────────────────────────────────────
  if (!big) {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[containerBackground(BG, 'widget'), widgetURL(URL)]}>
        {header}
        {scoreboard}
        {goalsBar}
      </VStack>
    );
  }

  // ── Grande ───────────────────────────────────────────────────────
  return (
    <VStack alignment="leading" spacing={12} modifiers={[containerBackground(BG, 'widget'), widgetURL(URL)]}>
      {header}
      <Text modifiers={[font({ weight: 'heavy', size: 20, design: 'rounded' }), foregroundStyle(TEXT)]}>Duelo de hoje</Text>
      {scoreboard}
      <HStack
        spacing={14}
        modifiers={[
          padding({ all: 12 }),
          frame({ maxWidth: 1000, alignment: 'leading' }),
          background(CHIP, shapes.roundedRectangle({ cornerRadius: 18, roundedCornerStyle: 'continuous' })),
        ]}>
        <Gauge
          value={progress}
          modifiers={[gaugeStyle('circularCapacity'), tint(allDone ? '#3FAE5A' : EMBER)]}
          currentValueLabel={
            <Text modifiers={[font({ weight: 'black', size: 14, design: 'rounded' }), foregroundStyle(TEXT)]}>
              {`${props.done}/${props.total}`}
            </Text>
          }>
          <Text>metas</Text>
        </Gauge>
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ weight: 'heavy', size: 15, design: 'rounded' }), foregroundStyle(TEXT)]}>
            {allDone ? 'Metas fechadas!' : 'Metas de hoje'}
          </Text>
          <Text modifiers={[font({ weight: 'bold', size: 13, design: 'rounded' }), foregroundStyle(GOLD), lineLimit(1)]}>
            {props.status}
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(DIM)]}>{`🔥 ${props.streak} dias seguidos`}</Text>
        </VStack>
      </HStack>
      <Spacer />
      {props.weekLeader ? (
        <Text
          modifiers={[
            font({ weight: 'semibold', size: 13, design: 'rounded' }),
            foregroundStyle(TEXT),
            lineLimit(1),
            padding({ horizontal: 12, vertical: 8 }),
            frame({ maxWidth: 1000, alignment: 'leading' }),
            background(CHIP, shapes.capsule()),
          ]}>
          {`🏆 ${props.weekLeader}`}
        </Text>
      ) : null}
    </VStack>
  );
};

export default createWidget('DuelWidget', DuelWidget);
