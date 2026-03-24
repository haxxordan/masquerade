import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function LandingScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-black items-center justify-center px-8 gap-6">
      <Text className="text-6xl">🐾</Text>
      <Text className="text-4xl font-bold text-[#ff6699]">masquerade</Text>
      <Text className="text-gray-400 text-center text-base">No face photos. Just your favorite animal, your vibe, and your people.</Text>
      <TouchableOpacity className="bg-[#ff6699] w-full py-4 rounded-full items-center"
        onPress={() => router.push('/(auth)/register')}>
        <Text className="text-white font-bold text-lg">Get Started</Text>
      </TouchableOpacity>
      <TouchableOpacity className="border border-[#ff6699] w-full py-4 rounded-full items-center"
        onPress={() => router.push('/(auth)/login')}>
        <Text className="text-[#ff6699] font-bold text-lg">Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}
