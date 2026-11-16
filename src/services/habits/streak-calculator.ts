import { HabitStatus, HabitStats } from './habit-types';

/**
 * Normalizes a date to YYYY-MM-DD in local time
 */
export function formatLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Calculates current streak and longest streak matching industry standards:
 * - Completed days increase streak.
 * - Rest days (e.g. Sunday) pause without penalty and keep streak alive.
 * - Missed/Not Completed breaks the current streak.
 * - Today not yet attempted does not break yesterday's streak.
 */
export function computeHabitStreaksAndStats(
  completions: { date: string; status: HabitStatus }[],
  restDays: number[] = [0],
  createdAtStr?: string
): HabitStats {
  const completionMap = new Map<string, HabitStatus>();
  for (const c of completions) {
    completionMap.set(c.date, c.status);
  }

  const today = new Date();
  const todayKey = formatLocalDateString(today);

  // 1. Current streak calculation: walk backwards from today
  let currentStreak = 0;
  const maxDays = 365;

  for (let offset = 0; offset < maxDays; offset++) {
    const cur = new Date();
    cur.setDate(cur.getDate() - offset);
    const key = formatLocalDateString(cur);
    const dayOfWeek = cur.getDay();
    const status = completionMap.get(key) || 'not_attempted';

    if (offset === 0) {
      if (status === 'completed' || status === 'recovered') {
        currentStreak++;
        continue;
      } else if (restDays.includes(dayOfWeek) || status === 'not_attempted') {
        // Today is pending or rest day, continue checking yesterday
        continue;
      } else if (status === 'not_completed') {
        // Today was explicitly marked failed
        break;
      }
    } else {
      if (status === 'completed' || status === 'recovered') {
        currentStreak++;
      } else if (restDays.includes(dayOfWeek)) {
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
    const firstDate = parseLocalDateString(sortedDates[0]);
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

      if (status === 'completed' || status === 'recovered') {
        totalCompleted++;
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else if (status === 'not_completed') {
        totalNotCompleted++;
        runningStreak = 0;
      } else if (restDays.includes(dayOfWeek)) {
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

    if (!restDays.includes(dow)) {
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
