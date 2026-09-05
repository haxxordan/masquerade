import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createApiClient, setAuthToken } from '@dating/api-client';
import { authApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSignalR } from '../hooks/useSignalR';
import { apiUrl } from '../lib/env';
import { queryClientDefaultOptions } from '../lib/queryConfig';
import '../global.css';

createApiClient(apiUrl);

const SECURE_KEY = 'masquerade-auth';

function AuthGuard() {
    const token = useAuthStore(s => s.token);
    const refreshToken = useAuthStore(s => s.refreshToken);
    const accessExpiresAt = useAuthStore(s => s.accessExpiresAt);
    const setMobileSession = useAuthStore(s => s.setMobileSession);
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
                            refreshToken: parsed.refreshToken ?? null,
                            accessExpiresAt: parsed.accessExpiresAt ?? null,
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
            SecureStore.setItemAsync(SECURE_KEY, JSON.stringify({ token, refreshToken, accessExpiresAt })).catch(() => { });
        } else {
            SecureStore.deleteItemAsync(SECURE_KEY).catch(() => { });
        }
    }, [token, refreshToken, accessExpiresAt, hydrated]);

    useEffect(() => {
        if (!token || !refreshToken || !accessExpiresAt) return;
        const delay = Math.max(0, Date.parse(accessExpiresAt) - Date.now() - 60_000);
        const timer = setTimeout(() => {
            authApi.mobileRefresh(refreshToken).then(setMobileSession).catch(() => useAuthStore.getState().logout());
        }, delay);
        return () => clearTimeout(timer);
    }, [token, refreshToken, accessExpiresAt, setMobileSession]);

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
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: queryClientDefaultOptions }));

    return (
        <QueryClientProvider client={queryClient}>
            <AuthGuard />
            {token && <SignalRMounter />}
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
        </QueryClientProvider>
    );
}
