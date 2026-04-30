import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, matchesApi } from '@dating/api-client';
import { useMatchStore } from '@dating/store';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ConversationState, Match } from '@dating/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, staleTimes } from '../../lib/queryConfig';

export default function MatchesScreen() {
  const { matches, setMatches, unreadMatchIds, markRead, setActiveMatch } = useMatchStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stateByMatchId, setStateByMatchId] = useState<Record<string, ConversationState | null>>({});

  const matchesQuery = useQuery({
    queryKey: queryKeys.matches,
    queryFn: () => matchesApi.getMatches(),
    staleTime: staleTimes.matches,
  });
  const { isStale, refetch } = matchesQuery;

  useEffect(() => {
    if (matchesQuery.data) {
      setMatches(matchesQuery.data);
    }
  }, [matchesQuery.data, setMatches]);

  useFocusEffect(useCallback(() => {
    if (isStale) {
      refetch().catch(() => { });
    }
  }, [isStale, refetch]));

  useEffect(() => {
    const missingMatchIds = matches
      .map(match => match.id)
      .filter(matchId => !(matchId in stateByMatchId));

    if (missingMatchIds.length === 0) return;

    let cancelled = false;

    Promise.all(missingMatchIds.map(async (matchId) => {
      try {
        const state = await matchesApi.getConversationState(matchId);
        return [matchId, state] as const;
      } catch (error: unknown) {
        const disabled = error instanceof ApiError && (error.status === 404 || error.status === 403);
        if (!disabled) {
          console.warn('[matches] conversation state error', error);
        }

        return [matchId, null] as const;
      }
    })).then(results => {
      if (cancelled) return;

      setStateByMatchId(prev => {
        const next = { ...prev };
        for (const [matchId, state] of results) {
          next[matchId] = state;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [matches, stateByMatchId]);

  const openChat = (m: Match) => {
    setActiveMatch(m.id);
    markRead(m.id);
    router.push(`/chat/${m.id}`);
  };

  return (
    <View className="flex-1 bg-black">
      <Text className="text-2xl font-bold text-[#ff6699] px-4 pb-4" style={{ paddingTop: insets.top + 12 }}>
        Matches 💖
      </Text>

      {matches.length === 0 && (
        <Text className="text-white/30 px-4 text-sm">No matches yet. Keep liking!</Text>
      )}

      <FlatList
        data={matches}
        keyExtractor={m => m.id}
        refreshing={matchesQuery.isRefetching && !matchesQuery.isLoading}
        onRefresh={() => refetch().catch(() => { })}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item: m }) => {
          const other = m.otherProfile;
          const hasUnread = unreadMatchIds.has(m.id);
          const isStaleConversation = stateByMatchId[m.id]?.isStale ?? false;
          return (
            <TouchableOpacity
              className="bg-white/5 rounded-xl p-4 border border-white/10 flex-row items-center gap-4"
              onPress={() => openChat(m)}
            >
              {/* Avatar */}
              <View className="w-12 h-12 rounded-full overflow-hidden border border-[#ff6699] flex-shrink-0">
                {other?.animalAvatarUrl ? (
                  <Image
                    source={{ uri: other.animalAvatarUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 bg-gray-800 items-center justify-center">
                    <Text className="text-2xl">🐾</Text>
                  </View>
                )}
              </View>

              {/* Name & type */}
              <View className="flex-1 min-w-0">
                <Text className="text-white font-bold" numberOfLines={1}>
                  {other?.displayName ?? 'Match'}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-white/40 text-sm capitalize" numberOfLines={1}>
                    {other?.animalType ?? ''}
                  </Text>
                  {isStaleConversation && !hasUnread && (
                    <Text className="text-[#ff9cbc] text-[10px] uppercase border border-[#ff6699]/40 rounded-full px-1.5 py-0.5">
                      nudge
                    </Text>
                  )}
                </View>
              </View>

              {/* Unread dot */}
              {hasUnread && (
                <View className="w-2.5 h-2.5 rounded-full bg-[#ff6699]" />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
