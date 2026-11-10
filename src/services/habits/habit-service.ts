import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayKey } from '../storage';

export interface HabitItem {
  id: string;
  title: string;
  category: 'mind' | 'body' | 'focus';
  icon: string;
  completedDays: string[]; // ['2026-11-09', ...]
  streak: number;
}

export interface RoutineStep {
  id: string;
  title: string;
  durationMin: number;
  isDone: boolean;
}

const HABITS_STORAGE_KEY = '@neuroninja_habits_matrix_v1';

export const DEFAULT_HABITS: HabitItem[] = [
  {
    id: 'habit_1',
    title: 'Hydrate 500ml upon waking',
    category: 'body',
    icon: 'water-outline',
    completedDays: [],
    streak: 4,
  },
  {
    id: 'habit_2',
    title: '15m Morning Breathwork',
    category: 'mind',
    icon: 'leaf-outline',
    completedDays: [],
    streak: 7,
  },
  {
    id: 'habit_3',
    title: '45m Unbroken Deep Work Sprint',
    category: 'focus',
    icon: 'flash-outline',
    completedDays: [],
    streak: 3,
  },
  {
    id: 'habit_4',
    title: 'Zero Phone in Bed past 10 PM',
    category: 'focus',
    icon: 'moon-outline',
    completedDays: [],
    streak: 6,
  },
];

export async function getHabits(): Promise<HabitItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) {
      await saveHabits(DEFAULT_HABITS);
      return DEFAULT_HABITS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_HABITS;
  }
}

export async function saveHabits(habits: HabitItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
  } catch (e) {
    console.error('Failed to save habits:', e);
  }
}

export async function toggleHabitToday(id: string): Promise<HabitItem[]> {
  const current = await getHabits();
  const today = getTodayKey();

  const updated = current.map((h) => {
    if (h.id !== id) return h;
    const isCompleted = h.completedDays.includes(today);
    let nextCompleted: string[];
    let nextStreak = h.streak;

    if (isCompleted) {
      nextCompleted = h.completedDays.filter((d) => d !== today);
      nextStreak = Math.max(0, nextStreak - 1);
    } else {
      nextCompleted = [...h.completedDays, today];
      nextStreak += 1;
    }

    return {
      ...h,
      completedDays: nextCompleted,
      streak: nextStreak,
    };
  });

  await saveHabits(updated);
  return updated;
}

