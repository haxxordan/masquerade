import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useEffect } from 'react';
import { matchesApi } from '@dating/api-client';
import { useMatchStore } from '@dating/store';
import { useRouter } from 'expo-router';

export default function MatchesScreen() {
  const { matches, setMatches } = useMatchStore();
  const router = useRouter();
  useEffect(() => { matchesApi.getMatches().then(setMatches); }, [setMatches]);

  return (
    <View className="flex-1 bg-black">
      <Text className="text-2xl font-bold text-pink-400 px-4 pt-12 pb-4">Your Matches 💖</Text>
      {matches.length === 0 && <Text className="text-gray-500 px-4">No matches yet. Keep liking!</Text>}
      <FlatList
        data={matches} keyExtractor={m => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item: m }) => (
          <TouchableOpacity className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex-row items-center gap-4"
            onPress={() => router.push(`/chat/${m.id}`)}>
            <View className="w-12 h-12 rounded-full bg-gray-700 items-center justify-center">
              <Text className="text-2xl">🐾</Text>
            </View>
            <View>
              <Text className="text-white font-bold">{m.otherProfile?.displayName ?? 'Match'}</Text>
              <Text className="text-gray-400 text-sm">{m.otherProfile?.animalType}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
