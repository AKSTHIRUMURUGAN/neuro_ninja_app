import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HabitMilestonesRailProps {
  currentStreak: number;
  bestStreak: number;
}

interface MilestoneTier {
  days: number;
  tier: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const MILESTONES: MilestoneTier[] = [
  { days: 1, tier: 'SPARK', icon: 'flame', color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.15)' },
  { days: 7, tier: 'WARRIOR', icon: 'shield-checkmark', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  { days: 15, tier: 'MOMENTUM', icon: 'flash', color: '#38BDF8', bgColor: 'rgba(56, 189, 248, 0.15)' },
  { days: 30, tier: 'MASTERY', icon: 'trophy', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  { days: 60, tier: 'LEGEND', icon: 'sparkles', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
];

export default function HabitMilestonesRail({
  currentStreak,
  bestStreak,
}: HabitMilestonesRailProps) {
  const effectiveStreak = Math.max(currentStreak, bestStreak);
  const unlockedCount = MILESTONES.filter((m) => effectiveStreak >= m.days).length;
  const nextMilestone = MILESTONES.find((m) => effectiveStreak < m.days);
  const prevMilestoneDays = MILESTONES.filter((m) => effectiveStreak >= m.days).pop()?.days || 0;

  const nextProgress = nextMilestone
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((effectiveStreak - prevMilestoneDays) / (nextMilestone.days - prevMilestoneDays)) *
              100
          )
        )
      )
    : 100;

  const daysRemaining = nextMilestone ? nextMilestone.days - effectiveStreak : 0;
  const trackPercent = Math.min(100, Math.round((unlockedCount / MILESTONES.length) * 100));

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.trophyIconBox}>
            <Ionicons name="trophy-outline" size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.title}>Streak Milestones</Text>
            <Text style={styles.subtitle}>Build your daily streak to earn prestige medallions</Text>
          </View>
        </View>
        <View style={styles.unlockedBadge}>
          <Text style={styles.unlockedText}>
            {unlockedCount} of {MILESTONES.length} Unlocked
          </Text>
        </View>
      </View>

      {/* Badges Journey Roadmap */}
      <View style={styles.roadmapContainer}>
        {/* Connecting Progress Rail */}
        <View style={styles.railTrack}>
          <View style={[styles.railFill, { width: `${trackPercent}%` }]} />
        </View>

        {/* 5 Milestone Badges */}
        <View style={styles.badgesRow}>
          {MILESTONES.map((m) => {
            const isUnlocked = effectiveStreak >= m.days;

            return (
              <View key={m.tier} style={styles.badgeColumn}>
                <View
                  style={[
                    styles.badgeCircle,
                    isUnlocked
                      ? { backgroundColor: m.bgColor, borderColor: m.color }
                      : styles.badgeCircleLocked,
                  ]}
                >
                  <Ionicons
                    name={m.icon}
                    size={20}
                    color={isUnlocked ? m.color : '#64748B'}
                  />
                  {isUnlocked ? (
                    <View style={styles.statusCheck}>
                      <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.statusLock}>
                      <Ionicons name="lock-closed" size={7} color="#94A3B8" />
                    </View>
                  )}
                </View>

                <Text style={[styles.badgeDays, isUnlocked && { color: m.color }]}>
                  {m.days}d
                </Text>
                <Text style={styles.badgeTier}>{m.tier}</Text>
                <Text style={styles.badgeStatus}>
                  {isUnlocked ? 'Unlocked' : `${Math.min(effectiveStreak, m.days)}/${m.days}d`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Next Target Countdown */}
      {nextMilestone && (
        <View style={styles.nextTargetCard}>
          <View style={styles.nextTargetHeader}>
            <View style={styles.targetLabelRow}>
              <Ionicons name="flame" size={14} color="#F97316" />
              <Text style={styles.targetLabel}>
                Next:{' '}
                <Text style={{ color: nextMilestone.color, fontWeight: '800' }}>
                  {nextMilestone.tier}
                </Text>{' '}
                ({nextMilestone.days} days streak)
              </Text>
            </View>
            <Text style={styles.daysRemainingText}>{daysRemaining} days to go</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.targetProgressTrack}>
            <View
              style={[
                styles.targetProgressFill,
                { width: `${nextProgress}%`, backgroundColor: nextMilestone.color },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  trophyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    maxWidth: 200,
  },
  unlockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  unlockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  roadmapContainer: {
    position: 'relative',
    paddingVertical: 10,
  },
  railTrack: {
    position: 'absolute',
    top: 28,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
  },
  railFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeColumn: {
    alignItems: 'center',
    flex: 1,
  },
  badgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  badgeCircleLocked: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  statusLock: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  badgeDays: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 6,
  },
  badgeTier: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },
  badgeStatus: {
    fontSize: 8,
    color: '#475569',
    marginTop: 1,
  },
  nextTargetCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    gap: 8,
  },
  nextTargetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetLabel: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  daysRemainingText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  targetProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  targetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
