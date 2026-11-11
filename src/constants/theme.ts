/**
 * Identidade visual Level Fit — "Sticker Arena".
 * Traço de anime: contorno grosso em tinta azul-marinho, sombra chapada,
 * formas arredondadas e cores vivas. Mascote: Kettu (assets/brand/kettu.svg).
 */
export const C = {
  // Base
  bg: '#FFF7E6', // creme papel
  surface: '#FFFFFF',
  surface2: '#EEF2FB', // névoa periwinkle
  ink: '#1E2A44', // contorno / texto principal
  border: '#1E2A44',
  hairline: '#D9DFEE',
  text: '#1E2A44',
  textDim: '#56627F',
  textMuted: '#8C95AD',

  // Marca
  primary: '#3E9BDB', // azul aura
  primaryDark: '#2B7DBA',
  periwinkle: '#8EA6DE', // corpo do Kettu
  periwinkleDark: '#6F88C4',
  leaf: '#5DBB63', // broto — sucesso / meta feita
  leafDark: '#3E8E47',
  cream: '#F5E6B8', // barriga do Kettu
  pink: '#F48FB1', // bochechas
  gold: '#F5C84C', // troféus
  accent: '#7B6FD6', // XP / níveis
  danger: '#E5484D',
  warning: '#F59E42',
  onColor: '#FFFFFF',
} as const;

export const PLAYER_COLORS = ['#3E9BDB', '#F48FB1', '#5DBB63', '#F59E42', '#7B6FD6', '#E5484D'];
export const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🐼', '🐸', '🦄', '🐙', '🦖', '🐵', '🦅', '🐻'];

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const R = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

/** Espessura do contorno e sombra chapada (estilo adesivo). */
export const STROKE = 2.5;
export const hardShadow = (y = 4, color: string = C.ink) => `0px ${y}px 0px ${color}`;

export const F = {
  display: 'Fredoka_700Bold',
  semibold: 'Fredoka_600SemiBold',
  medium: 'Fredoka_500Medium',
};
