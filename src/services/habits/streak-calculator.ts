import { HabitStatus, HabitStats, HabitScheduleConfig } from './habit-types';

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Normalizes a date to YYYY-MM-DD in local time
 */
export function formatLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a Date strictly anchored at local NOON (12:00:00).
 * Prevents UTC-midnight timezone shifts where yesterday's date/day is returned.
 */
export function parseLocalDateSafe(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function parseLocalDateString(dateStr: string): Date {
  return parseLocalDateSafe(dateStr);
}

/**
 * Returns deterministic weekday name for any YYYY-MM-DD string
 */
export function getWeekdayNameForDate(dateStr: string): string {
  const d = parseLocalDateSafe(dateStr);
  return DAY_NAMES[d.getDay()];
}

/**
 * Determines whether a habit is scheduled to be performed on a specific date.
 * If not scheduled, the day is considered an Honored Rest Day.
 */
export function isHabitScheduledForDate(
  habit: {
    schedule?: HabitScheduleConfig;
    restDays?: number[];
    createdAt?: string;
  },
  dateStr: string
): boolean {
  const d = parseLocalDateSafe(dateStr);
  const dayOfWeek = d.getDay(); // 0=Sun..6=Sat
  const effectiveRestDays = habit.restDays || [0];

  // 1. If explicit schedule config exists
  if (habit.schedule) {
    const { recurrenceType, specificDays, intervalDays } = habit.schedule;

    switch (recurrenceType) {
      case 'specific_days':
        return Array.isArray(specificDays) && specificDays.includes(dayOfWeek);

      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5;

      case 'weekends':
        return dayOfWeek === 0 || dayOfWeek === 6;

      case 'interval': {
        const interval = Math.max(1, intervalDays || 1);
        const created = habit.createdAt
          ? parseLocalDateSafe(habit.createdAt.split('T')[0])
          : parseLocalDateSafe(dateStr);
        const diffTime = d.getTime() - created.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays % interval === 0;
      }

      case 'times_per_period':
      case 'daily':
      default:
        // Daily unless listed in restDays
        return !effectiveRestDays.includes(dayOfWeek);
    }
  }

  // 2. Fallback to restDays rule (e.g. Sunday off by default)
  return !effectiveRestDays.includes(dayOfWeek);
}

/**
 * Calculates current streak and longest streak matching industry standards:
 * - Completed days increase streak.
 * - Rest days / Unscheduled days pause without penalty and keep streak alive.
 * - Missed/Not Completed breaks the current streak.
 * - Today not yet attempted does not break yesterday's streak.
 */
export function computeHabitStreaksAndStats(
  completions: { date: string; status: HabitStatus }[],
  restDays: number[] = [0],
  createdAtStr?: string,
  schedule?: HabitScheduleConfig
): HabitStats {
  const completionMap = new Map<string, HabitStatus>();
  for (const c of completions) {
    completionMap.set(c.date, c.status);
  }

  const today = new Date();
  const todayKey = formatLocalDateString(today);

  const isRestOrOff = (dateStr: string, dayOfWeek: number) => {
    if (schedule) {
      return !isHabitScheduledForDate({ schedule, restDays, createdAt: createdAtStr }, dateStr);
    }
    return restDays.includes(dayOfWeek);
  };

  // 1. Current streak calculation: walk backwards from today
  let currentStreak = 0;
  const maxDays = 365;

  for (let offset = 0; offset < maxDays; offset++) {
    const cur = new Date();
    cur.setDate(cur.getDate() - offset);
    const key = formatLocalDateString(cur);
    const dayOfWeek = cur.getDay();
    const status = completionMap.get(key) || 'not_attempted';
    const isOffDay = isRestOrOff(key, dayOfWeek);

    if (offset === 0) {
      if (status === 'completed' || status === 'recovered') {
        currentStreak++;
        continue;
      } else if (isOffDay || status === 'not_attempted') {
        // Today is pending or rest day, continue checking yesterday
        continue;
      } else if (status === 'not_completed') {
        // Today was explicitly marked failed
        break;
      }
    } else {
      if (status === 'completed' || status === 'recovered') {
        currentStreak++;
      } else if (isOffDay) {
        // Rest day keeps streak alive
        continue;
      } else {
        // Missed or not completed breaks active streak
        break;
      }
    }
  }

  // 2. Longest streak and overall stats
  let totalCompleted = 0;
  let totalNotCompleted = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  // Sort completions chronologically
  const sortedDates = Array.from(completionMap.keys()).sort();

  if (sortedDates.length > 0) {
    const firstDate = parseLocalDateSafe(sortedDates[0]);
    const lastDate = today;

    // Walk forward from first completion to today
    for (
      let d = new Date(firstDate);
      d <= lastDate;
      d.setDate(d.getDate() + 1)
    ) {
      const key = formatLocalDateString(d);
      const dayOfWeek = d.getDay();
      const status = completionMap.get(key) || 'not_attempted';
      const isOffDay = isRestOrOff(key, dayOfWeek);

      if (status === 'completed' || status === 'recovered') {
        totalCompleted++;
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else if (status === 'not_completed') {
        totalNotCompleted++;
        runningStreak = 0;
      } else if (isOffDay) {
        // Rest day, don't break running streak
      } else {
        // Not attempted past day
        if (key !== todayKey) {
          runningStreak = 0;
        }
      }
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  const totalEvaluated = totalCompleted + totalNotCompleted;
  const completionRate =
    totalEvaluated > 0 ? Math.round((totalCompleted / totalEvaluated) * 100) : 0;
  const failureRate =
    totalEvaluated > 0 ? Math.round((totalNotCompleted / totalEvaluated) * 100) : 0;

  // Weekly adherence (last 7 days)
  let weekCompleted = 0;
  let weekExpected = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = formatLocalDateString(d);
    const dow = d.getDay();
    const status = completionMap.get(key) || 'not_attempted';
    const isOffDay = isRestOrOff(key, dow);

    if (!isOffDay) {
      weekExpected++;
      if (status === 'completed' || status === 'recovered') {
        weekCompleted++;
      }
    }
  }

  const weeklyAdherence =
    weekExpected > 0 ? Math.round((weekCompleted / weekExpected) * 100) : 100;

  return {
    currentStreak,
    longestStreak,
    totalCompleted,
    totalNotCompleted,
    completionRate,
    failureRate,
    weeklyAdherence,
  };
}

export interface ChartDataItem {
  label: string;
  completions: number;
  maxDays: number;
}

export interface HabitDetailedStatsResult {
  totalDays: number;
  completedCount: number;
  notCompletedCount: number;
  missedCount: number;
  completionRate: number;
  failureRate: number;
  missedRate: number;
  habitScore: number;
  currentStreak: number;
  bestStreak: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
}

export function calculateHabitComprehensiveStats(
  completions: Record<string, HabitStatus>,
  habit: {
    createdAt?: string;
    schedule?: HabitScheduleConfig;
    restDays?: number[];
    longestStreak?: number;
  }
): HabitDetailedStatsResult {
  const today = new Date();
  const todayKey = formatLocalDateString(today);
  const createdDate = habit.createdAt ? parseLocalDateSafe(habit.createdAt.split('T')[0]) : new Date(today.getFullYear(), 0, 1);
  
  // Calculate day difference between createdDate and today
  const diffTime = today.getTime() - createdDate.getTime();
  const daySpan = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

  let completedCount = 0;
  let notCompletedCount = 0;
  let missedCount = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  let thisYear = 0;

  const currentYearNum = today.getFullYear();
  const currentMonthNum = today.getMonth();

  // Start of current week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Traverse all dates from createdDate up to today
  for (let d = new Date(createdDate); d <= today; d.setDate(d.getDate() + 1)) {
    const key = formatLocalDateString(d);
    const status = completions[key] || 'not_attempted';
    const isScheduled = isHabitScheduledForDate(habit, key);

    if (status === 'completed' || status === 'recovered') {
      completedCount++;
      const dTime = d.getTime();
      if (dTime >= startOfWeek.getTime()) {
        thisWeek++;
      }
      if (d.getFullYear() === currentYearNum && d.getMonth() === currentMonthNum) {
        thisMonth++;
      }
      if (d.getFullYear() === currentYearNum) {
        thisYear++;
      }
    } else if (status === 'not_completed') {
      notCompletedCount++;
    } else {
      // not_attempted: if it was in the past and scheduled, count as missed
      if (key < todayKey && isScheduled) {
        missedCount++;
      }
    }
  }

  // Total days tracked
  const totalDays = Math.max(daySpan, completedCount + notCompletedCount + missedCount, 1);
  const completionRate = Math.min(100, Math.round((completedCount / totalDays) * 100));
  const failureRate = Math.min(100, Math.round((notCompletedCount / totalDays) * 100));
  const missedRate = Math.max(0, 100 - completionRate - failureRate);

  // Streak calculations
  const basicStats = computeHabitStreaksAndStats(
    Object.entries(completions).map(([date, status]) => ({ date, status })),
    habit.restDays,
    habit.createdAt,
    habit.schedule
  );

  const bestStreak = Math.max(basicStats.longestStreak, habit.longestStreak || 0, basicStats.currentStreak);
  const habitScore = completionRate; // 0-100 score

  return {
    totalDays,
    completedCount,
    notCompletedCount,
    missedCount,
    completionRate,
    failureRate,
    missedRate,
    habitScore,
    currentStreak: basicStats.currentStreak,
    bestStreak,
    thisWeek,
    thisMonth,
    thisYear,
  };
}

export function getHabitMonthlyCompletions(
  completions: Record<string, HabitStatus>,
  year: number
): ChartDataItem[] {
  const result: ChartDataItem[] = [];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let m = 0; m < 12; m++) {
    const maxDays = new Date(year, m + 1, 0).getDate();
    let count = 0;
    for (let day = 1; day <= maxDays; day++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = completions[key];
      if (status === 'completed' || status === 'recovered') {
        count++;
      }
    }
    result.push({
      label: monthLabels[m],
      completions: count,
      maxDays,
    });
  }
  return result;
}

export function getHabitWeeklyCompletions(
  completions: Record<string, HabitStatus>
): ChartDataItem[] {
  const result: ChartDataItem[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7 - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    let count = 0;
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + dayOffset);
      const key = formatLocalDateString(d);
      const status = completions[key];
      if (status === 'completed' || status === 'recovered') {
        count++;
      }
    }

    result.push({
      label: i === 0 ? 'This Wk' : `${i}w ago`,
      completions: count,
      maxDays: 7,
    });
  }
  return result;
}

export function getHabitYearlyCompletions(
  completions: Record<string, HabitStatus>
): ChartDataItem[] {
  const result: ChartDataItem[] = [];
  const currentYear = new Date().getFullYear();

  for (let i = 4; i >= 0; i--) {
    const year = currentYear - i;
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const maxDays = isLeap ? 366 : 365;

    let count = 0;
    Object.entries(completions).forEach(([dateStr, status]) => {
      if ((status === 'completed' || status === 'recovered') && dateStr.startsWith(`${year}-`)) {
        count++;
      }
    });

    result.push({
      label: String(year),
      completions: count,
      maxDays,
    });
  }
  return result;
}
