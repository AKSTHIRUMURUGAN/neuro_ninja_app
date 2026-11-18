import type { SuppressedNotification } from 'expo-app-blocker';

export type AppNotificationCategory =
  | 'Communication'
  | 'Social'
  | 'Productivity'
  | 'Study'
  | 'Media'
  | 'Utility'
  | 'General';

export interface AppNotificationGroup {
  packageName: string;
  appName: string;
  category: AppNotificationCategory;
  count: number;
  latestPostTime: number;
  latestFormattedTime: string;
  items: SuppressedNotification[];
}

export function inferAppNotificationCategory(
  packageName: string,
  appName: string
): AppNotificationCategory {
  const p = (packageName + ' ' + appName).toLowerCase();

  if (
    p.includes('whatsapp') ||
    p.includes('telegram') ||
    p.includes('signal') ||
    p.includes('message') ||
    p.includes('chat') ||
    p.includes('sms') ||
    p.includes('discord') ||
    p.includes('slack') ||
    p.includes('teams')
  ) {
    return 'Communication';
  }

  if (
    p.includes('instagram') ||
    p.includes('facebook') ||
    p.includes('twitter') ||
    p.includes('reddit') ||
    p.includes('threads') ||
    p.includes('snapchat') ||
    p.includes('tiktok') ||
    p.includes('linkedin')
  ) {
    return 'Social';
  }

  if (
    p.includes('gmail') ||
    p.includes('mail') ||
    p.includes('outlook') ||
    p.includes('calendar') ||
    p.includes('notion') ||
    p.includes('todo') ||
    p.includes('keep') ||
    p.includes('trello') ||
    p.includes('asana')
  ) {
    return 'Productivity';
  }

  if (
    p.includes('youtube') ||
    p.includes('spotify') ||
    p.includes('music') ||
    p.includes('netflix') ||
    p.includes('prime') ||
    p.includes('hulu') ||
    p.includes('hotstar')
  ) {
    return 'Media';
  }

  if (
    p.includes('study') ||
    p.includes('duolingo') ||
    p.includes('anki') ||
    p.includes('coursera') ||
    p.includes('udemy') ||
    p.includes('quiz')
  ) {
    return 'Study';
  }

  if (
    p.includes('uber') ||
    p.includes('zomato') ||
    p.includes('swiggy') ||
    p.includes('amazon') ||
    p.includes('bank') ||
    p.includes('pay')
  ) {
    return 'Utility';
  }

  return 'General';
}

/**
 * Removes duplicate notifications based on unique ID or identical
 * (packageName + title + body) content signature, preserving the newest entry.
 */
export function deduplicateNotifications(
  notifications: SuppressedNotification[]
): SuppressedNotification[] {
  if (!notifications || notifications.length === 0) return [];

  const map = new Map<string, SuppressedNotification>();

  for (const n of notifications) {
    const pkg = (n.packageName || '').trim().toLowerCase();
    const title = (n.title || '')
      .normalize('NFKD')
      .replace(/\s+/gu, ' ')
      .trim()
      .toLowerCase();
    const body = (n.body || '')
      .normalize('NFKD')
      .replace(/\s+/gu, ' ')
      .trim()
      .toLowerCase();

    // Primary exact content signature
    const sig = `${pkg}:::${title}:::${body}`;
    const id = n.id ? String(n.id).trim() : '';

    // Prefer content signature if non-trivial, otherwise fallback to id
    const primaryKey = sig.length > 5 ? sig : id;

    const existing = map.get(primaryKey);

    if (!existing || (n.postTime || 0) >= (existing.postTime || 0)) {
      map.set(primaryKey, n);
    }
  }

  // Second pass: if two notifications from same package have identical title and post times within 120 seconds, keep newest
  const dedupedList = Array.from(map.values()).sort((a, b) => (b.postTime || 0) - (a.postTime || 0));
  const finalCleaned: SuppressedNotification[] = [];
  const secondaryMap = new Map<string, SuppressedNotification>();

  for (const item of dedupedList) {
    const pkg = (item.packageName || '').trim().toLowerCase();
    const title = (item.title || '')
      .normalize('NFKD')
      .replace(/\s+/gu, ' ')
      .trim()
      .toLowerCase();

    // Group near-duplicate alerts from same app with same title within 5 minutes
    const roundedTime = Math.floor((item.postTime || 0) / (5 * 60 * 1000));
    const titleTimeKey = `${pkg}:::${title}:::${roundedTime}`;

    if (!secondaryMap.has(titleTimeKey)) {
      secondaryMap.set(titleTimeKey, item);
      finalCleaned.push(item);
    }
  }

  return finalCleaned.sort((a, b) => (b.postTime || 0) - (a.postTime || 0));
}

/**
 * Groups a flat array of suppressed notifications by application package name.
 * Automatically cleanses duplicate alerts before grouping.
 * Sorts internal items by postTime descending (newest first).
 * Sorts groups by latestPostTime descending.
 */
export function groupNotificationsByApp(
  notifications: SuppressedNotification[]
): AppNotificationGroup[] {
  if (!notifications || notifications.length === 0) return [];

  const deduped = deduplicateNotifications(notifications);
  const map = new Map<string, SuppressedNotification[]>();

  for (const n of deduped) {
    const pkg = n.packageName || 'unknown';
    const list = map.get(pkg) || [];
    list.push(n);
    map.set(pkg, list);
  }

  const groups: AppNotificationGroup[] = [];

  for (const [pkg, items] of map.entries()) {
    // Sort items newest first
    items.sort((a, b) => (b.postTime || 0) - (a.postTime || 0));

    const newest = items[0];
    const appName = newest?.appName || pkg.split('.').pop() || 'Unknown App';
    const category = inferAppNotificationCategory(pkg, appName);

    groups.push({
      packageName: pkg,
      appName,
      category,
      count: items.length,
      latestPostTime: newest?.postTime || 0,
      latestFormattedTime: newest?.formattedTime || '',
      items,
    });
  }

  // Sort groups: newest notification on top
  groups.sort((a, b) => b.latestPostTime - a.latestPostTime);

  return groups;
}

export interface PaginationResult<T> {
  data: T[];
  hasMore: boolean;
  total: number;
  remaining: number;
  currentPage: number;
  pageSize: number;
}

/**
 * High-performance array pagination helper (10 by 10 chunking)
 */
export function paginateList<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10
): PaginationResult<T> {
  const safePage = Math.max(1, page);
  const total = items.length;
  const countToShow = safePage * pageSize;
  const data = items.slice(0, countToShow);
  const remaining = Math.max(0, total - countToShow);
  const hasMore = remaining > 0;

  return {
    data,
    hasMore,
    total,
    remaining,
    currentPage: safePage,
    pageSize,
  };
}
