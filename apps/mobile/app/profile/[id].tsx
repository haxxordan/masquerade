import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { profilesApi, matchesApi } from '@dating/api-client';
import { useMatchStore } from '@dating/store';
import type { Profile } from '@dating/types';
import type { ReportReason } from '@dating/api-client';

const REPORT_REASONS: ReportReason[] = ['Spam', 'Harassment', 'FakeProfile', 'Other'];

export default function ProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { matches } = useMatchStore();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [liked, setLiked] = useState(false);
    const [matched, setMatched] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const [reported, setReported] = useState(false);

    // Report panel state
    const [showReportPanel, setShowReportPanel] = useState(false);
    const [reportReason, setReportReason] = useState<ReportReason | null>(null);
    const [reportDetails, setReportDetails] = useState('');
    const [reporting, setReporting] = useState(false);

    useEffect(() => {
        profilesApi.get(id).then(p => {
            setProfile(p);
            setLiked(p.likeStatus === 'Liked' || p.likeStatus === 'Matched');
            setMatched(p.likeStatus === 'Matched');
        }).catch(() => { });
    }, [id]);

    // Find existing match ID if matched
    const matchId = matched
        ? matches.find(m => m.otherProfile?.id === profile?.id)?.id ?? null
        : null;

    if (!profile) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator color="#ff6699" />
            </View>
        );
    }

    const handleLike = async () => {
        if (liked) {
            // Unlike / unmatch
            Alert.alert(
                matched ? '💔 Unmatch?' : '👋 Remove like?',
                matched
                    ? 'This will delete your conversation with ' + profile.displayName + '.'
                    : 'Remove your like from ' + profile.displayName + '?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: matched ? 'Unmatch' : 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await matchesApi.unlike(profile.id);
                                setLiked(false);
                                setMatched(false);
                            } catch { }
                        },
                    },
                ]
            );
        } else {
            const result = await matchesApi.like(profile.id);
            setLiked(true);
            if (result.matched) setMatched(true);
        }
    };

    const handleBlock = () => {
        Alert.alert('Block ' + profile.displayName + '?', 'They won\'t be able to see your profile.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Block',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await profilesApi.block(profile.userId);
                        setBlocked(true);
                    } catch { }
                },
            },
        ]);
    };

    const handleReport = async () => {
        if (!reportReason) return;
        setReporting(true);
        try {
            await profilesApi.report(profile.userId, reportReason, reportDetails || undefined);
            setReported(true);
            setShowReportPanel(false);
        } catch {
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        } finally {
            setReporting(false);
        }
    };

    return (
        <View className="flex-1 bg-black">
            {/* Header */}
            <View className="px-5 pt-14 pb-3 flex-row items-center justify-between border-b border-white/10">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-white/50 text-sm">← back</Text>
                </TouchableOpacity>
                <View className="flex-row gap-3">
                    {reported && (
                        <Text className="text-orange-400 text-xs border border-orange-400/40 px-3 py-1 rounded-full">reported</Text>
                    )}
                    {blocked && (
                        <Text className="text-red-400 text-xs border border-red-400/40 px-3 py-1 rounded-full">blocked</Text>
                    )}
                    {!blocked && !reported && (
                        <>
                            <TouchableOpacity
                                onPress={() => setShowReportPanel(v => !v)}
                                className="border border-white/10 px-3 py-1 rounded-full"
                            >
                                <Text className="text-white/30 text-xs">report</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleBlock}
                                className="border border-white/10 px-3 py-1 rounded-full"
                            >
                                <Text className="text-white/30 text-xs">block</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                {/* Avatar & identity */}
                <View className="items-center gap-2">
                    {profile.animalAvatarUrl ? (
                        <Image
                            source={{ uri: profile.animalAvatarUrl }}
                            className="w-24 h-24 rounded"
                            style={{ borderWidth: 2, borderColor: '#ff6699' }}
                        />
                    ) : (
                        <Text className="text-6xl">🐾</Text>
                    )}
                    <Text className="text-white text-xl font-bold font-mono">{profile.displayName}</Text>
                    <Text className="text-white/40 text-sm font-mono capitalize">{profile.animalType}</Text>

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

                {/* Compatibility reasons */}
                {!!profile.compatibilityReasons?.length && (
                    <View className="gap-1">
                        <Text className="text-white/30 text-xs font-mono uppercase tracking-widest">Why you match</Text>
                        {profile.compatibilityReasons.map((r, i) => (
                            <Text key={i} className="text-[#ff6699] text-xs font-mono">✦ {r}</Text>
                        ))}
                    </View>
                )}

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

                {/* Report panel */}
                {showReportPanel && (
                    <View className="border border-orange-500/30 bg-orange-500/10 rounded-xl p-4 gap-3">
                        <Text className="text-orange-300 text-sm font-bold">Report {profile.displayName}</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {REPORT_REASONS.map(r => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => setReportReason(r)}
                                    className={`px-3 py-1.5 rounded-full border ${reportReason === r ? 'bg-orange-500 border-orange-500' : 'border-orange-500/40'}`}
                                >
                                    <Text className={`text-xs ${reportReason === r ? 'text-white font-bold' : 'text-orange-300'}`}>
                                        {r}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                            placeholder="Additional details (optional)"
                            placeholderTextColor="#86653a"
                            value={reportDetails}
                            onChangeText={setReportDetails}
                            multiline
                            numberOfLines={2}
                        />
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => { setShowReportPanel(false); setReportReason(null); setReportDetails(''); }}
                                className="flex-1 border border-white/10 py-2 rounded-full items-center"
                            >
                                <Text className="text-white/40 text-sm">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleReport}
                                disabled={!reportReason || reporting}
                                className={`flex-1 bg-orange-500 py-2 rounded-full items-center ${(!reportReason || reporting) ? 'opacity-50' : ''}`}
                            >
                                <Text className="text-white font-bold text-sm">
                                    {reporting ? 'Submitting...' : 'Submit Report'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Action buttons */}
                <View className="gap-3 mt-2">
                    {/* Messages button (if matched) */}
                    {matched && matchId && (
                        <TouchableOpacity
                            onPress={() => router.push(`/chat/${matchId}`)}
                            className="border border-[#ff6699] py-3 rounded-full items-center"
                        >
                            <Text className="text-[#ff6699] font-bold font-mono text-sm">💬 messages</Text>
                        </TouchableOpacity>
                    )}

                    {/* Like / Liked / Matched / Unlike */}
                    {!blocked && (
                        <TouchableOpacity
                            onPress={handleLike}
                            className={`py-3 rounded-full items-center ${matched ? 'bg-[#ff6699]' : liked ? 'bg-white/10' : 'bg-[#ff6699]'}`}
                        >
                            <Text className={`font-bold font-mono text-sm ${matched ? 'text-black' : liked ? 'text-white/40' : 'text-black'}`}>
                                {matched ? '💖 Matched!' : liked ? '♥ Unlike' : '♥ Like'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}