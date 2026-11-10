import { Platform } from 'react-native';
import * as ExpoAppBlocker from 'expo-app-blocker';
import type {
  PermissionStatus,
  AndroidBlockableApp,
  IOSBlockedItem,
} from 'expo-app-blocker';

import {
  loadNinjaSettings,
  saveNinjaSettings,
  recordIntercept,
  recordEarnedUnlock,
} from '../storage';

class BlockerEngine {
  private isConfigured = false;

  /**
   * Initializes native runtime configuration for Android and cleans initial intercepts.
   */
  public async initialize(): Promise<void> {
    if (this.isConfigured) return;

    if (Platform.OS === 'android') {
      try {
        ExpoAppBlocker.configureAndroid({
          overlayTitle: 'NeuroNinja Focus Shield',
          overlayText: '{appName} is sealed. Tap to breach or enter the Dojo.',
          overlayBackgroundColor: '#070A11',
          overlayTitleColor: '#10B981',
          overlayTextColor: '#94A3B8',
          overlayTitleFontSize: 24,
          overlayTextFontSize: 15,
          overlayTitleBold: true,
          overlayPadding: 32,
          overlayShowSpinner: true,
          overlaySpinnerColor: '#10B981',
          notificationTitle: 'NeuroNinja Focus Guard',
          notificationText: 'Distraction shield active. Stay focused.',
        });
      } catch (err) {
        console.warn('[BlockerEngine] Failed to configure Android native overlay:', err);
      }
    }

    // Drain any intercepts that occurred while closed
    await this.syncPendingIntercepts();
    this.isConfigured = true;
  }

  /**
   * Checks current permission status across iOS and Android.
   */
  public async checkPermissions(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'web') {
        return {
          allGranted: true,
          details: { platform: 'android', overlay: true, usageStats: true, notifications: true },
        };
      }
      return await ExpoAppBlocker.getPermissionStatus();
    } catch (e) {
      console.warn('[BlockerEngine] getPermissionStatus error:', e);
      return {
        allGranted: false,
        details: { platform: 'android', overlay: false, usageStats: false, notifications: false },
      };
    }
  }

  /**
   * Requests Screen Time authorization on iOS. (On Android, user must be routed to settings)
   */
  public async requestPermissions(): Promise<PermissionStatus> {
    try {
      if (Platform.OS === 'ios') {
        return await ExpoAppBlocker.requestPermissions();
      }
      return await this.checkPermissions();
    } catch (e) {
      console.warn('[BlockerEngine] requestPermissions error:', e);
      return await this.checkPermissions();
    }
  }

  /**
   * Android helper: open Display over other apps
   */
  public openOverlaySettings(): void {
    if (Platform.OS === 'android') {
      ExpoAppBlocker.openOverlaySettings();
    }
  }

  /**
   * Android helper: open Usage Access
   */
  public openUsageStatsSettings(): void {
    if (Platform.OS === 'android') {
      ExpoAppBlocker.openUsageStatsSettings();
    }
  }

  /**
   * Android helper: fetch installed apps with package names and labels
   */
  public async getInstalledApps(): Promise<AndroidBlockableApp[]> {
    if (Platform.OS !== 'android') return [];
    try {
      return await ExpoAppBlocker.getInstalledApps();
    } catch (e) {
      console.warn('[BlockerEngine] getInstalledApps error:', e);
      return [];
    }
  }

  /**
   * Arm the shield (apply blocking to the user's selected apps).
   */
  public async armShield(): Promise<void> {
    const settings = await loadNinjaSettings();

    if (Platform.OS === 'ios') {
      if (settings.iosBlockedItems && settings.iosBlockedItems.length > 0) {
        await ExpoAppBlocker.setBlockConfiguration({
          blockedItems: settings.iosBlockedItems,
          isActive: true,
        });
      }
    } else if (Platform.OS === 'android') {
      if (settings.androidBlockedPackages && settings.androidBlockedPackages.length > 0) {
        ExpoAppBlocker.setBlockedApps(settings.androidBlockedPackages);
        ExpoAppBlocker.startMonitoring();
      }
    }

    await saveNinjaSettings({ shieldActive: true });
  }

  /**
   * Disarm the shield (clear all blocks).
   */
  public async disarmShield(): Promise<void> {
    if (Platform.OS === 'ios') {
      ExpoAppBlocker.clearAllBlocks();
    } else if (Platform.OS === 'android') {
      ExpoAppBlocker.stopMonitoring();
      ExpoAppBlocker.setBlockedApps([]);
    }

    await saveNinjaSettings({ shieldActive: false });
  }

  /**
   * Update iOS blocked items & persist.
   */
  public async updateIOSSelection(
    selectionData: string,
    items: IOSBlockedItem[],
    shouldArmNow: boolean
  ): Promise<void> {
    await saveNinjaSettings({
      iosSelectionData: selectionData,
      iosBlockedItems: items,
    });

    if (shouldArmNow && Platform.OS === 'ios') {
      if (items.length > 0) {
        await ExpoAppBlocker.setBlockConfiguration({
          blockedItems: items,
          isActive: true,
        });
      } else {
        ExpoAppBlocker.clearAllBlocks();
      }
    }
  }

  /**
   * Update Android blocked package names & persist.
   */
  public async updateAndroidSelection(
    packages: string[],
    shouldArmNow: boolean
  ): Promise<void> {
    await saveNinjaSettings({
      androidBlockedPackages: packages,
    });

    if (shouldArmNow && Platform.OS === 'android') {
      ExpoAppBlocker.setBlockedApps(packages);
      if (packages.length > 0) {
        ExpoAppBlocker.startMonitoring();
      } else {
        ExpoAppBlocker.stopMonitoring();
      }
    }
  }

  /**
   * Grants temporary focus pass (budget) in minutes.
   */
  public async grantTemporaryUnlock(minutes: number): Promise<void> {
    try {
      await ExpoAppBlocker.temporaryUnlock(minutes);
      await recordEarnedUnlock(minutes);
    } catch (e) {
      console.warn('[BlockerEngine] temporaryUnlock error:', e);
    }
  }

  /**
   * Immediately terminates active unlock pass and restores shields.
   */
  public async relockNow(): Promise<void> {
    try {
      await ExpoAppBlocker.relockApps();
    } catch (e) {
      console.warn('[BlockerEngine] relockNow error:', e);
    }
  }

  /**
   * Checks if temporary unlock is currently active.
   */
  public isUnlocked(): boolean {
    if (Platform.OS === 'ios') {
      return ExpoAppBlocker.isTemporarilyUnlocked();
    }
    return ExpoAppBlocker.getRemainingUnlockTime() > 0;
  }

  /**
   * Returns remaining unlock time in seconds.
   */
  public getRemainingUnlockSeconds(): number {
    try {
      return ExpoAppBlocker.getRemainingUnlockTime();
    } catch {
      return 0;
    }
  }

  /**
   * Drains intercepts recorded by native background monitors and saves to analytics.
   */
  public async syncPendingIntercepts(): Promise<number> {
    try {
      const intercepts = ExpoAppBlocker.drainPendingIntercepts();
      if (intercepts && intercepts.length > 0) {
        await recordIntercept(intercepts.length);
        return intercepts.length;
      }
    } catch (e) {
      console.warn('[BlockerEngine] drainPendingIntercepts error:', e);
    }
    return 0;
  }

  /**
   * Check if user pressed shield button while app was closed (iOS).
   */
  public checkAndClearPendingUnlock(): boolean {
    if (Platform.OS === 'ios') {
      return ExpoAppBlocker.checkAndClearPendingUnlock();
    }
    return false;
  }

  /**
   * Subscribe to real-time shield button taps (iOS).
   */
  public addPendingUnlockListener(onTap: () => void): { remove: () => void } | null {
    if (Platform.OS === 'ios') {
      return ExpoAppBlocker.addPendingUnlockListener(onTap);
    }
    return null;
  }
}

export const blockerEngine = new BlockerEngine();

