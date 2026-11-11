import { useState } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProofCard } from '@/components/ProofCard';
import { Card, Segmented, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { periodLabel } from '@/domain/dates';
import type { Checkin } from '@/domain/types';
import { usePlayers, useToday } from '@/hooks/useScoreBook';
import { useGame } from '@/store/useGame';

type Filter = 'all' | 'me' | 'rival';
type Item = { type: 'header'; key: string; label: string } | { type: 'proof'; key: string; checkin: Checkin };

export default function FeedScreen() {
  const checkins = useGame((s) => s.checkins);
  const duel = useGame((s) => s.duel)!;
  const react = useGame((s) => s.react);
  const mode = useGame((s) => s.mode);
  const syncing = useGame((s) => s.syncing);
  const refresh = useGame((s) => s.refresh);
  const { me } = usePlayers();
  const today = useToday();
  const [filter, setFilter] = useState<Filter>('all');
  if (!me) return null;

  const visible = checkins
    .filter((c) => (filter === 'all' ? true : filter === 'me' ? c.playerId === me.id : c.playerId !== me.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const items: Item[] = [];
  let lastDay = '';
  for (const c of visible) {
    if (c.dateKey !== lastDay) {
      items.push({ type: 'header', key: `h-${c.dateKey}`, label: periodLabel('day', c.dateKey, today) });
      lastDay = c.dateKey;
    }
    items.push({ type: 'proof', key: c.id, checkin: c });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        contentContainerStyle={{ padding: S.lg, paddingTop: Platform.OS === 'web' ? 72 : S.lg, paddingBottom: 120, gap: S.md }}
        refreshControl={
          mode === 'online' ? <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={C.primary} /> : undefined
        }
        ListHeaderComponent={
          <View style={{ gap: S.lg, marginBottom: S.sm }}>
            <Txt variant="title">Provas</Txt>
            <Segmented
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'me', label: 'Minhas' },
                { value: 'rival', label: 'Do rival' },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </View>
        }
        ListEmptyComponent={
          <Card style={{ alignItems: 'center' }}>
            <Txt style={{ fontSize: 40 }}>📸</Txt>
            <Txt variant="h3">Nenhuma prova ainda</Txt>
            <Txt variant="dim" style={{ textAlign: 'center' }}>
              Cada meta cumprida vira uma foto aqui. Seu rival pode reagir — ou contestar se achar que é migué!
            </Txt>
          </Card>
        }
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <Txt variant="label" style={{ marginTop: S.sm }}>
              {item.label}
            </Txt>
          ) : (
            <ProofCard
              checkin={item.checkin}
              player={duel.players.find((p) => p.id === item.checkin.playerId)}
              viewerId={me.id}
              onReact={(e) => react(item.checkin.id, e)}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
