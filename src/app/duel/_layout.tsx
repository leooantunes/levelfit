import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { View } from 'react-native';

import { CelebrationHost } from '@/components/CelebrationHost';
import { C } from '@/constants/theme';
import { useActiveDuel } from '@/store/useGame';

export default function DuelTabsLayout() {
  const duel = useActiveDuel();
  // Duelo removido (saiu em outro aparelho, por exemplo): volta para a lista.
  if (!duel) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1 }}>
      <NativeTabs
        backgroundColor={C.surface}
        indicatorColor={C.primary + '33'}
        tintColor={C.primary}
        labelStyle={{ color: C.textDim, selected: { color: C.primary } }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Hoje</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'flame', selected: 'flame.fill' }} md="local_fire_department" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="ranking">
          <NativeTabs.Trigger.Label>Ranking</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} md="emoji_events" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="feed">
          <NativeTabs.Trigger.Label>Provas</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'photo.on.rectangle', selected: 'photo.fill.on.rectangle.fill' }} md="photo_library" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Duelo</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        </NativeTabs.Trigger>
      </NativeTabs>
      <CelebrationHost />
    </View>
  );
}
