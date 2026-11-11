/**
 * Identidade visual Level Fit — "Pôster de Luta".
 * Cada dia é um round: contorno grosso cor de cacau, sombra chapada, laranja brasa,
 * dourado de cinturão e os cantos vermelho x azul do ringue.
 * Mascote: Brasa (assets/brand/brasa.svg).
 */
export const C = {
  // Base
  bg: '#FFF3E3', // papel de pôster
  surface: '#FFFFFF',
  surface2: '#FBE6D2', // lona do ringue
  ink: '#2B1B17', // cacau — contorno e texto
  border: '#2B1B17',
  hairline: '#EED6C1',
  text: '#2B1B17',
  textDim: '#6E544B',
  textMuted: '#A68C80',

  // Marca
  primary: '#F26B1D', // brasa — ação principal
  primaryDark: '#C9481A',
  gold: '#F7B928', // cinturão — vitórias
  leaf: '#3FAE5A', // meta cumprida
  leafDark: '#2E8A45',
  accent: '#D6453B', // XP, combo
  redCorner: '#E2412F',
  blueCorner: '#2F7DD1',
  smoke: '#8A8285',
  danger: '#C62F2F',
  warning: '#F7B928',
  onColor: '#FFFFFF',

  // Noite de luta (telas de comemoração)
  night: '#1E1210',
  nightText: '#FFE9D6',
} as const;

/** Canto vermelho x canto azul + extras. */
export const PLAYER_COLORS = ['#E2412F', '#2F7DD1', '#F26B1D', '#3FAE5A', '#8E44AD', '#F7B928'];
export const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🐼', '🐸', '🦄', '🐙', '🦖', '🐵', '🦅', '🐻'];

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const R = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

/** Espessura do contorno e sombra chapada (estilo pôster). */
export const STROKE = 2.5;
export const hardShadow = (y = 4, color: string = C.ink) => `0px ${y}px 0px ${color}`;

export const F = {
  /** Display de pôster de luta: logo, títulos, placares. */
  display: 'Bungee_400Regular',
  heavy: 'Rubik_800ExtraBold',
  semibold: 'Rubik_600SemiBold',
  medium: 'Rubik_500Medium',
};
