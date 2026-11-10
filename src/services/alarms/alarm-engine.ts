import AsyncStorage from '@react-native-async-storage/async-storage';

export type MissionType = 'math' | 'shake' | 'breath' | 'qr';

export interface MissionAlarm {
  id: string;
  label: string;
  time: string; // "HH:MM" 24h
  days: number[]; // 0=Sun, 1=Mon ... 6=Sat
  isEnabled: boolean;
  mission: MissionType;
  difficulty: 'easy' | 'medium' | 'hard';
  snoozeCount: number;
  wakeCheckEnabled: boolean;
}

const ALARMS_STORAGE_KEY = '@neuroninja_mission_alarms_v1';

export const DEFAULT_ALARMS: MissionAlarm[] = [
  {
    id: 'alarm_1',
    label: 'Ninja Morning Wakeup',
    time: '06:30',
    days: [1, 2, 3, 4, 5],
    isEnabled: true,
    mission: 'math',
    difficulty: 'medium',
    snoozeCount: 0,
    wakeCheckEnabled: true,
  },
  {
    id: 'alarm_2',
    label: 'Deep Work Session',
    time: '14:00',
    days: [1, 2, 3, 4, 5],
    isEnabled: false,
    mission: 'shake',
    difficulty: 'easy',
    snoozeCount: 0,
    wakeCheckEnabled: false,
  },
];

export async function getAlarms(): Promise<MissionAlarm[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
    if (!raw) {
      await saveAlarms(DEFAULT_ALARMS);
      return DEFAULT_ALARMS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ALARMS;
  }
}

export async function saveAlarms(alarms: MissionAlarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
  } catch (e) {
    console.error('Failed to save alarms:', e);
  }
}

export async function toggleAlarm(id: string): Promise<MissionAlarm[]> {
  const current = await getAlarms();
  const updated = current.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a));
  await saveAlarms(updated);
  return updated;
}

export async function addAlarm(alarm: Omit<MissionAlarm, 'id'>): Promise<MissionAlarm[]> {
  const current = await getAlarms();
  const newAlarm: MissionAlarm = {
    ...alarm,
    id: `alarm_${Date.now()}`,
  };
  const updated = [...current, newAlarm];
  await saveAlarms(updated);
  return updated;
}

export async function deleteAlarm(id: string): Promise<MissionAlarm[]> {
  const current = await getAlarms();
  const updated = current.filter((a) => a.id !== id);
  await saveAlarms(updated);
  return updated;
}

