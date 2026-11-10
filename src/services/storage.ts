import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IOSBlockedItem } from 'expo-app-blocker';

export type ChallengeType = 'breathwork' | 'math' | 'intent';
export type LockType = 'gate' | 'scramble_pin' | 'decoy_crash';

export interface AppQuotaPolicy {
  dailyLimitMinutes: number;
  sessionLimitMinutes: number; // Max consecutive minutes per opening
  dailyLaunchLimit: number;    // Max allowed opens per day
  category: 'social' | 'video' | 'gaming' | 'reading' | 'utility';
  escalatingDelayEnabled: boolean;
}

export interface DailyStat {
  intercepts: number;
  minutesEarned: number;
  sessionsCompleted: number;
}

export interface NinjaAppSettings {
  shieldActive: boolean;
  activeChallenge: ChallengeType;
  lockType: LockType;
  masterPin: string;
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

export const DEFAULT_QUOTA_POLICIES: Record<string, AppQuotaPolicy> = {
  'com.instagram.android': {
    dailyLimitMinutes: 30,
    sessionLimitMinutes: 10,
    dailyLaunchLimit: 12,
    category: 'social',
    escalatingDelayEnabled: true,
  },
  'com.google.android.youtube': {
    dailyLimitMinutes: 60,
    sessionLimitMinutes: 20,
    dailyLaunchLimit: 8,
    category: 'video',
    escalatingDelayEnabled: true,
  },
  'com.zhiliaoapp.musically': {
    dailyLimitMinutes: 20,
    sessionLimitMinutes: 8,
    dailyLaunchLimit: 10,
    category: 'video',
    escalatingDelayEnabled: true,
  },
  'com.twitter.android': {
    dailyLimitMinutes: 25,
    sessionLimitMinutes: 10,
    dailyLaunchLimit: 15,
    category: 'social',
    escalatingDelayEnabled: true,
  },
  'com.reddit.frontpage': {
    dailyLimitMinutes: 30,
    sessionLimitMinutes: 15,
    dailyLaunchLimit: 10,
    category: 'social',
    escalatingDelayEnabled: false,
  },
};

export const DEFAULT_SETTINGS: NinjaAppSettings = {
  shieldActive: false,
  activeChallenge: 'breathwork',
  lockType: 'gate',
  masterPin: '1234',
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


