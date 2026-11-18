import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HabitScoreGauge from './HabitScoreGauge';
import HabitDonutChart from './HabitDonutChart';
import HabitPeriodBarChart from './HabitPeriodBarChart';
import HabitMilestonesRail from './HabitMilestonesRail';
import { HabitDetailedStatsResult } from '../../services/habits/streak-calculator';
import { HabitStatus } from '../../services/habits/habit-types';

interface HabitStatisticsViewProps {
  stats: HabitDetailedStatsResult;
  completions: Record<string, HabitStatus>;
}

export default function HabitStatisticsView({
  stats,
  completions,
}: HabitStatisticsViewProps) {
  return (
    <View style={styles.container}>
      {/* 1. Habit Score Circular Gauge */}
      <HabitScoreGauge score={stats.habitScore} />

      {/* 2. Streak Current & Best Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.title}>Streak</Text>
        </View>

        <View style={styles.streakGrid}>
          <View style={styles.streakColumn}>
            <Text style={styles.streakSub}>Current</Text>
            <Text style={[styles.streakNumber, { color: '#EF4444' }]}>
              {stats.currentStreak} DAY{stats.currentStreak !== 1 ? 'S' : ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.streakColumn}>
            <Text style={styles.streakSub}>Best</Text>
            <Text style={[styles.streakNumber, { color: '#EF4444' }]}>
              {stats.bestStreak} DAY{stats.bestStreak !== 1 ? 'S' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Times Completed Breakdown */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.title}>Times completed</Text>
        </View>

        <View style={styles.timesList}>
          <View style={styles.timesRow}>
            <Text style={styles.timesLabel}>This week</Text>
            <Text style={styles.timesValue}>{stats.thisWeek}</Text>
          </View>

          <View style={styles.timesRow}>
            <Text style={styles.timesLabel}>This month</Text>
            <Text style={styles.timesValue}>{stats.thisMonth}</Text>
          </View>

          <View style={styles.timesRow}>
            <Text style={styles.timesLabel}>This year</Text>
            <Text style={styles.timesValue}>{stats.thisYear}</Text>
          </View>

          <View style={[styles.timesRow, styles.timesRowLast]}>
            <Text style={styles.timesLabel}>All</Text>
            <Text style={[styles.timesValue, { color: '#00E699' }]}>{stats.completedCount}</Text>
          </View>
        </View>
      </View>

      {/* 4. Monthly / Weekly / Yearly Period Bar Chart */}
      <HabitPeriodBarChart completions={completions} />

      {/* 5. Success / Failed / Missed Multi-Arc Donut */}
      <HabitDonutChart
        completedCount={stats.completedCount}
        notCompletedCount={stats.notCompletedCount}
        missedCount={stats.missedCount}
        totalDays={stats.totalDays}
        completionRate={stats.completionRate}
        failureRate={stats.failureRate}
        missedRate={stats.missedRate}
      />

      {/* 6. Streak Milestones Progression Rail */}
      <HabitMilestonesRail
        currentStreak={stats.currentStreak}
        bestStreak={stats.bestStreak}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
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
    gap: 8,
    marginBottom: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  streakGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  streakColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  streakSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  timesList: {
    gap: 12,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  timesRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  timesLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  timesValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
});
