"use client";

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '@dating/store';
import { useMatchStore } from '@dating/store';
import { matchesApi } from '@dating/api-client';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

const pathname = usePathname();

export function useSignalR() {
    const { token } = useAuthStore();
    const { addMatch, addMessage } = useMatchStore();
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    useEffect(() => {
        if (!token || connectionRef.current) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${process.env.NEXT_PUBLIC_API_URL}/hubs/match`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .build();

        connection.on('NewMatch', async (matchId: string) => {
            // Fetch the full match (with otherProfile) and add to store
            const matches = await matchesApi.getMatches();
            const newMatch = matches.find(m => m.id === matchId);
            if (newMatch) addMatch(newMatch);
        });

        connection.on('NewMessage', (message) => {
            addMessage(message.matchId, message);
            // Only toast if user isn't already on the matches page
            if (!pathname.includes('/matches')) {
                toast('💬 New message', {
                    description: message.content.length > 40
                        ? message.content.slice(0, 40) + '...'
                        : message.content,
                    action: {
                        label: 'View',
                        onClick: () => window.location.href = '/matches',
                    },
                });
            }
        });

        connection.on('NewMatch', async (matchId: string) => {
            const matches = await matchesApi.getMatches();
            const newMatch = matches.find(m => m.id === matchId);
            if (newMatch) {
                addMatch(newMatch);
                const other = newMatch.otherProfile;
                toast(`💖 You matched with ${other?.displayName ?? 'someone'}!`, {
                    description: other?.animalType
                        ? `A wild ${other.animalType} appears`
                        : undefined,
                    action: {
                        label: 'Say hi',
                        onClick: () => window.location.href = '/matches',
                    },
                });
            }
        });


        connection.start().catch(err => console.error('SignalR connection failed:', err));
        connectionRef.current = connection;

        return () => {
            connection.stop();
            connectionRef.current = null;
        };
    }, [token]);
}

