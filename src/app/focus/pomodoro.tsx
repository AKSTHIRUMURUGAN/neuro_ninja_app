import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FocusGrove } from '../../components/focus-grove';
import { FocusAudioPlayer } from '../../components/focus-audio-player';
import { YouTubeStudyPortal } from '../../components/youtube-study-portal';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import { deepWorkEngine } from '../../services/focus/deep-work-engine';
import {
  FluidRadialTimer,
  type ClockFace,
} from '../../components/focus/fluid-radial-timer';
import { IntentLaunchModal } from '../../components/focus/intent-launch-modal';
import { ImpulseLoggerModal } from '../../components/focus/impulse-logger-modal';
import { SessionDebriefModal } from '../../components/focus/session-debrief-modal';
import type {
  PresetType,
  UpperCircuitProfile,
  DistractionImpulse,
} from '../../services/focus/deep-work-types';

export default function PomodoroFocusScreen() {
  const router = useRouter();
  const { showAlert, showToast } = useNinjaAlert();
  const params = useLocalSearchParams<{ minutes?: string; label?: string }>();

  // Profile & Presets
  const [profile, setProfile] = useState<UpperCircuitProfile | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('upper_circuit');
  const [clockFace, setClockFace] = useState<ClockFace>('ring');

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<string>(params.label || '');
  const [stakedCoins, setStakedCoins] = useState<number>(0);
  const [distractionsCount, setDistractionsCount] = useState<number>(0);

  // Timer State
  const [totalSeconds, setTotalSeconds] = useState<number>(38 * 60);
  const [sessionSeconds, setSessionSeconds] = useState<number>(38 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isBreak, setIsBreak] = useState<boolean>(false);

  // Modals
  const [showLaunchModal, setShowLaunchModal] = useState<boolean>(false);
  const [showImpulseModal, setShowImpulseModal] = useState<boolean>(false);
  const [showDebriefModal, setShowDebriefModal] = useState<boolean>(false);

  // Elapsed tracker for actual deep work seconds
  const [actualSeconds, setActualSeconds] = useState<number>(0);

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: PresetType) => {
    setSelectedPreset(preset);
    setIsBreak(false);

    if (preset === 'stopwatch') {
      setTotalSeconds(0);
      setSessionSeconds(0);
      return;
    }

    let minutes = 25;
    if (preset === 'upper_circuit' && profile) {
      minutes = deepWorkEngine.calculateSweetSpot(profile.ceilingMinutes).recommended;
    } else if (preset === 'extended') {
      minutes = 50;
    } else if (preset === 'sprint') {
      minutes = 15;
    } else if (preset === 'breaker_pr' && profile) {
      minutes = profile.weeklyPrMinutes + 5;
    }

    setTotalSeconds(minutes * 60);
    setSessionSeconds(minutes * 60);
  }, [profile]);

  // Handle sprint completion
  const handleSessionComplete = useCallback(async () => {
    setIsRunning(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!isBreak) {
      // Trigger post-session reflection debrief modal
      setShowDebriefModal(true);
    } else {
      showToast({
        title: 'Break Concluded',
        message: 'Your mind is recharged. Ready for the next Deep Work block?',
        type: 'info',
        icon: 'timer-sand',
      });
      setIsBreak(false);
      handleSelectPreset(selectedPreset);
    }
  }, [isBreak, selectedPreset, showToast, handleSelectPreset]);

  // Load upper circuit profile on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      const p = await deepWorkEngine.getUpperCircuitProfile();
      if (!active) return;
      setProfile(p);
      const sweet = deepWorkEngine.calculateSweetSpot(p.ceilingMinutes);
      const initMins = params.minutes ? Number(params.minutes) : sweet.recommended;
      setTotalSeconds(initMins * 60);
      setSessionSeconds(initMins * 60);
    })();
    return () => {
      active = false;
    };
  }, [params.minutes]);

  // Main countdown/stopwatch tick loop
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isRunning) {
      timer = setInterval(() => {
        setActualSeconds((prev) => prev + 1);
        setSessionSeconds((prev) => {
          if (selectedPreset === 'stopwatch') {
            return prev + 1;
          }
          if (prev <= 1) {
            setTimeout(() => {
              void handleSessionComplete();
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, selectedPreset, handleSessionComplete]);

  // Adjust minutes manually
  const handleAdjustMinutes = (delta: number) => {
    if (isRunning) return;
    const currentMins = Math.round(totalSeconds / 60);
    const nextMins = Math.max(5, Math.min(180, currentMins + delta));
    setTotalSeconds(nextMins * 60);
    setSessionSeconds(nextMins * 60);
  };

  // Start or Toggle Timer
  const handleToggleTimer = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isRunning) {
      if (!currentSessionId && !isBreak) {
        // Trigger Pre-Sprint Intent & Zero-Resistance Launch Modal
        setShowLaunchModal(true);
      } else {
        setIsRunning(true);
      }
    } else {
      setIsRunning(false);
    }
  };

  // Launch Session from Pre-Sprint Gate
  const handleConfirmLaunch = async (data: {
    intent: string;
    stakedCoins: number;
    zeroResistance: UpperCircuitProfile['zeroResistanceState'];
  }) => {
    setShowLaunchModal(false);
    setActiveIntent(data.intent);
    setStakedCoins(data.stakedCoins);
    setDistractionsCount(0);
    setActualSeconds(0);
    setIsRunning(true);

    try {
      // Persist zero resistance updates
      if (profile) {
        void deepWorkEngine.updateUpperCircuitProfile({
          zeroResistanceState: data.zeroResistance,
        });
      }

      // Start session in SQLite
      const session = await deepWorkEngine.startDeepWorkSession({
        intent: data.intent,
        presetType: selectedPreset,
        plannedSeconds: totalSeconds,
        stakedCoins: data.stakedCoins,
        treeSpecies: 'bonsai',
      });

      setCurrentSessionId(session.id);
    } catch (e) {
      console.warn('[Pomodoro] start session error:', e);
    }
  };

  // Debrief confirmed
  const handleDebriefComplete = async (data: {
    focusDepth: number;
    intentCompleted: boolean;
  }) => {
    setShowDebriefModal(false);

    if (currentSessionId) {
      await deepWorkEngine.completeSession({
        sessionId: currentSessionId,
        actualSeconds,
        focusDepth: data.focusDepth,
        intentCompleted: data.intentCompleted,
      });
    }

    // Enter Restorative Break (20% of work time)
    const breakMins = profile
      ? deepWorkEngine.calculateSweetSpot(profile.ceilingMinutes).breakMinutes
      : 5;
    setIsBreak(true);
    setCurrentSessionId(null);
    setTotalSeconds(breakMins * 60);
    setSessionSeconds(breakMins * 60);
  };

  // Abandon Session early
  const handleResetOrAbandon = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isRunning && !isBreak && currentSessionId) {
      showAlert({
        title: 'Abandon Deep Work Block?',
        message: 'Quitting early will cause your growing Bonsai to wither, and any staked coins will be forfeited to the penalty pool.',
        type: 'warning',
        icon: 'weather-dust',
        buttons: [{ text: 'Stay & Push Through', onPress: () => {} }],
      });

      await deepWorkEngine.abandonSession({
        sessionId: currentSessionId,
        actualSeconds,
      });

      showToast({
        title: 'Sprint Abandoned',
        message: 'A withered tree was added to your grove. Stay resilient!',
        type: 'warning',
        icon: 'weather-dust',
      });
    }

    setIsRunning(false);
    setCurrentSessionId(null);
    setActualSeconds(0);
    handleSelectPreset(selectedPreset);
  };

  // Record Distraction Impulse
  const handleRecordImpulse = async (tag: DistractionImpulse['tag'], note?: string) => {
    if (!currentSessionId) return;
    const res = await deepWorkEngine.recordDistractionImpulse(currentSessionId, tag, note);
    setDistractionsCount(res.count);
    showToast({
      title: 'Impulse Dissolved',
      message: 'Urge acknowledged and resisted. Unbroken flow continues!',
      type: 'success',
      icon: 'shield-check',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.badge}>
            {activeIntent ? `TARGET: ${activeIntent.toUpperCase()}` : 'UPPER CIRCUIT ENGINE'}
          </Text>
          <Text style={styles.title}>Deep Work Timer</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => {
            void Haptics.selectionAsync();
            setClockFace((prev) => (prev === 'ring' ? 'flip' : prev === 'flip' ? 'zen' : 'ring'));
          }}
        >
          <MaterialCommunityIcons name="view-dashboard-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Preset Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          <TouchableOpacity
            style={[styles.presetChip, selectedPreset === 'upper_circuit' && styles.presetChipActive]}
            onPress={() => handleSelectPreset('upper_circuit')}
          >
            <MaterialCommunityIcons
              name="flash"
              size={14}
              color={selectedPreset === 'upper_circuit' ? '#00E699' : '#64748B'}
            />
            <Text style={[styles.presetChipText, selectedPreset === 'upper_circuit' && styles.presetChipTextActive]}>
              Upper Circuit ({profile?.sweetSpotMinutes || 38}m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, selectedPreset === 'pomodoro' && styles.presetChipActive]}
            onPress={() => handleSelectPreset('pomodoro')}
          >
            <MaterialCommunityIcons
              name="brain"
              size={14}
              color={selectedPreset === 'pomodoro' ? '#00E699' : '#64748B'}
            />
            <Text style={[styles.presetChipText, selectedPreset === 'pomodoro' && styles.presetChipTextActive]}>
              Classic (25m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, selectedPreset === 'extended' && styles.presetChipActive]}
            onPress={() => handleSelectPreset('extended')}
          >
            <MaterialCommunityIcons
              name="target"
              size={14}
              color={selectedPreset === 'extended' ? '#00E699' : '#64748B'}
            />
            <Text style={[styles.presetChipText, selectedPreset === 'extended' && styles.presetChipTextActive]}>
              Deep Focus (50m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, selectedPreset === 'sprint' && styles.presetChipActive]}
            onPress={() => handleSelectPreset('sprint')}
          >
            <MaterialCommunityIcons
              name="rocket-launch-outline"
              size={14}
              color={selectedPreset === 'sprint' ? '#00E699' : '#64748B'}
            />
            <Text style={[styles.presetChipText, selectedPreset === 'sprint' && styles.presetChipTextActive]}>
              Sprint (15m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, selectedPreset === 'stopwatch' && styles.presetChipActive]}
            onPress={() => handleSelectPreset('stopwatch')}
          >
            <MaterialCommunityIcons
              name="timer-outline"
              size={14}
              color={selectedPreset === 'stopwatch' ? '#00E699' : '#64748B'}
            />
            <Text style={[styles.presetChipText, selectedPreset === 'stopwatch' && styles.presetChipTextActive]}>
              Stopwatch
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Active Intent & Impulse Logger Bar (When session is active) */}
        {currentSessionId && isRunning && (
          <View style={styles.activeSprintCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeSprintLabel}>ACTIVE INTENT</Text>
              <Text style={styles.activeSprintIntent} numberOfLines={1}>
                {activeIntent}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.impulseCatchBtn}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowImpulseModal(true);
              }}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F59E0B" />
              <Text style={styles.impulseCatchText}>
                Impulse ({distractionsCount})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fluid Radial Clock / Flip / Zen Hero */}
        <FluidRadialTimer
          remainingSeconds={sessionSeconds}
          totalSeconds={totalSeconds}
          isRunning={isRunning}
          isBreak={isBreak}
          species="bonsai"
          clockFace={clockFace}
          onChangeClockFace={setClockFace}
          onAdjustMinutes={handleAdjustMinutes}
        />

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.mainBtn, isRunning && styles.mainBtnPause]}
            onPress={() => void handleToggleTimer()}
            activeOpacity={0.85}
          >
            <Ionicons name={isRunning ? 'pause' : 'play'} size={24} color="#070A11" />
            <Text style={styles.mainBtnText}>
              {isRunning ? 'Pause Focus' : isBreak ? 'Resume Break' : 'Engage Focus'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={() => void handleResetOrAbandon()}>
            <Ionicons name="refresh" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Native App Shield Status */}
        <View style={styles.statusBox}>
          <Ionicons name="shield-checkmark" size={20} color="#00E699" />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusBoxTitle}>
              {isRunning ? 'SHIELD ARMED: DISTRACTIONS SEALED' : 'NATIVE FOCUS SHIELD STANDBY'}
            </Text>
            <Text style={styles.statusBoxDesc}>
              {isRunning
                ? 'Blacklisted social media & distracting apps are locked by native accessibility overlay.'
                : 'Starting this timer will arm OS-level blocking to protect your flow state.'}
            </Text>
          </View>
        </View>

        {/* Neuro-Acoustic Synthesizer */}
        <FocusAudioPlayer isTimerRunning={isRunning} />

        {/* Living Focus Grove & Tree Growth */}
        <FocusGrove />

        {/* YouTube Study Mode Portal */}
        <YouTubeStudyPortal />
      </ScrollView>

      {/* Pre-Sprint Calibration Modal */}
      <IntentLaunchModal
        visible={showLaunchModal}
        presetName={
          selectedPreset === 'upper_circuit'
            ? 'Upper Circuit Sweet Spot'
            : selectedPreset === 'extended'
            ? 'Deep Focus'
            : selectedPreset === 'sprint'
            ? 'Sprint'
            : 'Classic Pomodoro'
        }
        durationMinutes={Math.round(totalSeconds / 60)}
        initialZeroResistance={profile?.zeroResistanceState || {
          cleanDesk: true,
          phoneDnd: true,
          singleVictory: true,
          hydrated: true,
        }}
        onDismiss={() => setShowLaunchModal(false)}
        onLaunch={(data) => void handleConfirmLaunch(data)}
      />

      {/* Dopamine Impulse Caught Modal */}
      <ImpulseLoggerModal
        visible={showImpulseModal}
        onDismiss={() => setShowImpulseModal(false)}
        onRecordImpulse={(tag, note) => void handleRecordImpulse(tag, note)}
      />

      {/* Post-Sprint Debrief Modal */}
      <SessionDebriefModal
        visible={showDebriefModal}
        intent={activeIntent || 'Deep Work Sprint'}
        durationMinutes={Math.round(actualSeconds / 60)}
        distractionsCount={distractionsCount}
        stakedCoins={stakedCoins}
        onDismiss={() => setShowDebriefModal(false)}
        onComplete={(data) => void handleDebriefComplete(data)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: 'center',
  },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  headerActionBtn: {
    padding: 6,
  },
  scroll: {
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  presetScroll: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 4,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F1829',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  presetChipActive: {
    backgroundColor: '#00E69918',
    borderColor: '#00E699',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  presetChipTextActive: {
    color: '#00E699',
  },
  activeSprintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00E69944',
    width: '100%',
    gap: 12,
  },
  activeSprintLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.2,
  },
  activeSprintIntent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  impulseCatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B18',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  impulseCatchText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  mainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00E699',
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#00E699',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  mainBtnPause: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#070A11',
  },
  resetBtn: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#0A1813',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00E69955',
    width: '100%',
  },
  statusBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  statusBoxDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 2,
  },
});
