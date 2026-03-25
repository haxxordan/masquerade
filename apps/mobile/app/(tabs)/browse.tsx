import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { useCallback, useMemo } from 'react';
import { profilesApi, matchesApi } from '@dating/api-client';
import type { Profile } from '@dating/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, staleTimes } from '../../lib/queryConfig';

export default function BrowseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const loadProfiles = useCallback(async (): Promise<Profile[]> => {
    try {
      return await profilesApi.topPicks({ page: 0, pageSize: 10 });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status !== 404) throw error;

      return profilesApi.suggest({});
    }
  }, []);

  const browseQuery = useQuery({
    queryKey: queryKeys.browseProfiles,
    queryFn: loadProfiles,
    staleTime: staleTimes.browseProfiles,
  });
  const { isStale, refetch } = browseQuery;

  const profiles = browseQuery.data ?? [];
  const likedIds = useMemo(() => new Set(
    profiles
      .filter(p => p.likeStatus === 'Liked' || p.likeStatus === 'Matched')
      .map(p => p.id)
  ), [profiles]);

  const likeMutation = useMutation({
    mutationFn: (id: string) => matchesApi.like(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.browseProfiles });
      const previous = queryClient.getQueryData<Profile[]>(queryKeys.browseProfiles);
      queryClient.setQueryData<Profile[]>(queryKeys.browseProfiles, current =>
        (current ?? []).map(p => p.id === id ? { ...p, likeStatus: p.likeStatus === 'Matched' ? 'Matched' : 'Liked' } : p)
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.browseProfiles, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.browseProfiles }).catch(() => { });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches }).catch(() => { });
    },
  });

  useFocusEffect(useCallback(() => {
    if (isStale) {
      refetch().catch(() => { });
    }
  }, [isStale, refetch]));

  const handleLike = async (id: string) => {
    await likeMutation.mutateAsync(id);
  };

  return (
    <View className="flex-1 bg-black">
      <Text className="text-2xl font-bold text-[#ff6699] px-4 pb-4" style={{ paddingTop: insets.top + 12 }}>
        Discover 🐾
      </Text>
      <FlatList
        data={profiles}
        keyExtractor={p => p.id}
        refreshing={browseQuery.isRefetching && !browseQuery.isLoading}
        onRefresh={() => refetch().catch(() => { })}
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
              {!!p.compatibilityReasons?.length && (
                <Text className="text-[#ff6699]/70 text-xs mb-2">{p.compatibilityReasons[0]}</Text>
              )}
              <View className="flex-row flex-wrap gap-1 mb-3">
                {p.musicGenres.slice(0, 3).map(g => (
                  <View key={g} className="border border-[#ff6699]/30 px-2 py-1 rounded-full">
                    <Text className="text-[#ff6699]/70 text-xs">🎵 {g}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                className={`py-2 rounded-full items-center ${likedIds.has(p.id) ? 'bg-white/10' : 'bg-[#ff6699]'}`}
                onPress={() => handleLike(p.id)} disabled={likedIds.has(p.id)}>
                <Text className="text-white font-bold">{likedIds.has(p.id) ? '♥ Liked' : '♥ Like'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          browseQuery.isLoading ? (
            <Text className="text-white/30 px-4 text-sm">Loading profiles...</Text>
          ) : (
            <Text className="text-white/30 px-4 text-sm">No profiles right now. Pull to refresh.</Text>
          )
        }
      />
    </View>
  );
}
