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
  private iconCache = new Map<string, string>();

  /**
   * Retrieves cached base64 icon for a package if available.
   */
  public getCachedIcon(packageName: string): string | null {
    return this.iconCache.get(packageName) ?? null;
  }

  /**
   * Manually store an icon into the runtime cache.
   */
  public registerIcon(packageName: string, iconBase64: string): void {
    if (packageName && iconBase64) {
      this.iconCache.set(packageName, iconBase64);
    }
  }

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
   * Android helper: fetch installed apps with package names and labels.
   * includeIcons = false gives ultra-fast 10ms boot time (no Base64 PNG compression).
   */
  public async getInstalledApps(includeIcons: boolean = false): Promise<AndroidBlockableApp[]> {
    if (Platform.OS !== 'android') return [];
    try {
      const apps = await ExpoAppBlocker.getInstalledApps(includeIcons);
      if (includeIcons) {
        apps.forEach((app) => {
          if (app.packageName && app.iconBase64) {
            this.iconCache.set(app.packageName, app.iconBase64);
          }
        });
      }
      return apps;
    } catch (e) {
      console.warn('[BlockerEngine] getInstalledApps error:', e);
      return [];
    }
  }

  /**
   * Android helper: fetch individual app icon on demand (lazy loading)
   */
  public async getAppIcon(packageName: string): Promise<string | null> {
    if (this.iconCache.has(packageName)) {
      return this.iconCache.get(packageName) ?? null;
    }
    try {
      const icon = await ExpoAppBlocker.getAppIcon(packageName);
      if (icon) {
        this.iconCache.set(packageName, icon);
      }
      return icon;
    } catch {
      return null;
    }
  }

  /**
   * Android helper: fetch real device Screen-on Time & foreground app usage for today
   */
  public async getRealUsageStats(): Promise<ExpoAppBlocker.RealUsageStatsResult> {
    if (Platform.OS !== 'android') {
      return {
        totalScreenTimeMinutes: 0,
        appUsageMinutes: {},
        startTimeMs: Date.now(),
        endTimeMs: Date.now(),
      };
    }
    try {
      return await ExpoAppBlocker.getRealUsageStats();
    } catch (e) {
      console.warn('[BlockerEngine] getRealUsageStats error:', e);
      return {
        totalScreenTimeMinutes: 0,
        appUsageMinutes: {},
        startTimeMs: Date.now(),
        endTimeMs: Date.now(),
      };
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
  public async grantTemporaryUnlock(minutes: number, packageName?: string): Promise<void> {
    try {
      await ExpoAppBlocker.temporaryUnlock(minutes, packageName);
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

  // ─────────────────────────────────────────────────────────────
  // Floating Doomscroll HUD Widget Controls (Android)
  // ─────────────────────────────────────────────────────────────

  public setFloatingHudEnabled(enabled: boolean): void {
    ExpoAppBlocker.setFloatingHudEnabled(enabled);
  }

  public isFloatingHudEnabled(): boolean {
    return ExpoAppBlocker.isFloatingHudEnabled();
  }

  public setMonitoredHudPackages(packages: string[]): void {
    ExpoAppBlocker.setMonitoredHudPackages(packages);
  }

  public getMonitoredHudPackages(): string[] {
    return ExpoAppBlocker.getMonitoredHudPackages();
  }

  public setDoomscrollAlertThresholds(minutes: number, scrolls: number): void {
    ExpoAppBlocker.setDoomscrollAlertThresholds(minutes, scrolls);
  }

  public openAccessibilitySettings(): void {
    ExpoAppBlocker.openAccessibilitySettings();
  }

  public isAccessibilityServiceRunning(): boolean {
    return ExpoAppBlocker.isAccessibilityServiceRunning();
  }

  // ─────────────────────────────────────────────────────────────
  // Notification Suppression & Vault Engine (Regain Parity)
  // ─────────────────────────────────────────────────────────────

  public async isNotificationListenerGranted(): Promise<boolean> {
    return await ExpoAppBlocker.isNotificationListenerGranted();
  }

  public openNotificationListenerSettings(): boolean {
    return ExpoAppBlocker.openNotificationListenerSettings();
  }

  public async getSuppressedNotifications(): Promise<ExpoAppBlocker.SuppressedNotification[]> {
    return await ExpoAppBlocker.getSuppressedNotifications();
  }

  public clearSuppressedNotification(id: string): boolean {
    return ExpoAppBlocker.clearSuppressedNotification(id);
  }

  public clearAllSuppressedNotifications(): boolean {
    return ExpoAppBlocker.clearAllSuppressedNotifications();
  }

  public setNotificationFilterEnabled(enabled: boolean): void {
    ExpoAppBlocker.setNotificationFilterEnabled(enabled);
  }

  public isNotificationFilterEnabled(): boolean {
    return ExpoAppBlocker.isNotificationFilterEnabled();
  }

  public getVipPackages(): string[] {
    return ExpoAppBlocker.getVipPackages();
  }

  public setVipPackages(packages: string[]): void {
    ExpoAppBlocker.setVipPackages(packages);
  }

  public isSuppressAllNonVip(): boolean {
    return ExpoAppBlocker.isSuppressAllNonVip();
  }

  public setSuppressAllNonVip(enabled: boolean): void {
    ExpoAppBlocker.setSuppressAllNonVip(enabled);
  }
}

export const blockerEngine = new BlockerEngine();

