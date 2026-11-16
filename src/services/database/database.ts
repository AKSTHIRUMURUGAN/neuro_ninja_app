import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runMigrations } from './migrations';

const DB_NAME = 'neuroninja_lifeos.db';
const MIGRATED_FLAG_KEY = '@nn_migrated_to_sqlite_v1';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getLocalTimezoneId(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function generateUuid(prefix: string = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await runMigrations(db);
    await seedAndMigrateLegacyData(db);
    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

async function seedAndMigrateLegacyData(db: SQLite.SQLiteDatabase): Promise<void> {
  const alreadyMigrated = await AsyncStorage.getItem(MIGRATED_FLAG_KEY);
  const now = new Date().toISOString();

  // Ensure default task lists exist
  await db.withTransactionAsync(async () => {
    const existingLists = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM task_lists'
    );
    if ((existingLists?.count ?? 0) === 0) {
      const defaults = [
        { id: 'list_inbox', title: 'Inbox', color: '#06B6D4', icon: 'inbox-outline', order: 0 },
        { id: 'list_study', title: 'Study', color: '#818CF8', icon: 'book-open-outline', order: 1 },
        { id: 'list_work', title: 'Work', color: '#F59E0B', icon: 'briefcase-outline', order: 2 },
        { id: 'list_personal', title: 'Personal', color: '#10B981', icon: 'account-outline', order: 3 },
      ];
      for (const l of defaults) {
        await db.runAsync(
          'INSERT OR IGNORE INTO task_lists (list_id, title, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          l.id,
          l.title,
          l.color,
          l.icon,
          l.order,
          now
        );
      }
    }

    // Ensure default finance profile exists
    await db.runAsync(
      "INSERT OR IGNORE INTO finance_profile (id, currency, monthly_budget, savings_goal, updated_at) VALUES ('default_profile', '₹', 25000, 100000, ?)",
      now
    );
  });

  if (alreadyMigrated === 'true') return;

  try {
    // 1. Migrate legacy alarms
    const rawAlarms = await AsyncStorage.getItem('@neuroninja_mission_alarms_v1');
    if (rawAlarms) {
      const legacyAlarms = JSON.parse(rawAlarms) as {
        id: string;
        label: string;
        time: string;
        days: number[];
        isEnabled: boolean;
        mission: string;
        difficulty: string;
        snoozeCount: number;
        wakeCheckEnabled: boolean;
      }[];
      await db.withTransactionAsync(async () => {
        for (const a of legacyAlarms) {
          const [hStr, mStr] = (a.time || '06:30').split(':');
          const hour = Number(hStr) || 6;
          const minute = Number(mStr) || 30;
          await db.runAsync(
            `INSERT OR IGNORE INTO alarms
             (alarm_id, label, hour, minute, days_json, enabled, sound_id, vibrate, snooze_limit, snooze_interval_minutes, wake_check_enabled, wake_check_delay_minutes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'zen_bell', 1, 3, 5, ?, 3, ?, ?)`,
            a.id,
            a.label,
            hour,
            minute,
            JSON.stringify(a.days ?? [1, 2, 3, 4, 5]),
            a.isEnabled ? 1 : 0,
            a.wakeCheckEnabled ? 1 : 0,
            now,
            now
          );
          await db.runAsync(
            `INSERT OR IGNORE INTO alarm_missions
             (mission_id, alarm_id, mission_type, config_json, fallback_type, enabled)
             VALUES (?, ?, ?, ?, 'emergency', 1)`,
            `mis_${a.id}`,
            a.id,
            a.mission === 'breath' ? 'memory' : a.mission || 'math',
            JSON.stringify({ difficulty: a.difficulty || 'medium', count: 3, targetShakes: 20 })
          );
        }
      });
    }

    // 2. Migrate legacy habits
    const rawHabits = await AsyncStorage.getItem('@neuroninja_habits_matrix_v1');
    if (rawHabits) {
      const legacyHabits = JSON.parse(rawHabits) as {
        id: string;
        title: string;
        category: string;
        icon: string;
        completedDays: string[];
      }[];
      await db.withTransactionAsync(async () => {
        for (const h of legacyHabits) {
          await db.runAsync(
            `INSERT OR IGNORE INTO habits_v2
             (habit_id, title, frequency, schedule_json, category, icon, color, rest_days_json, recovery_window_days, challenge_target_days, reward_points, created_at)
             VALUES (?, ?, 'daily', '{}', ?, ?, '#10B981', '[0]', 1, 21, 15, ?)`,
            h.id,
            h.title,
            h.category || 'mind',
            h.icon || 'leaf-outline',
            now
          );
          for (const d of h.completedDays ?? []) {
            await db.runAsync(
              `INSERT OR IGNORE INTO habit_checkins (checkin_id, habit_id, date, status, created_at)
               VALUES (?, ?, ?, 'completed', ?)`,
              `chk_${h.id}_${d}`,
              h.id,
              d,
              now
            );
          }
        }
      });
    }

    // 3. Migrate legacy reminders into tasks
    const rawReminders = await AsyncStorage.getItem('@neuroninja_smart_reminders_v1');
    if (rawReminders) {
      const legacyReminders = JSON.parse(rawReminders) as {
        id: string;
        title: string;
        description: string;
        isEnabled: boolean;
        time?: string;
        intervalMinutes?: number;
      }[];
      const tz = getLocalTimezoneId();
      await db.withTransactionAsync(async () => {
        for (const r of legacyReminders) {
          await db.runAsync(
            `INSERT OR IGNORE INTO tasks
             (task_id, title, description, status, priority, list_id, timezone_id, recurrence_json, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'normal', 'list_personal', ?, ?, 'manual', ?, ?)`,
            `task_${r.id}`,
            r.title,
            r.description ?? '',
            r.isEnabled ? 'planned' : 'inbox',
            tz,
            r.intervalMinutes
              ? JSON.stringify({ frequency: 'daily', interval: 1 })
              : null,
            now,
            now
          );
        }
      });
    }

    await AsyncStorage.setItem(MIGRATED_FLAG_KEY, 'true');
  } catch (err) {
    console.warn('SQLite legacy migration encountered a non-fatal error:', err);
  }
}

export async function getLifeOSState<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value_json: string }>(
      'SELECT value_json FROM lifeos_state WHERE key = ?',
      key
    );
    if (!row) return fallback;
    return JSON.parse(row.value_json) as T;
  } catch {
    return fallback;
  }
}

export async function setLifeOSState<T>(key: string, value: T): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO lifeos_state (key, value_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    key,
    JSON.stringify(value),
    new Date().toISOString()
  );
}

