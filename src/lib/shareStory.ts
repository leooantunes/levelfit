import type { RefObject } from 'react';
import { Linking, Platform } from 'react-native';
import Share, { Social } from 'react-native-share';
import { captureRef } from 'react-native-view-shot';

import type { StoryCardRef } from '@/components/StoryCard';

/**
 * Facebook App ID (developers.facebook.com). A Meta exige o ID para abrir o
 * editor de Stories do Instagram direto. Sem ele, o app usa o menu de compartilhar.
 */
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || null;

async function instagramInstalled(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') return (await Share.isPackageInstalled('com.instagram.android')).isInstalled;
    return await Linking.canOpenURL('instagram-stories://share');
  } catch {
    return false;
  }
}

/**
 * Captura o cartão em 1080x1920 e abre o Story do Instagram com a imagem.
 * Sem Instagram ou sem App ID: abre o menu de compartilhar do celular.
 * Retorna false se a pessoa desistiu.
 */
export async function shareResultToStory(card: RefObject<StoryCardRef | null>): Promise<boolean> {
  if (!card.current) throw new Error('Não foi possível gerar a imagem.');
  const uri = await captureRef(card, { format: 'png', width: 1080, height: 1920, result: 'tmpfile' });
  const fileUrl = uri.startsWith('file://') ? uri : `file://${uri}`;

  if (FACEBOOK_APP_ID && (await instagramInstalled())) {
    try {
      const res = await Share.shareSingle({
        social: Social.InstagramStories,
        appId: FACEBOOK_APP_ID,
        backgroundImage: fileUrl,
        backgroundTopColor: '#1E1210',
        backgroundBottomColor: '#1E1210',
      });
      if (res.success) return true;
    } catch {
      // cai no menu de compartilhar
    }
  }

  const res = await Share.open({ url: fileUrl, type: 'image/png', filename: 'level-fit-resultado', failOnCancel: false });
  return !('dismissedAction' in res && res.dismissedAction);
}
