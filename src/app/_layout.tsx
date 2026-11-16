import { DarkTheme, ThemeProvider, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { NinjaProvider } from '../context/ninja-context';
import { NinjaAlertProvider } from '../context/ninja-alert-context';
import { blockerEngine } from '../services/blocker/blocker-engine';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootNavigator() {
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();

    if (Platform.OS === 'ios' && blockerEngine.checkAndClearPendingUnlock()) {
      router.push('/blocked?reason=opened' as any);
    }

    const sub = Platform.OS === 'ios' ? blockerEngine.addPendingUnlockListener(() => {
      router.push('/blocked?reason=opened' as any);
    }) : null;

    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string | undefined>;
      if (data?.type === 'alarm' && data.alarmId) {
        router.push(
          `/alarms/ring?alarmId=${encodeURIComponent(data.alarmId)}&mission=${data.mission ?? 'math'}` as any
        );
      } else if (data?.type === 'task_reminder' && data.taskId) {
        router.push(`/lifeos/tasks/detail?id=${data.taskId}` as any);
      } else if (data?.type === 'routine_start' && data.routineId) {
        router.push(`/lifeos/routines/player?routineId=${data.routineId}` as any);
      } else if (data?.type === 'bedtime_winddown') {
        router.push('/lifeos/sleep' as any);
      }
    });

    return () => {
      sub?.remove();
      notifSub.remove();
    };
  }, [router]);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#070A11' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="blocked"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <NinjaProvider>
      <NinjaAlertProvider>
        <RootNavigator />
      </NinjaAlertProvider>
    </NinjaProvider>
  );
}
