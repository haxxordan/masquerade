import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createApiClient } from '@dating/api-client';
import '../global.css';

createApiClient(process.env.EXPO_PUBLIC_API_URL!);

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#111' }, headerTintColor: '#ff6699', headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Setup Profile' }} />
      </Stack>
    </>
  );
}
