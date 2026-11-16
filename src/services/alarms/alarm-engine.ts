import { NativeModules, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getDatabase, generateUuid } from '../database/database';

export type MissionType =
  | 'math'
  | 'memory'
  | 'typing'
  | 'shake'
  | 'movement'
  | 'qr'
  | 'photo';

export interface AlarmMissionConfig {
  difficulty?: 'easy' | 'medium' | 'hard';
  questionCount?: number;
  memoryLength?: number;
  memoryMode?: 'sequence' | 'numbers';
  typingPhrase?: string;
  targetShakes?: number;
  shakeThreshold?: number;
  shakeSensitivity?: 'low' | 'medium' | 'high';
  targetSteps?: number;
  qrHash?: string;
  qrLabel?: string;
  photoSignature?: string;
  photoLocationLabel?: string;
}

export interface MissionAlarm {
  id: string;
  label: string;
  time: string; // "HH:MM" 24h
  days: number[]; // 0=Sun..6=Sat
  isEnabled: boolean;
  mission: MissionType;
  missionConfig: AlarmMissionConfig;
  difficulty: 'easy' | 'medium' | 'hard';
  soundId: string;
  vibrate: boolean;
  snoozeLimit: number;
  snoozeIntervalMinutes: number;
  wakeCheckEnabled: boolean;
  wakeCheckDelayMinutes: number;
  linkedRoutineId?: string | null;
  linkedHabitId?: string | null;
}

export interface AlarmSoundOption {
  id: 'zen_bell' | 'digital_pulse' | 'gentle_rise' | 'sensei_call';
  name: string;
  description: string;
  asset: number;
}

export const ALARM_SOUNDS: AlarmSoundOption[] = [
  {
    id: 'zen_bell',
    name: 'Zen Dojo Bell',
    description: 'Resonant 528 Hz temple singing bowl',
    asset: require('../../../assets/sounds/zen_bell.wav'),
  },
  {
    id: 'digital_pulse',
    name: 'Tactical Pulse',
    description: 'Crisp double-beep digital cadence',
    asset: require('../../../assets/sounds/digital_pulse.wav'),
  },
  {
    id: 'gentle_rise',
    name: 'Gentle Dawn Rise',
    description: 'Ascending C-major warm chimes',
    asset: require('../../../assets/sounds/gentle_rise.wav'),
  },
  {
    id: 'sensei_call',
    name: 'Sensei Gong',
    description: 'Urgent deep harmonic wake strike',
    asset: require('../../../assets/sounds/sensei_call.wav'),
  },
];

const NativeAlarm = NativeModules.NinjaAlarmModule as
  | {
      canScheduleExactAlarms(): Promise<boolean>;
      openExactAlarmSettings(): void;
      scheduleNativeAlarm(
        alarmId: string,
        label: string,
        hour: number,
        minute: number,
        daysCsv: string,
        mission: string,
        soundId: string,
        triggerAtMillis: number
      ): Promise<boolean>;
      cancelNativeAlarm(alarmId: string): Promise<boolean>;
      startAlarmSound(soundId: string): void;
      stopAlarmSound(): void;
    }
  | undefined;

const ACTIVE_MISSION_STATE_KEY = '@nn_active_alarm_mission_state_v1';

let previewPlayer: AudioPlayer | null = null;

export function hashMissionCode(rawCode: string): string {
  // Lightweight deterministic salted FNV-1a hex hash so raw QR codes are not stored
  let hash = 2166136261;
  const salted = `neuroninja_qr_salt::${rawCode.trim()}`;
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeNextAlarmDate(hour: number, minute: number, days: number[]): Date {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  const allowed = new Set(days);

  for (let offset = 0; offset <= 7; offset++) {
    const probe = new Date(base);
    probe.setDate(probe.getDate() + offset);
    if (probe.getTime() <= now.getTime()) continue;
    if (allowed.size === 0 || allowed.has(probe.getDay())) {
      return probe;
    }
  }
  base.setDate(base.getDate() + 1);
  return base;
}

async function ensureSeededAlarms(): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM alarms');
  if ((row?.count ?? 0) > 0) return;

  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR IGNORE INTO alarms
       (alarm_id, label, hour, minute, days_json, enabled, sound_id, vibrate, snooze_limit, snooze_interval_minutes, wake_check_enabled, wake_check_delay_minutes, created_at, updated_at)
       VALUES ('alarm_1', 'Ninja Morning Wakeup', 6, 30, '[1,2,3,4,5]', 1, 'zen_bell', 1, 3, 5, 1, 3, ?, ?)`,
      now,
      now
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO alarm_missions (mission_id, alarm_id, mission_type, config_json, fallback_type, enabled)
       VALUES ('mis_alarm_1', 'alarm_1', 'math', '{"difficulty":"medium","questionCount":3}', 'emergency', 1)`
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO alarms
       (alarm_id, label, hour, minute, days_json, enabled, sound_id, vibrate, snooze_limit, snooze_interval_minutes, wake_check_enabled, wake_check_delay_minutes, created_at, updated_at)
       VALUES ('alarm_2', 'Evening Study Kickoff', 19, 30, '[1,2,3,4,5]', 0, 'gentle_rise', 1, 2, 5, 0, 3, ?, ?)`,
      now,
      now
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO alarm_missions (mission_id, alarm_id, mission_type, config_json, fallback_type, enabled)
       VALUES ('mis_alarm_2', 'alarm_2', 'typing', '{"typingPhrase":"Discipline creates freedom"}', 'emergency', 1)`
    );
  });
}

export async function getAlarms(): Promise<MissionAlarm[]> {
  await ensureSeededAlarms();
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    alarm_id: string;
    label: string;
    hour: number;
    minute: number;
    days_json: string;
    enabled: number;
    sound_id: string;
    vibrate: number;
    snooze_limit: number;
    snooze_interval_minutes: number;
    wake_check_enabled: number;
    wake_check_delay_minutes: number;
    linked_routine_id: string | null;
    linked_habit_id: string | null;
  }>('SELECT * FROM alarms ORDER BY hour ASC, minute ASC');

  const missionRows = await db.getAllAsync<{
    alarm_id: string;
    mission_type: string;
    config_json: string;
  }>('SELECT alarm_id, mission_type, config_json FROM alarm_missions WHERE enabled = 1');

  const missionMap = new Map<string, { type: MissionType; config: AlarmMissionConfig }>();
  for (const m of missionRows) {
    let cfg: AlarmMissionConfig = {};
    try {
      cfg = JSON.parse(m.config_json) as AlarmMissionConfig;
    } catch {
      cfg = {};
    }
    missionMap.set(m.alarm_id, { type: m.mission_type as MissionType, config: cfg });
  }

  return rows.map((r) => {
    let days: number[] = [1, 2, 3, 4, 5];
    try {
      days = JSON.parse(r.days_json) as number[];
    } catch {
      days = [1, 2, 3, 4, 5];
    }
    const mis = missionMap.get(r.alarm_id);
    return {
      id: r.alarm_id,
      label: r.label,
      time: `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`,
      days,
      isEnabled: Boolean(r.enabled),
      mission: mis?.type ?? 'math',
      missionConfig: mis?.config ?? { difficulty: 'medium', questionCount: 3 },
      difficulty: mis?.config.difficulty ?? 'medium',
      soundId: r.sound_id || 'zen_bell',
      vibrate: Boolean(r.vibrate),
      snoozeLimit: r.snooze_limit,
      snoozeIntervalMinutes: r.snooze_interval_minutes,
      wakeCheckEnabled: Boolean(r.wake_check_enabled),
      wakeCheckDelayMinutes: r.wake_check_delay_minutes,
      linkedRoutineId: r.linked_routine_id,
      linkedHabitId: r.linked_habit_id,
    };
  });
}

export async function getAlarmById(id: string): Promise<MissionAlarm | null> {
  const all = await getAlarms();
  return all.find((a) => a.id === id) ?? null;
}

export async function getNextEnabledAlarm(): Promise<{
  alarm: MissionAlarm;
  nextTriggerDate: Date;
} | null> {
  const all = await getAlarms();
  const enabled = all.filter((a) => a.isEnabled);
  if (enabled.length === 0) return null;

  let best: { alarm: MissionAlarm; nextTriggerDate: Date } | null = null;
  for (const alarm of enabled) {
    const [h, m] = alarm.time.split(':').map(Number);
    const nextTriggerDate = computeNextAlarmDate(h, m, alarm.days);
    if (!best || nextTriggerDate.getTime() < best.nextTriggerDate.getTime()) {
      best = { alarm, nextTriggerDate };
    }
  }
  return best;
}

export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !NativeAlarm) return true;
  try {
    return await NativeAlarm.canScheduleExactAlarms();
  } catch {
    return false;
  }
}

export function openExactAlarmSettings(): void {
  if (Platform.OS === 'android' && NativeAlarm) {
    NativeAlarm.openExactAlarmSettings();
  }
}

export async function scheduleAlarmNative(alarm: MissionAlarm, explicitTriggerMs?: number): Promise<void> {
  const [hour, minute] = alarm.time.split(':').map(Number);
  const triggerDate = explicitTriggerMs
    ? new Date(explicitTriggerMs)
    : computeNextAlarmDate(hour, minute, alarm.days);

  if (Platform.OS === 'android' && NativeAlarm) {
    await NativeAlarm.scheduleNativeAlarm(
      alarm.id,
      alarm.label,
      hour,
      minute,
      alarm.days.join(','),
      alarm.mission,
      alarm.soundId,
      triggerDate.getTime()
    ).catch((e) => console.warn('Native exact alarm scheduling failed:', e));
  } else {
    try {
      const perms = await Notifications.getPermissionsAsync();
      if (perms.status === 'granted') {
        await Notifications.scheduleNotificationAsync({
          identifier: alarm.id,
          content: {
            title: alarm.label,
            body: `Wake-up mission: ${alarm.mission.toUpperCase()}`,
            data: { alarmId: alarm.id, mission: alarm.mission, type: 'alarm' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    } catch {
      // non-fatal
    }
  }
}

export async function cancelAlarmNative(alarmId: string): Promise<void> {
  if (Platform.OS === 'android' && NativeAlarm) {
    await NativeAlarm.cancelNativeAlarm(alarmId).catch(() => {});
  }
  await Notifications.cancelScheduledNotificationAsync(alarmId).catch(() => {});
}

export async function addOrUpdateAlarm(
  input: Omit<MissionAlarm, 'id'> & { id?: string }
): Promise<MissionAlarm[]> {
  const db = await getDatabase();
  const id = input.id ?? generateUuid('alarm');
  const [hour, minute] = input.time.split(':').map(Number);
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO alarms (
         alarm_id, label, hour, minute, days_json, enabled, sound_id, vibrate,
         snooze_limit, snooze_interval_minutes, wake_check_enabled, wake_check_delay_minutes,
         linked_routine_id, linked_habit_id, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(alarm_id) DO UPDATE SET
         label = excluded.label,
         hour = excluded.hour,
         minute = excluded.minute,
         days_json = excluded.days_json,
         enabled = excluded.enabled,
         sound_id = excluded.sound_id,
         vibrate = excluded.vibrate,
         snooze_limit = excluded.snooze_limit,
         snooze_interval_minutes = excluded.snooze_interval_minutes,
         wake_check_enabled = excluded.wake_check_enabled,
         wake_check_delay_minutes = excluded.wake_check_delay_minutes,
         linked_routine_id = excluded.linked_routine_id,
         linked_habit_id = excluded.linked_habit_id,
         updated_at = excluded.updated_at`,
      id,
      input.label.trim() || 'Ninja Wakeup',
      hour,
      minute,
      JSON.stringify(input.days),
      input.isEnabled ? 1 : 0,
      input.soundId || 'zen_bell',
      input.vibrate ? 1 : 0,
      input.snoozeLimit,
      input.snoozeIntervalMinutes,
      input.wakeCheckEnabled ? 1 : 0,
      input.wakeCheckDelayMinutes,
      input.linkedRoutineId ?? null,
      input.linkedHabitId ?? null,
      now,
      now
    );

    await db.runAsync('DELETE FROM alarm_missions WHERE alarm_id = ?', id);
    await db.runAsync(
      `INSERT INTO alarm_missions (mission_id, alarm_id, mission_type, config_json, fallback_type, enabled)
       VALUES (?, ?, ?, ?, 'emergency', 1)`,
      `mis_${id}`,
      id,
      input.mission,
      JSON.stringify({ ...input.missionConfig, difficulty: input.difficulty })
    );
  });

  const saved = await getAlarmById(id);
  if (saved) {
    if (saved.isEnabled) await scheduleAlarmNative(saved);
    else await cancelAlarmNative(saved.id);
  }

  return getAlarms();
}

export const addAlarm = addOrUpdateAlarm;

export async function toggleAlarm(id: string): Promise<MissionAlarm[]> {
  const db = await getDatabase();
  const current = await getAlarmById(id);
  if (!current) return getAlarms();

  const nextEnabled = !current.isEnabled;
  await db.runAsync(
    'UPDATE alarms SET enabled = ?, updated_at = ? WHERE alarm_id = ?',
    nextEnabled ? 1 : 0,
    new Date().toISOString(),
    id
  );

  const updated = { ...current, isEnabled: nextEnabled };
  if (nextEnabled) await scheduleAlarmNative(updated);
  else await cancelAlarmNative(id);

  return getAlarms();
}

export async function deleteAlarm(id: string): Promise<MissionAlarm[]> {
  const db = await getDatabase();
  await cancelAlarmNative(id);
  await db.runAsync('DELETE FROM alarms WHERE alarm_id = ?', id);
  return getAlarms();
}

export async function snoozeAlarm(alarmId: string): Promise<Date | null> {
  const alarm = await getAlarmById(alarmId);
  stopRingingAlarmAudio();
  if (!alarm) return null;

  const snoozeDate = new Date(Date.now() + Math.max(1, alarm.snoozeIntervalMinutes) * 60_000);
  await scheduleAlarmNative(alarm, snoozeDate.getTime());
  return snoozeDate;
}

export async function recordAlarmOccurrence(input: {
  alarmId: string;
  missionStatus: 'completed' | 'emergency' | 'snoozed';
  fallbackUsed: boolean;
}): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO alarm_occurrences (occurrence_id, alarm_id, scheduled_at, rang_at, dismissed_at, mission_status, fallback_used, delivery_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'delivered')`,
    generateUuid('occ'),
    input.alarmId,
    now,
    now,
    now,
    input.missionStatus,
    input.fallbackUsed ? 1 : 0
  );
}

export async function scheduleWakeUpCheckNotification(
  alarmLabel: string,
  delayMinutes: number
): Promise<void> {
  try {
    const perms = await Notifications.getPermissionsAsync();
    if (perms.status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Wake-Up Check: ${alarmLabel}`,
        body: 'Still awake and moving? Tap to confirm.',
        data: { type: 'wake_up_check' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, delayMinutes * 60),
        repeats: false,
      },
    });
  } catch {
    // non-fatal
  }
}

export function startRingingAlarmAudio(soundId: string): void {
  if (Platform.OS === 'android' && NativeAlarm) {
    NativeAlarm.startAlarmSound(soundId);
    return;
  }
  void previewSound(soundId, true);
}

export function stopRingingAlarmAudio(): void {
  if (Platform.OS === 'android' && NativeAlarm) {
    NativeAlarm.stopAlarmSound();
  }
  stopPreviewSound();
}

export async function previewSound(soundId: string, loop: boolean = false): Promise<void> {
  stopPreviewSound();
  const opt = ALARM_SOUNDS.find((s) => s.id === soundId) ?? ALARM_SOUNDS[0];
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer(opt.asset);
    player.loop = loop;
    player.play();
    previewPlayer = player;
  } catch (e) {
    console.warn('Audio preview error:', e);
  }
}

export function stopPreviewSound(): void {
  if (previewPlayer) {
    try {
      previewPlayer.pause();
      previewPlayer.release();
    } catch {
      // ignore
    }
    previewPlayer = null;
  }
}

export async function saveActiveMissionProgress(
  alarmId: string,
  missionType: MissionType,
  stateJson: Record<string, unknown>
): Promise<void> {
  await AsyncStorage.setItem(
    ACTIVE_MISSION_STATE_KEY,
    JSON.stringify({ alarmId, missionType, stateJson, updatedAt: Date.now() })
  ).catch(() => {});
}

export async function loadActiveMissionProgress(
  alarmId: string,
  missionType: MissionType
): Promise<Record<string, unknown> | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_MISSION_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      alarmId: string;
      missionType: MissionType;
      stateJson: Record<string, unknown>;
      updatedAt: number;
    };
    if (
      parsed.alarmId === alarmId &&
      parsed.missionType === missionType &&
      Date.now() - parsed.updatedAt < 30 * 60_000
    ) {
      return parsed.stateJson;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearActiveMissionProgress(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_MISSION_STATE_KEY).catch(() => {});
}
