import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { authApi } from '@dating/api-client';
import { useAuthStore } from '@dating/store';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const auth = await authApi.login(form);
      setAuth(auth);
      router.replace('/(tabs)/browse');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <View className="flex-1 bg-black px-6 justify-center gap-4">
      <Text className="text-3xl font-bold text-pink-400">Sign In</Text>
      {!!error && <Text className="text-red-400">{error}</Text>}
      <TextInput className="bg-gray-900 text-white p-4 rounded-xl" placeholder="Email"
        placeholderTextColor="#666" keyboardType="email-address" autoCapitalize="none"
        value={form.email} onChangeText={t => setForm(f => ({ ...f, email: t }))} />
      <TextInput className="bg-gray-900 text-white p-4 rounded-xl" placeholder="Password"
        placeholderTextColor="#666" secureTextEntry
        value={form.password} onChangeText={t => setForm(f => ({ ...f, password: t }))} />
      <TouchableOpacity className="bg-pink-500 py-4 rounded-full items-center" onPress={handleLogin}>
        <Text className="text-white font-bold text-lg">Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}
