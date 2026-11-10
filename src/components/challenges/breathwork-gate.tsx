import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { NinjaPalette } from '../../constants/theme';

interface Props {
  strictMode?: boolean;
  escalationTier?: 1 | 2 | 3;
  onSuccess: () => void;
  onCancel: () => void;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale' | 'Pause';

export function BreathworkGate({
  strictMode = false,
  escalationTier = 1,
  onSuccess,
  onCancel,
}: Props) {
  const initialCycles = strictMode ? 2 : escalationTier;
  const [phase, setPhase] = useState<BreathPhase>('Inhale');
  const [cyclesRemaining, setCyclesRemaining] = useState<number>(initialCycles);
  const [isDone, setIsDone] = useState(false);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    let isMounted = true;

    const runCycle = (remaining: number) => {
      if (!isMounted) return;

      // 1. Inhale (4s)
      setPhase('Inhale');
      scale.value = withTiming(1.6, { duration: 4000, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(0.9, { duration: 4000 });

      setTimeout(() => {
        if (!isMounted) return;
        // 2. Hold (4s)
        setPhase('Hold');

        setTimeout(() => {
          if (!isMounted) return;
          // 3. Exhale (4s)
          setPhase('Exhale');
          scale.value = withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.ease) });
          opacity.value = withTiming(0.4, { duration: 4000 });

          setTimeout(() => {
            if (!isMounted) return;
            // 4. Pause (4s)
            setPhase('Pause');

            setTimeout(() => {
              if (!isMounted) return;
              if (remaining > 1) {
                setCyclesRemaining(remaining - 1);
                runCycle(remaining - 1);
              } else {
                setIsDone(true);
              }
            }, 4000);
          }, 4000);
        }, 4000);
      }, 4000);
    };

    runCycle(cyclesRemaining);

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedOrbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {escalationTier > 1 ? (
        <View style={styles.escalationPill}>
          <Text style={styles.escalationText}>
            ⚡ Escalating Friction Tier {escalationTier} (+{(escalationTier - 1) * 16}s Pause)
          </Text>
        </View>
      ) : (
        <Text style={styles.badge}>MIND BARRIER</Text>
      )}
      <Text style={styles.title}>Zen Breathwork</Text>
      <Text style={styles.subtitle}>
        Calm your dopamine loop before taking action.
      </Text>

      <View style={styles.orbContainer}>
        <Animated.View style={[styles.glowRing, animatedOrbStyle]} />
        <View style={styles.innerOrb}>
          <Text style={styles.phaseText}>{phase}</Text>
          <Text style={styles.subPhaseText}>
            {phase === 'Inhale'
              ? '4s deep breath in'
              : phase === 'Hold'
              ? 'Retain focus'
              : phase === 'Exhale'
              ? 'Release tension'
              : 'Still your mind'}
          </Text>
        </View>
      </View>

      <Text style={styles.cycleText}>
        {isDone
          ? 'Breath cycle completed!'
          : `${cyclesRemaining} ${cyclesRemaining === 1 ? 'cycle' : 'cycles'} left`}
      </Text>

      {isDone ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onSuccess}>
          <Text style={styles.primaryButtonText}>Claim Focus Pass</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Stay in Focus (Exit)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: '100%',
  },
  escalationPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
  },
  escalationText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    color: NinjaPalette.emerald,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    marginBottom: 36,
  },
  orbContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  glowRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: NinjaPalette.emerald,
  },
  innerOrb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#0A1220',
    borderWidth: 2,
    borderColor: NinjaPalette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  phaseText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 4,
  },
  subPhaseText: {
    fontSize: 11,
    color: NinjaPalette.emerald,
    textAlign: 'center',
    fontWeight: '600',
  },
  cycleText: {
    fontSize: 13,
    color: NinjaPalette.textMuted,
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#070A11',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    color: NinjaPalette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

