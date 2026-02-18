"use client";
import { useEffect } from 'react';
import { matchesApi } from '@dating/api-client';
import { useMatchStore } from '@dating/store';
import Link from 'next/link';

export default function MatchesPage() {
  const { matches, setMatches } = useMatchStore();

  useEffect(() => {
    matchesApi.getMatches().then(setMatches);
  }, [setMatches]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-pink-400 mb-6">Your Matches 💖</h1>
      {matches.length === 0 && <p className="text-gray-500">No matches yet. Keep liking!</p>}
      <div className="flex flex-col gap-3">
        {matches.map(m => (
          <Link key={m.id} href={`/chat/${m.id}`}
            className="bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-pink-500 transition flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-2xl">🐾</div>
            <div>
              <p className="font-bold text-white">{m.otherProfile?.displayName ?? 'Match'}</p>
              <p className="text-gray-400 text-sm">{m.otherProfile?.animalType}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
