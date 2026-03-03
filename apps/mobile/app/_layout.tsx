import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createApiClient } from '@dating/api-client';
import { useAuthStore } from '@dating/store';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import '../global.css';

createApiClient(process.env.EXPO_PUBLIC_API_URL!);

function AuthGuard() {
    const { token } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        const inAuth = segments[0] === '(auth)';
        if (!token && !inAuth) router.replace('/(auth)/login');
        if (token && inAuth) router.replace('/(tabs)/browse');
    }, [token, segments]);

    return null;
}

export default function RootLayout() {
    return (
        <>
            <AuthGuard />
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }} />
        </>
    );
}
