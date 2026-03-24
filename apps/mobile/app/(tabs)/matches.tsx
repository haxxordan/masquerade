import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useEffect } from 'react';
import { matchesApi } from '@dating/api-client';
import { useMatchStore } from '@dating/store';
import { useRouter } from 'expo-router';
import type { Match } from '@dating/types';

export default function MatchesScreen() {
  const { matches, setMatches, unreadMatchIds, markRead, setActiveMatch } = useMatchStore();
  const router = useRouter();

  useEffect(() => {
    matchesApi.getMatches().then(setMatches).catch(() => { });
  }, []);

  const openChat = (m: Match) => {
    setActiveMatch(m.id);
    markRead(m.id);
    router.push(`/chat/${m.id}`);
  };

  return (
    <View className="flex-1 bg-black">
      <Text className="text-2xl font-bold text-[#ff6699] px-4 pt-14 pb-4">Matches 💖</Text>

      {matches.length === 0 && (
        <Text className="text-white/30 px-4 text-sm">No matches yet. Keep liking!</Text>
      )}

      <FlatList
        data={matches}
        keyExtractor={m => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item: m }) => {
          const other = m.otherProfile;
          const hasUnread = unreadMatchIds.has(m.id);
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
                <Text className="text-white/40 text-sm capitalize" numberOfLines={1}>
                  {other?.animalType ?? ''}
                </Text>
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
