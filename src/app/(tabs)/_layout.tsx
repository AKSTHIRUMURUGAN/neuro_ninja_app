import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { NinjaPalette } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: NinjaPalette.emerald,
        tabBarInactiveTintColor: NinjaPalette.textMuted,
        tabBarStyle: {
          backgroundColor: '#070A11',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dojo',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="sword"
              size={size}
              color={typeof color === 'string' ? color : NinjaPalette.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="blocklist"
        options={{
          title: 'Armory',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="shield-lock"
              size={size}
              color={typeof color === 'string' ? color : NinjaPalette.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Gates',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="brain"
              size={size}
              color={typeof color === 'string' ? color : NinjaPalette.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-bell-curve-cumulative"
              size={size}
              color={typeof color === 'string' ? color : NinjaPalette.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cog"
              size={size}
              color={typeof color === 'string' ? color : NinjaPalette.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
