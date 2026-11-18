import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { authService } from '../services/auth/auth-service';
import { useNinjaAlert } from '../context/ninja-alert-context';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useNinjaAlert();

  useEffect(() => {
    async function handleAuth() {
      try {
        const token = (params.token as string) || '';
        const userJson = (params.user as string) || '';
        let user: any = null;

        if (userJson) {
          try {
            user = typeof userJson === 'string' ? JSON.parse(decodeURIComponent(userJson)) : userJson;
          } catch {
            user = null;
          }
        }

        if (token && user) {
          await authService.setExternalSession(token, user);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          showToast({
            title: 'Firebase Connected',
            message: `Welcome back, ${user.name || user.email}!`,
            type: 'success',
            icon: 'google',
          });

          // Navigate back to cloud sync settings or main app
          router.replace('/settings/cloud-sync' as any);
          return;
        }

        // Fallback if missing params
        router.replace('/(tabs)' as any);
      } catch (err) {
        console.error('Auth callback processing error:', err);
        router.replace('/settings/cloud-sync' as any);
      }
    }

    void handleAuth();
  }, [params, router, showToast]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00E699" />
      <Text style={styles.text}>Connecting to Firebase Cloud...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
});
