import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { profilesApi, matchesApi } from '@dating/api-client';
import type { Profile } from '@dating/types';

export default function ProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [liked, setLiked] = useState(false);
    const [matched, setMatched] = useState(false);

    useEffect(() => {
        profilesApi.get(id).then(p => {
            setProfile(p);
            setLiked(p.likeStatus === 'Liked' || p.likeStatus === 'Matched');
            setMatched(p.likeStatus === 'Matched');
        });
    }, [id]);

    if (!profile) return (
        <View className="flex-1 bg-black items-center justify-center">
            <ActivityIndicator color="#ff6699" />
        </View>
    );

    const handleLike = async () => {
        const result = await matchesApi.like(profile.id);
        setLiked(true);
        if (result.matched) setMatched(true);
    };

    return (
        <View className="flex-1 bg-black">
            {/* Header */}
            <View className="px-5 pt-14 pb-3 flex-row items-center gap-3 border-b border-white/10">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-white/60 text-sm">← back</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                {/* Avatar & identity */}
                <View className="items-center gap-2">
                    {profile.animalAvatarUrl ? (
                        <Image
                            source={{ uri: profile.animalAvatarUrl }}
                            className="w-24 h-24 rounded border-2 border-[#ff6699]"
                        />
                    ) : (
                        <Text className="text-6xl">🐾</Text>
                    )}
                    <Text className="text-white text-xl font-bold font-mono">{profile.displayName}</Text>
                    <Text className="text-white/40 text-sm font-mono capitalize">{profile.animalType}</Text>

                    {/* Pills */}
                    <View className="flex-row flex-wrap gap-2 justify-center">
                        {profile.gender && (
                            <Text className="text-xs border border-[#ff6699] text-[#ff6699] px-3 py-1 rounded-full font-mono">
                                {profile.gender}
                            </Text>
                        )}
                        {profile.lookingFor && (
                            <Text className="text-xs border border-[#ff6699] text-[#ff6699] px-3 py-1 rounded-full font-mono">
                                Looking for: {profile.lookingFor}
                            </Text>
                        )}
                        {profile.faith && (
                            <Text className="text-xs border border-white/20 text-white/60 px-3 py-1 rounded-full font-mono">
                                {profile.faith}
                            </Text>
                        )}
                        {profile.politicalLeaning && (
                            <Text className="text-xs border border-white/20 text-white/60 px-3 py-1 rounded-full font-mono">
                                {profile.politicalLeaning}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Music genres */}
                {profile.musicGenres.length > 0 && (
                    <View className="gap-2">
                        <Text className="text-white/40 text-xs font-mono uppercase tracking-widest">Music</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {profile.musicGenres.map(g => (
                                <Text key={g} className="text-xs border border-white/20 text-white/60 px-3 py-1 rounded-full font-mono">
                                    🎵 {g}
                                </Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Hobbies */}
                {profile.hobbies.length > 0 && (
                    <View className="gap-2">
                        <Text className="text-white/40 text-xs font-mono uppercase tracking-widest">Hobbies</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {profile.hobbies.map(h => (
                                <Text key={h} className="text-xs border border-white/20 text-white/60 px-3 py-1 rounded-full font-mono">
                                    {h}
                                </Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Like button */}
                <TouchableOpacity
                    onPress={handleLike}
                    disabled={liked}
                    className={`py-3 rounded-full items-center ${liked ? 'bg-white/10' : 'bg-[#ff6699]'}`}
                >
                    <Text className={`font-bold font-mono text-sm ${liked ? 'text-white/40' : 'text-black'}`}>
                        {matched ? '💖 Matched!' : liked ? '♥ Liked' : '♥ Like'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}