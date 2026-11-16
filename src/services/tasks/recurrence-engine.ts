import type { ParsedRecurrence } from './nlp-parser';

export interface RecurrenceRule extends ParsedRecurrence {
  endAfterOccurrences?: number;
}

/**
 * Computes the next wall-clock occurrence for a recurring task.
 * Preserves local wall-clock hour/minute across DST transitions by constructing
 * the next Date in local calendar units before converting to UTC ISO.
 */
export function computeNextOccurrence(
  currentDueLocalOrUtc: string | undefined,
  rule: RecurrenceRule,
  referenceNow: Date = new Date()
): { dueLocal: string; dueAtUtc: string } {
  const base = parseWallClockOrUtc(currentDueLocalOrUtc, referenceNow);
  const next = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    base.getHours(),
    base.getMinutes(),
    0,
    0
  );

  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === 'daily') {
    next.setDate(next.getDate() + interval);
  } else if (rule.frequency === 'weekly') {
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      const sortedDays = [...new Set(rule.daysOfWeek)].sort((a, b) => a - b);
      const currentDay = next.getDay();
      const laterThisWeek = sortedDays.find((d) => d > currentDay);
      if (laterThisWeek !== undefined) {
        next.setDate(next.getDate() + (laterThisWeek - currentDay));
      } else {
        const firstNextWeek = sortedDays[0];
        const daysUntilSunday = 7 - currentDay;
        const extraWeeks = (interval - 1) * 7;
        next.setDate(next.getDate() + daysUntilSunday + firstNextWeek + extraWeeks);
      }
    } else {
      next.setDate(next.getDate() + 7 * interval);
    }
  } else if (rule.frequency === 'monthly') {
    const targetDay = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + interval);
    const maxDaysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(targetDay, maxDaysInMonth));
  } else if (rule.frequency === 'yearly') {
    next.setFullYear(next.getFullYear() + interval);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const dueLocal = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())} ${pad(next.getHours())}:${pad(next.getMinutes())}`;

  return {
    dueLocal,
    dueAtUtc: next.toISOString(),
  };
}

function parseWallClockOrUtc(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  // Format "YYYY-MM-DD HH:mm" preserves wall-clock hour/min
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (match && !value.endsWith('Z')) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      0,
      0
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

