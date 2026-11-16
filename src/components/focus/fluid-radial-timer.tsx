import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export type ClockFace = 'ring' | 'flip' | 'zen';

interface Props {
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  isBreak: boolean;
  species?: string;
  clockFace: ClockFace;
  onChangeClockFace: (face: ClockFace) => void;
  onAdjustMinutes?: (delta: number) => void;
}

export function FluidRadialTimer({
  remainingSeconds,
  totalSeconds,
  isRunning,
  isBreak,
  species = 'bonsai',
  clockFace,
  onChangeClockFace,
  onAdjustMinutes,
}: Props) {
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isRunning) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isRunning, pulseAnim]);

  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, 1 - remainingSeconds / totalSeconds)) : 0;
  const progressPercent = Math.round(progress * 100);

  const formatParts = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return {
      minutes: `${m < 10 ? '0' : ''}${m}`,
      seconds: `${s < 10 ? '0' : ''}${s}`,
    };
  };

  const { minutes, seconds } = formatParts(remainingSeconds);

  const handleAdjust = async (delta: number) => {
    if (isRunning) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onAdjustMinutes) onAdjustMinutes(delta);
  };

  return (
    <View style={styles.container}>
      {/* Visual Clock Face Mode Switcher */}
      <View style={styles.clockModeRow}>
        <TouchableOpacity
          style={[styles.clockModeBtn, clockFace === 'ring' && styles.clockModeBtnActive]}
          onPress={() => onChangeClockFace('ring')}
        >
          <MaterialCommunityIcons
            name="circle-slice-8"
            size={14}
            color={clockFace === 'ring' ? '#00E699' : '#64748B'}
          />
          <Text style={[styles.clockModeText, clockFace === 'ring' && styles.clockModeTextActive]}>
            Fluid Arc
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.clockModeBtn, clockFace === 'flip' && styles.clockModeBtnActive]}
          onPress={() => onChangeClockFace('flip')}
        >
          <MaterialCommunityIcons
            name="numeric"
            size={14}
            color={clockFace === 'flip' ? '#00E699' : '#64748B'}
          />
          <Text style={[styles.clockModeText, clockFace === 'flip' && styles.clockModeTextActive]}>
            Cyber Flip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.clockModeBtn, clockFace === 'zen' && styles.clockModeBtnActive]}
          onPress={() => onChangeClockFace('zen')}
        >
          <MaterialCommunityIcons
            name="eye-off-outline"
            size={14}
            color={clockFace === 'zen' ? '#00E699' : '#64748B'}
          />
          <Text style={[styles.clockModeText, clockFace === 'zen' && styles.clockModeTextActive]}>
            Zen HUD
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Clock Face Render */}
      {clockFace === 'ring' && (
        <Animated.View
          style={[
            styles.heroCircle,
            isRunning && (isBreak ? styles.heroCircleBreak : styles.heroCircleRunning),
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {/* Subtle Outer Neon Track */}
          <View style={[styles.outerGlowRing, isRunning && styles.outerGlowRingActive]} />

          {/* Center Tree Icon Sprout */}
          <View style={styles.treeSproutContainer}>
            <MaterialCommunityIcons
              name={isBreak ? 'coffee' : 'tree'}
              size={28}
              color={isBreak ? '#F59E0B' : '#00E699'}
            />
          </View>

          {/* Time Numerals */}
          <Text style={styles.timeDisplay}>
            {minutes}:{seconds}
          </Text>

          {/* Phase Badge */}
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseText}>
              {isBreak
                ? 'RESTORATIVE BREAK'
                : isRunning
                ? `FLOW CONQUERED: ${progressPercent}%`
                : 'READY TO ENGAGE'}
            </Text>
          </View>

          {/* Scrubbing +/- adjusters (Only visible when not running) */}
          {!isRunning && onAdjustMinutes && (
            <View style={styles.adjustRow}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => void handleAdjust(-5)}>
                <Text style={styles.adjustBtnText}>-5m</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => void handleAdjust(+5)}>
                <Text style={styles.adjustBtnText}>+5m</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}

      {clockFace === 'flip' && (
        <View style={styles.flipContainer}>
          <View style={styles.flipCard}>
            <Text style={styles.flipDigit}>{minutes}</Text>
            <View style={styles.flipDivider} />
            <Text style={styles.flipLabel}>MINUTES</Text>
          </View>
          <Text style={styles.flipColon}>:</Text>
          <View style={styles.flipCard}>
            <Text style={styles.flipDigit}>{seconds}</Text>
            <View style={styles.flipDivider} />
            <Text style={styles.flipLabel}>SECONDS</Text>
          </View>
        </View>
      )}

      {clockFace === 'zen' && (
        <View style={styles.zenContainer}>
          <Text style={styles.zenTime}>
            {minutes}:{seconds}
          </Text>
          <Text style={styles.zenSubtitle}>
            {isBreak ? 'RESTORE MIND' : 'UNBROKEN DEEP WORK'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 12,
    gap: 16,
  },
  clockModeRow: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  clockModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  clockModeBtnActive: {
    backgroundColor: '#1E293B',
  },
  clockModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  clockModeTextActive: {
    color: '#00E699',
  },
  heroCircle: {
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#0B1120',
    borderWidth: 5,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroCircleRunning: {
    borderColor: '#00E699',
    shadowOpacity: 0.35,
    shadowRadius: 28,
  },
  heroCircleBreak: {
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
  },
  outerGlowRing: {
    position: 'absolute',
    width: 290,
    height: 290,
    borderRadius: 145,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  outerGlowRingActive: {
    borderColor: '#00E69922',
  },
  treeSproutContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00E69910',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    fontSize: 54,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  phaseBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.2,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  adjustBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adjustBtnText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  flipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  flipCard: {
    backgroundColor: '#0F1829',
    width: 110,
    height: 120,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  flipDigit: {
    fontSize: 60,
    fontWeight: '900',
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
  },
  flipDivider: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#070A11',
  },
  flipLabel: {
    position: 'absolute',
    bottom: 6,
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  flipColon: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00E699',
    marginHorizontal: 4,
  },
  zenContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
    gap: 10,
  },
  zenTime: {
    fontSize: 76,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },
  zenSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 2,
  },
});
