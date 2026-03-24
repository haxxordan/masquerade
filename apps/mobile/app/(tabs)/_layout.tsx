import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useMatchStore } from '@dating/store';

function MatchesTabIcon({ color }: { color: string }) {
  const unreadMatchIds = useMatchStore(s => s.unreadMatchIds);
  const hasUnread = unreadMatchIds.size > 0;
  return (
    <View>
      <Ionicons name="heart" size={24} color={color} />
      {hasUnread && (
        <View
          style={{
            position: 'absolute', top: -2, right: -4,
            width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff6699',
          }}
        />
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: '#000', borderTopColor: 'rgba(255,255,255,0.08)' },
      tabBarActiveTintColor: '#ff6699',
      tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
      headerShown: false,
    }}>
      <Tabs.Screen name="browse" options={{ title: 'Discover',
        tabBarIcon: ({ color }) => <Ionicons name="paw" size={24} color={color} /> }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches',
        tabBarIcon: ({ color }) => <MatchesTabIcon color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile',
        tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> }} />
    </Tabs>
  );
}
