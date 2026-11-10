import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    background: '#F8FAFC',
    backgroundElement: '#EDF2F7',
    backgroundSelected: '#E2E8F0',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#D1FAE5',
    accent: '#6366F1',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#070A11',
    backgroundElement: '#0F172A',
    backgroundSelected: '#1E293B',
    card: '#0D1526',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    primary: '#10B981',
    primaryDark: '#047857',
    primaryLight: 'rgba(16, 185, 129, 0.15)',
    accent: '#818CF8',
    danger: '#F87171',
    warning: '#FBBF24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const NinjaPalette = {
  emerald: '#10B981',
  emeraldGlow: 'rgba(16, 185, 129, 0.35)',
  emeraldDark: '#064E3B',
  slateDark: '#070A11',
  cardBg: '#0F1829',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  danger: '#EF4444',
  amber: '#F59E0B',
  cyan: '#06B6D4',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const BottomTabInset = Platform.select({ ios: 65, android: 85 }) ?? 75;
export const MaxContentWidth = 800;
