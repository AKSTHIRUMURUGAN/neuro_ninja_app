import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  advanceRoutineRun,
  getActiveRoutineRun,
  getRoutineById,
  startRoutineRun,
  stopRoutineRun,
  togglePauseRoutineRun,
  type RoutineDefinition,
  type RoutineRunState,
} from '../../../services/routines/routine-engine';
import { previewSound, stopPreviewSound } from '../../../services/alarms/alarm-engine';
import { useNinja } from '../../../context/ninja-context';

export default function RoutinePlayerScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { notifyLifeOSChanged, isArmed, toggleShield } = useNinja();

  const [routine, setRoutine] = useState<RoutineDefinition | null>(null);
  const [run, setRun] = useState<RoutineRunState | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const existingActive = await getActiveRoutineRun();
      if (!active) return;
      if (existingActive && (!routineId || existingActive.routineId === routineId)) {
        const rtn = await getRoutineById(existingActive.routineId);
        if (!active) return;
        setRoutine(rtn);
        setRun(existingActive);
        return;
      }
      if (routineId) {
        const rtn = await getRoutineById(routineId);
        const started = await startRoutineRun(routineId);
        if (!active) return;
        setRoutine(rtn);
        setRun(started);
        notifyLifeOSChanged();
      }
    })();
    return () => {
      active = false;
      stopPreviewSound();
    };
  }, [routineId, notifyLifeOSChanged]);

  const currentStep = routine?.steps.find((s) => s.stepId === run?.currentStepId) ?? null;
  const currentIdx = routine && currentStep
    ? routine.steps.findIndex((s) => s.stepId === currentStep.stepId)
    : -1;
  const nextStep =
    routine && currentIdx >= 0 && currentIdx + 1 < routine.steps.length
      ? routine.steps[currentIdx + 1]
      : null;

  const handleAdvance = useCallback(
    async (action: 'complete' | 'skip') => {
      if (!run) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void previewSound('zen_bell', false);
      const updated = await advanceRoutineRun(run.runId, action);
      setRun(updated);
      notifyLifeOSChanged();
      if (updated?.status === 'completed') {
        Alert.alert('Routine Complete!', 'Disciplined execution recorded.', [
          { text: 'Return', onPress: () => router.back() },
        ]);
      }
    },
    [run, router, notifyLifeOSChanged]
  );

  // Monotonic timestamp elapsed timer (resilient to process backgrounding)
  useEffect(() => {
    if (!run || run.status !== 'running' || !currentStep) {
      return;
    }

    const tick = () => {
      const totalMs =
        run.progress.pausedElapsedMs + Math.max(0, Date.now() - run.progress.stepStartedAtMs);
      const secs = Math.floor(totalMs / 1000);
      setElapsedSec(secs);
      if (autoAdvance && currentStep.durationSeconds > 0 && secs >= currentStep.durationSeconds) {
        void handleAdvance('complete');
      }
    };
    const initTimeout = setTimeout(tick, 0);
    const id = setInterval(tick, 500);
    return () => {
      clearTimeout(initTimeout);
      clearInterval(id);
    };
  }, [run, currentStep, autoAdvance, handleAdvance]);

  const displayedElapsedSec =
    run?.status === 'paused' ? Math.floor(run.progress.pausedElapsedMs / 1000) : elapsedSec;

  const handlePauseToggle = async () => {
    if (!run) return;
    const updated = await togglePauseRoutineRun(run.runId);
    setRun(updated);
  };

  const handleStop = async () => {
    if (run) {
      await stopRoutineRun(run.runId);
      notifyLifeOSChanged();
    }
    router.back();
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  if (!routine || !run || !currentStep) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.stepTitle}>Loading Routine...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pct =
    currentStep.durationSeconds > 0
      ? Math.min(100, Math.round((displayedElapsedSec / currentStep.durationSeconds) * 100))
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={26} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.routineKicker}>{routine.title.toUpperCase()}</Text>
          <Text style={styles.stepProgressText}>
            Step {currentIdx + 1} of {routine.steps.length}
          </Text>
        </View>
        <TouchableOpacity onPress={() => void handleStop()} style={styles.iconBtn}>
          <Ionicons name="stop-circle-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.timerRing}>
          <Text style={styles.timerMain}>{formatSec(displayedElapsedSec)}</Text>
          <Text style={styles.timerTarget}>
            Target {formatSec(currentStep.durationSeconds)} · {pct}%
          </Text>
        </View>

        <Text style={styles.stepTitle}>{currentStep.title}</Text>

        {currentStep.linkedAction === 'start_focus' && (
          <TouchableOpacity
            style={styles.linkedBtn}
            onPress={() =>
              router.push(
                `/focus/pomodoro?minutes=${Math.max(5, Math.round(currentStep.durationSeconds / 60))}&label=${encodeURIComponent(currentStep.title)}` as any
              )
            }
          >
            <Ionicons name="timer-outline" size={16} color="#10B981" />
            <Text style={styles.linkedBtnText}>Launch Linked Focus Timer</Text>
          </TouchableOpacity>
        )}

        {currentStep.linkedAction === 'show_task' && (
          <TouchableOpacity
            style={styles.linkedBtn}
            onPress={() => router.push('/lifeos/tasks' as any)}
          >
            <Ionicons name="checkbox-outline" size={16} color="#60A5FA" />
            <Text style={styles.linkedBtnText}>Open Today&apos;s Tasks</Text>
          </TouchableOpacity>
        )}

        {currentStep.linkedAction === 'activate_profile' && (
          <TouchableOpacity
            style={styles.linkedBtn}
            onPress={() => {
              if (!isArmed) {
                void toggleShield().then(() => {
                  Alert.alert('Shield Armed', 'Distraction blocker policy is now active for this routine step.');
                });
              } else {
                router.push('/(tabs)/blocklist' as any);
              }
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color="#F59E0B" />
            <Text style={styles.linkedBtnText}>
              {isArmed ? 'Restriction Shield Active (Inspect Armory)' : 'Activate Distraction Shield'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.autoRow}>
          <Text style={styles.autoLabel}>Auto-advance when step duration finishes</Text>
          <Switch value={autoAdvance} onValueChange={setAutoAdvance} thumbColor="#A855F7" />
        </View>

        {nextStep && (
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>UP NEXT</Text>
            <Text style={styles.nextTitle}>{nextStep.title}</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryCtrl} onPress={() => void handleAdvance('skip')}>
          <Ionicons name="play-skip-forward" size={20} color="#94A3B8" />
          <Text style={styles.secondaryCtrlText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryCtrl} onPress={() => void handleAdvance('complete')}>
          <Ionicons name="checkmark-done" size={22} color="#070A11" />
          <Text style={styles.primaryCtrlText}>Complete Step</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryCtrl} onPress={() => void handlePauseToggle()}>
          <Ionicons name={run.status === 'paused' ? 'play' : 'pause'} size={20} color="#F8FAFC" />
          <Text style={styles.secondaryCtrlText}>
            {run.status === 'paused' ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070A11' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  iconBtn: { padding: 6 },
  routineKicker: { color: '#A855F7', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  stepProgressText: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  timerRing: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#0F1829',
    borderWidth: 4,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerMain: { fontSize: 44, fontWeight: '900', color: '#FFFFFF' },
  timerTarget: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  stepTitle: { fontSize: 22, fontWeight: '900', color: '#F8FAFC', textAlign: 'center' },
  linkedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F1829',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  linkedBtnText: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#A855F7' },
  autoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  nextCard: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  nextLabel: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  nextTitle: { color: '#CBD5E1', fontSize: 14, fontWeight: '700', marginTop: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 18,
  },
  secondaryCtrl: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#0F1829',
    gap: 2,
  },
  secondaryCtrlText: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
  primaryCtrl: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryCtrlText: { color: '#070A11', fontSize: 15, fontWeight: '900' },
});

