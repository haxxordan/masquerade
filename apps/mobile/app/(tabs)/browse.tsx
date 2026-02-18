import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { profilesApi, matchesApi } from '@dating/api-client';
import type { Profile } from '@dating/types';
import { useRouter } from 'expo-router';

export default function BrowseScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => { profilesApi.suggest({}).then(setProfiles); }, []);

  const handleLike = async (id: string) => {
    await matchesApi.like(id);
    setLikedIds(prev => new Set([...prev, id]));
  };

  return (
    <View className="flex-1 bg-black">
      <Text className="text-2xl font-bold text-pink-400 px-4 pt-12 pb-4">Discover 🐾</Text>
      <FlatList
        data={profiles}
        keyExtractor={p => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item: p }) => (
          <TouchableOpacity className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800"
            onPress={() => router.push(`/profile/${p.id}`)}>
            <View className="h-48 bg-gray-800 items-center justify-center">
              {p.animalAvatarUrl
                ? <Image source={{ uri: p.animalAvatarUrl }} className="w-full h-full" resizeMode="cover" />
                : <Text className="text-6xl">🐾</Text>}
            </View>
            <View className="p-4">
              <Text className="text-white font-bold text-lg">{p.displayName}</Text>
              <Text className="text-gray-400 text-sm mb-2">{p.animalType}</Text>
              <View className="flex-row flex-wrap gap-1 mb-3">
                {p.musicGenres.slice(0, 3).map(g => (
                  <View key={g} className="bg-gray-800 px-2 py-1 rounded-full">
                    <Text className="text-pink-300 text-xs">🎵 {g}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                className={`py-2 rounded-full items-center ${likedIds.has(p.id) ? 'bg-gray-700' : 'bg-pink-500'}`}
                onPress={() => handleLike(p.id)} disabled={likedIds.has(p.id)}>
                <Text className="text-white font-bold">{likedIds.has(p.id) ? '♥ Liked' : '♥ Like'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
