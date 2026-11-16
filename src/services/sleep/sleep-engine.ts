import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getDatabase, generateUuid, getLocalTimezoneId, getLifeOSState, setLifeOSState } from '../database/database';

export interface SleepDiaryEntry {
  entryId: string;
  sleepStart: string;
  wakeTime: string;
  durationMinutes: number;
  timezoneId: string;
  subjectiveQuality: number; // 1-5
  notes?: string | null;
  source: 'manual' | 'alarm_dismiss' | 'health_connect';
  createdAt: string;
}

export interface SleepScheduleConfig {
  targetBedtimeHHMM: string; // "22:30"
  targetWakeHHMM: string;    // "06:30"
  windDownMinutesBefore: number;
  windDownNotificationId?: string | null;
  enabled: boolean;
}

export interface SleepSoundOptInResearchState {
  micConsentGranted: boolean;
  retentionDays: 1 | 7 | 30;
  localInsightsEnabled: boolean;
  notes: string;
}

export interface SleepSoundTrack {
  id: 'ambient_rain' | 'ambient_ocean' | 'zen_bell' | 'gentle_rise';
  title: string;
  subtitle: string;
  icon: string;
  asset: number;
}

export const SLEEP_SOUND_TRACKS: SleepSoundTrack[] = [
  {
    id: 'ambient_rain',
    title: 'Night Temple Rain',
    subtitle: 'Soft pink-filtered rainfall loop',
    icon: 'weather-rainy',
    asset: require('../../../assets/sounds/ambient_rain.wav'),
  },
  {
    id: 'ambient_ocean',
    title: 'Pacific Swell',
    subtitle: 'Slow rhythmic brown surf waves',
    icon: 'waves',
    asset: require('../../../assets/sounds/ambient_ocean.wav'),
  },
  {
    id: 'zen_bell',
    title: 'Tibetan Sing Bowl',
    subtitle: '528 Hz warm meditative resonance',
    icon: 'bell-outline',
    asset: require('../../../assets/sounds/zen_bell.wav'),
  },
  {
    id: 'gentle_rise',
    title: 'Dawn Arpeggio',
    subtitle: 'Harmonic soft chimes',
    icon: 'music-note-outline',
    asset: require('../../../assets/sounds/gentle_rise.wav'),
  },
];

const SCHEDULE_STATE_KEY = 'sleep_schedule_config';
const RESEARCH_STATE_KEY = 'sleep_sound_research_optin';

let sleepAudioPlayer: AudioPlayer | null = null;
let sleepStopTimeout: ReturnType<typeof setTimeout> | null = null;

export async function getSleepSchedule(): Promise<SleepScheduleConfig> {
  return getLifeOSState<SleepScheduleConfig>(SCHEDULE_STATE_KEY, {
    targetBedtimeHHMM: '22:30',
    targetWakeHHMM: '06:30',
    windDownMinutesBefore: 30,
    enabled: false,
  });
}

export async function saveSleepSchedule(config: SleepScheduleConfig): Promise<SleepScheduleConfig> {
  if (config.windDownNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(config.windDownNotificationId).catch(() => {});
  }

  let nextNotifId: string | null = null;
  if (config.enabled) {
    try {
      const perms = await Notifications.getPermissionsAsync();
      if (perms.status === 'granted') {
        const [bh, bm] = config.targetBedtimeHHMM.split(':').map(Number);
        const totalMin = (bh * 60 + bm - config.windDownMinutesBefore + 1440) % 1440;
        const trigHour = Math.floor(totalMin / 60);
        const trigMin = totalMin % 60;
        nextNotifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'NeuroNinja Wind-Down',
            body: `Bedtime target (${config.targetBedtimeHHMM}) is in ${config.windDownMinutesBefore} minutes. Open sleep sounds or diary.`,
            data: { type: 'bedtime_winddown' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: trigHour,
            minute: trigMin,
          },
        });
      }
    } catch {
      // non-fatal
    }
  }

  const saved: SleepScheduleConfig = { ...config, windDownNotificationId: nextNotifId };
  await setLifeOSState(SCHEDULE_STATE_KEY, saved);
  return saved;
}

export async function getSleepSoundResearchState(): Promise<SleepSoundOptInResearchState> {
  return getLifeOSState<SleepSoundOptInResearchState>(RESEARCH_STATE_KEY, {
    micConsentGranted: false,
    retentionDays: 7,
    localInsightsEnabled: false,
    notes: 'Local-only sound-event research mode. Never uploads audio or makes medical claims.',
  });
}

export async function saveSleepSoundResearchState(
  state: SleepSoundOptInResearchState
): Promise<void> {
  await setLifeOSState(RESEARCH_STATE_KEY, state);
}

export async function getSleepDiaryEntries(limit: number = 14): Promise<SleepDiaryEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    entry_id: string;
    sleep_start: string | null;
    wake_time: string | null;
    timezone_id: string;
    subjective_quality: number | null;
    notes: string | null;
    source: string;
    created_at: string;
  }>('SELECT * FROM sleep_diary ORDER BY created_at DESC LIMIT ?', limit);

  return rows.map((r) => {
    const startMs = r.sleep_start ? new Date(r.sleep_start).getTime() : 0;
    const wakeMs = r.wake_time ? new Date(r.wake_time).getTime() : 0;
    const durMin = startMs && wakeMs && wakeMs > startMs ? Math.round((wakeMs - startMs) / 60000) : 450;
    return {
      entryId: r.entry_id,
      sleepStart: r.sleep_start ?? r.created_at,
      wakeTime: r.wake_time ?? r.created_at,
      durationMinutes: durMin,
      timezoneId: r.timezone_id,
      subjectiveQuality: r.subjective_quality ?? 3,
      notes: r.notes,
      source: r.source as SleepDiaryEntry['source'],
      createdAt: r.created_at,
    };
  });
}

export async function logSleepDiaryEntry(input: {
  sleepStart: Date;
  wakeTime: Date;
  subjectiveQuality: number;
  notes?: string;
  source?: SleepDiaryEntry['source'];
}): Promise<SleepDiaryEntry> {
  const db = await getDatabase();
  const entryId = generateUuid('slp');
  const tz = getLocalTimezoneId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sleep_diary (entry_id, sleep_start, wake_time, timezone_id, subjective_quality, notes, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    entryId,
    input.sleepStart.toISOString(),
    input.wakeTime.toISOString(),
    tz,
    Math.min(5, Math.max(1, input.subjectiveQuality)),
    input.notes ?? null,
    input.source ?? 'manual',
    now
  );

  const durMin = Math.max(
    0,
    Math.round((input.wakeTime.getTime() - input.sleepStart.getTime()) / 60000)
  );
  return {
    entryId,
    sleepStart: input.sleepStart.toISOString(),
    wakeTime: input.wakeTime.toISOString(),
    durationMinutes: durMin,
    timezoneId: tz,
    subjectiveQuality: input.subjectiveQuality,
    notes: input.notes ?? null,
    source: input.source ?? 'manual',
    createdAt: now,
  };
}

export async function deleteSleepDiaryEntry(entryId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sleep_diary WHERE entry_id = ?', entryId);
}

export async function deleteAllSleepData(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sleep_diary');
  await setLifeOSState(RESEARCH_STATE_KEY, {
    micConsentGranted: false,
    retentionDays: 7,
    localInsightsEnabled: false,
    notes: 'All local sleep observations and sound preferences cleared.',
  });
}

export async function startSleepSound(
  track: SleepSoundTrack,
  timerMinutes: number
): Promise<void> {
  stopSleepSound();
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
    });
    const player = createAudioPlayer(track.asset);
    player.loop = true;
    player.volume = 0.7;
    player.play();
    sleepAudioPlayer = player;

    if (timerMinutes > 0) {
      sleepStopTimeout = setTimeout(() => {
        stopSleepSound();
      }, timerMinutes * 60 * 1000);
    }
  } catch (e) {
    console.warn('Failed to start sleep sound:', e);
  }
}

export function stopSleepSound(): void {
  if (sleepStopTimeout) {
    clearTimeout(sleepStopTimeout);
    sleepStopTimeout = null;
  }
  if (sleepAudioPlayer) {
    try {
      sleepAudioPlayer.pause();
      sleepAudioPlayer.release();
    } catch {
      // ignore release failure
    }
    sleepAudioPlayer = null;
  }
}

