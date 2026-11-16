import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';

interface ShakeMissionProps {
  targetShakes?: number;
  sensitivity?: 'low' | 'medium' | 'high';
  onCompleted: () => void;
}

export function ShakeMission({
  targetShakes = 20,
  sensitivity = 'medium',
  onCompleted,
}: ShakeMissionProps) {
  const [currentCount, setCurrentCount] = useState(0);
  const [sensorAvailable, setSensorAvailable] = useState<boolean>(true);
  const [lastForce, setLastForce] = useState<number>(0);
  const completedRef = useRef(false);
  const lastShakeAtRef = useRef(0);
  const lastMagRef = useRef(1.0);

  const deltaThreshold = sensitivity === 'low' ? 1.05 : sensitivity === 'high' ? 0.55 : 0.8;

  const incrementShake = React.useCallback(() => {
    if (completedRef.current) return;
    setCurrentCount((prev) => {
      const next = prev + 1;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (next >= targetShakes && !completedRef.current) {
        completedRef.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => onCompleted(), 150);
      }
      return next;
    });
  }, [targetShakes, onCompleted]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let mounted = true;

    void (async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!mounted) return;
        setSensorAvailable(available);
        if (!available) return;

        Accelerometer.setUpdateInterval(90);
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const mag = Math.sqrt(x * x + y * y + z * z);
          const delta = Math.abs(mag - lastMagRef.current);
          lastMagRef.current = mag;
          setLastForce(Number(delta.toFixed(2)));

          const now = Date.now();
          if (delta > deltaThreshold && now - lastShakeAtRef.current > 220) {
            lastShakeAtRef.current = now;
            incrementShake();
          }
        });
      } catch {
        if (mounted) setSensorAvailable(false);
      }
    })();

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [deltaThreshold, incrementShake]);

  const progressPercent = Math.min(100, (currentCount / targetShakes) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="barbell-outline" size={16} color="#F59E0B" />
        <Text style={styles.badgeText}>
          Kinetic Shake · {sensorAvailable ? `Delta ${lastForce}g` : 'Tap Assist Mode'}
        </Text>
      </View>

      <Text style={styles.title}>Wake Up Your Body</Text>
      <Text style={styles.subtitle}>
        {sensorAvailable
          ? 'Shake your phone briskly (or tap circle as accessible fallback) until complete.'
          : 'Accelerometer unavailable on this device. Tap the kinetic zone repeatedly to dismiss.'}
      </Text>

      <TouchableOpacity
        style={styles.shakeZone}
        onPress={incrementShake}
        activeOpacity={0.7}
      >
        <Ionicons name="phone-portrait-outline" size={64} color="#F59E0B" />
        <Text style={styles.countText}>
          {currentCount} / {targetShakes}
        </Text>
        <Text style={styles.tapPrompt}>
          {sensorAvailable ? 'Shake or Tap' : 'Tap Pulse'}
        </Text>
      </TouchableOpacity>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20, width: '100%' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#292211',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 14,
  },
  badgeText: { fontSize: 12, color: '#F59E0B', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 290,
  },
  shakeZone: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  countText: { fontSize: 30, fontWeight: '900', color: '#F59E0B', marginTop: 6 },
  tapPrompt: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#0F172A',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 5 },
});
