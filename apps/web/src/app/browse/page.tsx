"use client";
import { useEffect, useState } from 'react';
import { profilesApi, matchesApi } from '@dating/api-client';
import type { Profile } from '@dating/types';
import Image from 'next/image';
import Link from 'next/link';

export default function BrowsePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    profilesApi.suggest({}).then(data => {
      setProfiles(data);
      setLikedIds(new Set(
        data
          .filter(p => p.likeStatus === 'Liked' || p.likeStatus === 'Matched')
          .map(p => p.id)
      ));
      setMatchedIds(new Set(
        data
          .filter(p => p.likeStatus === 'Matched')
          .map(p => p.id)
      ));
    });
  }, []);

  const handleLike = async (profileId: string) => {
    const result = await matchesApi.like(profileId);
    setLikedIds(prev => new Set([...prev, profileId]));
    if (result.matched) setMatchedIds(prev => new Set([...prev, profileId]));
  };


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-pink-400 mb-6">Discover 🐾</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(p => (
          <div key={p.id} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-pink-500 transition">
            <Link href={`/profile/${p.id}`}>
              <div className="relative h-48 bg-gray-800 flex items-center justify-center">
                {p.animalAvatarUrl
                  ? <Image src={p.animalAvatarUrl} alt={p.animalType} fill className="object-cover" />
                  : <span className="text-6xl">🐾</span>}
              </div>
            </Link>
            <div className="p-4">
              <h3 className="font-bold text-white">{p.displayName}</h3>
              <p className="text-gray-400 text-sm">{p.animalType}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {p.musicGenres.slice(0, 3).map(g => (
                  <span key={g} className="bg-gray-800 text-pink-300 text-xs px-2 py-1 rounded-full">{g}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleLike(p.id)}
                  disabled={likedIds.has(p.id)}
                  className={`flex-1 py-2 rounded-full font-bold text-sm transition ${likedIds.has(p.id) ? 'bg-gray-700 text-gray-500' : 'bg-pink-500 hover:bg-pink-600 text-white'}`}>
                  {matchedIds.has(p.id) ? '💖 Matched!' : likedIds.has(p.id) ? '♥ Liked' : '♥ Like'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
