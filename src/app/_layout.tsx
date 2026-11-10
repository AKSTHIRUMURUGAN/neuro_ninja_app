import { DarkTheme, ThemeProvider, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { NinjaProvider } from '../context/ninja-context';
import { blockerEngine } from '../services/blocker/blocker-engine';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();

    if (blockerEngine.checkAndClearPendingUnlock()) {
      router.push('/blocked?reason=opened' as any);
    }

    const sub = blockerEngine.addPendingUnlockListener(() => {
      router.push('/blocked?reason=opened' as any);
    });

    return () => {
      sub?.remove();
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
      <RootNavigator />
    </NinjaProvider>
  );
}
