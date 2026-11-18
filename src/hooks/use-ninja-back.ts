import { useEffect, useState, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useNinja } from '../context/ninja-context';
import { checkLauncherStatus } from '../services/launcher/launcher-service';

export interface UseNinjaBackOptions {
  onBackOverride?: () => boolean | void;
  fallbackRoute?: string;
  enableHardwareBack?: boolean;
}

export function useNinjaBack(options?: UseNinjaBackOptions) {
  const router = useRouter();
  const { settings } = useNinja();
  const [isDefaultHome, setIsDefaultHome] = useState(false);

  const {
    onBackOverride,
    fallbackRoute,
    enableHardwareBack = true,
  } = options || {};

  useEffect(() => {
    let mounted = true;
    void checkLauncherStatus().then((status) => {
      if (mounted) {
        setIsDefaultHome(status.isDefault);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const isLauncherActive = Boolean(settings.ghostLauncherAsHome || isDefaultHome);

  const handleSmartBack = useCallback(() => {
    if (onBackOverride) {
      const handled = onBackOverride();
      if (handled) return;
    }

    if (router.canGoBack()) {
      router.back();
    } else if (fallbackRoute) {
      router.replace(fallbackRoute as any);
    } else {
      // In NeuroNinja, Ghost Launcher is the universal logical home.
      router.replace('/focus/ghost-launcher' as any);
    }
  }, [router, onBackOverride, fallbackRoute]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !enableHardwareBack) return;

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBackOverride) {
        const handled = onBackOverride();
        if (handled) return true;
      }

      if (router.canGoBack()) {
        router.back();
        return true;
      }

      if (fallbackRoute) {
        router.replace(fallbackRoute as any);
        return true;
      }

      router.replace('/focus/ghost-launcher' as any);
      return true;
    });

    return () => backSub.remove();
  }, [enableHardwareBack, onBackOverride, router, fallbackRoute]);

  return {
    handleSmartBack,
    isLauncherActive,
  };
}
