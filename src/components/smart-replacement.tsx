import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../constants/theme';
import { addFocusCoins } from '../services/storage';

interface SmartReplacementProps {
  appName: string;
  onGrantPass: (minutes: number) => void;
  onExit: () => void;
}

export function SmartReplacement({ appName, onGrantPass, onExit }: SmartReplacementProps) {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(5);
  const [replacingWithHabit, setReplacingWithHabit] = useState<string | null>(null);

  const REASONS = [
    { id: 'work', label: 'Work / Essential Task', icon: 'briefcase-outline' },
    { id: 'search', label: 'Specific Search Query', icon: 'magnify' },
    { id: 'autopilot', label: 'Habit / Dopamine Loop', icon: 'repeat' },
    { id: 'message', label: 'Urgent Direct Message', icon: 'message-outline' },
  ];

  const DURATION_INTERVALS = [5, 10, 15, 30];

  const handleTakeReplacement = async (type: 'brain' | 'water' | 'stretch') => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addFocusCoins(10); // Reward for choosing healthy replacement

    if (type === 'brain') {
      router.replace('/dojo-games' as any);
    } else {
      setReplacingWithHabit(
        type === 'water'
          ? '💧 Hydration Break Logged! +10 Focus Coins earned.'
          : '🧘 Posture Reset Complete! +10 Focus Coins earned.'
      );
      setTimeout(() => {
        onExit();
      }, 1500);
    }
  };

  const handleConfirmIntentPass = async () => {
    if (!selectedReason) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onGrantPass(selectedDuration); // Mindful extension based on user interval selection
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Replacement & Intent</Text>
      <Text style={styles.subtitle}>
        Before opening {appName}, break the autopilot loop with a positive micro-action or state your conscious intent.
      </Text>

      {/* Healthy Replacement Action Cards */}
      <View style={styles.replacementList}>
        <TouchableOpacity
          style={styles.replaceCard}
          onPress={() => handleTakeReplacement('brain')}
        >
          <View style={[styles.replaceIconBox, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
            <MaterialCommunityIcons name="brain" size={22} color="#60A5FA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.replaceTitle}>1-Min Brain Reflex Game</Text>
            <Text style={styles.replaceSub}>Play Stroop Test instead • Earn +10 Coins</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.replaceCard}
          onPress={() => handleTakeReplacement('water')}
        >
          <View style={[styles.replaceIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
            <MaterialCommunityIcons name="cup-water" size={22} color="#06B6D4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.replaceTitle}>Hydration Sentinel Pause</Text>
            <Text style={styles.replaceSub}>Drink a glass of water • Earn +10 Coins</Text>
          </View>
          <MaterialCommunityIcons name="check" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.replaceCard}
          onPress={() => handleTakeReplacement('stretch')}
        >
          <View style={[styles.replaceIconBox, { backgroundColor: 'rgba(0, 230, 153, 0.15)' }]}>
            <MaterialCommunityIcons name="human-handsup" size={22} color="#00E699" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.replaceTitle}>30-Second Ergonomic Stretch</Text>
            <Text style={styles.replaceSub}>Release neck & eye strain • Earn +10 Coins</Text>
          </View>
          <MaterialCommunityIcons name="check" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {replacingWithHabit ? (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{replacingWithHabit}</Text>
        </View>
      ) : (
        /* Conscious In-App Session Reminder Interval Option */
        <View style={styles.intentSection}>
          <Text style={styles.intentHeading}>SELECT INTENDED SESSION DURATION</Text>
          <View style={styles.durationRow}>
            {DURATION_INTERVALS.map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.durationPill,
                  selectedDuration === mins && styles.durationPillSelected,
                ]}
                onPress={() => setSelectedDuration(mins)}
              >
                <Text
                  style={[
                    styles.durationPillText,
                    selectedDuration === mins && styles.durationPillTextSelected,
                  ]}
                >
                  {mins} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.intentHeading, { marginTop: 14 }]}>
            OR PROCEED WITH CONSCIOUS INTENT
          </Text>
          <View style={styles.reasonsGrid}>
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.reasonPill,
                  selectedReason === r.id && styles.reasonPillSelected,
                ]}
                onPress={() => setSelectedReason(r.id)}
              >
                <MaterialCommunityIcons
                  name={r.icon as any}
                  size={14}
                  color={selectedReason === r.id ? '#00E699' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === r.id && styles.reasonTextSelected,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedReason && (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmIntentPass}
            >
              <Text style={styles.confirmBtnText}>
                Grant {selectedDuration}-Minute Mindful Pass
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  replacementList: {
    gap: 10,
    marginBottom: 20,
  },
  replaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  replaceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replaceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
  },
  replaceSub: {
    fontSize: 11,
    color: NinjaPalette.textMuted,
    marginTop: 2,
  },
  feedbackBanner: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00E699',
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00E699',
  },
  intentSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  intentHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  durationPillSelected: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  durationPillTextSelected: {
    color: '#00E699',
  },
  reasonsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  reasonPillSelected: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
  },
  reasonText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  reasonTextSelected: {
    color: '#00E699',
  },
  confirmBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#070A11',
  },
});

