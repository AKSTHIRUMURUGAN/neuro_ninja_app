import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SmartReminder } from './reminder-service';

export const CATEGORY_HYDRATION = 'CATEGORY_HYDRATION';
export const CATEGORY_SCREEN_BREAK = 'CATEGORY_SCREEN_BREAK';
export const CATEGORY_MOVEMENT = 'CATEGORY_MOVEMENT';
export const CATEGORY_CURFEW = 'CATEGORY_CURFEW';

export const ACTION_DRANK_WATER = 'ACTION_DRANK_WATER';
export const ACTION_SNOOZE_15 = 'ACTION_SNOOZE_15';
export const ACTION_RESTED_EYES = 'ACTION_RESTED_EYES';
export const ACTION_STRETCH_DONE = 'ACTION_STRETCH_DONE';
export const ACTION_WIND_DOWN = 'ACTION_WIND_DOWN';

const SCHEDULED_MAP_KEY = '@neuroninja_reminder_notification_ids_v1';
export const WATER_LOG_KEY = '@neuroninja_water_log_today_v1';

export interface WaterLog {
  date: string; // YYYY-MM-DD
  glasses: number; // 250ml per glass
  totalMl: number;
  lastDrankAt: string;
}

/**
 * Initialize Android notification channels and interactive categories
 */
export async function initSmartReminderChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('smart_reminders_channel', {
      name: 'Smart Proactive Reminders',
      importance: 4, // AndroidImportance.HIGH
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00E699',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }

  // Register interactive categories with actionable buttons
  await Promise.all([
    Notifications.setNotificationCategoryAsync(CATEGORY_HYDRATION, [
      {
        identifier: ACTION_DRANK_WATER,
        buttonTitle: '🥤 Drank 250ml (+10 XP)',
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_SNOOZE_15,
        buttonTitle: '⏳ Snooze 15m',
        options: { opensAppToForeground: false },
      },
    ]),
    Notifications.setNotificationCategoryAsync(CATEGORY_SCREEN_BREAK, [
      {
        identifier: ACTION_RESTED_EYES,
        buttonTitle: '👁️ Eyes Rested (20-20-20)',
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_SNOOZE_15,
        buttonTitle: '⏳ Snooze 10m',
        options: { opensAppToForeground: false },
      },
    ]),
    Notifications.setNotificationCategoryAsync(CATEGORY_MOVEMENT, [
      {
        identifier: ACTION_STRETCH_DONE,
        buttonTitle: '🧘 10 Squats Done',
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACTION_SNOOZE_15,
        buttonTitle: '⏳ Snooze 15m',
        options: { opensAppToForeground: false },
      },
    ]),
    Notifications.setNotificationCategoryAsync(CATEGORY_CURFEW, [
      {
        identifier: ACTION_WIND_DOWN,
        buttonTitle: '🌙 Screens Off',
        options: { opensAppToForeground: false },
      },
    ]),
  ]);
}

/**
 * Schedule a repeating notification for a smart reminder
 */
export async function scheduleSmartReminderNotification(reminder: SmartReminder): Promise<string | null> {
  if (!reminder.isEnabled) return null;

  try {
    await initSmartReminderChannels();

    let categoryId = CATEGORY_HYDRATION;
    let title = reminder.title;
    let body = reminder.description;

    if (reminder.id === 'rem_water') {
      categoryId = CATEGORY_HYDRATION;
      title = '💧 Hydration Sentinel';
      body = 'Time for 250ml water! Keep your brain hydrated and cognition sharp.';
    } else if (reminder.id === 'rem_break') {
      categoryId = CATEGORY_SCREEN_BREAK;
      title = '👁️ 20-20-20 Screen Reset';
      body = 'Look at an object 20 feet away for 20 seconds to prevent digital eye strain.';
    } else if (reminder.id === 'rem_movement') {
      categoryId = CATEGORY_MOVEMENT;
      title = '🧘 Micro-Movement Sentinel';
      body = 'Break physical inertia: 10 bodyweight squats or shoulder rolls right now!';
    } else if (reminder.id === 'rem_sleep') {
      categoryId = CATEGORY_CURFEW;
      title = '🌙 Digital Curfew Approaching';
      body = '30 minutes until 10:00 PM digital blackout. Disconnect screens for melatonin release.';
    }

    // Cancel any previous notification for this reminder
    await cancelSmartReminderNotification(reminder.id);

    let notificationId: string;

    if (reminder.time) {
      // Daily specific time (e.g. 21:30)
      const [hourStr, minuteStr] = reminder.time.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          categoryIdentifier: categoryId,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { reminderId: reminder.id, category: reminder.category },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    } else {
      // Repeating interval in seconds (minimum 60s)
      const intervalSec = Math.max(60, (reminder.intervalMinutes || 60) * 60);

      notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          categoryIdentifier: categoryId,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { reminderId: reminder.id, category: reminder.category },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: intervalSec,
          repeats: true,
        },
      });
    }

    // Save scheduled ID map
    const map = await getScheduledMap();
    map[reminder.id] = notificationId;
    await AsyncStorage.setItem(SCHEDULED_MAP_KEY, JSON.stringify(map));

    return notificationId;
  } catch (error) {
    console.warn(`Failed to schedule reminder ${reminder.id}:`, error);
    return null;
  }
}

/**
 * Cancel a scheduled reminder notification
 */
export async function cancelSmartReminderNotification(reminderId: string): Promise<void> {
  try {
    const map = await getScheduledMap();
    const notificationId = map[reminderId];
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      delete map[reminderId];
      await AsyncStorage.setItem(SCHEDULED_MAP_KEY, JSON.stringify(map));
    }
  } catch (e) {
    console.warn(`Failed to cancel reminder notification ${reminderId}:`, e);
  }
}

/**
 * Fire an immediate real test alert notification with sound, vibration & action buttons
 */
export async function triggerLiveReminderTestAlert(reminder: SmartReminder): Promise<void> {
  await initSmartReminderChannels();

  let categoryId = CATEGORY_HYDRATION;
  if (reminder.id === 'rem_break') categoryId = CATEGORY_SCREEN_BREAK;
  if (reminder.id === 'rem_movement') categoryId = CATEGORY_MOVEMENT;
  if (reminder.id === 'rem_sleep') categoryId = CATEGORY_CURFEW;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚡ Live Alert: ${reminder.title}`,
      body: reminder.description,
      categoryIdentifier: categoryId,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 300, 150, 300],
      data: { reminderId: reminder.id, isTest: true },
    },
    trigger: null, // null triggers immediately
  });
}

/**
 * Handle notification action response (e.g. from background tap)
 */
export async function handleReminderActionResponse(actionIdentifier: string): Promise<string | null> {
  if (actionIdentifier === ACTION_DRANK_WATER) {
    const log = await getTodayWaterLog();
    log.glasses += 1;
    log.totalMl = log.glasses * 250;
    log.lastDrankAt = new Date().toISOString();
    await AsyncStorage.setItem(WATER_LOG_KEY, JSON.stringify(log));
    return `Hydration Logged! Total: ${log.totalMl}ml today (+10 XP)`;
  }

  if (actionIdentifier === ACTION_RESTED_EYES) {
    return '20-20-20 screen break completed. Eye strain mitigated!';
  }

  if (actionIdentifier === ACTION_STRETCH_DONE) {
    return 'Physical stretch completed. Posture restored!';
  }

  if (actionIdentifier === ACTION_WIND_DOWN) {
    return 'Digital Curfew engaged. Sleep sanctuary active.';
  }

  return null;
}

export async function getTodayWaterLog(): Promise<WaterLog> {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const raw = await AsyncStorage.getItem(WATER_LOG_KEY);
    if (raw) {
      const parsed: WaterLog = JSON.parse(raw);
      if (parsed.date === todayStr) return parsed;
    }
  } catch {}
  return {
    date: todayStr,
    glasses: 0,
    totalMl: 0,
    lastDrankAt: '',
  };
}

async function getScheduledMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
