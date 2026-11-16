import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HabitStats } from '../../services/habits/habit-types';

interface HabitStreakCardProps {
  stats: HabitStats;
  targetDays?: number;
}

export default function HabitStreakCard({ stats, targetDays = 21 }: HabitStreakCardProps) {
  const challengeProgress = Math.min(
    100,
    Math.round((stats.currentStreak / Math.max(1, targetDays)) * 100)
  );

  return (
    <View style={styles.card}>
      {/* Top Streak Row */}
      <View style={styles.topRow}>
        <View style={styles.streakBox}>
          <View style={styles.flameCircle}>
            <Ionicons name="flame" size={24} color="#F59E0B" />
          </View>
          <View>
            <View style={styles.streakNumberRow}>
              <Text style={styles.streakNumber}>{stats.currentStreak}</Text>
              <Text style={styles.streakUnit}>days</Text>
            </View>
            <Text style={styles.streakLabel}>Current Streak</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.streakBox}>
          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={22} color="#818CF8" />
          </View>
          <View>
            <View style={styles.streakNumberRow}>
              <Text style={styles.streakNumber}>{stats.longestStreak}</Text>
              <Text style={styles.streakUnit}>days</Text>
            </View>
            <Text style={styles.streakLabel}>Best Record</Text>
          </View>
        </View>
      </View>

      {/* Challenge Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressTitle}>
            {targetDays}-Day Ninja Challenge
          </Text>
          <Text style={styles.progressPercent}>{challengeProgress}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${challengeProgress}%` },
            ]}
          />
        </View>
      </View>

      {/* Grid of Micro Stats */}
      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <View style={[styles.dot, { backgroundColor: '#00E699' }]} />
          <Text style={styles.metaText}>
            Done: <Text style={styles.metaVal}>{stats.totalCompleted}</Text>
          </Text>
        </View>

        <View style={styles.metaCell}>
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.metaText}>
            Missed: <Text style={styles.metaVal}>{stats.totalNotCompleted}</Text>
          </Text>
        </View>

        <View style={styles.metaCell}>
          <View style={[styles.dot, { backgroundColor: '#818CF8' }]} />
          <Text style={styles.metaText}>
            Adherence: <Text style={styles.metaVal}>{stats.weeklyAdherence}%</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  flameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  streakUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  streakLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 8,
  },
  progressContainer: {
    marginTop: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E699',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#00E699',
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  metaVal: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
});
