import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { profilesApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import {
  MUSIC_GENRES, HOBBY_OPTIONS, GENDER_OPTIONS, LOOKING_FOR_OPTIONS,
} from '@dating/types';
import type { Profile, Gender, LookingFor } from '@dating/types';

// ─── Pill toggle used in edit mode ───────────────────────────────────────────

function Pill({
  label, active, color = '#ff6699', onPress,
}: { label: string; active: boolean; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ backgroundColor: active ? color : 'transparent', borderColor: active ? color : 'rgba(255,255,255,0.15)' }}
      className="px-3 py-1.5 rounded-full border mr-2 mb-2"
    >
      <Text style={{ color: active ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: active ? '600' : '400' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-white/30 text-xs uppercase tracking-widest mb-3">{title}</Text>
      {children}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MyProfileScreen() {
  const { profile: storeProfile, setProfile } = useAuthStore();
  const [profile, setLocalProfile] = useState<Profile | null>(storeProfile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(!storeProfile);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [animalAvatarUrl, setAnimalAvatarUrl] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [lookingFor, setLookingFor] = useState<LookingFor | ''>('');
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [faith, setFaith] = useState('');
  const [political, setPolitical] = useState('');

  useEffect(() => {
    profilesApi.getMe()
      .then(p => {
        setLocalProfile(p);
        setProfile(p);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const startEdit = () => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setAnimalType(profile.animalType);
    setAnimalAvatarUrl(profile.animalAvatarUrl ?? '');
    setGender(profile.gender ?? '');
    setLookingFor(profile.lookingFor ?? '');
    setSelectedMusic(profile.musicGenres ?? []);
    setSelectedHobbies(profile.hobbies ?? []);
    setFaith(profile.faith ?? '');
    setPolitical(profile.politicalLeaning ?? '');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await profilesApi.update({
        displayName,
        animalType,
        animalAvatarUrl,
        gender: (gender || undefined) as Gender | undefined,
        lookingFor: (lookingFor || undefined) as LookingFor | undefined,
        musicGenres: selectedMusic,
        hobbies: selectedHobbies,
        faith: faith || undefined,
        politicalLeaning: political || undefined,
      });
      setLocalProfile(updated);
      setProfile(updated);
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (item: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => useAuthStore.getState().logout() },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#ff6699" />
      </View>
    );
  }

  if (!profile && !editing) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Text className="text-white/40 text-center mb-4">Couldn't load your profile.</Text>
        <TouchableOpacity onPress={() => setLoading(true)}>
          <Text className="text-[#ff6699]">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── View Mode ────────────────────────────────────────────────────────────────
  if (!editing && profile) {
    const accent = profile.layout?.accentColor ?? '#ff6699';

    return (
      <ScrollView className="flex-1 bg-black" contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header */}
        <View className="px-5 pt-14 pb-5 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-[#ff6699]">My Profile</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="border border-white/20 px-4 py-2 rounded-full"
              onPress={startEdit}
            >
              <Text className="text-white/60 text-sm">Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-white/10 px-4 py-2 rounded-full"
              onPress={handleLogout}
            >
              <Text className="text-white/30 text-sm">Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar & identity */}
        <View className="items-center px-5 mb-6">
          <View
            className="w-24 h-24 rounded overflow-hidden mb-3"
            style={{ borderWidth: 2, borderColor: accent }}
          >
            {profile.animalAvatarUrl ? (
              <Image source={{ uri: profile.animalAvatarUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="flex-1 bg-gray-800 items-center justify-center">
                <Text className="text-4xl">🐾</Text>
              </View>
            )}
          </View>
          <Text className="text-white text-xl font-bold font-mono">{profile.displayName}</Text>
          <Text className="text-white/40 text-sm font-mono capitalize mb-3">{profile.animalType}</Text>

          {/* Identity pills */}
          <View className="flex-row flex-wrap justify-center gap-2">
            {profile.gender && (
              <Text style={{ borderColor: accent, color: accent }} className="text-xs border px-3 py-1 rounded-full font-mono">
                {profile.gender}
              </Text>
            )}
            {profile.lookingFor && (
              <Text style={{ borderColor: accent, color: accent }} className="text-xs border px-3 py-1 rounded-full font-mono">
                Looking for: {profile.lookingFor}
              </Text>
            )}
            {profile.faith && (
              <Text className="text-xs border border-white/20 text-white/50 px-3 py-1 rounded-full font-mono">
                {profile.faith}
              </Text>
            )}
            {profile.politicalLeaning && (
              <Text className="text-xs border border-white/20 text-white/50 px-3 py-1 rounded-full font-mono">
                {profile.politicalLeaning}
              </Text>
            )}
          </View>
        </View>

        <View className="px-5 gap-5">
          {/* Music */}
          {profile.musicGenres.length > 0 && (
            <View>
              <Text className="text-white/30 text-xs uppercase tracking-widest mb-3">Music</Text>
              <View className="flex-row flex-wrap">
                {profile.musicGenres.map(g => (
                  <Text key={g} style={{ borderColor: accent, color: accent }} className="text-xs border px-3 py-1 rounded-full mr-2 mb-2 font-mono">
                    🎵 {g}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Hobbies */}
          {profile.hobbies.length > 0 && (
            <View>
              <Text className="text-white/30 text-xs uppercase tracking-widest mb-3">Hobbies</Text>
              <View className="flex-row flex-wrap">
                {profile.hobbies.map(h => (
                  <Text key={h} style={{ borderColor: accent, color: accent }} className="text-xs border px-3 py-1 rounded-full mr-2 mb-2 font-mono">
                    {h}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // ── Edit Mode ────────────────────────────────────────────────────────────────
  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 60 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-xl font-bold text-[#ff6699]">Edit Profile</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="border border-white/20 px-4 py-2 rounded-full"
            onPress={() => setEditing(false)}
          >
            <Text className="text-white/60 text-sm">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`bg-[#ff6699] px-4 py-2 rounded-full ${saving ? 'opacity-60' : ''}`}
            onPress={handleSave}
            disabled={saving}
          >
            <Text className="text-white text-sm font-bold">{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Section title="Identity">
        <TextInput
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
          placeholder="Display name"
          placeholderTextColor="#555"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-3"
          placeholder="Favorite animal"
          placeholderTextColor="#555"
          value={animalType}
          onChangeText={setAnimalType}
        />
        <TextInput
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          placeholder="Avatar image URL"
          placeholderTextColor="#555"
          value={animalAvatarUrl}
          onChangeText={setAnimalAvatarUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
      </Section>

      <Section title="I am a...">
        <View className="flex-row flex-wrap">
          {GENDER_OPTIONS.map(g => (
            <Pill key={g} label={g} active={gender === g} onPress={() => setGender(g)} />
          ))}
        </View>
      </Section>

      <Section title="Looking for...">
        <View className="flex-row flex-wrap">
          {LOOKING_FOR_OPTIONS.map(l => (
            <Pill key={l} label={l} active={lookingFor === l} color="#a855f7" onPress={() => setLookingFor(l)} />
          ))}
        </View>
      </Section>

      <Section title="Music">
        <View className="flex-row flex-wrap">
          {MUSIC_GENRES.map(g => (
            <Pill key={g} label={g} active={selectedMusic.includes(g)} onPress={() => toggle(g, selectedMusic, setSelectedMusic)} />
          ))}
        </View>
      </Section>

      <Section title="Hobbies">
        <View className="flex-row flex-wrap">
          {HOBBY_OPTIONS.map(h => (
            <Pill key={h} label={h} active={selectedHobbies.includes(h)} color="#a855f7" onPress={() => toggle(h, selectedHobbies, setSelectedHobbies)} />
          ))}
        </View>
      </Section>

      <Section title="Faith (optional)">
        <View className="flex-row flex-wrap">
          {['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Buddhist', 'Agnostic', 'Atheist', 'Spiritual'].map(f => (
            <Pill key={f} label={f} active={faith === f} onPress={() => setFaith(faith === f ? '' : f)} />
          ))}
        </View>
      </Section>

      <Section title="Politics (optional)">
        <View className="flex-row flex-wrap">
          {['Liberal', 'Progressive', 'Moderate', 'Conservative', 'Libertarian'].map(p => (
            <Pill key={p} label={p} active={political === p} onPress={() => setPolitical(political === p ? '' : p)} />
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}
