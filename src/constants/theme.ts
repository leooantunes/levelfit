import { Platform } from 'react-native';

export const C = {
  bg: '#0A0E1A',
  surface: '#131A2B',
  surface2: '#1C2540',
  border: '#26304D',
  text: '#F4F6FF',
  textDim: '#9AA3BF',
  textMuted: '#626C8C',
  primary: '#7CFF6B',
  primaryDark: '#3FBF35',
  accent: '#8B5CF6',
  gold: '#FFD447',
  silver: '#C9D2E3',
  danger: '#FF5C7A',
  warning: '#FFB347',
} as const;

export const PLAYER_COLORS = ['#38BDF8', '#F472B6', '#FB923C', '#A78BFA', '#34D399', '#FACC15'];
export const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🐼', '🐸', '🦄', '🐙', '🦖', '🐵', '🦅', '🐻'];

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const R = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const F = {
  rounded: Platform.select({ ios: 'ui-rounded', default: undefined }),
};
