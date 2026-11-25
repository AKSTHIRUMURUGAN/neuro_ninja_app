import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleSmartReminderNotification,
  cancelSmartReminderNotification,
} from './smart-reminder-engine';

export type ReminderCategory = 'water' | 'break' | 'sleep' | 'movement' | 'study';

export interface SmartReminder {
  id: string;
  title: string;
  category: ReminderCategory;
  intervalMinutes?: number;
  time?: string; // "HH:MM"
  isEnabled: boolean;
  icon: string;
  description: string;
}

const REMINDERS_STORAGE_KEY = '@neuroninja_smart_reminders_v1';

export const DEFAULT_REMINDERS: SmartReminder[] = [
  {
    id: 'rem_water',
    title: 'Hydration Sentinel',
    category: 'water',
    intervalMinutes: 90,
    isEnabled: true,
    icon: 'water-outline',
    description: 'Prompts you to drink 250ml water every 90 minutes.',
  },
  {
    id: 'rem_break',
    title: 'Prolonged Screen Break',
    category: 'break',
    intervalMinutes: 45,
    isEnabled: true,
    icon: 'eye-outline',
    description: 'Suggests a 2-minute 20-20-20 eye reset after 45m screen time.',
  },
  {
    id: 'rem_sleep',
    title: 'Digital Curfew Wind-Down',
    category: 'sleep',
    time: '21:30',
    isEnabled: true,
    icon: 'moon-outline',
    description: 'Alerts you 30 minutes before 10 PM to disconnect screens.',
  },
  {
    id: 'rem_movement',
    title: 'Physical Stretch & Posture',
    category: 'movement',
    intervalMinutes: 120,
    isEnabled: false,
    icon: 'walk-outline',
    description: 'Prompts 10 bodyweight squats or shoulder rolls.',
  },
];

export async function getReminders(): Promise<SmartReminder[]> {
  try {
    const raw = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) {
      await saveReminders(DEFAULT_REMINDERS);
      return DEFAULT_REMINDERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export async function saveReminders(reminders: SmartReminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (e) {
    console.error('Failed to save reminders:', e);
  }
}

export async function toggleReminder(id: string): Promise<SmartReminder[]> {
  const current = await getReminders();
  const target = current.find((r) => r.id === id);
  const updated = current.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
  await saveReminders(updated);

  if (target) {
    if (!target.isEnabled) {
      // It was disabled, now enabled -> schedule
      await scheduleSmartReminderNotification({ ...target, isEnabled: true });
    } else {
      // It was enabled, now disabled -> cancel
      await cancelSmartReminderNotification(target.id);
    }
  }

  return updated;
}

export async function syncAllActiveReminders(): Promise<void> {
  const list = await getReminders();
  for (const r of list) {
    if (r.isEnabled) {
      await scheduleSmartReminderNotification(r);
    } else {
      await cancelSmartReminderNotification(r.id);
    }
  }
}


