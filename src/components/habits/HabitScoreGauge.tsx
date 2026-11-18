import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HabitScoreGaugeProps {
  score: number; // 0 to 100
  title?: string;
  size?: number;
}

export default function HabitScoreGauge({
  score,
  title = 'Habit score',
  size = 170,
}: HabitScoreGaugeProps) {
  const safeScore = Math.min(100, Math.max(0, Math.round(score)));
  const strokeWidth = 14;

  // Rotation angle for progress (0 - 360 deg)
  const angle = (safeScore / 100) * 360;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.dot} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={[styles.gaugeContainer, { width: size, height: size }]}>
        {/* Background full track ring */}
        <View
          style={[
            styles.baseRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
            },
          ]}
        />

        {/* Dynamic Rotational Arcs */}
        {safeScore > 0 && (
          <View
            style={[
              styles.arcLayer,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: 'transparent',
                borderTopColor: '#EC4899',
                borderRightColor: angle > 90 ? '#EC4899' : 'transparent',
                borderBottomColor: angle > 180 ? '#EC4899' : 'transparent',
                borderLeftColor: angle > 270 ? '#EC4899' : 'transparent',
                transform: [{ rotate: `${angle <= 90 ? angle : 0}deg` }],
              },
            ]}
          />
        )}

        {/* Center score typography */}
        <View style={styles.centerTextContainer}>
          <Text style={styles.scoreText}>{safeScore}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EC4899',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 6,
  },
  baseRing: {
    borderColor: '#1E293B',
    position: 'absolute',
  },
  arcLayer: {
    position: 'absolute',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F8FAFC',
  },
});
