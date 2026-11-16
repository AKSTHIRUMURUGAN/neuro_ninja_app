import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface MovementMissionProps {
  targetSteps?: number;
  onCompleted: () => void;
}

/**
 * Hardware step-counter alarm mission (FR-185 / FR-194).
 * Requests foreground motion permissions only when active and provides safe fallback
 * if step sensor hardware or permission is denied.
 */
export function MovementMission({ targetSteps = 15, onCompleted }: MovementMissionProps) {
  const [steps, setSteps] = useState(0);
  const [sensorStatus, setSensorStatus] = useState<'checking' | 'ready' | 'unavailable' | 'denied'>('checking');
  const completedRef = useRef(false);

  const checkComplete = React.useCallback(
    (nextSteps: number) => {
      if (nextSteps >= targetSteps && !completedRef.current) {
        completedRef.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCompleted();
      }
    },
    [targetSteps, onCompleted]
  );

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let mounted = true;

    void (async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!mounted) return;
        if (!available) {
          setSensorStatus('unavailable');
          return;
        }
        const perm = await Pedometer.requestPermissionsAsync();
        if (!mounted) return;
        if (!perm.granted) {
          setSensorStatus('denied');
          return;
        }
        setSensorStatus('ready');
        sub = Pedometer.watchStepCount((result) => {
          setSteps(result.steps);
          checkComplete(result.steps);
        });
      } catch {
        if (mounted) setSensorStatus('unavailable');
      }
    })();

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [checkComplete]);

  const progress = Math.min(100, (steps / targetSteps) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="walk-outline" size={16} color="#10B981" />
        <Text style={styles.badgeText}>Movement Mission · Approximate Steps</Text>
      </View>

      <Text style={styles.title}>Get Out of Bed</Text>
      <Text style={styles.subtitle}>
        Walk {targetSteps} steps while holding your phone. Non-medical step detection only.
      </Text>

      <View style={styles.circle}>
        <Ionicons name="footsteps-outline" size={56} color="#10B981" />
        <Text style={styles.counter}>
          {steps} / {targetSteps}
        </Text>
        <Text style={styles.statusText}>
          {sensorStatus === 'ready'
            ? 'Step sensor active'
            : sensorStatus === 'checking'
              ? 'Connecting sensor...'
              : sensorStatus === 'denied'
                ? 'Motion permission denied'
                : 'Step sensor unavailable'}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {(sensorStatus === 'unavailable' || sensorStatus === 'denied') && (
        <TouchableOpacity
          style={styles.fallbackBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const next = steps + 3;
            setSteps(next);
            checkComplete(next);
          }}
        >
          <Text style={styles.fallbackText}>
            Manual Step Fallback (+3 steps)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20, width: '100%' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F291E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 14,
  },
  badgeText: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 20,
  },
  circle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#0F1829',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  counter: { fontSize: 30, fontWeight: '900', color: '#10B981', marginTop: 6 },
  statusText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#0F172A',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#10B981' },
  fallbackBtn: {
    marginTop: 16,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fallbackText: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
});

