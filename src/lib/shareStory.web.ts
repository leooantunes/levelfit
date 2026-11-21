import type { RefObject } from 'react';

import type { StoryCardRef } from '@/components/StoryCard';

/**
 * Na web não há Story do Instagram nem captura de tela nativa
 * (react-native-share e react-native-view-shot só existem no app).
 * A comemoração já esconde o botão na web; isto só evita carregar os módulos nativos.
 */
export async function shareResultToStory(_card: RefObject<StoryCardRef | null>): Promise<boolean> {
  throw new Error('Compartilhar no Story só está disponível no app do celular.');
}
