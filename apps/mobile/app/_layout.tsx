import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createApiClient, setAuthToken } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSignalR } from '../hooks/useSignalR';
import { apiUrl } from '../lib/env';
import '../global.css';

createApiClient(apiUrl);

const SECURE_KEY = 'masquerade-auth';

function AuthGuard() {
    const token = useAuthStore(s => s.token);
    const userId = useAuthStore(s => s.userId);
    const segments = useSegments();
    const router = useRouter();
    const [hydrated, setHydrated] = useState(false);

    // Restore auth from SecureStore on cold start
    useEffect(() => {
        SecureStore.getItemAsync(SECURE_KEY).then(raw => {
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed?.token) {
                        setAuthToken(parsed.token);
                        useAuthStore.setState({
                            token: parsed.token,
                            userId: parsed.userId ?? null,
                            profile: null,
                            isAuthenticated: true,
                        });
                    }
                } catch { }
            }
            setHydrated(true);
        }).catch(() => setHydrated(true));
    }, []);

    // Persist auth state changes
    useEffect(() => {
        if (!hydrated) return;
        if (token) {
            SecureStore.setItemAsync(SECURE_KEY, JSON.stringify({ token, userId })).catch(() => { });
        } else {
            SecureStore.deleteItemAsync(SECURE_KEY).catch(() => { });
        }
    }, [token, userId, hydrated]);

    // Route guard (only after hydration to avoid login flash)
    useEffect(() => {
        if (!hydrated) return;
        const inAuth = segments[0] === '(auth)';
        const inOnboarding = segments[0] === 'onboarding';
        if (!token && !inAuth) router.replace('/(auth)/login');
        if (token && (inAuth || segments[0] === undefined || segments[0] === 'index')) router.replace('/(tabs)/browse');
    }, [token, segments, hydrated]);

    return null;
}

function SignalRMounter() {
    useSignalR();
    return null;
}

export default function RootLayout() {
    const token = useAuthStore(s => s.token);
    return (
        <>
            <AuthGuard />
            {token && <SignalRMounter />}
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }} />
        </>
    );
}
