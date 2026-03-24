import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { authApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.password) return;
    setLoading(true);
    setError('');
    try {
      const auth = await authApi.register(form);
      setAuth(auth);
      router.replace('/onboarding');
    } catch (err: unknown) {
      const messages = (err as { response?: { data?: unknown } })?.response?.data;
      if (Array.isArray(messages)) {
        setError(messages.join(', '));
      } else {
        setError('Registration failed. Please try again.');
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-[#ff6699] mb-1">Create Account</Text>
          <Text className="text-white/40 text-sm">Join masquerade today</Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <TextInput
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
            placeholder="Email"
            placeholderTextColor="#666"
            value={form.email}
            onChangeText={v => setForm(f => ({ ...f, email: v }))}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
            placeholder="Password"
            placeholderTextColor="#666"
            value={form.password}
            onChangeText={v => setForm(f => ({ ...f, password: v }))}
            secureTextEntry
            autoComplete="password-new"
          />

          {!!error && (
            <Text className="text-red-400 text-sm">{error}</Text>
          )}

          <TouchableOpacity
            className={`bg-[#ff6699] py-4 rounded-full items-center mt-2 ${loading ? 'opacity-60' : ''}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white font-bold text-base">
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <TouchableOpacity className="mt-6 items-center" onPress={() => router.push('/(auth)/login')}>
          <Text className="text-white/40 text-sm">
            Already have an account? <Text className="text-[#ff6699]">Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
