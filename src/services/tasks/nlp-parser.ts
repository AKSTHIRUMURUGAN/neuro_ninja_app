export type ParsedPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ParsedRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[]; // 0=Sun..6=Sat
}

export interface NlpParseResult {
  cleanTitle: string;
  dueLocal?: string; // ISO local datetime or YYYY-MM-DD HH:mm
  dueAtUtc?: string;
  dueDateLabel?: string;
  priority?: ParsedPriority;
  estimatedMinutes?: number;
  recurrence?: ParsedRecurrence;
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
  matchedTokens: string[];
  hasInterpretation: boolean;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Deterministic natural-language task parser.
 * Extracts candidate date, time, recurrence, priority, estimated duration, and #tags.
 * Caller MUST display candidate fields to the user for explicit confirmation before saving.
 */
export function parseTaskNaturalLanguage(rawInput: string, now: Date = new Date()): NlpParseResult {
  let working = rawInput.trim();
  const matchedTokens: string[] = [];
  const tags: string[] = [];

  // 1. Extract #tags
  working = working.replace(/#([a-zA-Z0-9_-]+)/g, (full, tag: string) => {
    tags.push(tag.toLowerCase());
    matchedTokens.push(full);
    return '';
  });

  // 2. Priority extraction
  let priority: ParsedPriority | undefined;
  const priorityPatterns: { regex: RegExp; val: ParsedPriority }[] = [
    { regex: /\b(urgent|p1|asap|critical)\b/i, val: 'urgent' },
    { regex: /\b(high priority|high|p2|important)\b/i, val: 'high' },
    { regex: /\b(low priority|low|p4|someday)\b/i, val: 'low' },
  ];
  for (const p of priorityPatterns) {
    const m = working.match(p.regex);
    if (m) {
      priority = p.val;
      matchedTokens.push(m[0]);
      working = working.replace(p.regex, '');
      break;
    }
  }

  // 3. Duration extraction (e.g. "for 45m", "for 2 hours", "30 mins")
  let estimatedMinutes: number | undefined;
  const durMatch = working.match(/\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
  if (durMatch) {
    const qty = parseFloat(durMatch[1]);
    const unit = durMatch[2].toLowerCase();
    estimatedMinutes = unit.startsWith('h') ? Math.round(qty * 60) : Math.round(qty);
    matchedTokens.push(durMatch[0]);
    working = working.replace(durMatch[0], '');
  }

  // 4. Recurrence extraction (e.g. "every day", "every Monday", "every 2 weeks")
  let recurrence: ParsedRecurrence | undefined;
  const everyDayMatch = working.match(/\b(every\s+day|daily)\b/i);
  const everyWeekdayMatch = working.match(/\bevery\s+(sunday|sun|monday|mon|tuesday|tues?|wednesday|wed|thursday|thurs?|friday|fri|saturday|sat)\b/i);
  const everyWeekMatch = working.match(/\b(every\s+week|weekly)\b/i);
  const everyMonthMatch = working.match(/\b(every\s+month|monthly)\b/i);

  if (everyWeekdayMatch) {
    const dayNum = WEEKDAYS[everyWeekdayMatch[1].toLowerCase()];
    recurrence = { frequency: 'weekly', interval: 1, daysOfWeek: [dayNum] };
    matchedTokens.push(everyWeekdayMatch[0]);
    working = working.replace(everyWeekdayMatch[0], '');
  } else if (everyDayMatch) {
    recurrence = { frequency: 'daily', interval: 1 };
    matchedTokens.push(everyDayMatch[0]);
    working = working.replace(everyDayMatch[0], '');
  } else if (everyWeekMatch) {
    recurrence = { frequency: 'weekly', interval: 1, daysOfWeek: [now.getDay()] };
    matchedTokens.push(everyWeekMatch[0]);
    working = working.replace(everyWeekMatch[0], '');
  } else if (everyMonthMatch) {
    recurrence = { frequency: 'monthly', interval: 1 };
    matchedTokens.push(everyMonthMatch[0]);
    working = working.replace(everyMonthMatch[0], '');
  }

  // 5. Date extraction
  let targetDate: Date | null = null;
  let dateFound = false;

  if (/\btomorrow\b/i.test(working)) {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    dateFound = true;
    matchedTokens.push('tomorrow');
    working = working.replace(/\btomorrow\b/i, '');
  } else if (/\btoday\b|\btonight\b/i.test(working)) {
    targetDate = new Date(now);
    const isTonight = /\btonight\b/i.test(working);
    if (isTonight) targetDate.setHours(20, 0, 0, 0);
    dateFound = true;
    matchedTokens.push(isTonight ? 'tonight' : 'today');
    working = working.replace(/\btoday\b|\btonight\b/i, '');
  } else {
    const nextDayMatch = working.match(/\b(?:next|this)?\s*(sunday|sun|monday|mon|tuesday|tues?|wednesday|wed|thursday|thurs?|friday|fri|saturday|sat)\b/i);
    if (nextDayMatch) {
      const wantedDay = WEEKDAYS[nextDayMatch[1].toLowerCase()];
      targetDate = new Date(now);
      let delta = (wantedDay - targetDate.getDay() + 7) % 7;
      if (delta === 0) delta = 7;
      targetDate.setDate(targetDate.getDate() + delta);
      dateFound = true;
      matchedTokens.push(nextDayMatch[0]);
      working = working.replace(nextDayMatch[0], '');
    } else {
      const inDaysMatch = working.match(/\bin\s+(\d+)\s+days?\b/i);
      if (inDaysMatch) {
        const addDays = parseInt(inDaysMatch[1], 10);
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + addDays);
        dateFound = true;
        matchedTokens.push(inDaysMatch[0]);
        working = working.replace(inDaysMatch[0], '');
      }
    }
  }

  // 6. Time extraction (e.g. "at 3pm", "at 14:30", "9:15 am")
  const timeMatch = working.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  let timeFound = false;
  if (timeMatch && (timeMatch[3] || timeMatch[2] || /\bat\s+/i.test(timeMatch[0]))) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;

      if (!targetDate) {
        targetDate = new Date(now);
        if (hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes())) {
          targetDate.setDate(targetDate.getDate() + 1);
        }
      }
      targetDate.setHours(hour, minute, 0, 0);
      timeFound = true;
      dateFound = true;
      matchedTokens.push(timeMatch[0]);
      working = working.replace(timeMatch[0], '');
    }
  } else if (dateFound && targetDate && targetDate.getHours() === now.getHours()) {
    // Default due time for date-only expressions: 09:00
    targetDate.setHours(9, 0, 0, 0);
  }

  const cleanTitle = working.replace(/\s+/g, ' ').replace(/^[\s,-]+|[\s,-]+$/g, '') || rawInput.trim();

  let dueLocal: string | undefined;
  let dueAtUtc: string | undefined;
  let dueDateLabel: string | undefined;

  if (dateFound && targetDate) {
    dueLocal = formatLocalIso(targetDate);
    dueAtUtc = targetDate.toISOString();
    dueDateLabel = targetDate.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(timeFound ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
  }

  const hasInterpretation = Boolean(
    dueAtUtc || priority || estimatedMinutes || recurrence || tags.length > 0
  );

  return {
    cleanTitle,
    dueLocal,
    dueAtUtc,
    dueDateLabel,
    priority,
    estimatedMinutes,
    recurrence,
    tags,
    confidence: matchedTokens.length >= 2 ? 'high' : matchedTokens.length === 1 ? 'medium' : 'low',
    matchedTokens,
    hasInterpretation,
  };
}

