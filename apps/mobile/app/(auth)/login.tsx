import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { authApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const auth = await authApi.login(form);
      setAuth(auth);
      router.replace('/(tabs)/browse');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status) {
        setError('Cannot reach API server from phone. Check EXPO_PUBLIC_API_URL and server bind address.');
      } else if (status === 401) {
        setError('Invalid credentials');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6 gap-5">
        <View className="mb-3">
          <Text className="text-3xl font-bold text-[#ff6699] mb-1">Welcome back</Text>
          <Text className="text-white/40 text-sm">Sign in to masquerade</Text>
        </View>

        {!!error && <Text className="text-red-400 text-sm">{error}</Text>}

        <TextInput
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          placeholder="Email"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={form.email}
          onChangeText={t => setForm(f => ({ ...f, email: t }))}
        />
        <TextInput
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry
          autoComplete="password"
          value={form.password}
          onChangeText={t => setForm(f => ({ ...f, password: t }))}
        />

        <TouchableOpacity
          className={`bg-[#ff6699] py-4 rounded-full items-center ${loading ? 'opacity-60' : ''}`}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center" onPress={() => router.push('/(auth)/register')}>
          <Text className="text-white/40 text-sm">
            New here? <Text className="text-[#ff6699]">Create account</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
