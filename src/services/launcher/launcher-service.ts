import { Platform } from 'react-native';
import {
  isDefaultLauncher as nativeIsDefaultLauncher,
  requestDefaultLauncher as nativeRequestDefaultLauncher,
  openHomeSettings as nativeOpenHomeSettings,
  launchApp as nativeLaunchApp,
} from 'expo-app-blocker';

export interface LauncherStatus {
  isSupported: boolean;
  isDefault: boolean;
}

export async function checkLauncherStatus(): Promise<LauncherStatus> {
  if (Platform.OS !== 'android') {
    return { isSupported: false, isDefault: false };
  }

  try {
    const isDefault = await nativeIsDefaultLauncher();
    return { isSupported: true, isDefault };
  } catch (error) {
    console.warn('[LauncherService] Failed to check default launcher status:', error);
    return { isSupported: true, isDefault: false };
  }
}

export function promptSetDefaultLauncher(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return nativeRequestDefaultLauncher();
  } catch (error) {
    console.warn('[LauncherService] Failed to request default launcher:', error);
    return false;
  }
}

export function openNormalLauncherSettings(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return nativeOpenHomeSettings();
  } catch (error) {
    console.warn('[LauncherService] Failed to open home settings:', error);
    return false;
  }
}

export function launchApplication(packageName: string): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return nativeLaunchApp(packageName);
  } catch (error) {
    console.warn('[LauncherService] Failed to launch application:', packageName, error);
    return false;
  }
}

