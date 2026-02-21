"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { profilesApi, matchesApi } from '@dating/api-client';
import type { Profile, LookingFor } from '@dating/types';
import Image from 'next/image';
import Link from 'next/link';

import { Lobster } from 'next/font/google';
import { UnlikeModal } from '@/components/UnlikeModal';
import { useMatchStore } from '@dating/store';

const lobster = Lobster({ weight: '400', subsets: ['latin'] });

export default function BrowsePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [myLookingFor, setMyLookingFor] = useState<LookingFor | undefined>(undefined);
  const [ready, setReady] = useState(false); // gate fetchPage until we have the user's profile
  const { matches, removeMatch } = useMatchStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 12;
  const [modalProfileId, setModalProfileId] = useState<string | null>(null);
  const modalProfile = profiles.find(p => p.id === modalProfileId) ?? null;

  const fetchPage = useCallback(async (pageNum: number) => {
    const data = await profilesApi.suggest({ lookingFor: myLookingFor, page: pageNum, pageSize: PAGE_SIZE });
    setProfiles(prev => pageNum === 0 ? data : [...prev, ...data]);
    setLikedIds(prev => new Set([
      ...prev,
      ...data.filter(p => p.likeStatus === 'Liked' || p.likeStatus === 'Matched').map(p => p.id)
    ]));
    setMatchedIds(prev => new Set([
      ...prev,
      ...data.filter(p => p.likeStatus === 'Matched').map(p => p.id)
    ]));
    setHasMore(data.length === PAGE_SIZE);
  }, [myLookingFor]);

  // Initial load
  useEffect(() => {
    profilesApi.getMe()
      .then((me: Profile) => setMyLookingFor(me.lookingFor))
      .catch(() => setMyLookingFor(undefined))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchPage(0).finally(() => setLoading(false));
  }, [ready]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          setPage(prev => {
            const next = prev + 1;
            fetchPage(next).finally(() => setLoadingMore(false));
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, fetchPage]);

  const handleLike = async (profileId: string) => {
    const result = await matchesApi.like(profileId);
    setLikedIds(prev => new Set([...prev, profileId]));
    if (result.matched) setMatchedIds(prev => new Set([...prev, profileId]));
  };

  const handleUnlike = async (profileId: string) => {
    await matchesApi.unlike(profileId);
    setLikedIds(prev => { const s = new Set(prev); s.delete(profileId); return s; });
    setMatchedIds(prev => { const s = new Set(prev); s.delete(profileId); return s; });
    setModalProfileId(null);

    // Sync match store if they were matched
    const unlikedProfile = profiles.find(p => p.id === profileId);
    const match = matches.find(m =>
      m.user1Id === unlikedProfile?.userId || m.user2Id === unlikedProfile?.userId
    );
    if (match) removeMatch(match.id);
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono px-6 py-10">
      <h1 className={`${lobster.className} text-4xl text-center mb-2`} style={{ color: '#ff6699' }}>
        ballroom 🪩
      </h1>
      <p className="text-center text-xs opacity-40 mb-10">Find people who share your interests</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="col-span-full text-center text-xs opacity-30 py-20">
            finding your people...
          </div>
        ) : profiles.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-3 py-20 opacity-40">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">no profiles to show right now</p>
            <p className="text-xs opacity-60">check back later or adjust your filters</p>
          </div>
        ) : (
          profiles.map(p => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="aspect-square relative bg-white/5">
                {p.animalAvatarUrl
                  ? <Image src={p.animalAvatarUrl} alt={p.animalType} fill className="object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-5xl">🐾</div>}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div>
                  <div className="font-bold text-sm">{p.displayName}</div>
                  <div className="text-xs opacity-40 capitalize">{p.animalType}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.musicGenres.slice(0, 3).map(g => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full border border-[#ff6699] bg-white/10 opacity-70">
                      {g}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <Link
                    href={`/profile/${p.id}`}
                    className="flex-1 py-2 rounded-full text-sm text-center border border-white/20 hover:border-[#ff6699] hover:text-[#ff6699] transition opacity-60 hover:opacity-100"
                  >
                    view
                  </Link>
                  <button
                    onClick={() => likedIds.has(p.id) ? setModalProfileId(p.id) : handleLike(p.id)}
                    className={`flex-1 py-2 rounded-full font-bold text-sm transition ${likedIds.has(p.id) ? 'bg-gray-700 text-gray-500 hover:bg-red-900/50 hover:text-red-400' : 'bg-pink-500 hover:bg-pink-600 text-white'
                      }`}
                  >
                    {matchedIds.has(p.id) ? '💖 Matched!' : likedIds.has(p.id) ? '♥ Liked' : '♥ Like'}
                  </button>

                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Infinite scroll sentinel */}
      {!loading && (
        <div ref={bottomRef} className="flex justify-center py-8">
          {loadingMore && <span className="text-xs opacity-30">loading more...</span>}
          {!hasMore && profiles.length > 0 && (
            <span className="text-xs opacity-40">you've seen everyone 🐾</span>
          )}
        </div>
      )}

      <UnlikeModal
        isOpen={!!modalProfileId}
        matched={!!modalProfile && matchedIds.has(modalProfile.id)}
        displayName={modalProfile?.displayName ?? ''}
        onConfirm={() => modalProfile && handleUnlike(modalProfile.id)}
        onCancel={() => setModalProfileId(null)}
      />

    </div>
  );
}
