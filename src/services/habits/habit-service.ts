import { getDatabase, generateUuid } from '../database/database';
import { addFocusCoins, getTodayKey } from '../storage';
import { villainEngine } from '../villains/villain-engine';
import {
  HabitCategory,
  HabitItemV3,
  HabitStatus,
  HabitStats,
  VerifierType,
} from './habit-types';
import {
  computeHabitStreaksAndStats,
  formatLocalDateString,
} from './streak-calculator';

// Export type aliases for backward compatibility across existing screens
export type { HabitCategory, HabitStatus, VerifierType, HabitItemV3, HabitStats };
export type HabitItemV2 = HabitItemV3;
export type HabitItem = HabitItemV3;

export interface HabitWeeklyReview {
  completedThisWeek: number;
  restDaysThisWeek: number;
  recoveriesUsed: number;
  totalPossible: number;
  adherencePercent: number;
}

function getDateKeyOffset(daysBack: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  d.setDate(d.getDate() - daysBack);
  return formatLocalDateString(d);
}

async function ensureSeededHabits(): Promise<void> {
  const db = await getDatabase();
  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM habits_v2');
  if ((countRow?.count ?? 0) > 0) return;

  const now = new Date().toISOString();
  const starters: {
    id: string;
    title: string;
    category: HabitCategory;
    icon: string;
    color: string;
    focusMin?: number;
  }[] = [
    { id: 'hab_hydrate', title: 'Hydrate 500ml upon waking', category: 'body', icon: 'water-outline', color: '#06B6D4' },
    { id: 'hab_breath', title: '10m Morning Breathwork', category: 'mind', icon: 'leaf-outline', color: '#10B981' },
    { id: 'hab_deepwork', title: '45m Unbroken Deep Work Sprint', category: 'focus', icon: 'flash-outline', color: '#818CF8', focusMin: 45 },
    { id: 'hab_curfew', title: 'Zero Phone in Bed past 10 PM', category: 'sleep', icon: 'moon-outline', color: '#F59E0B' },
  ];

  await db.withTransactionAsync(async () => {
    for (const s of starters) {
      await db.runAsync(
        `INSERT OR IGNORE INTO habits_v2
         (habit_id, title, frequency, schedule_json, category, icon, color, rest_days_json, recovery_window_days, challenge_target_days, reward_points, coin_reward, xp_reward, linked_focus_minutes, verifier_type, created_at, sync_status)
         VALUES (?, ?, 'daily', '{}', ?, ?, ?, '[0]', 1, 21, 15, 5, 25, ?, 'self', ?, 'synced')`,
        s.id,
        s.title,
        s.category,
        s.icon,
        s.color,
        s.focusMin ?? null,
        now
      );
    }
  });
}

export async function getHabits(): Promise<HabitItemV3[]> {
  await ensureSeededHabits();
  const db = await getDatabase();
  const habitRows = await db.getAllAsync<{
    habit_id: string;
    title: string;
    description: string | null;
    frequency: string;
    schedule_json: string | null;
    category: string;
    icon: string;
    color: string;
    rest_days_json: string;
    recovery_window_days: number;
    challenge_target_days: number;
    reward_points: number;
    coin_reward: number | null;
    xp_reward: number | null;
    longest_streak: number | null;
    verifier_type: string | null;
    verifier_id: string | null;
    verifier_email: string | null;
    linked_alarm_id: string | null;
    linked_focus_minutes: number | null;
    created_at: string;
    sync_status: string | null;
  }>('SELECT * FROM habits_v2 ORDER BY created_at ASC');

  const checkinRows = await db.getAllAsync<{
    habit_id: string;
    date: string;
    status: string;
    notes: string | null;
  }>('SELECT habit_id, date, status, notes FROM habit_checkins');

  const checkinsMap = new Map<
    string,
    {
      completed: string[];
      notCompleted: string[];
      recovered: string[];
      all: { date: string; status: HabitStatus }[];
      progressByDate: Map<string, number>;
    }
  >();

  for (const c of checkinRows) {
    const bucket = checkinsMap.get(c.habit_id) ?? {
      completed: [],
      notCompleted: [],
      recovered: [],
      all: [],
      progressByDate: new Map<string, number>(),
    };
    const s = (c.status as HabitStatus) || 'completed';
    bucket.all.push({ date: c.date, status: s });
    if (s === 'completed') bucket.completed.push(c.date);
    else if (s === 'not_completed') bucket.notCompleted.push(c.date);
    else if (s === 'recovered') bucket.recovered.push(c.date);

    // Parse numeric progress from notes if present (e.g. "count:4")
    if (c.notes && c.notes.startsWith('count:')) {
      const val = parseInt(c.notes.replace('count:', ''), 10);
      if (!isNaN(val)) {
        bucket.progressByDate.set(c.date, val);
      }
    }

    checkinsMap.set(c.habit_id, bucket);
  }

  const todayStr = formatLocalDateString(new Date());

  return habitRows.map((h) => {
    let restDays: number[] = [0];
    try {
      restDays = JSON.parse(h.rest_days_json) as number[];
    } catch {
      restDays = [0];
    }

    let schedule: HabitItemV3['schedule'] = undefined;
    try {
      if (h.schedule_json && h.schedule_json !== '{}') {
        schedule = JSON.parse(h.schedule_json);
      }
    } catch {
      schedule = undefined;
    }

    const bucket = checkinsMap.get(h.habit_id) ?? {
      completed: [],
      notCompleted: [],
      recovered: [],
      all: [],
      progressByDate: new Map<string, number>(),
    };

    const stats = computeHabitStreaksAndStats(bucket.all, restDays, h.created_at, schedule);

    const currentProgress = bucket.progressByDate.get(todayStr) ?? (bucket.completed.includes(todayStr) ? (schedule?.targetValue || 1) : 0);

    return {
      id: h.habit_id,
      title: h.title,
      description: h.description ?? undefined,
      frequency: (h.frequency as 'daily' | 'weekly') || 'daily',
      category: (h.category as HabitCategory) || 'mind',
      icon: h.icon || 'leaf-outline',
      color: h.color || '#10B981',
      restDays,
      recoveryWindowDays: h.recovery_window_days || 1,
      challengeTargetDays: h.challenge_target_days || 21,
      rewardPoints: h.reward_points || 15,
      coinReward: h.coin_reward ?? 5,
      xpReward: h.xp_reward ?? 25,
      streak: stats.currentStreak,
      longestStreak: Math.max(stats.longestStreak, h.longest_streak || 0),
      verifierType: (h.verifier_type as VerifierType) || 'self',
      verifierId: h.verifier_id,
      verifierEmail: h.verifier_email,
      linkedAlarmId: h.linked_alarm_id,
      linkedFocusMinutes: h.linked_focus_minutes,
      schedule,
      targetType: schedule?.targetType || 'boolean',
      targetValue: schedule?.targetValue || 1,
      targetUnit: schedule?.targetUnit,
      currentProgress,
      completedDays: bucket.completed,
      notCompletedDays: bucket.notCompleted,
      recoveredDays: bucket.recovered,
      createdAt: h.created_at,
      syncStatus: (h.sync_status as 'synced' | 'pending') || 'synced',
    };
  });
}

export async function getHabitById(habitId: string): Promise<HabitItemV3 | null> {
  const habits = await getHabits();
  return habits.find((h) => h.id === habitId) || null;
}

/**
 * Tri-State Cycle:
 * not_attempted -> not_completed (Red X) -> completed (Green Check) -> not_attempted (Reset)
 */
export async function cycleHabitStatus(
  habitId: string,
  dateStr: string
): Promise<{ newStatus: HabitStatus; streak: number; longestStreak: number }> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ checkin_id: string; status: string }>(
    'SELECT checkin_id, status FROM habit_checkins WHERE habit_id = ? AND date = ?',
    habitId,
    dateStr
  );

  const currentStatus: HabitStatus = (existing?.status as HabitStatus) || 'not_attempted';
  let nextStatus: HabitStatus;

  if (currentStatus === 'not_attempted') {
    nextStatus = 'not_completed';
  } else if (currentStatus === 'not_completed') {
    nextStatus = 'completed';
  } else {
    nextStatus = 'not_attempted';
  }

  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (nextStatus === 'not_attempted') {
      if (existing) {
        await db.runAsync('DELETE FROM habit_checkins WHERE checkin_id = ?', existing.checkin_id);
      }
    } else {
      if (existing) {
        await db.runAsync(
          'UPDATE habit_checkins SET status = ?, sync_status = ? WHERE checkin_id = ?',
          nextStatus,
          'pending',
          existing.checkin_id
        );
      } else {
        const checkinId = generateUuid('chk');
        await db.runAsync(
          `INSERT INTO habit_checkins (checkin_id, habit_id, date, status, created_at, sync_status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          checkinId,
          habitId,
          dateStr,
          nextStatus,
          now
        );
      }
    }

    // If completed, award focus coins and check verifier
    if (nextStatus === 'completed') {
      const habit = await db.getFirstAsync<{
        title: string | null;
        coin_reward: number | null;
        xp_reward: number | null;
        verifier_type: string | null;
        verifier_id: string | null;
        verifier_email: string | null;
      }>('SELECT title, coin_reward, xp_reward, verifier_type, verifier_id, verifier_email FROM habits_v2 WHERE habit_id = ?', habitId);

      await addFocusCoins(habit?.coin_reward ?? 5);

      // Strike active Daily & Weekly Villains!
      void villainEngine.dealDamage('habit', 50, habit?.title || 'Daily Habit').catch(() => {});

      // If accountability verifier exists, dispatch verification request!
      if (habit && habit.verifier_type && habit.verifier_type !== 'self' && habit.verifier_id) {
        const reqId = generateUuid('vreq');
        await db.runAsync(
          `INSERT INTO verification_requests
           (id, habit_id, date, user_id, verifier_id, verifier_email, type, status, created_at, sync_status)
           VALUES (?, ?, ?, 'local_user', ?, ?, 'habit', 'pending', ?, 'pending')`,
          reqId,
          habitId,
          dateStr,
          habit.verifier_id,
          habit.verifier_email || null,
          now
        );
      }
    }

    // Enqueue outbox job for web cloud sync
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'habit_completion', ?, 'cycle_status', ?, ?, 'pending')`,
      generateUuid('out'),
      habitId,
      JSON.stringify({ habitId, date: dateStr, status: nextStatus, timestamp: now }),
      now
    );
  });

  // Calculate updated streaks
  const checkins = await db.getAllAsync<{ date: string; status: string }>(
    'SELECT date, status FROM habit_checkins WHERE habit_id = ?',
    habitId
  );
  const habitRow = await db.getFirstAsync<{ rest_days_json: string; longest_streak: number | null; created_at: string }>(
    'SELECT rest_days_json, longest_streak, created_at FROM habits_v2 WHERE habit_id = ?',
    habitId
  );

  let restDays: number[] = [0];
  try {
    restDays = JSON.parse(habitRow?.rest_days_json || '[0]');
  } catch {
    restDays = [0];
  }

  const stats = computeHabitStreaksAndStats(
    checkins.map((c) => ({ date: c.date, status: (c.status as HabitStatus) || 'completed' })),
    restDays,
    habitRow?.created_at
  );

  const newLongest = Math.max(stats.longestStreak, habitRow?.longest_streak || 0);
  await db.runAsync(
    'UPDATE habits_v2 SET longest_streak = ? WHERE habit_id = ?',
    newLongest,
    habitId
  );

  return {
    newStatus: nextStatus,
    streak: stats.currentStreak,
    longestStreak: newLongest,
  };
}

/**
 * Returns date-indexed map of completion statuses for a habit in a specific month
 */
export async function getHabitCompletionsMap(
  habitId: string,
  year: number,
  month: number // 1-12
): Promise<Record<string, HabitStatus>> {
  const db = await getDatabase();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = await db.getAllAsync<{ date: string; status: string }>(
    "SELECT date, status FROM habit_checkins WHERE habit_id = ? AND date LIKE ? || '%'",
    habitId,
    monthPrefix
  );

  const map: Record<string, HabitStatus> = {};
  for (const r of rows) {
    map[r.date] = (r.status as HabitStatus) || 'completed';
  }
  return map;
}

/**
 * Returns date-indexed map of completion statuses across all recorded history
 * for high-performance 90-day Everyday & GitHub parity contribution heatmaps!
 */
export async function getAllHabitCompletionsMap(
  habitId?: string
): Promise<Record<string, HabitStatus>> {
  const db = await getDatabase();
  const rows = habitId
    ? await db.getAllAsync<{ date: string; status: string }>(
        'SELECT date, status FROM habit_checkins WHERE habit_id = ? ORDER BY date ASC',
        habitId
      )
    : await db.getAllAsync<{ date: string; status: string }>(
        'SELECT date, status FROM habit_checkins ORDER BY date ASC'
      );

  const map: Record<string, HabitStatus> = {};
  for (const r of rows) {
    const existing = map[r.date];
    if (!existing || r.status === 'completed' || existing !== 'completed') {
      map[r.date] = (r.status as HabitStatus) || 'completed';
    }
  }
  return map;
}

/**
 * Increments or decrements progress for numeric count habits (Done / Loop parity).
 * e.g., Glasses of water, pages read, pushups.
 */
export async function incrementHabitProgress(
  habitId: string,
  dateStr: string,
  delta: number
): Promise<{ currentProgress: number; targetValue: number; newStatus: HabitStatus }> {
  const db = await getDatabase();
  const habit = await getHabitById(habitId);
  if (!habit) {
    return { currentProgress: 0, targetValue: 1, newStatus: 'not_attempted' };
  }

  const targetValue = Math.max(1, habit.targetValue || 1);
  const existingCheckin = await db.getFirstAsync<{ status: string; notes: string | null }>(
    'SELECT status, notes FROM habit_checkins WHERE habit_id = ? AND date = ?',
    habitId,
    dateStr
  );

  let currentVal = 0;
  if (existingCheckin?.notes && existingCheckin.notes.startsWith('count:')) {
    currentVal = parseInt(existingCheckin.notes.replace('count:', ''), 10) || 0;
  } else if (existingCheckin?.status === 'completed') {
    currentVal = targetValue;
  }

  const nextVal = Math.max(0, currentVal + delta);
  const nextStatus: HabitStatus =
    nextVal >= targetValue ? 'completed' : 'not_attempted';
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (nextVal === 0) {
      await db.runAsync(
        'DELETE FROM habit_checkins WHERE habit_id = ? AND date = ?',
        habitId,
        dateStr
      );
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO habit_checkins (checkin_id, habit_id, date, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        generateUuid('chk'),
        habitId,
        dateStr,
        nextStatus,
        `count:${nextVal}`,
        now
      );
    }

    if (nextStatus === 'completed' && existingCheckin?.status !== 'completed') {
      await addFocusCoins(habit.coinReward ?? 5);
      void villainEngine.dealDamage('habit', 50, habit.title).catch(() => {});
    }
  });

  return {
    currentProgress: nextVal,
    targetValue,
    newStatus: nextStatus,
  };
}

export async function getHabitStats(habitId: string): Promise<HabitStats> {
  const db = await getDatabase();
  const checkins = await db.getAllAsync<{ date: string; status: string }>(
    'SELECT date, status FROM habit_checkins WHERE habit_id = ?',
    habitId
  );
  const habitRow = await db.getFirstAsync<{ rest_days_json: string; created_at: string }>(
    'SELECT rest_days_json, created_at FROM habits_v2 WHERE habit_id = ?',
    habitId
  );

  let restDays: number[] = [0];
  try {
    restDays = JSON.parse(habitRow?.rest_days_json || '[0]');
  } catch {
    restDays = [0];
  }

  return computeHabitStreaksAndStats(
    checkins.map((c) => ({ date: c.date, status: (c.status as HabitStatus) || 'completed' })),
    restDays,
    habitRow?.created_at
  );
}

export async function createHabit(input: {
  title: string;
  description?: string;
  category: HabitCategory;
  restDays?: number[];
  challengeTargetDays?: number;
  linkedAlarmId?: string | null;
  linkedFocusMinutes?: number | null;
  verifierType?: VerifierType;
  verifierId?: string | null;
  verifierEmail?: string | null;
  schedule?: HabitItemV3['schedule'];
}): Promise<HabitItemV3[]> {
  const db = await getDatabase();
  const iconMap: Record<HabitCategory, string> = {
    mind: 'leaf-outline',
    body: 'barbell-outline',
    focus: 'flash-outline',
    study: 'book-outline',
    sleep: 'moon-outline',
  };
  const colorMap: Record<HabitCategory, string> = {
    mind: '#10B981',
    body: '#06B6D4',
    focus: '#818CF8',
    study: '#A855F7',
    sleep: '#F59E0B',
  };

  const newId = generateUuid('hab');
  const now = new Date().toISOString();

  // If schedule has specificDays, restDays are the inverse
  let computedRestDays = input.restDays ?? [0];
  if (input.schedule?.recurrenceType === 'specific_days' && Array.isArray(input.schedule.specificDays)) {
    computedRestDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !input.schedule?.specificDays.includes(d));
  } else if (input.schedule?.recurrenceType === 'weekdays') {
    computedRestDays = [0, 6]; // Sun, Sat
  } else if (input.schedule?.recurrenceType === 'weekends') {
    computedRestDays = [1, 2, 3, 4, 5]; // Mon-Fri
  }

  const scheduleJson = input.schedule ? JSON.stringify(input.schedule) : '{}';

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO habits_v2
       (habit_id, title, description, frequency, schedule_json, category, icon, color, rest_days_json, recovery_window_days, challenge_target_days, reward_points, coin_reward, xp_reward, longest_streak, verifier_type, verifier_id, verifier_email, linked_alarm_id, linked_focus_minutes, created_at, sync_status)
       VALUES (?, ?, ?, 'daily', ?, ?, ?, ?, ?, 1, ?, 15, 5, 25, 0, ?, ?, ?, ?, ?, ?, 'pending')`,
      newId,
      input.title.trim(),
      input.description || null,
      scheduleJson,
      input.category,
      iconMap[input.category],
      colorMap[input.category],
      JSON.stringify(computedRestDays),
      input.challengeTargetDays ?? 21,
      input.verifierType || 'self',
      input.verifierId || null,
      input.verifierEmail || null,
      input.linkedAlarmId ?? null,
      input.linkedFocusMinutes ?? null,
      now
    );

    // Enqueue create outbox job
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'habit', ?, 'create', ?, ?, 'pending')`,
      generateUuid('out'),
      newId,
      JSON.stringify({ ...input, id: newId, createdAt: now }),
      now
    );
  });

  return getHabits();
}

export async function updateHabit(
  habitId: string,
  updates: Partial<{
    title: string;
    description: string;
    category: HabitCategory;
    restDays: number[];
    challengeTargetDays: number;
    verifierType: VerifierType;
    verifierId: string | null;
    verifierEmail: string | null;
    linkedFocusMinutes: number | null;
    linkedAlarmId: string | null;
    schedule: HabitItemV3['schedule'];
  }>
): Promise<HabitItemV3[]> {
  const db = await getDatabase();
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    params.push(updates.title.trim());
  }
  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    params.push(updates.description);
  }
  if (updates.category !== undefined) {
    setClauses.push('category = ?');
    params.push(updates.category);
  }
  if (updates.schedule !== undefined) {
    setClauses.push('schedule_json = ?');
    params.push(JSON.stringify(updates.schedule));
  }
  if (updates.restDays !== undefined) {
    setClauses.push('rest_days_json = ?');
    params.push(JSON.stringify(updates.restDays));
  }
  if (updates.challengeTargetDays !== undefined) {
    setClauses.push('challenge_target_days = ?');
    params.push(updates.challengeTargetDays);
  }
  if (updates.verifierType !== undefined) {
    setClauses.push('verifier_type = ?');
    params.push(updates.verifierType);
  }
  if (updates.verifierId !== undefined) {
    setClauses.push('verifier_id = ?');
    params.push(updates.verifierId);
  }
  if (updates.verifierEmail !== undefined) {
    setClauses.push('verifier_email = ?');
    params.push(updates.verifierEmail);
  }
  if (updates.linkedFocusMinutes !== undefined) {
    setClauses.push('linked_focus_minutes = ?');
    params.push(updates.linkedFocusMinutes);
  }
  if (updates.linkedAlarmId !== undefined) {
    setClauses.push('linked_alarm_id = ?');
    params.push(updates.linkedAlarmId);
  }

  if (setClauses.length > 0) {
    setClauses.push("sync_status = 'pending'");
    params.push(habitId);
    await db.runAsync(
      `UPDATE habits_v2 SET ${setClauses.join(', ')} WHERE habit_id = ?`,
      ...params
    );

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'habit', ?, 'update', ?, ?, 'pending')`,
      generateUuid('out'),
      habitId,
      JSON.stringify(updates),
      new Date().toISOString()
    );
  }

  return getHabits();
}

export async function deleteHabit(habitId: string): Promise<HabitItemV3[]> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM habits_v2 WHERE habit_id = ?', habitId);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'habit', ?, 'delete', '{}', ?, 'pending')`,
      generateUuid('out'),
      habitId,
      new Date().toISOString()
    );
  });
  return getHabits();
}

/**
 * Backward compatible toggle today
 */
export async function toggleHabitToday(habitId: string): Promise<HabitItemV3[]> {
  const today = getTodayKey();
  await cycleHabitStatus(habitId, today);
  return getHabits();
}

export async function recoverYesterdayHabit(habitId: string): Promise<HabitItemV3[]> {
  const yesterday = getDateKeyOffset(1);
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ checkin_id: string }>(
    'SELECT checkin_id FROM habit_checkins WHERE habit_id = ? AND date = ?',
    habitId,
    yesterday
  );
  if (!existing) {
    await db.runAsync(
      `INSERT INTO habit_checkins (checkin_id, habit_id, date, status, created_at, sync_status)
       VALUES (?, ?, ?, 'recovered', ?, 'pending')`,
      generateUuid('rec'),
      habitId,
      yesterday,
      new Date().toISOString()
    );
  }
  return getHabits();
}

export async function getWeeklyHabitReview(): Promise<HabitWeeklyReview> {
  const habits = await getHabits();
  if (habits.length === 0) {
    return {
      completedThisWeek: 0,
      restDaysThisWeek: 0,
      recoveriesUsed: 0,
      totalPossible: 0,
      adherencePercent: 0,
    };
  }

  const weekKeys: { key: string; dow: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekKeys.push({ key: getDateKeyOffset(i), dow: d.getDay() });
  }

  let completedThisWeek = 0;
  let restDaysThisWeek = 0;
  let recoveriesUsed = 0;
  let totalPossible = 0;

  for (const h of habits) {
    const compSet = new Set(h.completedDays);
    const recSet = new Set(h.recoveredDays);
    for (const day of weekKeys) {
      if (compSet.has(day.key)) {
        completedThisWeek++;
        totalPossible++;
      } else if (recSet.has(day.key)) {
        recoveriesUsed++;
        totalPossible++;
      } else if (h.restDays.includes(day.dow)) {
        restDaysThisWeek++;
      } else {
        totalPossible++;
      }
    }
  }

  const adherencePercent =
    totalPossible > 0
      ? Math.round(((completedThisWeek + recoveriesUsed) / totalPossible) * 100)
      : 100;

  return {
    completedThisWeek,
    restDaysThisWeek,
    recoveriesUsed,
    totalPossible,
    adherencePercent,
  };
}
