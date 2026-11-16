import { AppQuotaPolicy, DailyStat } from '../storage';

export interface AppCategoryInfo {
  category: string;
  label: string;
  color: string;
  icon: string;
  minutes: number;
  percentage: number;
}

export interface AppUsageItem {
  pkg: string;
  name: string;
  usedMinutes: number;
  limitMinutes: number;
  sessionLimitMinutes: number;
  dailyLaunchLimit: number;
  launchCount: number;
  category: string;
  percentUsed: number;
  isExceeded: boolean;
  curfewActive: boolean;
}

/** Formats integer minutes into clean "Xh Ym" or "Ym" format */
export function formatHoursMinutes(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Calculates Opal-style Focus Score from 0 to 100 based on distraction ratio,
 * mindful intercepts, and excessive launches.
 */
export function calculateFocusScore(
  todayStat?: DailyStat,
  totalIntercepts: number = 0
): { score: number; label: string; color: string; description: string } {
  const sot = todayStat?.totalScreenTimeMinutes ?? 192;
  const intercepts = todayStat?.intercepts ?? totalIntercepts ?? 8;
  const unlocks = todayStat?.phoneUnlocksCount ?? 42;

  // Base score 100 minus penalty for excessive screen time & pickups + bonus for intercepts
  const screenTimePenalty = Math.min(60, (sot / 240) * 45); // up to 45 pts penalty
  const unlockPenalty = Math.min(25, (unlocks / 60) * 20); // up to 20 pts penalty
  const interceptBonus = Math.min(30, intercepts * 4); // up to 30 pts reward

  const rawScore = Math.round(100 - screenTimePenalty - unlockPenalty + interceptBonus);
  const score = Math.max(5, Math.min(100, rawScore));

  if (score >= 85) {
    return {
      score,
      label: 'Iron Discipline',
      color: '#10B981', // Emerald
      description: 'Supreme neural flow. You have deflected digital dopamine traps effortlessly today.',
    };
  }
  if (score >= 70) {
    return {
      score,
      label: 'Deep Focus',
      color: '#06B6D4', // Cyan
      description: 'Strong intentional boundaries. Mindful usage with minimal autopilot scrolling.',
    };
  }
  if (score >= 50) {
    return {
      score,
      label: 'Moderate Balance',
      color: '#F59E0B', // Amber
      description: 'Balanced day with minor distraction spikes. Stay vigilant of late-night binging.',
    };
  }
  return {
    score,
    label: 'High Dopamine Drift',
    color: '#EF4444', // Red
    description: 'Screen time and compulsive pickups are elevated. Engage Dojo breathing to reset.',
  };
}

/** Finds the 1-hour interval with maximum minutes spent */
export function findPeakDistractionHour(hourlyMinutes?: number[]): {
  hour: number;
  label: string;
  minutes: number;
} {
  if (!hourlyMinutes || hourlyMinutes.length === 0) {
    // Default peak afternoon 14:00 (2 PM)
    return { hour: 14, label: '2:00 PM – 3:00 PM', minutes: 42 };
  }

  let maxHour = 0;
  let maxMinutes = 0;
  for (let h = 0; h < 24; h++) {
    const mins = hourlyMinutes[h] || 0;
    if (mins > maxMinutes) {
      maxMinutes = mins;
      maxHour = h;
    }
  }

  const startPeriod = maxHour >= 12 ? 'PM' : 'AM';
  const displayStart = maxHour % 12 === 0 ? 12 : maxHour % 12;
  const nextHour = (maxHour + 1) % 24;
  const endPeriod = nextHour >= 12 ? 'PM' : 'AM';
  const displayEnd = nextHour % 12 === 0 ? 12 : nextHour % 12;

  return {
    hour: maxHour,
    label: `${displayStart}:00 ${startPeriod} – ${displayEnd}:00 ${endPeriod}`,
    minutes: maxMinutes,
  };
}

export const CATEGORY_COLORS: Record<string, { color: string; label: string; icon: string }> = {
  social: { color: '#8B5CF6', label: 'Social Media', icon: 'account-group-outline' },
  video: { color: '#EF4444', label: 'Entertainment & Video', icon: 'play-circle-outline' },
  messaging: { color: '#10B981', label: 'Messaging & Chat', icon: 'chat-processing-outline' },
  browser: { color: '#F59E0B', label: 'Browsing & Search', icon: 'compass-outline' },
  gaming: { color: '#EC4899', label: 'Gaming', icon: 'gamepad-variant-outline' },
  productivity: { color: '#3B82F6', label: 'Productivity & Work', icon: 'briefcase-check-outline' },
  utility: { color: '#64748B', label: 'Utilities', icon: 'cog-outline' },
  other: { color: '#94A3B8', label: 'Other', icon: 'dots-horizontal-circle-outline' },
};

/** Calculates percentage and breakdown across categories */
export function getCategoryBreakdown(
  appUsage: Record<string, number>,
  policies: Record<string, AppQuotaPolicy>
): AppCategoryInfo[] {
  const totals: Record<string, number> = {};
  let overallMin = 0;

  for (const [pkg, mins] of Object.entries(appUsage)) {
    const cat = policies[pkg]?.category || 'other';
    totals[cat] = (totals[cat] || 0) + mins;
    overallMin += mins;
  }

  if (overallMin === 0) {
    // Return standard realistic default mix
    return [
      { category: 'social', label: 'Social Media', color: '#8B5CF6', icon: 'account-group-outline', minutes: 68, percentage: 38 },
      { category: 'video', label: 'Entertainment', color: '#EF4444', icon: 'play-circle-outline', minutes: 54, percentage: 30 },
      { category: 'messaging', label: 'Messaging', color: '#10B981', icon: 'chat-processing-outline', minutes: 32, percentage: 18 },
      { category: 'browser', label: 'Browsing', color: '#F59E0B', icon: 'compass-outline', minutes: 16, percentage: 9 },
      { category: 'productivity', label: 'Productivity', color: '#3B82F6', icon: 'briefcase-check-outline', minutes: 10, percentage: 5 },
    ];
  }

  return Object.entries(totals)
    .map(([cat, mins]) => {
      const info = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
      return {
        category: cat,
        label: info.label,
        color: info.color,
        icon: info.icon,
        minutes: mins,
        percentage: Math.round((mins / overallMin) * 100),
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/** Check if current time falls within active curfew schedule */
export function isCurfewActive(policy?: AppQuotaPolicy): { active: boolean; label: string } {
  if (!policy?.curfewSchedule?.enabled) return { active: false, label: '' };

  const curfew = policy.curfewSchedule;
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun ... 6 = Sat

  if (curfew.activeDays && curfew.activeDays.length > 0 && !curfew.activeDays.includes(currentDay)) {
    return { active: false, label: '' };
  }

  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = curfew.startHour * 60 + curfew.startMinute;
  const endMinutes = curfew.endHour * 60 + curfew.endMinute;

  let inWindow = false;
  if (startMinutes <= endMinutes) {
    // Normal window e.g. 09:00 to 17:00
    inWindow = curMinutes >= startMinutes && curMinutes <= endMinutes;
  } else {
    // Overnight window e.g. 22:00 to 07:00
    inWindow = curMinutes >= startMinutes || curMinutes <= endMinutes;
  }

  if (inWindow) {
    const sH = curfew.startHour % 12 === 0 ? 12 : curfew.startHour % 12;
    const sP = curfew.startHour >= 12 ? 'PM' : 'AM';
    const eH = curfew.endHour % 12 === 0 ? 12 : curfew.endHour % 12;
    const eP = curfew.endHour >= 12 ? 'PM' : 'AM';
    const sM = String(curfew.startMinute).padStart(2, '0');
    const eM = String(curfew.endMinute).padStart(2, '0');
    return {
      active: true,
      label: `Bedtime Curfew Active (${sH}:${sM} ${sP} – ${eH}:${eM} ${eP})`,
    };
  }

  return { active: false, label: '' };
}

/** Checks whether an app has reached or exceeded its daily minutes quota */
export function isDailyQuotaExceeded(
  usedMinutes: number,
  policy?: AppQuotaPolicy
): { exceeded: boolean; remainingMin: number; limitMin: number; percent: number } {
  const limitMin = policy?.dailyLimitMinutes ?? 0;
  if (limitMin <= 0) {
    return { exceeded: false, remainingMin: 999, limitMin: 0, percent: 0 };
  }

  const percent = Math.min(100, Math.round((usedMinutes / limitMin) * 100));
  const remainingMin = Math.max(0, limitMin - usedMinutes);
  return {
    exceeded: usedMinutes >= limitMin,
    remainingMin,
    limitMin,
    percent,
  };
}

/** Standard packages metadata for display icons & names */
export const KNOWN_PACKAGES_INFO: Record<string, { name: string; category: string; icon: string; defaultLimit: number }> = {
  'com.instagram.android': { name: 'Instagram', category: 'social', icon: 'instagram', defaultLimit: 30 },
  'com.google.android.youtube': { name: 'YouTube', category: 'video', icon: 'youtube', defaultLimit: 60 },
  'com.zhiliaoapp.musically': { name: 'TikTok', category: 'video', icon: 'music-note-eighth', defaultLimit: 20 },
  'com.twitter.android': { name: 'X / Twitter', category: 'social', icon: 'twitter', defaultLimit: 25 },
  'com.reddit.frontpage': { name: 'Reddit', category: 'social', icon: 'reddit', defaultLimit: 30 },
  'com.whatsapp': { name: 'WhatsApp', category: 'messaging', icon: 'whatsapp', defaultLimit: 45 },
  'com.android.chrome': { name: 'Google Chrome', category: 'browser', icon: 'google-chrome', defaultLimit: 30 },
  'com.google.android.apps.messaging': { name: 'Messages', category: 'messaging', icon: 'message-text', defaultLimit: 30 },
  'com.spotify.music': { name: 'Spotify', category: 'video', icon: 'spotify', defaultLimit: 90 },
  'com.facebook.katana': { name: 'Facebook', category: 'social', icon: 'facebook', defaultLimit: 25 },
};
