import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import {
  isDefaultLauncher as nativeIsDefaultLauncher,
  requestDefaultLauncher as nativeRequestDefaultLauncher,
  openHomeSettings as nativeOpenHomeSettings,
  launchApp as nativeLaunchApp,
} from 'expo-app-blocker';
import { blockerEngine } from '../blocker/blocker-engine';

export interface InstalledLauncherApp {
  packageName: string;
  name: string;
}

const NinjaLauncherNative = NativeModules.NinjaLauncherModule as
  | {
      getInstalledLauncherApps?: () => Promise<InstalledLauncherApp[]>;
    }
  | undefined;

export async function getRealtimeInstalledLauncherApps(): Promise<InstalledLauncherApp[]> {
  if (Platform.OS !== 'android') return [];
  if (NinjaLauncherNative?.getInstalledLauncherApps) {
    try {
      const list = await NinjaLauncherNative.getInstalledLauncherApps();
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    } catch (error) {
      console.warn('[LauncherService] NinjaLauncherModule.getInstalledLauncherApps failed:', error);
    }
  }
  const fallback = await blockerEngine.getInstalledApps(false);
  return fallback.map((a) => ({ packageName: a.packageName, name: a.name }));
}

export function subscribeToPackageChanges(
  onChanged: (payload: { reason?: string; packageName?: string }) => void
): () => void {
  if (Platform.OS !== 'android' || !NativeModules.NinjaLauncherModule) {
    return () => {};
  }
  const emitter = new NativeEventEmitter(NativeModules.NinjaLauncherModule);
  const sub = emitter.addListener('NinjaPackageChanged', onChanged);
  return () => sub.remove();
}

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

