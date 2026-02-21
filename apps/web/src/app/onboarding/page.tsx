"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { profilesApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import { MUSIC_GENRES, HOBBY_OPTIONS, GENDER_OPTIONS, LOOKING_FOR_OPTIONS } from '@dating/types';
import type { Gender, LookingFor, ProfileLayout } from '@dating/types';

const defaultLayout: ProfileLayout = {
  theme: 'riot',
  accentColor: '#ff6699',
  widgets: [
    { id: '1', type: 'about', title: 'About Me', content: '', order: 0 },
    { id: '2', type: 'music', title: 'My Music', content: '', order: 1 },
  ],
};

export default function OnboardingPage() {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [animalAvatarUrl, setAnimalAvatarUrl] = useState('');
  const [selectedMusic, setSelectedMusic] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [faith, setFaith] = useState('');
  const [political, setPolitical] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [lookingFor, setLookingFor] = useState<LookingFor | ''>('');

  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleFinish = async () => {
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
        layout: defaultLayout,  // profilesApi will handle serialization
      });
      setProfile(profile);
      router.push('/browse');
    } catch (err: any) {
      console.error('Profile creation failed:', err.response?.data);
      alert(err.response?.data?.join('\n') ?? 'Failed to create profile');
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-lg">

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-pink-400">Welcome! Let's set up your profile</h2>
            <input className="bg-gray-800 p-3 rounded-lg text-white" placeholder="Display name"
              value={displayName} onChange={e => setDisplayName(e.target.value)} />
            <input className="bg-gray-800 p-3 rounded-lg text-white" placeholder="Favorite animal (e.g. red panda)"
              value={animalType} onChange={e => setAnimalType(e.target.value)} />
            <input className="bg-gray-800 p-3 rounded-lg text-white" placeholder="Animal avatar image URL (required)"
              value={animalAvatarUrl} onChange={e => setAnimalAvatarUrl(e.target.value)} />
            <p className="text-gray-400 text-sm">⬆ Upload to Cloudinary/Imgur first, then paste the URL here. Full upload UI coming soon!</p>
            <button className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold" onClick={() => setStep(2)}>Next →</button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-pink-400">About You</h2>

            <div>
              <p className="text-gray-400 text-sm mb-2">I am a...</p>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map(g => (
                  <button
                    key={g}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${gender === g
                        ? 'bg-pink-500 border-pink-500 text-white'
                        : 'border-gray-600 text-gray-400 hover:border-pink-400'
                      }`}
                    onClick={() => setGender(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-2">Looking for...</p>
              <div className="flex flex-wrap gap-2">
                {LOOKING_FOR_OPTIONS.map(l => (
                  <button
                    key={l}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${lookingFor === l
                        ? 'bg-purple-500 border-purple-500 text-white'
                        : 'border-gray-600 text-gray-400 hover:border-purple-400'
                      }`}
                    onClick={() => setLookingFor(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold disabled:opacity-40"
              disabled={!gender || !lookingFor}
              onClick={() => setStep(3)}
            >
              Next →
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-pink-400">Your Music Taste</h2>
            <div className="flex flex-wrap gap-2">
              {MUSIC_GENRES.map(g => (
                <button key={g}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${selectedMusic.includes(g) ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-600 text-gray-400 hover:border-pink-400'}`}
                  onClick={() => toggleItem(g, selectedMusic, setSelectedMusic)}>{g}</button>
              ))}
            </div>
            <button className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold" onClick={() => setStep(4)}>Next →</button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-pink-400">Your Hobbies</h2>
            <div className="flex flex-wrap gap-2">
              {HOBBY_OPTIONS.map(h => (
                <button key={h}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${selectedHobbies.includes(h) ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-600 text-gray-400 hover:border-purple-400'}`}
                  onClick={() => toggleItem(h, selectedHobbies, setSelectedHobbies)}>{h}</button>
              ))}
            </div>
            <button className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold" onClick={() => setStep(5)}>Next →</button>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-pink-400">Optional: Faith & Politics</h2>
            <p className="text-gray-400 text-sm">These are optional but help find compatible matches.</p>
            <select className="bg-gray-800 p-3 rounded-lg text-white" value={faith} onChange={e => setFaith(e.target.value)}>
              <option value="">Faith (prefer not to say)</option>
              <option>Christian</option><option>Catholic</option><option>Jewish</option>
              <option>Muslim</option><option>Hindu</option><option>Buddhist</option>
              <option>Agnostic</option><option>Atheist</option><option>Spiritual</option>
            </select>
            <select className="bg-gray-800 p-3 rounded-lg text-white" value={political} onChange={e => setPolitical(e.target.value)}>
              <option value="">Politics (prefer not to say)</option>
              <option>Liberal</option><option>Progressive</option><option>Moderate</option>
              <option>Conservative</option><option>Libertarian</option>
            </select>
            <button className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-lg font-bold" onClick={handleFinish}>
              Finish & Find Matches 🐾
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
