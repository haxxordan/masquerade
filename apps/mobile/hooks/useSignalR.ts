import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { AppState } from 'react-native';
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
    const appStateRef = useRef(AppState.currentState);

    // Keep ref in sync so event handler closure always sees current value
    useEffect(() => {
        activeMatchIdRef.current = activeMatchId;
    }, [activeMatchId]);

    useEffect(() => {
        if (!token) return;
        let disposed = false;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${apiUrl}/hubs/match`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Error)
            .build();

        // Mobile networks can pause briefly when app state changes.
        // Use a wider timeout budget to reduce false-positive disconnects.
        connection.serverTimeoutInMilliseconds = 120000;
        connection.keepAliveIntervalInMilliseconds = 15000;

        hubConnection.current = connection;

        const startConnection = async () => {
            if (disposed) return;
            if (connection.state !== signalR.HubConnectionState.Disconnected) return;
            try {
                await connection.start();
            } catch (err) {
                console.warn('[SignalR] connect error:', err);
            }
        };

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

        connection.on('MessagesRead', (data: { matchId: string; readAt: string }) => {
            applyReadReceipt(data.matchId, data.readAt);
        });

        connection.onreconnecting(() => {
            // No-op: automatic reconnect is enabled.
        });

        connection.onreconnected(() => {
            // Refresh unread state for safety after a reconnect.
            matchesApi.getMatches().catch(() => { });
        });

        connection.onclose(() => {
            // If app is active, attempt a restart even after reconnect policy exhaustion.
            if (!disposed && appStateRef.current === 'active') {
                startConnection().catch(() => { });
            }
        });

        startConnection().catch(() => { });

        const appStateSub = AppState.addEventListener('change', (nextState) => {
            appStateRef.current = nextState;

            if (nextState === 'active') {
                startConnection().catch(() => { });
                return;
            }

            if (nextState === 'inactive' || nextState === 'background') {
                if (connection.state !== signalR.HubConnectionState.Disconnected) {
                    connection.stop().catch(() => { });
                }
            }
        });

        return () => {
            disposed = true;
            appStateSub.remove();
            hubConnection.current = null;
            connection.stop().catch(() => { });
        };
    }, [token]);
}
