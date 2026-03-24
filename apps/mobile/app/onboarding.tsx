import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { profilesApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import {
  MUSIC_GENRES, HOBBY_OPTIONS, GENDER_OPTIONS, LOOKING_FOR_OPTIONS,
} from '@dating/types';
import type { Gender, LookingFor, ProfileLayout } from '@dating/types';

const TOTAL_STEPS = 5;

const defaultLayout: ProfileLayout = {
  theme: 'riot',
  accentColor: '#ff6699',
  widgets: [
    { id: '1', type: 'about', title: 'About Me', content: '', order: 0 },
    { id: '2', type: 'music', title: 'My Music', content: '', order: 1 },
  ],
};

function PillButton({
  label, active, onPress, color = '#ff6699',
}: { label: string; active: boolean; onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full border mr-2 mb-2 ${active ? 'bg-[#ff6699] border-[#ff6699]' : 'border-white/20'}`}
      style={active ? {} : {}}
    >
      <Text className={active ? 'text-white font-semibold text-sm' : 'text-white/50 text-sm'}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const setProfile = useAuthStore(s => s.setProfile);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [displayName, setDisplayName] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [animalAvatarUrl, setAnimalAvatarUrl] = useState('');

  // Step 2
  const [gender, setGender] = useState<Gender | ''>('');
  const [lookingFor, setLookingFor] = useState<LookingFor | ''>('');

  // Step 3
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);

  // Step 4
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);

  // Step 5
  const [faith, setFaith] = useState('');
  const [political, setPolitical] = useState('');

  const toggle = (item: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const profile = await profilesApi.create({
        displayName,
        animalType,
        animalAvatarUrl,
        gender: gender as Gender,
        lookingFor: lookingFor as LookingFor,
        musicGenres: selectedMusic,
        hobbies: selectedHobbies,
        faith: faith || undefined,
        politicalLeaning: political || undefined,
        layout: defaultLayout,
      });
      setProfile(profile);
      router.replace('/(tabs)/browse');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      const msg = Array.isArray(data) ? data.join('\n') : 'Failed to create profile. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: i < step ? '#ff6699' : 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </View>
        <Text className="text-white/30 text-xs mt-2">Step {step} of {TOTAL_STEPS}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 8, paddingBottom: 48 }}>

        {/* ── Step 1: Identity ── */}
        {step === 1 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-[#ff6699] mb-1">Welcome to masquerade!</Text>
              <Text className="text-white/40 text-sm">Let's set up your profile</Text>
            </View>
            <TextInput
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              placeholder="Display name"
              placeholderTextColor="#555"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TextInput
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              placeholder="Favorite animal (e.g. red panda)"
              placeholderTextColor="#555"
              value={animalType}
              onChangeText={setAnimalType}
            />
            <View>
              <TextInput
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                placeholder="Animal avatar image URL"
                placeholderTextColor="#555"
                value={animalAvatarUrl}
                onChangeText={setAnimalAvatarUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text className="text-white/30 text-xs mt-1 px-1">
                Upload to Cloudinary or Imgur first, then paste the URL here
              </Text>
            </View>
            <TouchableOpacity
              className={`bg-[#ff6699] py-4 rounded-full items-center ${!displayName || !animalType ? 'opacity-40' : ''}`}
              disabled={!displayName || !animalType}
              onPress={() => setStep(2)}
            >
              <Text className="text-white font-bold">Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: About You ── */}
        {step === 2 && (
          <View className="gap-6">
            <Text className="text-2xl font-bold text-[#ff6699]">About you</Text>

            <View>
              <Text className="text-white/40 text-sm mb-3">I am a...</Text>
              <View className="flex-row flex-wrap">
                {GENDER_OPTIONS.map(g => (
                  <PillButton
                    key={g} label={g}
                    active={gender === g}
                    onPress={() => setGender(g)}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text className="text-white/40 text-sm mb-3">Looking for...</Text>
              <View className="flex-row flex-wrap">
                {LOOKING_FOR_OPTIONS.map(l => (
                  <TouchableOpacity
                    key={l}
                    onPress={() => setLookingFor(l)}
                    className={`px-4 py-2 rounded-full border mr-2 mb-2 ${lookingFor === l ? 'bg-purple-500 border-purple-500' : 'border-white/20'}`}
                  >
                    <Text className={lookingFor === l ? 'text-white font-semibold text-sm' : 'text-white/50 text-sm'}>
                      {l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              className={`bg-[#ff6699] py-4 rounded-full items-center ${!gender || !lookingFor ? 'opacity-40' : ''}`}
              disabled={!gender || !lookingFor}
              onPress={() => setStep(3)}
            >
              <Text className="text-white font-bold">Next →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(1)}>
              <Text className="text-white/30 text-center text-sm">← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Music ── */}
        {step === 3 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-[#ff6699] mb-1">Your Music Taste</Text>
              <Text className="text-white/40 text-sm">Pick as many as you like</Text>
            </View>
            <View className="flex-row flex-wrap">
              {MUSIC_GENRES.map(g => (
                <PillButton
                  key={g} label={g}
                  active={selectedMusic.includes(g)}
                  onPress={() => toggle(g, selectedMusic, setSelectedMusic)}
                />
              ))}
            </View>
            <TouchableOpacity
              className="bg-[#ff6699] py-4 rounded-full items-center"
              onPress={() => setStep(4)}
            >
              <Text className="text-white font-bold">Next →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(2)}>
              <Text className="text-white/30 text-center text-sm">← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 4: Hobbies ── */}
        {step === 4 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-[#ff6699] mb-1">Your Hobbies</Text>
              <Text className="text-white/40 text-sm">Pick as many as you like</Text>
            </View>
            <View className="flex-row flex-wrap">
              {HOBBY_OPTIONS.map(h => (
                <TouchableOpacity
                  key={h}
                  onPress={() => toggle(h, selectedHobbies, setSelectedHobbies)}
                  className={`px-4 py-2 rounded-full border mr-2 mb-2 ${selectedHobbies.includes(h) ? 'bg-purple-500 border-purple-500' : 'border-white/20'}`}
                >
                  <Text className={selectedHobbies.includes(h) ? 'text-white font-semibold text-sm' : 'text-white/50 text-sm'}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              className="bg-[#ff6699] py-4 rounded-full items-center"
              onPress={() => setStep(5)}
            >
              <Text className="text-white font-bold">Next →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(3)}>
              <Text className="text-white/30 text-center text-sm">← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 5: Faith & Politics ── */}
        {step === 5 && (
          <View className="gap-5">
            <View>
              <Text className="text-2xl font-bold text-[#ff6699] mb-1">Optional Details</Text>
              <Text className="text-white/40 text-sm">These help find compatible matches. Skip if you prefer.</Text>
            </View>

            <View>
              <Text className="text-white/40 text-xs uppercase tracking-widest mb-2">Faith</Text>
              <View className="flex-row flex-wrap">
                {['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Buddhist', 'Agnostic', 'Atheist', 'Spiritual'].map(f => (
                  <PillButton
                    key={f} label={f}
                    active={faith === f}
                    onPress={() => setFaith(faith === f ? '' : f)}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text className="text-white/40 text-xs uppercase tracking-widest mb-2">Politics</Text>
              <View className="flex-row flex-wrap">
                {['Liberal', 'Progressive', 'Moderate', 'Conservative', 'Libertarian'].map(p => (
                  <PillButton
                    key={p} label={p}
                    active={political === p}
                    onPress={() => setPolitical(political === p ? '' : p)}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              className={`bg-[#ff6699] py-4 rounded-full items-center mt-2 ${loading ? 'opacity-60' : ''}`}
              onPress={handleFinish}
              disabled={loading}
            >
              <Text className="text-white font-bold text-base">
                {loading ? 'Setting up...' : 'Finish & Find Matches 🐾'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(4)}>
              <Text className="text-white/30 text-center text-sm">← Back</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
