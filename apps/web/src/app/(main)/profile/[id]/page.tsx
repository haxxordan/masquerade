"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { profilesApi, matchesApi } from '@dating/api-client';
import type { Profile } from '@dating/types';
import { WidgetPanel } from '@/components/profile';
import { UnlikeModal } from '@/components/UnlikeModal';
import { useMatchStore } from '@dating/store';

// ─── Constants (same as my-profile) ──────────────────────────────────────────

const themeClasses: Record<string, string> = {
  riot: 'bg-black text-white',
  jupiter: 'bg-[#000033] text-[#ff99ff]',
  ocean: 'bg-[#001133] text-[#99ccff]',
  sparrow: 'bg-[#0a1a0a] text-[#99ff99]',
};

// ─── Read-only widget renderers ───────────────────────────────────────────────

function ProfileWidget({
  widget,
  profile,
  accentColor,
}: {
  widget: Profile['layout']['widgets'][number];
  profile: Profile;
  accentColor: string;
}) {
  const pill = (label: string, prefix = '') => (
    <span
      key={label}
      className="px-2 py-0.5 rounded-full text-xs border"
      style={{ borderColor: accentColor, color: accentColor }}
    >
      {prefix}{label}
    </span>
  );

  switch (widget.type) {
    case 'about':
      return (
        <WidgetPanel title={widget.title || 'About Me'} accentColor={accentColor}>
          <p className="whitespace-pre-wrap leading-relaxed">
            {widget.content || <span className="opacity-40 italic">Nothing here yet...</span>}
          </p>
        </WidgetPanel>
      );

    case 'music':
      return (
        <WidgetPanel title={widget.title || 'Music'} accentColor={accentColor}>
          {profile.musicGenres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {profile.musicGenres.map(g => pill(g, '🎵 '))}
            </div>
          )}
          {widget.content && (
            <p className="whitespace-pre-wrap leading-relaxed opacity-80">{widget.content}</p>
          )}
        </WidgetPanel>
      );

    case 'hobbies':
      return (
        <WidgetPanel title={widget.title || 'Hobbies & Interests'} accentColor={accentColor}>
          {profile.hobbies.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {profile.hobbies.map(h => pill(h))}
            </div>
          )}
          {widget.content && (
            <p className="whitespace-pre-wrap leading-relaxed opacity-80">{widget.content}</p>
          )}
        </WidgetPanel>
      );

    case 'top8':
      return (
        <WidgetPanel title={widget.title || 'Top 8'} accentColor={accentColor}>
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: 'Luna', animal: 'Snow Leopard', emoji: '🐆' },
              { name: 'Cosmo', animal: 'Red Panda', emoji: '🦊' },
              { name: 'Ripple', animal: 'Axolotl', emoji: '🦎' },
              { name: 'Dusk', animal: 'Fennec Fox', emoji: '🦊' },
              { name: 'Orbit', animal: 'Capybara', emoji: '🐾' },
              { name: 'Fable', animal: 'Quokka', emoji: '🦘' },
              { name: 'Zephyr', animal: 'Clouded Leopard', emoji: '🐱' },
              { name: 'Mochi', animal: 'Pygmy Slow Loris', emoji: '🐒' },
            ].map(p => (
              <div key={p.name} className="flex flex-col items-center text-center gap-1">
                <div
                  className="w-12 h-12 rounded flex items-center justify-center text-2xl border"
                  style={{ borderColor: accentColor }}
                >
                  {p.emoji}
                </div>
                <span className="text-xs font-semibold">{p.name}</span>
                <span className="text-[10px] opacity-50">{p.animal}</span>
              </div>
            ))}
          </div>
        </WidgetPanel>
      );

    case 'blog':
      return (
        <WidgetPanel title={widget.title || 'Blog'} accentColor={accentColor}>
          <p className="whitespace-pre-wrap leading-relaxed">
            {widget.content || <span className="opacity-40 italic">No entries yet...</span>}
          </p>
        </WidgetPanel>
      );

    default:
      return null;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [liked, setLiked] = useState(false);
  const [matched, setMatched] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { matches, removeMatch } = useMatchStore();

  useEffect(() => {
    profilesApi.get(id).then(p => {
      console.log('likeStatus:', p.likeStatus);
      console.log('liked will be:', p.likeStatus === 'Liked');
      console.log('matched will be:', p.likeStatus === 'Matched');
      setProfile(p);
      setLiked(p.likeStatus === 'Liked' || p.likeStatus === 'Matched');
      setMatched(p.likeStatus === 'Matched');
    }).catch(err => console.error('Failed to load profile:', err));
  }, [id]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white opacity-50">
        Loading...
      </div>
    );
  }

  const layout = profile.layout;
  const themeClass = themeClasses[layout.theme] ?? themeClasses.riot;
  const sortedWidgets = [...layout.widgets].sort((a, b) => a.order - b.order);

  const handleLike = async () => {
    const result = await matchesApi.like(profile.id);
    setLiked(true);
    if (result.matched) setMatched(true);
  };

  const handleUnlike = async () => {

    await matchesApi.unlike(profile.id);

    const match = matches.find(m =>
      m.user1Id === profile.userId || m.user2Id === profile.userId
    );
    if (match) removeMatch(match.id);

    setLiked(false);
    setMatched(false);
    setModalOpen(false);
  };

  return (
    <div className={`min-h-screen ${themeClass} font-mono`}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Back link ── */}
        <Link
          href="/browse"
          className="text-xs opacity-40 hover:opacity-80 transition mb-6 inline-block"
          style={{ color: layout.accentColor }}
        >
          ← back to browse
        </Link>

        {/* ── Avatar & identity ── */}
        <div className="flex items-center gap-5 mb-8">
          <div
            className="w-20 h-20 rounded border-2 overflow-hidden flex items-center justify-center text-4xl flex-shrink-0"
            style={{ borderColor: layout.accentColor }}
          >
            {profile.animalAvatarUrl ? (
              <Image
                src={profile.animalAvatarUrl}
                alt={profile.displayName}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : '🐾'}
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold">{profile.displayName}</div>
            <div className="text-sm opacity-60 capitalize">{profile.animalType}</div>
            {profile.faith && <div className="text-xs opacity-40 mt-0.5">{profile.faith}</div>}
            {profile.politicalLeaning && <div className="text-xs opacity-40">{profile.politicalLeaning}</div>}
          </div>

          {/* ── Like button ── */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => liked ? setModalOpen(true) : handleLike()}
              className={`px-6 py-2 rounded-full font-bold text-sm transition ${liked ? 'bg-gray-700 text-gray-500 hover:bg-red-900/50 hover:text-red-400' : 'bg-pink-500 hover:bg-pink-600 text-white'
                }`}
            >
              {matched ? '💖 Matched!' : liked ? '♥ Liked' : '♥ Like'}
            </button>

            {matched && (() => {
              const match = matches.find(m =>
                m.user1Id === profile.userId || m.user2Id === profile.userId
              );
              return match ? (
                <Link
                  href={`/matches?matchId=${match.id}`}
                  className="px-6 py-2 rounded-full text-sm font-bold border border-[#ff6699] text-[#ff6699] hover:bg-[#ff6699] hover:text-black transition"
                >
                  💬 messages
                </Link>
              ) : null;
            })()}
          </div>

        </div>

        {/* ── Widgets ── */}
        {sortedWidgets.map(widget => (
          <ProfileWidget
            key={widget.id}
            widget={widget}
            profile={profile}
            accentColor={layout.accentColor}
          />
        ))}

      </div>
      <UnlikeModal
        isOpen={modalOpen}
        matched={matched}
        displayName={profile.displayName}
        onConfirm={handleUnlike}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}