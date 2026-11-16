import AsyncStorage from '@react-native-async-storage/async-storage';

export type DisguiseMode = 'none' | 'calculator' | 'game_vault' | 'notes' | 'clock';

export interface VaultConfig {
  disguiseMode: DisguiseMode;
  secretVaultPin: string;
  hiddenPackages: string[];
  vaultDecoyActive: boolean;
}

const VAULT_STORAGE_KEY = '@neuro_ninja_vault_config_v1';

export const DEFAULT_VAULT_CONFIG: VaultConfig = {
  disguiseMode: 'none',
  secretVaultPin: '1234',
  hiddenPackages: ['com.instagram.android', 'com.zhiliaoapp.musically'],
  vaultDecoyActive: false,
};

export async function loadVaultConfig(): Promise<VaultConfig> {
  try {
    const raw = await AsyncStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return DEFAULT_VAULT_CONFIG;
    return { ...DEFAULT_VAULT_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load vault config:', e);
    return DEFAULT_VAULT_CONFIG;
  }
}

export async function saveVaultConfig(patch: Partial<VaultConfig>): Promise<VaultConfig> {
  try {
    const current = await loadVaultConfig();
    const updated = { ...current, ...patch };
    await AsyncStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save vault config:', e);
    return DEFAULT_VAULT_CONFIG;
  }
}

export const DISGUISE_PROFILES: Record<
  DisguiseMode,
  { name: string; subtitle: string; icon: string; color: string }
> = {
  none: {
    name: 'NeuroNinja Shinobi',
    subtitle: 'Standard cyberpunk focus warrior brand',
    icon: 'sword',
    color: '#10B981',
  },
  calculator: {
    name: 'Calc+ Stealth Vault',
    subtitle: 'Fully functioning math calculator with secret PIN bypass',
    icon: 'calculator',
    color: '#06B6D4',
  },
  game_vault: {
    name: 'Game Space Arcade',
    subtitle: 'Disguised as high-performance gaming booster & chess dojo',
    icon: 'gamepad-variant',
    color: '#8B5CF6',
  },
  notes: {
    name: 'Quick Notepad',
    subtitle: 'Disguised as minimalist offline memo editor',
    icon: 'notebook',
    color: '#F59E0B',
  },
  clock: {
    name: 'World Chronometer',
    subtitle: 'Disguised as minimalist world clock & stopwatch',
    icon: 'clock-outline',
    color: '#64748B',
  },
};
