import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface ShakeMissionProps {
  targetShakes?: number;
  onCompleted: () => void;
}

export function ShakeMission({ targetShakes = 25, onCompleted }: ShakeMissionProps) {
  const [currentCount, setCurrentCount] = useState(0);

  const handleShake = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const next = currentCount + 1;
    setCurrentCount(next);
    if (next >= targetShakes) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCompleted();
    }
  };

  const progressPercent = Math.min(100, (currentCount / targetShakes) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="barbell-outline" size={16} color="#F59E0B" />
        <Text style={styles.badgeText}>Kinetic Shake Mission</Text>
      </View>

      <Text style={styles.title}>Wake Up Your Body</Text>
      <Text style={styles.subtitle}>
        Shake phone vigorously or tap rapid kinetic pulses to dismiss alarm.
      </Text>

      <TouchableOpacity
        style={styles.shakeZone}
        onPress={() => void handleShake()}
        activeOpacity={0.7}
      >
        <Ionicons name="phone-portrait-outline" size={72} color="#F59E0B" />
        <Text style={styles.countText}>
          {currentCount} / {targetShakes}
        </Text>
        <Text style={styles.tapPrompt}>Tap / Shake Now</Text>
      </TouchableOpacity>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
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
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 280,
  },
  shakeZone: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  countText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F59E0B',
    marginTop: 8,
  },
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
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 5,
  },
});

