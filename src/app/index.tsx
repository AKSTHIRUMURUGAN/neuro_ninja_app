import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';

import { useNinja } from '../context/ninja-context';
import { NinjaPalette } from '../constants/theme';
import { checkLauncherStatus } from '../services/launcher/launcher-service';

export default function IndexRoute() {
  const { settings, isLoading } = useNinja();
  const [checkingLauncher, setCheckingLauncher] = useState(true);
  const [isDefaultHome, setIsDefaultHome] = useState(false);

  useEffect(() => {
    let mounted = true;
    void checkLauncherStatus().then((status) => {
      if (mounted) {
        setIsDefaultHome(status.isDefault);
        setCheckingLauncher(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading || checkingLauncher) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NinjaPalette.emerald} />
      </View>
    );
  }

  if (!settings.hasCompletedOnboarding) {
    return <Redirect href={'/onboarding' as any} />;
  }

  if (settings.ghostLauncherAsHome || isDefaultHome) {
    return <Redirect href={'/focus/ghost-launcher' as any} />;
  }

  return <Redirect href={'/(tabs)' as any} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#070A11',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
