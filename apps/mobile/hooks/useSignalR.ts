import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '@dating/store';
import { useMatchStore } from '@dating/store';
import { matchesApi } from '@dating/api-client';
import { hubConnection } from '../lib/hubConnection';
import { apiUrl } from '../lib/env';

/**
 * Establishes a SignalR connection to /hubs/match for the logged-in user.
 *
 * Handles:
 *   NewMatch      → addMatch to store
 *   NewMessage    → addMessage; markRead if that match is active
 *   TypingStarted → setTyping(matchId, true)
 *   TypingStopped → setTyping(matchId, false)
 *   MessagesRead  → applyReadReceipt
 */
export function useSignalR() {
    const token = useAuthStore(s => s.token);
    const { addMatch, addMessage, setTyping, applyReadReceipt, markRead, activeMatchId } = useMatchStore();
    const activeMatchIdRef = useRef(activeMatchId);

    // Keep ref in sync so event handler closure always sees current value
    useEffect(() => {
        activeMatchIdRef.current = activeMatchId;
    }, [activeMatchId]);

    useEffect(() => {
        if (!token) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${apiUrl}/hubs/match`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        hubConnection.current = connection;

        connection.on('NewMatch', (match) => {
            addMatch(match);
        });

        connection.on('NewMessage', (message) => {
            addMessage(message.matchId, message);
            // Auto-mark read if we're currently viewing that conversation
            if (activeMatchIdRef.current === message.matchId) {
                matchesApi.markRead(message.matchId).catch(() => { });
                markRead(message.matchId);
            }
        });

        connection.on('TypingStarted', (matchId: string) => {
            setTyping(matchId, true);
        });

        connection.on('TypingStopped', (matchId: string) => {
            setTyping(matchId, false);
        });

        connection.on('MessagesRead', (data: { matchId: string; readerUserId: string; readAt: string }) => {
            applyReadReceipt(data.matchId, data.readerUserId, data.readAt);
        });

        connection.start()
            .catch(err => console.warn('[SignalR] connect error:', err));

        return () => {
            hubConnection.current = null;
            connection.stop().catch(() => { });
        };
    }, [token]);
}
