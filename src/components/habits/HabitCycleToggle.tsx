import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HabitStatus } from '../../services/habits/habit-types';

interface HabitCycleToggleProps {
  status: HabitStatus;
  onCycle: () => void;
  size?: number;
  disabled?: boolean;
}

export default function HabitCycleToggle({
  status,
  onCycle,
  size = 36,
  disabled = false,
}: HabitCycleToggleProps) {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePress = async () => {
    if (disabled) return;

    // Micro-spring animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (status === 'not_attempted') {
      // Transitioning to not_completed (Red)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (status === 'not_completed') {
      // Transitioning to completed (Green)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Transitioning back to not_attempted (Reset)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onCycle();
  };

  const iconSize = Math.round(size * 0.55);

  const renderContent = () => {
    switch (status) {
      case 'completed':
        return (
          <View
            style={[
              styles.completedCircle,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Ionicons name="checkmark" size={iconSize} color="#070A11" />
          </View>
        );
      case 'not_completed':
        return (
          <View
            style={[
              styles.failedCircle,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Ionicons name="close" size={iconSize} color="#FFFFFF" />
          </View>
        );
      case 'recovered':
        return (
          <View
            style={[
              styles.recoveredCircle,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <Ionicons name="refresh" size={iconSize} color="#070A11" />
          </View>
        );
      case 'not_attempted':
      default:
        return (
          <View
            style={[
              styles.unattemptedCircle,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <View
              style={[
                styles.innerDashed,
                { width: size * 0.45, height: size * 0.45, borderRadius: size * 0.25 },
              ]}
            />
          </View>
        );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => void handlePress()}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Habit status: ${status}. Tap to cycle status.`}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {renderContent()}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  unattemptedCircle: {
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#475569',
  },
  completedCircle: {
    backgroundColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  failedCircle: {
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  recoveredCircle: {
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
});
