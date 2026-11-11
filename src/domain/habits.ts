import type { Habit } from './types';

export const HABITS: Habit[] = [
  {
    id: 'leitura',
    title: 'Ler 10 páginas',
    emoji: '📚',
    description: 'Leia pelo menos 10 páginas de um livro.',
    points: 15,
    category: 'mente',
    maxPerDay: 1,
    proofHint: 'Foto do livro aberto na página em que você parou.',
  },
  {
    id: 'agua',
    title: 'Beber 2L de água',
    emoji: '💧',
    description: 'Bata a meta de 2 litros (ou mais) de água no dia.',
    points: 10,
    category: 'nutricao',
    maxPerDay: 1,
    proofHint: 'Foto da garrafa vazia ou do app de hidratação.',
  },
  {
    id: 'refeicao',
    title: 'Refeição da dieta',
    emoji: '🥗',
    description: 'Cada refeição saudável dentro da dieta conta (até 3 por dia).',
    points: 8,
    category: 'nutricao',
    maxPerDay: 3,
    proofHint: 'Foto do prato antes de comer.',
  },
  {
    id: 'exercicio',
    title: 'Treino de 30 min',
    emoji: '🏋️',
    description: 'Academia, corrida, bike, dança, luta… 30 minutos ou mais.',
    points: 25,
    category: 'corpo',
    maxPerDay: 1,
    proofHint: 'Selfie no treino ou print do relógio/app.',
  },
  {
    id: 'passos',
    title: '10 mil passos',
    emoji: '👟',
    description: 'Caminhe 10.000 passos ao longo do dia.',
    points: 15,
    category: 'corpo',
    maxPerDay: 1,
    proofHint: 'Print do contador de passos.',
  },
  {
    id: 'sono',
    title: 'Dormir 7h+',
    emoji: '😴',
    description: 'Durma pelo menos 7 horas na noite anterior.',
    points: 12,
    category: 'bem-estar',
    maxPerDay: 1,
    proofHint: 'Print do monitor de sono ou foto da cama arrumada cedo.',
  },
  {
    id: 'sem-acucar',
    title: 'Zero açúcar',
    emoji: '🚫🍬',
    description: 'Passe o dia sem doces e bebidas açucaradas.',
    points: 15,
    category: 'nutricao',
    maxPerDay: 1,
    proofHint: 'Foto do lanche saudável que substituiu o doce.',
  },
  {
    id: 'meditacao',
    title: 'Meditar 10 min',
    emoji: '🧘',
    description: '10 minutos de meditação ou respiração guiada.',
    points: 10,
    category: 'mente',
    maxPerDay: 1,
    proofHint: 'Print do app ou foto do seu cantinho zen.',
  },
  {
    id: 'alongamento',
    title: 'Alongamento',
    emoji: '🤸',
    description: '10 minutos de alongamento ou mobilidade.',
    points: 8,
    category: 'corpo',
    maxPerDay: 1,
    proofHint: 'Foto no tapete ou alongando.',
  },
  {
    id: 'frutas',
    title: '3 porções de fruta/legume',
    emoji: '🍎',
    description: 'Coma pelo menos 3 porções de frutas ou vegetais.',
    points: 10,
    category: 'nutricao',
    maxPerDay: 1,
    proofHint: 'Foto das frutas/vegetais do dia.',
  },
  {
    id: 'sem-tela',
    title: 'Sem tela antes de dormir',
    emoji: '📵',
    description: 'Nada de celular 30 min antes de dormir.',
    points: 10,
    category: 'bem-estar',
    maxPerDay: 1,
    proofHint: 'Foto do celular carregando longe da cama.',
  },
  {
    id: 'acordar-cedo',
    title: 'Acordar cedo',
    emoji: '🌅',
    description: 'Levante antes das 7h.',
    points: 10,
    category: 'bem-estar',
    maxPerDay: 1,
    proofHint: 'Foto do nascer do sol ou do relógio.',
  },
  {
    id: 'ar-livre',
    title: '20 min ao ar livre',
    emoji: '🌳',
    description: 'Tome sol / fique ao ar livre por 20 minutos.',
    points: 8,
    category: 'bem-estar',
    maxPerDay: 1,
    proofHint: 'Foto do lugar onde você está.',
  },
  {
    id: 'gratidao',
    title: 'Diário de gratidão',
    emoji: '✍️',
    description: 'Escreva 3 coisas pelas quais você é grato hoje.',
    points: 8,
    category: 'mente',
    maxPerDay: 1,
    proofHint: 'Foto da página escrita (pode borrar o texto).',
  },
  {
    id: 'sem-alcool',
    title: 'Zero álcool',
    emoji: '🧃',
    description: 'Dia sem bebidas alcoólicas.',
    points: 10,
    category: 'nutricao',
    maxPerDay: 1,
    proofHint: 'Foto da sua bebida sem álcool.',
  },
];

export const HABITS_BY_ID: Record<string, Habit> = Object.fromEntries(HABITS.map((h) => [h.id, h]));

export function getHabit(id: string): Habit | undefined {
  return HABITS_BY_ID[id];
}

export const CATEGORY_LABEL: Record<Habit['category'], string> = {
  mente: 'Mente',
  corpo: 'Corpo',
  nutricao: 'Nutrição',
  'bem-estar': 'Bem-estar',
};

/** Pacotes de metas que o app sugere ao criar o duelo. */
export const GOAL_PRESETS: { id: string; title: string; emoji: string; description: string; habitIds: string[] }[] = [
  {
    id: 'equilibrio',
    title: 'Equilíbrio',
    emoji: '⚖️',
    description: 'O clássico: corpo, mente e alimentação.',
    habitIds: ['leitura', 'agua', 'refeicao', 'exercicio', 'sono'],
  },
  {
    id: 'shape',
    title: 'Modo Shape',
    emoji: '🔥',
    description: 'Foco total em treino e dieta.',
    habitIds: ['exercicio', 'refeicao', 'agua', 'sem-acucar', 'passos'],
  },
  {
    id: 'zen',
    title: 'Mente Zen',
    emoji: '🧠',
    description: 'Menos estresse, mais foco e descanso.',
    habitIds: ['meditacao', 'leitura', 'sono', 'sem-tela', 'gratidao'],
  },
  {
    id: 'iniciante',
    title: 'Primeiros Passos',
    emoji: '🌱',
    description: 'Leve e fácil de manter para começar.',
    habitIds: ['agua', 'passos', 'frutas', 'alongamento'],
  },
];

export const DEFAULT_HABIT_IDS = GOAL_PRESETS[0].habitIds;

/** Gera um número pseudo-aleatório determinístico a partir de uma string. */
function seededIndex(seed: string, length: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % length;
}

/**
 * Desafio bônus do dia: um hábito fora das metas do duelo que vale pontos em dobro.
 * Determinístico por duelo + dia, então os dois celulares mostram o mesmo desafio.
 */
export function dailyChallenge(duelId: string, dateKey: string, goalIds: string[]): Habit {
  const pool = HABITS.filter((h) => !goalIds.includes(h.id));
  const list = pool.length > 0 ? pool : HABITS;
  return list[seededIndex(`${duelId}:${dateKey}`, list.length)];
}

export const CHALLENGE_MULTIPLIER = 2;
