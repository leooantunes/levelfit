import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View } from 'react-native';

import { C, hardShadow, R, STROKE } from '@/constants/theme';

type SymbolName = SymbolViewProps['name'];

/** Ícone vetorial (SF Symbols no iOS, Material Symbols no Android/web) num selo do estilo pôster. */
export function IconBadge({ name, color, size = 52 }: Readonly<{ name: SymbolName; color: string; size?: number }>) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: R.md,
        backgroundColor: color,
        borderWidth: STROKE,
        borderColor: C.ink,
        boxShadow: hardShadow(3),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SymbolView name={name} size={size * 0.55} tintColor={C.onColor} weight="bold" />
    </View>
  );
}
