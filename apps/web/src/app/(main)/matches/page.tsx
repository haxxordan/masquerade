"use client";

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { matchesApi, ApiError } from '@dating/api-client';
import { useMatchStore } from '@dating/store';
import { useAuthStore } from '@dating/store';
import type { Match, Message, ConversationState } from '@dating/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { hubConnection } from '@/lib/hubConnection';

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

function formatSeenTime(value: string) {
    return new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
    match,
    active,
    unread,
    stale,
    onClick,
}: {
    match: Match;
    active: boolean;
    unread: boolean;
    stale: boolean;
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
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <div className={`text-sm truncate ${unread && !active ? 'font-bold text-white' : 'font-semibold'}`}>
                        {other?.displayName ?? 'Unknown'}
                    </div>
                    {unread && (
                        <span className="h-2 w-2 rounded-full bg-[#ff6699] shrink-0" />
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs opacity-40">
                    <span className="capitalize truncate">{other?.animalType ?? ''}</span>
                    {stale && !unread ? (
                        <span className="shrink-0 rounded-full border border-[#ff6699]/40 px-1.5 py-0.5 text-[10px] uppercase text-[#ff9cbc] opacity-100">
                            nudge
                        </span>
                    ) : null}
                </div>
            </div>
        </button>
    );
}

function isFeatureDisabled(error: unknown) {
    return error instanceof ApiError && (error.status === 404 || error.status === 403);
}

// ─── Main page ────────────────────────────────────────────────────────────────

function MatchesContent() {
    const { userId } = useAuthStore();
    const {
        matches, activeMatchId,
        setMatches, setActiveMatch,
        messages, setMessages, addMessage,
        markRead,
        unreadMatchIds,
        typingByMatchId,
    } = useMatchStore();

    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [nudging, setNudging] = useState(false);
    const [openersByMatchId, setOpenersByMatchId] = useState<Record<string, string[]>>({});
    const [stateByMatchId, setStateByMatchId] = useState<Record<string, ConversationState | null>>({});
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const searchParams = useSearchParams();

    // Auto-select match from query param
    useEffect(() => {
        const matchIdParam = searchParams.get('matchId');
        if (matchIdParam && matches.some(m => m.id === matchIdParam)) {
            setActiveMatch(matchIdParam);
            markRead(matchIdParam);
            handleMarkRead(matchIdParam);
        }
    }, [matches]); // run when matches load

    // Load matches on mount
    useEffect(() => {
        matchesApi.getMatches().then(setMatches);
    }, []);

    // Opportunistically load stale state for match-list indicators. If the
    // feature is disabled the API returns 404/403, which should stay silent.
    useEffect(() => {
        const missingMatchIds = matches
            .map(match => match.id)
            .filter(matchId => !(matchId in stateByMatchId));

        if (missingMatchIds.length === 0) return;

        let cancelled = false;

        Promise.all(missingMatchIds.map(async (matchId) => {
            try {
                const state = await matchesApi.getConversationState(matchId);
                return [matchId, state] as const;
            } catch (error: unknown) {
                if (!isFeatureDisabled(error)) {
                    console.error('Failed to load conversation state:', error);
                }

                return [matchId, null] as const;
            }
        })).then(results => {
            if (cancelled) return;

            setStateByMatchId(prev => {
                const next = { ...prev };
                for (const [matchId, state] of results) {
                    next[matchId] = state;
                }
                return next;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [matches, stateByMatchId]);

    // Load messages when active match changes
    useEffect(() => {
        if (!activeMatchId || messages[activeMatchId]) return;
        matchesApi.getMessages(activeMatchId).then(msgs => {
            setMessages(activeMatchId, msgs);
            markRead(activeMatchId);
            handleMarkRead(activeMatchId);
        });
    }, [activeMatchId]);

    // Load smart openers for selected match (flag-safe: 404 => disabled)
    useEffect(() => {
        if (!activeMatchId || openersByMatchId[activeMatchId]) return;

        matchesApi.getOpeners(activeMatchId)
            .then(data => {
                setOpenersByMatchId(prev => ({
                    ...prev,
                    [activeMatchId]: data.suggestions,
                }));
            })
            .catch((error: unknown) => {
                if (!isFeatureDisabled(error)) {
                    console.error('Failed to load smart openers:', error);
                }

                setOpenersByMatchId(prev => ({
                    ...prev,
                    [activeMatchId]: [],
                }));
            });
    }, [activeMatchId, openersByMatchId]);

    // Load conversation stale/nudge state (flag-safe: 404 => disabled)
    useEffect(() => {
        if (!activeMatchId || activeMatchId in stateByMatchId) return;

        matchesApi.getConversationState(activeMatchId)
            .then((state) => {
                setStateByMatchId(prev => ({
                    ...prev,
                    [activeMatchId]: state,
                }));
            })
            .catch((error: unknown) => {
                if (!isFeatureDisabled(error)) {
                    console.error('Failed to load conversation state:', error);
                }

                setStateByMatchId(prev => ({
                    ...prev,
                    [activeMatchId]: null,
                }));
            });
    }, [activeMatchId, stateByMatchId]);

    // Scroll to bottom when messages update
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeMatchId]);

    const activeMatch = matches.find(m => m.id === activeMatchId) ?? null;
    const activeMessages = activeMatchId ? (messages[activeMatchId] ?? []) : [];
    const activeOpeners = activeMatchId ? (openersByMatchId[activeMatchId] ?? []) : [];
    const activeState = activeMatchId ? (stateByMatchId[activeMatchId] ?? null) : null;
    const isOtherTyping = activeMatchId ? (typingByMatchId[activeMatchId] ?? false) : false;
    const lastMyMessageWithReceipt = [...activeMessages]
        .reverse()
        .find((message) => message.senderId === userId && message.readAt);

    const handleInputChange = (value: string) => {
        setInput(value);
        if (!activeMatchId) return;

        hubConnection.current?.invoke('StartTyping', activeMatchId).catch(() => { /* best-effort */ });

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
            hubConnection.current?.invoke('StopTyping', activeMatchId).catch(() => { /* best-effort */ });
        }, 3000);
    };

    const handleSend = async () => {
        if (!input.trim() || !activeMatchId || sending) return;
        setSending(true);

        // Stop typing indicator immediately on send
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        hubConnection.current?.invoke('StopTyping', activeMatchId).catch(() => { /* best-effort */ });
        try {
            const msg = await matchesApi.sendMessage(activeMatchId, input.trim());
            addMessage(activeMatchId, msg);
            setInput('');
            setOpenersByMatchId(prev => ({
                ...prev,
                [activeMatchId]: [],
            }));

            const updatedState = await matchesApi.getConversationState(activeMatchId)
                .catch((error: unknown) => {
                    if (!isFeatureDisabled(error)) {
                        console.error('Failed to refresh conversation state:', error);
                    }
                    return null;
                });

            setStateByMatchId(prev => ({
                ...prev,
                [activeMatchId]: updatedState,
            }));
        } finally {
            setSending(false);
        }
    };

    const handleSendNudge = async () => {
        if (!activeMatchId || nudging || !activeState?.canNudge) return;

        setNudging(true);
        try {
            const response = await matchesApi.sendNudge(activeMatchId);
            addMessage(activeMatchId, response.message);
            setStateByMatchId(prev => ({
                ...prev,
                [activeMatchId]: response.state,
            }));
        } catch (error) {
            console.error('Failed to send nudge:', error);
        } finally {
            setNudging(false);
        }
    };

    const handleMarkRead = async (matchId: string) => {
        try {
            const receipt = await matchesApi.markRead(matchId);
            if (!userId) return;
            useMatchStore.getState().applyReadReceipt(matchId, userId, receipt.readAt);
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
        }
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
                                unread={unreadMatchIds.has(m.id)}
                                stale={stateByMatchId[m.id]?.isStale ?? false}
                                onClick={() => {
                                    setActiveMatch(m.id);
                                    markRead(m.id);
                                    handleMarkRead(m.id);
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
                                <div className="text-xs opacity-40 capitalize">
                                    {isOtherTyping ? (
                                        <span style={{ color: '#ff6699' }}>typing...</span>
                                    ) : (
                                        activeMatch.otherProfile?.animalType
                                    )}
                                </div>
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
                                activeMessages.map(msg => {
                                    const isMe = msg.senderId === userId;
                                    const showSeen = isMe && msg.id === lastMyMessageWithReceipt?.id && !!msg.readAt;

                                    return (
                                        <div key={msg.id}>
                                            <MessageBubble
                                                message={msg}
                                                isMe={isMe}
                                            />
                                            {showSeen && msg.readAt ? (
                                                <div className="mb-2 mt-[-4px] pr-1 text-right text-[11px] text-white/40">
                                                    Seen {formatSeenTime(msg.readAt)}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="px-5 py-3 border-t border-white/10">
                            {activeMessages.length === 0 && activeOpeners.length > 0 && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {activeOpeners.map(opener => (
                                        <button
                                            key={opener}
                                            onClick={() => setInput(opener)}
                                            className="text-xs px-3 py-1.5 rounded-full border border-[#ff6699]/60 text-[#ff9cbc] hover:bg-[#ff6699]/15 transition"
                                        >
                                            {opener}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeState?.isStale && (
                                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#ff6699]/30 bg-[#ff6699]/10 px-3 py-2">
                                    <div className="min-w-0">
                                        {activeState.isSeenNoReply ? (
                                            <p className="mb-1 text-[10px] uppercase tracking-wide text-[#ffc2d5]">Seen, no reply yet</p>
                                        ) : (
                                            <p className="mb-1 text-[10px] uppercase tracking-wide text-[#ffc2d5]">Not seen yet</p>
                                        )}
                                        <p className="text-xs text-[#ffb3ca] truncate">{activeState.suggestedNudge}</p>
                                    </div>
                                    <button
                                        onClick={handleSendNudge}
                                        disabled={!activeState.canNudge || nudging}
                                        className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#ff6699] text-[#ff9cbc] hover:bg-[#ff6699]/20 disabled:opacity-40 transition"
                                    >
                                        {nudging ? 'sending...' : activeState.canNudge ? 'send nudge' : 'nudge cooling down'}
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <input
                                    className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm outline-none border border-white/10 focus:border-[#ff6699] transition"
                                    placeholder="say something..."
                                    value={input}
                                    onChange={e => handleInputChange(e.target.value)}
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
