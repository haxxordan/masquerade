"use client";

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { matchesApi } from '@dating/api-client';
import { useMatchStore } from '@dating/store';
import { useAuthStore } from '@dating/store';
import type { Match, Message } from '@dating/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isMe }: { message: Message; isMe: boolean }) {
    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isMe
                    ? 'rounded-br-sm bg-[#ff6699] text-black'
                    : 'rounded-bl-sm bg-white/10 text-white'
                    }`}
            >
                {message.content}
            </div>
        </div>
    );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
    match,
    active,
    onClick,
}: {
    match: Match;
    active: boolean;
    onClick: () => void;
}) {
    const other = match.otherProfile;

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-white/5 hover:bg-white/5 ${active ? 'bg-white/10' : ''
                }`}
        >
            <div className="w-10 h-10 rounded border border-[#ff6699] overflow-hidden flex items-center justify-center text-xl flex-shrink-0">
                {other?.animalAvatarUrl ? (
                    <Image
                        src={other.animalAvatarUrl}
                        alt={other.displayName}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                    />
                ) : '🐾'}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{other?.displayName ?? 'Unknown'}</div>
                <div className="text-xs opacity-40 capitalize truncate">{other?.animalType ?? ''}</div>
            </div>
        </button>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function MatchesContent() {
    const { userId } = useAuthStore();
    const {
        matches, activeMatchId,
        setMatches, setActiveMatch,
        messages, setMessages, addMessage,
        markRead
    } = useMatchStore();

    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const searchParams = useSearchParams();

    // Auto-select match from query param
    useEffect(() => {
        const matchIdParam = searchParams.get('matchId');
        if (matchIdParam && matches.length > 0) {
            setActiveMatch(matchIdParam);
            markRead(matchIdParam);
        }
    }, [matches]); // run when matches load

    // Load matches on mount
    useEffect(() => {
        matchesApi.getMatches().then(setMatches);
    }, []);

    // Load messages when active match changes
    useEffect(() => {
        if (!activeMatchId || messages[activeMatchId]) return;
        matchesApi.getMessages(activeMatchId).then(msgs => {
            setMessages(activeMatchId, msgs);
            markRead(activeMatchId);
        });
    }, [activeMatchId]);

    // Scroll to bottom when messages update
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeMatchId]);

    const activeMatch = matches.find(m => m.id === activeMatchId) ?? null;
    const activeMessages = activeMatchId ? (messages[activeMatchId] ?? []) : [];

    const handleSend = async () => {
        if (!input.trim() || !activeMatchId || sending) return;
        setSending(true);
        const msg = await matchesApi.sendMessage(activeMatchId, input.trim());
        addMessage(activeMatchId, msg);
        setInput('');
        setSending(false);
    };

    return (
        <div className="bg-black text-white font-mono flex overflow-hidden" style={{ height: 'calc(100vh - 3.5rem)' }}>

            {/* ── Match list (left panel) ── */}
            <div className="w-72 flex-shrink-0 border-r border-white/10 flex flex-col">
                <div className="px-4 py-3 border-b border-white/10">
                    <h1 className="text-lg font-bold" style={{ color: '#ff6699' }}>
                        💖 matches
                    </h1>
                </div>

                {matches.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs opacity-30 px-4 text-center">
                        No matches yet. Keep browsing!
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        {matches.map(m => (
                            <MatchCard
                                key={m.id}
                                match={m}
                                active={m.id === activeMatchId}
                                onClick={() => {
                                    setActiveMatch(m.id);
                                    markRead(m.id);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Conversation (right panel) ── */}
            <div className="flex-1 flex flex-col">
                {!activeMatch ? (
                    <div className="flex-1 flex items-center justify-center text-xs opacity-30">
                        Select a match to start chatting
                    </div>
                ) : (
                    <>
                        {/* Conversation header */}
                        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded border border-[#ff6699] overflow-hidden flex items-center justify-center text-lg flex-shrink-0">
                                {activeMatch.otherProfile?.animalAvatarUrl ? (
                                    <Image
                                        src={activeMatch.otherProfile.animalAvatarUrl}
                                        alt={activeMatch.otherProfile.displayName}
                                        width={32}
                                        height={32}
                                        className="object-cover w-full h-full"
                                    />
                                ) : '🐾'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold">{activeMatch.otherProfile?.displayName}</div>
                                <div className="text-xs opacity-40 capitalize">{activeMatch.otherProfile?.animalType}</div>
                            </div>
                            {activeMatch.otherProfile && (
                                <Link
                                    href={`/profile/${activeMatch.otherProfile.id}`}
                                    className="text-xs px-3 py-1.5 rounded-full border border-white/20 hover:border-[#ff6699] hover:text-[#ff6699] opacity-60 hover:opacity-100 transition flex-shrink-0"
                                >
                                    view profile
                                </Link>
                            )}
                        </div>


                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {activeMessages.length === 0 ? (
                                <div className="text-center text-xs opacity-30 mt-8">
                                    You matched! Say hello 👋
                                </div>
                            ) : (
                                activeMessages.map(msg => (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        isMe={msg.senderId === userId}
                                    />
                                ))
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="px-5 py-3 border-t border-white/10 flex gap-3">
                            <input
                                className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm outline-none border border-white/10 focus:border-[#ff6699] transition"
                                placeholder="say something..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || sending}
                                className="px-5 py-2 rounded-full text-sm font-bold transition disabled:opacity-30"
                                style={{ backgroundColor: '#ff6699', color: '#000' }}
                            >
                                send
                            </button>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}

export default function MatchesPage() {
    return (
        <Suspense fallback={<div className="bg-black text-white font-mono flex items-center justify-center" style={{ height: 'calc(100vh - 3.5rem)' }}>Loading...</div>}>
            <MatchesContent />
        </Suspense>
    );
}
