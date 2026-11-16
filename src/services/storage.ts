import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IOSBlockedItem } from 'expo-app-blocker';

export type ChallengeType = 'breathwork' | 'math' | 'intent' | 'chess' | 'matiks' | 'schulte';
export type LockType = 'pattern' | 'pin' | 'biometric' | 'gate' | 'scramble_pin' | 'decoy_crash';

export interface AppCurfewSchedule {
  enabled: boolean;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number; // 0-23
  endMinute: number; // 0-59
  activeDays: number[]; // 0=Sun, 1=Mon... 6=Sat
}

export interface AppQuotaPolicy {
  dailyLimitMinutes: number;
  sessionLimitMinutes: number; // Max consecutive minutes per opening (0 = unlimited)
  dailyLaunchLimit: number;    // Max allowed opens per day (0 = unlimited)
  category: 'social' | 'video' | 'gaming' | 'reading' | 'utility' | 'messaging' | 'browser' | 'productivity' | 'other';
  escalatingDelayEnabled: boolean;
  curfewSchedule?: AppCurfewSchedule;
  lockType?: 'hard_lock' | 'mindful_gate' | 'strict' | 'pattern' | 'pin';
  hasCustomSecurity?: boolean;
  customPin?: string;       // App-specific PIN override (e.g. "8821")
  customPattern?: number[];  // App-specific Pattern override (e.g. [0, 1, 2, 5, 8])
  customPasscode?: string;   // App-specific passphrase/password (e.g. "FOCUS_NOW")
  allowBiometrics?: boolean; // For locker vault apps: whether fingerprint unlocks this specific app

  // Protection classification: Privacy Locker vs Doom Barrier
  protectionMode?: 'locker_vault' | 'doom_barrier';
  doomFrictionType?: 'breath_gate' | 'wait_timer' | 'oath_type' | 'math_sprint' | 'schulte_grid' | 'custom_pass';
  doomWaitSeconds?: number;       // Forced cooldown timer: 10, 15, 30, or 60s
  doomOathText?: string;         // Anti-dopamine oath/mantra to type
  allowBiometricBypass?: boolean; // default false for Doom Apps
  allowMasterPinBypass?: boolean; // default false for Doom Apps
}

export interface DailyStat {
  intercepts: number;
  minutesEarned: number;
  sessionsCompleted: number;
  totalScreenTimeMinutes?: number;
  phoneUnlocksCount?: number;
  hourlyUsageMinutes?: number[]; // Array of 24 numbers (minutes per hour 00:00 to 23:00)
  appUsageMinutes?: Record<string, number>; // package -> minutes used today
  appLaunchCounts?: Record<string, number>; // package -> times opened today
}

export interface NinjaAppSettings {
  shieldActive: boolean;
  activeChallenge: ChallengeType;
  lockType: LockType;
  masterPin: string;
  masterPattern: number[];
  patternVisible: boolean;
  patternHaptics: boolean;
  scramblePinKeypad: boolean;
  biometricsEnabled: boolean;
  decoyEnabled: boolean;
  unlockDurationMinutes: number;
  autoLockDelaySeconds: number; // 0 = immediate, 60 = 1m, 300 = 5m
  strictMode: boolean; // If true, requires longer challenge
  iosSelectionData: string;
  iosBlockedItems: IOSBlockedItem[];
  androidBlockedPackages: string[];
  totalInterceptsCount: number;
  dailyStats: Record<string, DailyStat>; // "YYYY-MM-DD"
  dailyQuotas: Record<string, number>; // package -> minutes
  appQuotaPolicies: Record<string, AppQuotaPolicy>;
  focusCoins: number;
  hasCompletedOnboarding: boolean;
  ghostLauncherAsHome: boolean;
}

const STORAGE_KEY = '@neuro_ninja_settings_v1';

export const DEFAULT_QUOTA_POLICIES: Record<string, AppQuotaPolicy> = {};

export const DEFAULT_SETTINGS: NinjaAppSettings = {
  shieldActive: false,
  activeChallenge: 'breathwork',
  lockType: 'pattern',
  masterPin: '1234',
  masterPattern: [0, 1, 2, 5, 8],
  patternVisible: true,
  patternHaptics: true,
  scramblePinKeypad: false,
  biometricsEnabled: true,
  decoyEnabled: false,
  unlockDurationMinutes: 10,
  autoLockDelaySeconds: 0,
  strictMode: false,
  iosSelectionData: '',
  iosBlockedItems: [],
  androidBlockedPackages: [
    'com.instagram.android',
    'com.zhiliaoapp.musically', // TikTok
    'com.google.android.youtube',
    'com.twitter.android',
    'com.reddit.frontpage',
  ],
  totalInterceptsCount: 0,
  dailyStats: {},
  dailyQuotas: {
    'com.instagram.android': 30,
    'com.google.android.youtube': 60,
  },
  appQuotaPolicies: DEFAULT_QUOTA_POLICIES,
  focusCoins: 120,
  hasCompletedOnboarding: false,
  ghostLauncherAsHome: false,
};

export async function loadNinjaSettings(): Promise<NinjaAppSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.error('Failed to load NeuroNinja settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export async function saveNinjaSettings(
  patch: Partial<NinjaAppSettings>
): Promise<NinjaAppSettings> {
  try {
    const current = await loadNinjaSettings();
    const updated: NinjaAppSettings = { ...current, ...patch };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save NeuroNinja settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function recordIntercept(count: number = 1): Promise<void> {
  if (count <= 0) return;
  try {
    const settings = await loadNinjaSettings();
    const today = getTodayKey();
    const currentDaily = settings.dailyStats[today] ?? {
      intercepts: 0,
      minutesEarned: 0,
      sessionsCompleted: 0,
    };

    const updatedDaily: DailyStat = {
      ...currentDaily,
      intercepts: currentDaily.intercepts + count,
    };

    await saveNinjaSettings({
      totalInterceptsCount: settings.totalInterceptsCount + count,
      dailyStats: {
        ...settings.dailyStats,
        [today]: updatedDaily,
      },
    });
  } catch (e) {
    console.error('Failed to record intercept:', e);
  }
}

export async function recordEarnedUnlock(minutes: number): Promise<void> {
  try {
    const settings = await loadNinjaSettings();
    const today = getTodayKey();
    const currentDaily = settings.dailyStats[today] ?? {
      intercepts: 0,
      minutesEarned: 0,
      sessionsCompleted: 0,
    };

    const updatedDaily: DailyStat = {
      ...currentDaily,
      minutesEarned: currentDaily.minutesEarned + minutes,
    };

    await saveNinjaSettings({
      dailyStats: {
        ...settings.dailyStats,
        [today]: updatedDaily,
      },
    });
  } catch (e) {
    console.error('Failed to record earned unlock:', e);
  }
}

export async function addFocusCoins(amount: number): Promise<number> {
  try {
    const settings = await loadNinjaSettings();
    const newTotal = Math.max(0, (settings.focusCoins ?? 0) + amount);
    await saveNinjaSettings({ focusCoins: newTotal });
    return newTotal;
  } catch (e) {
    console.error('Failed to update focus coins:', e);
    return 0;
  }
}

export async function recordAppUsageTick(packageName: string, minutes: number = 1): Promise<void> {
  if (minutes <= 0) return;
  try {
    const settings = await loadNinjaSettings();
    const today = getTodayKey();
    const curHour = new Date().getHours();
    const currentDaily = settings.dailyStats[today] ?? {
      intercepts: 0,
      minutesEarned: 0,
      sessionsCompleted: 0,
      totalScreenTimeMinutes: 0,
      phoneUnlocksCount: 0,
      hourlyUsageMinutes: Array(24).fill(0),
      appUsageMinutes: {},
      appLaunchCounts: {},
    };

    const currentAppUsage = currentDaily.appUsageMinutes ?? {};
    const appMinutes = (currentAppUsage[packageName] ?? 0) + minutes;

    const hourly = [...(currentDaily.hourlyUsageMinutes ?? Array(24).fill(0))];
    hourly[curHour] = (hourly[curHour] ?? 0) + minutes;

    const updatedDaily: DailyStat = {
      ...currentDaily,
      totalScreenTimeMinutes: (currentDaily.totalScreenTimeMinutes ?? 0) + minutes,
      hourlyUsageMinutes: hourly,
      appUsageMinutes: {
        ...currentAppUsage,
        [packageName]: appMinutes,
      },
    };

    await saveNinjaSettings({
      dailyStats: {
        ...settings.dailyStats,
        [today]: updatedDaily,
      },
    });
  } catch (e) {
    console.error('Failed to record app usage tick:', e);
  }
}

export async function recordPhoneUnlock(): Promise<void> {
  try {
    const settings = await loadNinjaSettings();
    const today = getTodayKey();
    const currentDaily = settings.dailyStats[today] ?? {
      intercepts: 0,
      minutesEarned: 0,
      sessionsCompleted: 0,
      totalScreenTimeMinutes: 0,
      phoneUnlocksCount: 0,
      hourlyUsageMinutes: Array(24).fill(0),
      appUsageMinutes: {},
      appLaunchCounts: {},
    };

    const updatedDaily: DailyStat = {
      ...currentDaily,
      phoneUnlocksCount: (currentDaily.phoneUnlocksCount ?? 0) + 1,
    };

    await saveNinjaSettings({
      dailyStats: {
        ...settings.dailyStats,
        [today]: updatedDaily,
      },
    });
  } catch (e) {
    console.error('Failed to record phone unlock:', e);
  }
}

export async function recordAppLaunch(packageName: string): Promise<void> {
  try {
    const settings = await loadNinjaSettings();
    const today = getTodayKey();
    const currentDaily = settings.dailyStats[today] ?? {
      intercepts: 0,
      minutesEarned: 0,
      sessionsCompleted: 0,
      totalScreenTimeMinutes: 0,
      phoneUnlocksCount: 0,
      hourlyUsageMinutes: Array(24).fill(0),
      appUsageMinutes: {},
      appLaunchCounts: {},
    };

    const launches = currentDaily.appLaunchCounts ?? {};
    const updatedDaily: DailyStat = {
      ...currentDaily,
      appLaunchCounts: {
        ...launches,
        [packageName]: (launches[packageName] ?? 0) + 1,
      },
    };

    await saveNinjaSettings({
      dailyStats: {
        ...settings.dailyStats,
        [today]: updatedDaily,
      },
    });
  } catch (e) {
    console.error('Failed to record app launch:', e);
  }
}

export async function updateAppQuotaPolicy(
  packageName: string,
  policy: Partial<AppQuotaPolicy>
): Promise<void> {
  try {
    const settings = await loadNinjaSettings();
    const existing = settings.appQuotaPolicies[packageName] ?? {
      dailyLimitMinutes: 30,
      sessionLimitMinutes: 10,
      dailyLaunchLimit: 15,
      category: 'social',
      escalatingDelayEnabled: true,
    };

    const updatedPolicies = {
      ...settings.appQuotaPolicies,
      [packageName]: { ...existing, ...policy },
    };

    await saveNinjaSettings({ appQuotaPolicies: updatedPolicies });
  } catch (e) {
    console.error('Failed to update app quota policy:', e);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Batched Notifications Storage
// ──────────────────────────────────────────────────────────────────────────────

export interface BatchedNotificationItem {
  id: string;
  appName: string;
  pkg: string;
  title: string;
  body: string;
  timestamp: string;
  receivedAtMs: number;
  icon: string;
  color: string;
}

const NOTIFICATIONS_STORAGE_KEY = '@neuro_ninja_batched_notifs_v1';

export async function getBatchedNotifications(): Promise<BatchedNotificationItem[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get batched notifications:', e);
    return [];
  }
}

export async function saveBatchedNotification(item: BatchedNotificationItem): Promise<BatchedNotificationItem[]> {
  try {
    const current = await getBatchedNotifications();
    const updated = [item, ...current].slice(0, 100);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save batched notification:', e);
    return [];
  }
}

export async function dismissBatchedNotification(id: string): Promise<BatchedNotificationItem[]> {
  try {
    const current = await getBatchedNotifications();
    const updated = current.filter((n) => n.id !== id);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to dismiss batched notification:', e);
    return [];
  }
}

export async function clearAllBatchedNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear batched notifications:', e);
  }
}


