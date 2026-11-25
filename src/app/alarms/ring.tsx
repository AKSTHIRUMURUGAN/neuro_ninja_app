import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNinjaAlert } from '../../context/ninja-alert-context';

import {
  clearActiveMissionProgress,
  getAlarmById,
  recordAlarmOccurrence,
  scheduleWakeUpCheckNotification,
  snoozeAlarm,
  startRingingAlarmAudio,
  stopRingingAlarmAudio,
  type MissionAlarm,
  type MissionType,
} from '../../services/alarms/alarm-engine';
import { MathMission } from '../../components/alarms/math-mission';
import { MemoryMission } from '../../components/alarms/memory-mission';
import { TypingMission } from '../../components/alarms/typing-mission';
import { ShakeMission } from '../../components/alarms/shake-mission';
import { MovementMission } from '../../components/alarms/movement-mission';
import { QRMission } from '../../components/alarms/qr-mission';
import { PhotoMission } from '../../components/alarms/photo-mission';
import { EmergencyDismiss } from '../../components/alarms/emergency-dismiss';
import { getHabits, toggleHabitToday } from '../../services/habits/habit-service';
import { getTodayKey } from '../../services/storage';

export default function AlarmRingScreen() {
  const router = useRouter();
  const { showAlert } = useNinjaAlert();
  const params = useLocalSearchParams<{
    alarmId?: string;
    mission?: string;
    label?: string;
    soundId?: string;
  }>();

  const [alarm, setAlarm] = useState<MissionAlarm | null>(null);
  const [activeMission, setActiveMission] = useState<MissionType>(
    (params.mission as MissionType) || 'math'
  );
  const [snoozesUsed, setSnoozesUsed] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    let mounted = true;
    const soundToPlay = params.soundId || 'zen_bell';
    startRingingAlarmAudio(soundToPlay);

    if (params.alarmId) {
      void getAlarmById(params.alarmId).then((loaded) => {
        if (!mounted || !loaded) return;
        setAlarm(loaded);
        if (!params.mission) setActiveMission(loaded.mission);
        if (!params.soundId) startRingingAlarmAudio(loaded.soundId);
      });
    }

    const vibInterval = setInterval(() => {
      if (!isDismissed) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }, 1500);

    return () => {
      mounted = false;
      clearInterval(vibInterval);
      stopRingingAlarmAudio();
    };
  }, [params.alarmId, params.mission, params.soundId]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishDismiss = async (fallbackUsed: boolean) => {
    setIsDismissed(true);
    stopRingingAlarmAudio();
    await clearActiveMissionProgress();

    const alarmId = alarm?.id ?? params.alarmId ?? 'alarm_sim';
    const alarmLabel = alarm?.label ?? params.label ?? 'Ninja Morning Wakeup';

    await recordAlarmOccurrence({
      alarmId,
      missionStatus: fallbackUsed ? 'emergency' : 'completed',
      fallbackUsed,
    });

    if (alarm?.wakeCheckEnabled) {
      await scheduleWakeUpCheckNotification(alarmLabel, alarm.wakeCheckDelayMinutes || 3);
    }

    if (alarm?.linkedHabitId) {
      const habits = await getHabits();
      const target = habits.find((h) => h.id === alarm.linkedHabitId);
      const todayKey = getTodayKey();
      if (target && !target.completedDays.includes(todayKey)) {
        await toggleHabitToday(target.id);
      }
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (alarm?.linkedRoutineId) {
      showAlert({
        title: 'Alarm Silenced',
        message: 'Ready to start your morning routine?',
        type: 'success',
        icon: 'alarm-check',
        buttons: [
          { text: 'Enter Dojo', onPress: () => router.replace('/(tabs)' as any) },
          {
            text: 'Start Routine',
            onPress: () =>
              router.replace(`/lifeos/routines/player?routineId=${alarm.linkedRoutineId}` as any),
          },
        ],
      });
      return;
    }

    showAlert({
      title: fallbackUsed ? 'Emergency Dismissed' : 'Mission Accomplished!',
      message: fallbackUsed
        ? 'Safety first. Alarm silenced via emergency fallback.'
        : 'Your prefrontal cortex is awake and ready.',
      type: fallbackUsed ? 'warning' : 'success',
      icon: fallbackUsed ? 'shield-alert' : 'trophy-award',
      buttons: [{ text: 'Continue', onPress: () => router.replace('/(tabs)' as any) }],
    });
  };

  const handleSnooze = async () => {
    const limit = alarm?.snoozeLimit ?? 3;
    if (snoozesUsed >= limit) {
      showAlert({
        title: 'Snooze Limit Reached',
        message: 'Complete the wake-up mission or use emergency dismiss.',
        type: 'warning',
        icon: 'alarm-snooze',
      });
      return;
    }
    setIsDismissed(true);
    stopRingingAlarmAudio();
    const id = alarm?.id ?? params.alarmId;
    if (id) {
      await snoozeAlarm(id);
      await recordAlarmOccurrence({ alarmId: id, missionStatus: 'snoozed', fallbackUsed: false });
    }
    setSnoozesUsed((s) => s + 1);
    showAlert({
      title: 'Snoozed',
      message: `Alarm will ring again in ${alarm?.snoozeIntervalMinutes ?? 5} minutes.`,
      type: 'info',
      icon: 'alarm-snooze',
      buttons: [{ text: 'OK', onPress: () => router.back() }],
    });
  };

  const displayLabel = alarm?.label ?? params.label ?? 'Ninja Wakeup Mission';
  const maxSnoozes = alarm?.snoozeLimit ?? 3;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.alarmIconBox}>
            <Ionicons name="alarm" size={34} color="#EF4444" />
          </View>
          <Text style={styles.alarmTime}>{alarm?.time ?? nowStr}</Text>
          <Text style={styles.alarmTitle}>{displayLabel}</Text>
          <Text style={styles.alarmSub}>Complete {activeMission.toUpperCase()} mission to dismiss.</Text>
        </View>

        <View style={styles.missionArea}>
          {activeMission === 'math' && (
            <MathMission
              alarmId={alarm?.id ?? params.alarmId}
              difficulty={alarm?.difficulty ?? 'medium'}
              questionCount={alarm?.missionConfig.questionCount ?? 3}
              onCompleted={() => void finishDismiss(false)}
            />
          )}
          {activeMission === 'memory' && (
            <MemoryMission
              alarmId={alarm?.id ?? params.alarmId}
              sequenceLength={alarm?.missionConfig.memoryLength ?? 4}
              mode={alarm?.missionConfig.memoryMode ?? 'sequence'}
              onCompleted={() => void finishDismiss(false)}
            />
          )}
          {activeMission === 'typing' && (
            <TypingMission
              phrase={alarm?.missionConfig.typingPhrase}
              onCompleted={() => void finishDismiss(false)}
            />
          )}
          {activeMission === 'shake' && (
            <ShakeMission
              targetShakes={alarm?.missionConfig.targetShakes ?? 20}
              sensitivity={alarm?.missionConfig.shakeSensitivity ?? 'medium'}
              onCompleted={() => void finishDismiss(false)}
            />
          )}
          {activeMission === 'movement' && (
            <MovementMission
              targetSteps={alarm?.missionConfig.targetSteps ?? 15}
              onCompleted={() => void finishDismiss(false)}
            />
          )}
          {activeMission === 'qr' && (
            <QRMission
              mode="verify"
              expectedHash={alarm?.missionConfig.qrHash}
              expectedLabel={alarm?.missionConfig.qrLabel}
              onCompleted={() => void finishDismiss(false)}
              onFallbackRequested={() => setActiveMission('math')}
            />
          )}
          {activeMission === 'photo' && (
            <PhotoMission
              mode="verify"
              referenceUri={alarm?.missionConfig.photoSignature}
              locationLabel={alarm?.missionConfig.photoLocationLabel}
              onCompleted={() => void finishDismiss(false)}
              onFallbackRequested={() => setActiveMission('math')}
            />
          )}
        </View>

        <View style={styles.bottomControls}>
          {maxSnoozes > 0 && (
            <TouchableOpacity style={styles.snoozeBtn} onPress={() => void handleSnooze()}>
              <Ionicons name="bed-outline" size={18} color="#CBD5E1" />
              <Text style={styles.snoozeText}>
                Snooze ({alarm?.snoozeIntervalMinutes ?? 5}m · {maxSnoozes - snoozesUsed} left)
              </Text>
            </TouchableOpacity>
          )}
          <EmergencyDismiss onEmergencyDismiss={() => void finishDismiss(true)} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070A11' },
  container: { flex: 1, paddingHorizontal: 18, justifyContent: 'space-between', paddingBottom: 12 },
  header: { alignItems: 'center', marginTop: 10 },
  alarmIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  alarmTime: { fontSize: 36, fontWeight: '900', color: '#F8FAFC', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  alarmTitle: { fontSize: 17, fontWeight: '800', color: '#EF4444', marginTop: 2 },
  alarmSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 2 },
  missionArea: { flex: 1, justifyContent: 'center' },
  bottomControls: { gap: 8 },
  snoozeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
  },
  snoozeText: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
});
