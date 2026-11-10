import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TopAppItem {
  name: string;
  usedMinutes: number;
  limitMinutes: number;
  category: string;
  sessionLimitMinutes?: number;
  dailyLaunchLimit?: number;
}

interface UsageTimelineProps {
  totalSotMinutes?: number;
  addictionScore?: number;
  distractionIndex?: number;
  productivityRatio?: number;
  topApps?: TopAppItem[];
}

export function UsageTimeline({
  totalSotMinutes = 192,
  addictionScore = 38,
  distractionIndex = 24,
  productivityRatio = 65,
  topApps = [
    {
      name: 'Instagram',
      usedMinutes: 28,
      limitMinutes: 30,
      category: 'Social',
      sessionLimitMinutes: 10,
      dailyLaunchLimit: 12,
    },
    {
      name: 'YouTube',
      usedMinutes: 45,
      limitMinutes: 60,
      category: 'Entertainment',
      sessionLimitMinutes: 20,
      dailyLaunchLimit: 8,
    },
    {
      name: 'WhatsApp',
      usedMinutes: 32,
      limitMinutes: 45,
      category: 'Messaging',
      sessionLimitMinutes: 15,
      dailyLaunchLimit: 25,
    },
    {
      name: 'Chrome',
      usedMinutes: 18,
      limitMinutes: 30,
      category: 'Browser',
      sessionLimitMinutes: 15,
      dailyLaunchLimit: 20,
    },
  ],
}: UsageTimelineProps) {
  // Generate sample 24 hour histogram data
  const hours = Array.from({ length: 24 }, (_, i) => {
    // Peak hours during 12-14 and 18-22
    let intensity = 0;
    if (i >= 8 && i <= 11) intensity = (i * 7) % 35 + 10;
    else if (i >= 12 && i <= 14) intensity = 45;
    else if (i >= 18 && i <= 22) intensity = 52;
    else if (i >= 0 && i <= 6) intensity = 0;
    else intensity = 15;
    return { hour: i, minutes: intensity, isPeak: intensity > 30 };
  });

  const getScoreColor = (score: number) => {
    if (score <= 35) return '#00E699';
    if (score <= 65) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreLabel = (score: number) => {
    if (score <= 35) return 'Mindful Disciplined';
    if (score <= 65) return 'Moderate Distraction';
    return 'Dopamine Loop Active';
  };

  const formatHour = (h: number) => {
    if (h === 0) return '12A';
    if (h === 12) return '12P';
    return h > 12 ? `${h - 12}P` : `${h}A`;
  };

  return (
    <View style={styles.container}>
      {/* 1. Proprietary NeuroMetrics Cards */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="pulse" size={16} color={getScoreColor(addictionScore)} />
            <Text style={styles.metricLabel}>Addiction Score</Text>
          </View>
          <Text style={[styles.metricValue, { color: getScoreColor(addictionScore) }]}>
            {addictionScore}
            <Text style={styles.metricSub}>/100</Text>
          </Text>
          <Text style={styles.metricStatus}>{getScoreLabel(addictionScore)}</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="repeat" size={16} color="#60A5FA" />
            <Text style={styles.metricLabel}>Distraction Index</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#60A5FA' }]}>
            {distractionIndex}%
          </Text>
          <Text style={styles.metricStatus}>Quick re-open loops</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="shield-checkmark" size={16} color="#00E699" />
            <Text style={styles.metricLabel}>Productivity</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#00E699' }]}>
            {productivityRatio}%
          </Text>
          <Text style={styles.metricStatus}>Focused vs leisure</Text>
        </View>
      </View>

      {/* 2. 24-Hour Usage Distribution Bar Chart */}
      <View style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>24-Hour Usage Rhythm</Text>
          <Text style={styles.timelineTotal}>
            {Math.floor(totalSotMinutes / 60)}h {totalSotMinutes % 60}m SOT
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
          {hours.map((item) => {
            const heightPercent = Math.min(100, (item.minutes / 60) * 100);
            return (
              <View key={item.hour} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: item.isPeak ? '#EF4444' : item.minutes > 0 ? '#00E699' : 'transparent',
                      },
                    ]}
                  />
                </View>
                {item.hour % 3 === 0 && (
                  <Text style={styles.hourLabel}>{formatHour(item.hour)}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Multi-Tier Target App Quotas & Burn Forecast (StayFree Parity) */}
      <View style={styles.quotasCard}>
        <View style={styles.quotasHeader}>
          <Text style={styles.quotasTitle}>Target App Multi-Tier Quotas</Text>
          <Text style={styles.quotasSubBadge}>Multi-tier & Forecast</Text>
        </View>

        {topApps.map((app) => {
          const ratio = Math.min(1, app.usedMinutes / app.limitMinutes);
          const isWarning = ratio >= 0.8;
          const remaining = Math.max(0, app.limitMinutes - app.usedMinutes);
          const forecastText =
            remaining === 0
              ? 'Limit Reached'
              : remaining <= 5
              ? 'Exhaustion in <30m'
              : `~${Math.min(11, 2 + Math.floor(remaining / 5))}:45 PM projected`;

          return (
            <View key={app.name} style={styles.quotaRow}>
              <View style={styles.quotaMeta}>
                <View>
                  <Text style={styles.appName}>{app.name}</Text>
                  <View style={styles.tierPills}>
                    {app.sessionLimitMinutes && (
                      <Text style={styles.tierPill}>Max {app.sessionLimitMinutes}m/run</Text>
                    )}
                    {app.dailyLaunchLimit && (
                      <Text style={styles.tierPill}>Max {app.dailyLaunchLimit} opens</Text>
                    )}
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.appUsageText}>
                    <Text style={{ color: isWarning ? '#EF4444' : '#00E699', fontWeight: '700' }}>
                      {app.usedMinutes}m
                    </Text>
                    {' '}/ {app.limitMinutes}m limit
                  </Text>
                  <Text style={[styles.forecastText, isWarning && { color: '#EF4444' }]}>
                    {forecastText}
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${ratio * 100}%`,
                      backgroundColor: isWarning ? '#EF4444' : '#00E699',
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    width: '100%',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metricStatus: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  timelineCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  timelineTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00E699',
  },
  chartScroll: {
    gap: 6,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    width: 14,
  },
  barTrack: {
    height: 70,
    width: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
  },
  hourLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 6,
  },
  quotasCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quotasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  quotasTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  quotasSubBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tierPills: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  tierPill: {
    fontSize: 9,
    color: '#94A3B8',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  forecastText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  quotaRow: {
    marginBottom: 12,
  },
  quotaMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  appUsageText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});

