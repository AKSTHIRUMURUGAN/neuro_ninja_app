import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface EmergencyDismissProps {
  onEmergencyDismiss: () => void;
}

const HOLD_DURATION_MS = 3000;

/**
 * Always-discoverable emergency dismissal route per FR-190.
 * Requires a deliberate 3-second hold to prevent accidental dismissal while
 * ensuring a user is never trapped in an inaccessible or broken alarm state.
 */
export function EmergencyDismiss({ onEmergencyDismiss }: EmergencyDismissProps) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const stopHold = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);
  };

  useEffect(() => stopHold, []);

  const startHold = () => {
    startRef.current = Date.now();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) {
        stopHold();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onEmergencyDismiss();
      }
    }, 50);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPressIn={startHold}
        onPressOut={stopHold}
        accessibilityRole="button"
        accessibilityLabel="Hold for 3 seconds for emergency alarm dismissal"
        style={styles.button}
      >
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        <Ionicons name="medkit-outline" size={16} color="#FCA5A5" />
        <Text style={styles.text}>
          {progress > 0
            ? `Hold to Emergency Dismiss (${Math.ceil((1 - progress) * 3)}s)...`
            : 'Emergency Dismiss (Hold 3s)'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', paddingVertical: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
  text: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
});

