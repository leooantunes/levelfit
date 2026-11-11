import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const IDS = ['levelfit-midday', 'levelfit-evening'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Agenda dois lembretes diários: meio-dia e no horário escolhido à noite. */
export async function syncReminders(enabled: boolean, hour: number, minute: number) {
  if (Platform.OS === 'web') return;
  for (const id of IDS) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  if (!enabled) return;

  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) {
    const req = await Notifications.requestPermissionsAsync();
    if (!req.granted) return;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes',
      // eslint-disable-next-line import/namespace -- reexportado via `export *`
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: IDS[0],
    content: { title: '💧 Pausa pra água?', body: 'Já registrou seus hábitos hoje? Seu rival pode estar na frente 👀' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 12, minute: 30, channelId: 'reminders' },
  });
  await Notifications.scheduleNotificationAsync({
    identifier: IDS[1],
    content: { title: '🥊 O gongo vai soar!', body: 'Poste as provas que faltam antes da meia-noite e não entregue o round!' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' },
  });
}
