import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: '#111', borderTopColor: '#222' },
      tabBarActiveTintColor: '#ff6699',
      tabBarInactiveTintColor: '#666',
      headerShown: false,
    }}>
      <Tabs.Screen name="browse" options={{ title: 'Discover',
        tabBarIcon: ({ color }) => <Ionicons name="paw" size={24} color={color} /> }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches',
        tabBarIcon: ({ color }) => <Ionicons name="heart" size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile',
        tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> }} />
    </Tabs>
  );
}
