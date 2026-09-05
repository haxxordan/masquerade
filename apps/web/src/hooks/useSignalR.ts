"use client";

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { matchesApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import { useMatchStore } from '@dating/store';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import { Match } from '@dating/types';
import { hubConnection } from '@/lib/hubConnection';

export function useSignalR() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { addMatch, addMessage, setTyping, applyReadReceipt, activeMatchId } = useMatchStore();
    const pathname = usePathname();
    const connectionRef = useRef<signalR.HubConnection | null>(null);
    const pathnameRef = useRef(pathname);

    useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

    useEffect(() => {
        if (!isAuthenticated || connectionRef.current) return;

        let cancelled = false; // ← track if cleanup ran before start resolved

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001'}/hubs/match`, { withCredentials: true })
            .withAutomaticReconnect()
            .build();

        connection.on('NewMatch', (newMatch: Match) => {
            addMatch(newMatch);
            const other = newMatch.otherProfile;
            toast(`💖 You matched with ${other?.displayName ?? 'someone'}!`, {
                description: other?.animalType ? `A wild ${other.animalType} appears` : undefined,
                action: { label: 'Say hi', onClick: () => window.location.href = `/matches?matchId=${newMatch.id}` },
            });
        });


        connection.on('NewMessage', (message) => {
            addMessage(message.matchId, message);

            const isViewingThisConversation = pathnameRef.current.includes('/matches') && activeMatchId === message.matchId;
            const isIncoming = !message.isMine;

            if (isViewingThisConversation && isIncoming) {
                matchesApi.markRead(message.matchId)
                    .then((receipt) => {
                        applyReadReceipt(message.matchId, receipt.readAt);
                    })
                    .catch((error: unknown) => {
                        console.error('Failed to mark incoming message as read:', error);
                    });
            }

            if (!pathnameRef.current.includes('/matches')) {
                toast('💬 New message', {
                    description: message.content.length > 40
                        ? message.content.slice(0, 40) + '...'
                        : message.content,
                    action: {
                        label: 'View',
                        onClick: () => window.location.href = `/matches?matchId=${message.matchId}`,
                    },
                });
            }
        });

        connection.on('NewLike', (data: { profileId: string; displayName: string; animalAvatarUrl: string }) => {
            toast(`🐾 ${data.displayName} liked you!`, {
                description: 'Maybe the feeling is mutual?',
                action: {
                    label: 'View profile',
                    onClick: () => window.location.href = `/profile/${data.profileId}`,
                },
            });
        });

        connection.on('TypingStarted', (matchId: string) => {
            setTyping(matchId, true);
        });

        connection.on('TypingStopped', (matchId: string) => {
            setTyping(matchId, false);
        });

        connection.on('MessagesRead', (payload: { matchId: string; readAt: string }) => {
            applyReadReceipt(payload.matchId, payload.readAt);
        });

        connection.start()
            .then(() => {
                if (cancelled) {
                    // Cleanup ran before we finished starting — stop immediately
                    connection.stop();
                    return;
                }
                connectionRef.current = connection;
                hubConnection.current = connection;
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error('SignalR connection failed:', err);
                }
                // Suppress the error if we intentionally cancelled
            });

        return () => {
            cancelled = true;
            if (connectionRef.current) {
                connectionRef.current.stop();
                connectionRef.current = null;
                hubConnection.current = null;
            }
        };
    }, [isAuthenticated, applyReadReceipt, activeMatchId]);
}
