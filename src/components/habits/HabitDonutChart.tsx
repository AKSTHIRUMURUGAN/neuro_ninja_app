import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HabitDonutChartProps {
  completedCount: number;
  notCompletedCount: number;
  missedCount: number;
  totalDays: number;
  completionRate: number;
  failureRate: number;
  missedRate: number;
  size?: number;
}

export default function HabitDonutChart({
  completedCount,
  notCompletedCount,
  missedCount,
  totalDays,
  completionRate,
  failureRate,
  missedRate,
  size = 170,
}: HabitDonutChartProps) {
  const strokeWidth = 18;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.dot} />
        <Text style={styles.title}>Success / Failed / Missed</Text>
      </View>

      {/* Circular Donut Gauge */}
      <View style={[styles.chartWrapper, { width: size, height: size }]}>
        {/* Outer Ring with multi-sector border colors */}
        <View
          style={[
            styles.baseRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderTopColor: completedCount > 0 ? '#22C55E' : '#334155',
              borderRightColor:
                notCompletedCount > 0 ? '#EF4444' : completedCount > 0 ? '#22C55E' : '#334155',
              borderBottomColor: missedCount > 0 ? '#64748B' : '#334155',
              borderLeftColor: missedCount > 0 ? '#475569' : '#334155',
            },
          ]}
        />

        {/* Center Information */}
        <View style={styles.centerInfo}>
          <Text style={styles.totalNumber}>{totalDays}</Text>
          <Text style={styles.totalLabel}>Total Days</Text>
        </View>
      </View>

      {/* Multi-Segment Proportional Progress Bar */}
      <View style={styles.segmentBarContainer}>
        {completionRate > 0 && (
          <View
            style={[
              styles.segment,
              { width: `${completionRate}%`, backgroundColor: '#22C55E' },
            ]}
          />
        )}
        {failureRate > 0 && (
          <View
            style={[styles.segment, { width: `${failureRate}%`, backgroundColor: '#EF4444' }]}
          />
        )}
        {missedRate > 0 && (
          <View
            style={[styles.segment, { width: `${missedRate}%`, backgroundColor: '#64748B' }]}
          />
        )}
      </View>

      {/* Legend Rows */}
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={styles.legendIndicator}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendName}>Success</Text>
          </View>
          <Text style={styles.legendValue}>
            <Text style={{ color: '#22C55E', fontWeight: '800' }}>{completedCount}</Text>{' '}
            <Text style={styles.legendPercent}>({completionRate}%)</Text>
          </Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendIndicator}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendName}>Failed</Text>
          </View>
          <Text style={styles.legendValue}>
            <Text style={{ color: '#EF4444', fontWeight: '800' }}>{notCompletedCount}</Text>{' '}
            <Text style={styles.legendPercent}>({failureRate}%)</Text>
          </Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendIndicator}>
            <View style={[styles.legendDot, { backgroundColor: '#64748B' }]} />
            <Text style={styles.legendName}>Missed</Text>
          </View>
          <Text style={styles.legendValue}>
            <Text style={{ color: '#94A3B8', fontWeight: '800' }}>{missedCount}</Text>{' '}
            <Text style={styles.legendPercent}>({missedRate}%)</Text>
          </Text>
        </View>
      </View>

      {/* Summary Footer Box */}
      <View style={styles.summaryFooter}>
        <View style={styles.summaryTextRow}>
          <Text style={styles.summaryPill}>Success Rate: {completionRate}%</Text>
          <Text style={styles.summaryPill}>Failure Rate: {failureRate}%</Text>
          <Text style={styles.summaryPill}>Missed Rate: {missedRate}%</Text>
        </View>
        <Text style={styles.totalDaysNote}>Total tracked days: {totalDays}</Text>
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
    alignSelf: 'flex-start',
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
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  baseRing: {
    position: 'absolute',
  },
  centerInfo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  totalLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: -2,
  },
  segmentBarContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginTop: 14,
    marginBottom: 6,
  },
  segment: {
    height: '100%',
  },
  legendContainer: {
    width: '100%',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 14,
    color: '#F8FAFC',
  },
  legendPercent: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  summaryFooter: {
    width: '100%',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  summaryTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  summaryPill: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  totalDaysNote: {
    fontSize: 10,
    color: '#64748B',
  },
});
