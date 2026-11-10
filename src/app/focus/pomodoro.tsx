import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FocusGrove, addPlantToGrove, addWitheredPlantToGrove } from '../../components/focus-grove';
import { FocusAudioPlayer } from '../../components/focus-audio-player';
import { YouTubeStudyPortal } from '../../components/youtube-study-portal';
import { addFocusCoins } from '../../services/storage';

type FocusPreset = 'deep_work' | 'study' | 'detox';
type TimerMode = 'countdown' | 'stopwatch';

export default function PomodoroFocusScreen() {
  const router = useRouter();
  const [timerMode, setTimerMode] = useState<TimerMode>('countdown');
  const [selectedPreset, setSelectedPreset] = useState<FocusPreset>('deep_work');
  const [sessionSeconds, setSessionSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  const handleSessionEnd = useCallback(async () => {
    setIsRunning(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!isBreak) {
      await addPlantToGrove('bonsai', 'Imperial Bonsai', 25);
      await addFocusCoins(10);
      Alert.alert(
        'Focus Session Conquered!',
        'A new Bonsai has bloomed in your Focus Grove! Earned +10 Focus Coins and +50 Focus XP.'
      );
      setIsBreak(true);
      setSessionSeconds(5 * 60);
    } else {
      Alert.alert('Break Complete', 'Ready to resume your next Deep Work sprint?');
      setIsBreak(false);
      setSessionSeconds(25 * 60);
    }
  }, [isBreak]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isRunning) {
      timer = setInterval(() => {
        setSessionSeconds((prev) => {
          if (timerMode === 'stopwatch') {
            return prev + 1;
          }
          if (prev <= 1) {
            setTimeout(() => {
              void handleSessionEnd();
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
  }, [isRunning, timerMode, handleSessionEnd]);

  const handleToggleTimer = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(!isRunning);
  };

  const handleReset = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRunning && !isBreak && sessionSeconds < 24 * 60) {
      await addWitheredPlantToGrove('bonsai', 'Imperial Bonsai', 25);
      Alert.alert(
        'Sprint Abandoned',
        'Forest parity: A withered tree has been recorded in your Focus Grove. Stay strong next time!'
      );
    }
    setIsRunning(false);
    setSessionSeconds(isBreak ? 5 * 60 : 25 * 60);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.badge}>REGAIN PROTOCOL</Text>
          <Text style={styles.title}>Deep Work Timer</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Mode Switcher: Pomodoro Countdown vs Count-up Stopwatch */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, timerMode === 'countdown' && styles.modeToggleBtnActive]}
            onPress={() => {
              setTimerMode('countdown');
              setIsRunning(false);
              setSessionSeconds(25 * 60);
            }}
          >
            <Ionicons
              name="hourglass-outline"
              size={14}
              color={timerMode === 'countdown' ? '#00E699' : '#64748B'}
            />
            <Text
              style={[
                styles.modeToggleText,
                timerMode === 'countdown' && styles.modeToggleTextActive,
              ]}
            >
              Pomodoro Countdown
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeToggleBtn, timerMode === 'stopwatch' && styles.modeToggleBtnActive]}
            onPress={() => {
              setTimerMode('stopwatch');
              setIsRunning(false);
              setSessionSeconds(0);
            }}
          >
            <Ionicons
              name="stopwatch-outline"
              size={14}
              color={timerMode === 'stopwatch' ? '#00E699' : '#64748B'}
            />
            <Text
              style={[
                styles.modeToggleText,
                timerMode === 'stopwatch' && styles.modeToggleTextActive,
              ]}
            >
              Count-Up Stopwatch
            </Text>
          </TouchableOpacity>
        </View>

        {/* Presets Selector (Visible in Countdown mode) */}
        {timerMode === 'countdown' && (
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={[styles.presetBtn, selectedPreset === 'deep_work' && styles.presetBtnActive]}
              onPress={() => {
                setSelectedPreset('deep_work');
                setSessionSeconds(25 * 60);
                setIsBreak(false);
              }}
            >
              <Text style={[styles.presetText, selectedPreset === 'deep_work' && styles.presetTextActive]}>
                25m Deep Work
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, selectedPreset === 'study' && styles.presetBtnActive]}
              onPress={() => {
                setSelectedPreset('study');
                setSessionSeconds(50 * 60);
                setIsBreak(false);
              }}
            >
              <Text style={[styles.presetText, selectedPreset === 'study' && styles.presetTextActive]}>
                50m Study
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, selectedPreset === 'detox' && styles.presetBtnActive]}
              onPress={() => {
                setSelectedPreset('detox');
                setSessionSeconds(60 * 60);
                setIsBreak(false);
              }}
            >
              <Text style={[styles.presetText, selectedPreset === 'detox' && styles.presetTextActive]}>
                1h Detox
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Circular Hero Timer */}
        <View style={styles.timerContainer}>
          <View style={[styles.timerCircle, isRunning && styles.timerCircleRunning]}>
            <Text style={styles.timerDisplay}>{formatTime(sessionSeconds)}</Text>
            <Text style={styles.timerPhase}>
              {isBreak ? 'REST BREAK' : isRunning ? 'DEEP FOCUS ACTIVE' : 'READY TO ENGAGE'}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.mainBtn, isRunning && styles.mainBtnPause]}
            onPress={() => void handleToggleTimer()}
            activeOpacity={0.8}
          >
            <Ionicons name={isRunning ? 'pause' : 'play'} size={24} color="#070A11" />
            <Text style={styles.mainBtnText}>{isRunning ? 'Pause Focus' : 'Engage Focus'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={() => void handleReset()}>
            <Ionicons name="refresh" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Focus Shield Status in ReGain */}
        <View style={styles.statusBox}>
          <Ionicons name="shield-checkmark" size={20} color="#00E699" />
          <Text style={styles.statusBoxText}>
            Distracting applications are strictly sealed for the duration of this timer.
          </Text>
        </View>

        {/* Regain Parity: Focus Audio Synthesizer */}
        <FocusAudioPlayer isTimerRunning={isRunning} />

        {/* Forest Parity: Living Focus Grove & Tree Growth */}
        <FocusGrove />

        {/* Regain Parity: Curated YouTube Study Mode Portal */}
        <YouTubeStudyPortal />
      </ScrollView>
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
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  scroll: {
    padding: 20,
    alignItems: 'center',
    gap: 20,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
    width: '100%',
    gap: 6,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 10,
  },
  modeToggleBtnActive: {
    backgroundColor: '#1E293B',
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modeToggleTextActive: {
    color: '#00E699',
  },
  presetsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 4,
    gap: 6,
    width: '100%',
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  presetBtnActive: {
    backgroundColor: '#0F172A',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  presetTextActive: {
    color: '#00E699',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  timerCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#0F1829',
    borderWidth: 6,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerCircleRunning: {
    borderColor: '#00E699',
  },
  timerDisplay: {
    fontSize: 54,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerPhase: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  },
  mainBtnPause: {
    backgroundColor: '#F59E0B',
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
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F291E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00E699',
    width: '100%',
  },
  statusBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 17,
  },
});

