import { profilesApi, createApiClient } from '@dating/api-client';
import { type ProfileLayout } from '@dating/types';
import Image from 'next/image';

createApiClient(process.env.NEXT_PUBLIC_API_URL!);

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const profile = await profilesApi.get(params.id);
  const layout = profile.layout;

  const themeClasses: Record<string, string> = {
    dark: 'bg-black text-white',
    retro: 'bg-[#000033] text-[#ff99ff]',
    ocean: 'bg-[#001133] text-[#99ccff]',
    forest: 'bg-[#0a1a0a] text-[#99ff99]',
  };

  return (
    <div className={`min-h-screen p-6 ${themeClasses[layout.theme] ?? themeClasses.dark}`}>
      <div className="max-w-2xl mx-auto">
        {/* Animal avatar hero */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 mb-4"
            style={{ borderColor: layout.accentColor }}>
            {profile.animalAvatarUrl
              ? <Image src={profile.animalAvatarUrl} alt={profile.animalType} fill className="object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-6xl bg-gray-900">🐾</div>}
          </div>
          <h1 className="text-3xl font-bold">{profile.displayName}</h1>
          <p className="opacity-60">{profile.animalType}</p>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {profile.musicGenres.map(g => (
            <span key={g} className="px-3 py-1 rounded-full text-sm font-semibold border"
              style={{ borderColor: layout.accentColor, color: layout.accentColor }}>
              🎵 {g}
            </span>
          ))}
          {profile.hobbies.map(h => (
            <span key={h} className="px-3 py-1 rounded-full text-sm font-semibold border border-purple-500 text-purple-400">
              {h}
            </span>
          ))}
        </div>

        {/* Widgets (Myspace-style layout blocks) */}
        {layout.widgets.sort((a, b) => a.order - b.order).map(widget => (
          <div key={widget.id} className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
            <h2 className="font-bold mb-2" style={{ color: layout.accentColor }}>{widget.title}</h2>
            <p className="opacity-80 whitespace-pre-wrap">{widget.content || 'Nothing here yet...'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
