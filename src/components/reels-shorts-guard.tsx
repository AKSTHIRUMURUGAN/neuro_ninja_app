import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../constants/theme';
import { addFocusCoins } from '../services/storage';

interface ReelsShortsGuardProps {
  appName: string;
  onGrantPass: (minutes: number) => void;
  onExit: () => void;
}

export function ReelsShortsGuard({
  appName,
  onGrantPass,
  onExit,
}: ReelsShortsGuardProps) {
  const router = useRouter();

  const handleStudyModeRedirect = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addFocusCoins(15);
    router.replace('/focus/pomodoro' as any);
  };

  const handleBrainGameRedirect = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addFocusCoins(10);
    router.replace('/dojo-games' as any);
  };

  const handleGrantMicroPass = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onGrantPass(3); // Strict 3-minute emergency micro-pass
  };

  return (
    <View style={styles.container}>
      <View style={styles.alertHeader}>
        <View style={styles.shieldBadge}>
          <MaterialCommunityIcons name="movie-play-outline" size={24} color="#EF4444" />
        </View>
        <Text style={styles.alertTitle}>Reels & Shorts Deterrent</Text>
        <Text style={styles.alertSub}>
          Short-form algorithm loop detected on <Text style={styles.highlightApp}>{appName}</Text>. Continuous vertical scrolling depletes dopamine reserves and fragments attention.
        </Text>
      </View>

      {/* Productive Alternatives Grid */}
      <View style={styles.alternativesBox}>
        <Text style={styles.sectionLabel}>HEALTHIER NEURAL ALTERNATIVES</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleStudyModeRedirect}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <MaterialCommunityIcons name="youtube" size={22} color="#EF4444" />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>YouTube Study Hall</Text>
            <Text style={styles.actionDesc}>
              Watch curated Khan Academy, MIT OCW, or 3Blue1Brown (+15 Coins)
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleBrainGameRedirect}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
            <MaterialCommunityIcons name="brain" size={22} color="#60A5FA" />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>Cognitive Reflex Arcade</Text>
            <Text style={styles.actionDesc}>
              Play 60-second Stroop Color Challenge (+10 Coins)
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Emergency Conscious Sprint */}
      <View style={styles.footerActions}>
        <TouchableOpacity
          style={styles.microSprintBtn}
          onPress={handleGrantMicroPass}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="timer-sand" size={16} color="#F59E0B" />
          <Text style={styles.microSprintText}>Conscious 3-Min Pass (Hard Auto-Lock)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onExit} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Back to Dojo Discipline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F87171',
    letterSpacing: 0.5,
  },
  alertSub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  highlightApp: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  alternativesBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDetails: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
  },
  actionDesc: {
    fontSize: 11,
    color: NinjaPalette.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  footerActions: {
    gap: 10,
  },
  microSprintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 12,
  },
  microSprintText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});

