import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { PermissionStatus, IOSBlockedItem } from 'expo-app-blocker';

import {
  loadNinjaSettings,
  saveNinjaSettings,
  type NinjaAppSettings,
  type ChallengeType,
  type LockType,
  type AppQuotaPolicy,
  DEFAULT_SETTINGS,
} from '../services/storage';
import { blockerEngine } from '../services/blocker/blocker-engine';
import { getLifeOSState, setLifeOSState } from '../services/database/database';

export type ProductivityMode = 'study' | 'work' | 'personal' | 'recovery';

export interface ProductivityModeProfile {
  id: ProductivityMode;
  label: string;
  subtitle: string;
  focusMinutes: number;
  breakMinutes: number;
  accentColor: string;
  icon: string;
}

export const PRODUCTIVITY_MODES: Record<ProductivityMode, ProductivityModeProfile> = {
  study: {
    id: 'study',
    label: 'Study Mode',
    subtitle: 'Syllabus blocks, revision alerts & 25/5 Pomodoro sprints',
    focusMinutes: 25,
    breakMinutes: 5,
    accentColor: '#818CF8',
    icon: 'book-open-variant',
  },
  work: {
    id: 'work',
    label: 'Work Mode',
    subtitle: 'Calendar blocks, quiet inbox & 50/10 deep work flow',
    focusMinutes: 50,
    breakMinutes: 10,
    accentColor: '#F59E0B',
    icon: 'briefcase-outline',
  },
  personal: {
    id: 'personal',
    label: 'Personal Mode',
    subtitle: 'Habits, routines, errands & balanced mindfulness',
    focusMinutes: 30,
    breakMinutes: 5,
    accentColor: '#10B981',
    icon: 'account-heart-outline',
  },
  recovery: {
    id: 'recovery',
    label: 'Recovery Mode',
    subtitle: 'Gentle pacing, rest days & wind-down — zero guilt',
    focusMinutes: 15,
    breakMinutes: 10,
    accentColor: '#06B6D4',
    icon: 'weather-night',
  },
};

interface NinjaContextType {
  settings: NinjaAppSettings;
  permissions: PermissionStatus | null;
  isArmed: boolean;
  isUnlocked: boolean;
  unlockRemainingSeconds: number;
  isLoading: boolean;
  productivityMode: ProductivityMode;
  lifeOSRevision: number;
  setProductivityMode: (mode: ProductivityMode) => Promise<void>;
  notifyLifeOSChanged: () => void;
  toggleShield: () => Promise<void>;
  refreshPermissions: () => Promise<PermissionStatus>;
  setIOSSelection: (selectionData: string, items: IOSBlockedItem[]) => Promise<void>;
  setAndroidSelection: (packages: string[]) => Promise<void>;
  grantUnlock: (minutes: number, packageName?: string) => Promise<void>;
  relockNow: () => Promise<void>;
  setChallengeType: (type: ChallengeType) => Promise<void>;
  setLockType: (type: LockType) => Promise<void>;
  setMasterPin: (pin: string) => Promise<void>;
  setMasterPattern: (pattern: number[]) => Promise<void>;
  setPatternVisible: (visible: boolean) => Promise<void>;
  setPatternHaptics: (enabled: boolean) => Promise<void>;
  setScramblePinKeypad: (enabled: boolean) => Promise<void>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  setDecoyEnabled: (enabled: boolean) => Promise<void>;
  setUnlockDuration: (minutes: number) => Promise<void>;
  setAutoLockDelay: (seconds: number) => Promise<void>;
  setStrictMode: (enabled: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  syncIntercepts: () => Promise<number>;
  setGhostLauncherAsHome: (enabled: boolean) => Promise<void>;
  updateQuotaPolicy: (packageName: string, policy: Partial<AppQuotaPolicy>) => Promise<void>;
}

const NinjaContext = createContext<NinjaContextType | null>(null);

export function NinjaProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<NinjaAppSettings>(DEFAULT_SETTINGS);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [unlockRemainingSeconds, setUnlockRemainingSeconds] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [productivityMode, setProductivityModeState] = useState<ProductivityMode>('study');
  const [lifeOSRevision, setLifeOSRevision] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    const status = await blockerEngine.checkPermissions();
    setPermissions(status);
    return status;
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await blockerEngine.initialize();
      const loadedSettings = await loadNinjaSettings();
      const savedMode = await getLifeOSState<ProductivityMode>('productivity_mode', 'study');
      if (!active) return;
      setSettings(loadedSettings);
      setProductivityModeState(savedMode);
      const status = await blockerEngine.checkPermissions();
      if (!active) return;
      setPermissions(status);
      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  // Periodic timer check for unlock budget countdown
  useEffect(() => {
    const checkUnlockBudget = () => {
      const remaining = blockerEngine.getRemainingUnlockSeconds();
      setUnlockRemainingSeconds(remaining);
      setIsUnlocked(remaining > 0 || blockerEngine.isUnlocked());
    };

    checkUnlockBudget();
    timerRef.current = setInterval(checkUnlockBudget, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Listen to AppState (when app comes from background to foreground, sync intercepts and permissions)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          await blockerEngine.syncPendingIntercepts();
          const loaded = await loadNinjaSettings();
          setSettings(loaded);
          await refreshPermissions();
        }
      }
    );

    return () => subscription.remove();
  }, [refreshPermissions]);

  // Master shield toggle
  const toggleShield = useCallback(async () => {
    if (settings.shieldActive) {
      await blockerEngine.disarmShield();
      setSettings((prev) => ({ ...prev, shieldActive: false }));
    } else {
      await blockerEngine.armShield();
      setSettings((prev) => ({ ...prev, shieldActive: true }));
    }
  }, [settings.shieldActive]);

  // iOS Selection
  const setIOSSelection = useCallback(
    async (selectionData: string, items: IOSBlockedItem[]) => {
      await blockerEngine.updateIOSSelection(
        selectionData,
        items,
        settings.shieldActive
      );
      setSettings((prev) => ({
        ...prev,
        iosSelectionData: selectionData,
        iosBlockedItems: items,
      }));
    },
    [settings.shieldActive]
  );

  // Android Selection
  const setAndroidSelection = useCallback(
    async (packages: string[]) => {
      await blockerEngine.updateAndroidSelection(
        packages,
        settings.shieldActive
      );
      setSettings((prev) => ({
        ...prev,
        androidBlockedPackages: packages,
      }));
    },
    [settings.shieldActive]
  );

  // Temporary Unlock
  const grantUnlock = useCallback(async (minutes: number, packageName?: string) => {
    await blockerEngine.grantTemporaryUnlock(minutes, packageName);
    setIsUnlocked(true);
    setUnlockRemainingSeconds(minutes * 60);
    const updated = await loadNinjaSettings();
    setSettings(updated);
  }, []);

  // Relock
  const relockNow = useCallback(async () => {
    await blockerEngine.relockNow();
    setIsUnlocked(false);
    setUnlockRemainingSeconds(0);
  }, []);

  // Challenge Type
  const setChallengeType = useCallback(async (type: ChallengeType) => {
    const updated = await saveNinjaSettings({ activeChallenge: type });
    setSettings(updated);
  }, []);

  // Lock Type & Security Settings
  const setLockType = useCallback(async (type: LockType) => {
    const updated = await saveNinjaSettings({ lockType: type });
    setSettings(updated);
  }, []);

  const setMasterPin = useCallback(async (pin: string) => {
    const updated = await saveNinjaSettings({ masterPin: pin });
    setSettings(updated);
  }, []);

  const setMasterPattern = useCallback(async (pattern: number[]) => {
    const updated = await saveNinjaSettings({ masterPattern: pattern });
    setSettings(updated);
  }, []);

  const setPatternVisible = useCallback(async (visible: boolean) => {
    const updated = await saveNinjaSettings({ patternVisible: visible });
    setSettings(updated);
  }, []);

  const setPatternHaptics = useCallback(async (enabled: boolean) => {
    const updated = await saveNinjaSettings({ patternHaptics: enabled });
    setSettings(updated);
  }, []);

  const setScramblePinKeypad = useCallback(async (enabled: boolean) => {
    const updated = await saveNinjaSettings({ scramblePinKeypad: enabled });
    setSettings(updated);
  }, []);

  const setBiometricsEnabled = useCallback(async (enabled: boolean) => {
    const updated = await saveNinjaSettings({ biometricsEnabled: enabled });
    setSettings(updated);
  }, []);

  const setDecoyEnabled = useCallback(async (enabled: boolean) => {
    const updated = await saveNinjaSettings({ decoyEnabled: enabled });
    setSettings(updated);
  }, []);

  // Unlock duration
  const setUnlockDuration = useCallback(async (minutes: number) => {
    const updated = await saveNinjaSettings({ unlockDurationMinutes: minutes });
    setSettings(updated);
  }, []);

  // Auto-lock delay
  const setAutoLockDelay = useCallback(async (seconds: number) => {
    const updated = await saveNinjaSettings({ autoLockDelaySeconds: seconds });
    setSettings(updated);
  }, []);

  // Strict Mode
  const setStrictMode = useCallback(async (enabled: boolean) => {
    const updated = await saveNinjaSettings({ strictMode: enabled });
    setSettings(updated);
  }, []);

  // Complete Onboarding
  const completeOnboarding = useCallback(async () => {
    const updated = await saveNinjaSettings({ hasCompletedOnboarding: true });
    setSettings(updated);
  }, []);

  // Ghost Launcher as Home
  const setGhostLauncherAsHome = useCallback(async (enabled: boolean) => {
    const updated = await saveNinjaSettings({ ghostLauncherAsHome: enabled });
    setSettings(updated);
  }, []);

  const notifyLifeOSChanged = useCallback(() => {
    setLifeOSRevision((prev) => prev + 1);
  }, []);

  const setProductivityMode = useCallback(async (mode: ProductivityMode) => {
    setProductivityModeState(mode);
    await setLifeOSState('productivity_mode', mode);
    const profile = PRODUCTIVITY_MODES[mode];
    // Recovery mode gently disarms strict blocking if desired or lowers unlock pressure
    if (mode === 'recovery' && settings.strictMode) {
      const updated = await saveNinjaSettings({ strictMode: false });
      setSettings(updated);
    } else if (mode === 'study') {
      const updated = await saveNinjaSettings({ unlockDurationMinutes: profile.focusMinutes });
      setSettings(updated);
    }
    notifyLifeOSChanged();
  }, [settings.strictMode, notifyLifeOSChanged]);

  // Sync intercepts
  const syncIntercepts = useCallback(async () => {
    const count = await blockerEngine.syncPendingIntercepts();
    if (count > 0) {
      const updated = await loadNinjaSettings();
      setSettings(updated);
    }
    return count;
  }, []);

  const updateQuotaPolicy = useCallback(async (packageName: string, policy: Partial<AppQuotaPolicy>) => {
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
    const updated = await saveNinjaSettings({ appQuotaPolicies: updatedPolicies });
    setSettings(updated);
  }, [settings.appQuotaPolicies]);

  const value = {
    settings,
    permissions,
    isArmed: settings.shieldActive,
    isUnlocked,
    unlockRemainingSeconds,
    isLoading,
    productivityMode,
    lifeOSRevision,
    setProductivityMode,
    notifyLifeOSChanged,
    toggleShield,
    refreshPermissions,
    setIOSSelection,
    setAndroidSelection,
    grantUnlock,
    relockNow,
    setChallengeType,
    setLockType,
    setMasterPin,
    setMasterPattern,
    setPatternVisible,
    setPatternHaptics,
    setScramblePinKeypad,
    setBiometricsEnabled,
    setDecoyEnabled,
    setUnlockDuration,
    setAutoLockDelay,
    setStrictMode,
    completeOnboarding,
    syncIntercepts,
    setGhostLauncherAsHome,
    updateQuotaPolicy,
  };

  return <NinjaContext.Provider value={value}>{children}</NinjaContext.Provider>;
}

export function useNinja(): NinjaContextType {
  const context = useContext(NinjaContext);
  if (!context) {
    throw new Error('useNinja must be used within a NinjaProvider');
  }
  return context;
}

