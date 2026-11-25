import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIF_CHANNEL_ID = 'dare_alerts';
const PRE_DEADLINE_ID = 'dare_pre_deadline_alert';
const MORNING_PROMPT_ID = 'dare_morning_rollover_prompt';

/**
 * Configure Dare Notification Channel
 */
export async function initDareNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIF_CHANNEL_ID, {
      name: 'Dare & Escrow Alerts',
      importance: 4, // AndroidImportance.HIGH
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00E699',
      sound: 'default',
    });
  }
}

/**
 * Schedule alert 2 hours before dare deadline
 */
export async function scheduleDareExpiryWarning(
  dareTitle: string,
  stakeRupees: number,
  deadlineDate: Date
) {
  try {
    await cancelDareExpiryWarning();

    const now = Date.now();
    const targetMs = deadlineDate.getTime() - 2 * 60 * 60 * 1000; // 2 hours before
    const secondsFromNow = Math.floor((targetMs - now) / 1000);

    if (secondsFromNow > 60) {
      await Notifications.scheduleNotificationAsync({
        identifier: PRE_DEADLINE_ID,
        content: {
          title: `⚠️ 2 Hours Left on Your ₹${stakeRupees} Dare!`,
          body: `Keep your shield up! Avoid Reels & Shorts before midnight to claim back your ₹${stakeRupees}.`,
          sound: true,
          data: { type: 'DARE_WARNING', dareTitle, stakeRupees },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsFromNow,
        },
      });
      console.log(`[DareNotifications] Scheduled pre-deadline alert in ${secondsFromNow}s`);
    }
  } catch (e) {
    console.warn('[DareNotifications] Error scheduling warning:', e);
  }
}

/**
 * Cancel pre-deadline warning when dare is settled early
 */
export async function cancelDareExpiryWarning() {
  try {
    await Notifications.cancelScheduledNotificationAsync(PRE_DEADLINE_ID);
  } catch {}
}

/**
 * Schedule daily 9:00 AM reminder to take or renew dare
 */
export async function scheduleMorningDarePrompt() {
  try {
    await Notifications.cancelScheduledNotificationAsync(MORNING_PROMPT_ID);

    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_PROMPT_ID,
      content: {
        title: '⚡ Are You Dare Today?',
        body: 'Put a stake on your discipline today. Stay intentional with your focus!',
        sound: true,
        data: { type: 'MORNING_PROMPT' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });
  } catch (e) {
    console.warn('[DareNotifications] Error scheduling morning prompt:', e);
  }
}
