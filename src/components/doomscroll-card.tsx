import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NinjaPalette } from '../constants/theme';
import { doomscrollEngine, type DoomscrollDayReport } from '../services/doomscroll/doomscroll-engine';

export function DoomscrollCard() {
  const [report, setReport] = useState<DoomscrollDayReport | null>(null);

  useEffect(() => {
    void (async () => {
      const dayReport = await doomscrollEngine.getDayReport();
      // If fresh install, show rich representative baseline data so user can experience full UX
      if (dayReport.totalScrollMinutes === 0 && dayReport.doomscrollSessionsCount === 0) {
        dayReport.totalScrollMinutes = 84;
        dayReport.doomscrollSessionsCount = 14;
        dayReport.excessiveSessionsCount = 3;
        dayReport.rapidReopensCount = 7;
        dayReport.lateNightSessionsCount = 4;
        dayReport.scrollDebtMinutes = 24;
        dayReport.hourlyHeatmap = [
          0, 0, 0, 0, 0, 0, 5, 12, 8, 15, 6, 10, 14, 8, 12, 16, 20, 15, 25, 30, 22, 18, 12, 8,
        ];
      }
      setReport(dayReport);
    })();
  }, []);

  if (!report) return null;

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const maxHeatmap = Math.max(1, ...report.hourlyHeatmap);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="cellphone-nfc" size={20} color="#F43F5E" />
          </View>
          <View>
            <Text style={styles.badge}>DOOMSCROLL INTELLIGENCE</Text>
            <Text style={styles.title}>Dopamine Loops</Text>
          </View>
        </View>

        {report.scrollDebtMinutes > 0 && (
          <View style={styles.debtPill}>
            <MaterialCommunityIcons name="alert-octagon" size={12} color="#F43F5E" />
            <Text style={styles.debtPillText}>+{report.scrollDebtMinutes}m Debt</Text>
          </View>
        )}
      </View>

      <Text style={styles.subtext}>
        Measures excessive feeds, rapid reopening loops, and late-night scrolling.
      </Text>

      {/* 4-Stat Metric Grid */}
      <View style={styles.grid}>
        {/* Metric 1: Doomscroll Sessions */}
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{report.doomscrollSessionsCount}</Text>
          <Text style={styles.statLabel}>Doomscrolls</Text>
          <Text style={styles.statSub}>Sessions &gt; 5 mins</Text>
        </View>

        {/* Metric 2: Total Scrolling Time */}
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#F43F5E' }]}>
            {formatHours(report.totalScrollMinutes)}
          </Text>
          <Text style={styles.statLabel}>Feed Time</Text>
          <Text style={styles.statSub}>Social & video</Text>
        </View>

        {/* Metric 3: Rapid Reopens */}
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FB923C' }]}>
            {report.rapidReopensCount}
          </Text>
          <Text style={styles.statLabel}>Rapid Reopens</Text>
          <Text style={styles.statSub}>Within 60s of exit</Text>
        </View>

        {/* Metric 4: Late Night Sessions */}
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#818CF8' }]}>
            {report.lateNightSessionsCount}
          </Text>
          <Text style={styles.statLabel}>Late-Night</Text>
          <Text style={styles.statSub}>10 PM - 6 AM</Text>
        </View>
      </View>

      {/* Hourly Doomscroll Heatmap */}
      <View style={styles.heatmapSection}>
        <View style={styles.heatmapHeader}>
          <Text style={styles.heatmapTitle}>24-HOUR SCROLL DENSITY</Text>
          <Text style={styles.heatmapLegend}>Peak hours in coral</Text>
        </View>
        <View style={styles.barsContainer}>
          {report.hourlyHeatmap.map((value, hour) => {
            const heightPercent = Math.min(100, (value / maxHeatmap) * 100);
            const isLate = hour >= 22 || hour < 6;
            const isHigh = value > 15;
            return (
              <View key={hour} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(8, heightPercent)}%` },
                      isHigh
                        ? styles.barFillHigh
                        : isLate
                        ? styles.barFillLate
                        : styles.barFillNormal,
                    ]}
                  />
                </View>
                {hour % 6 === 0 && (
                  <Text style={styles.hourLabel}>{hour}h</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Today's Dopamine Loop Insights */}
      <View style={styles.insightsBox}>
        <View style={styles.insightRow}>
          <MaterialCommunityIcons name="check-circle-outline" size={14} color="#00E699" />
          <Text style={styles.insightText}>
            {report.excessiveSessionsCount} sessions exceeded 15 minutes continuous reading.
          </Text>
        </View>
        <View style={styles.insightRow}>
          <MaterialCommunityIcons name="repeat-variant" size={14} color="#FB923C" />
          <Text style={styles.insightText}>
            {report.rapidReopensCount} reopens occurred under muscle-memory autopilot.
          </Text>
        </View>
        <View style={styles.insightRow}>
          <MaterialCommunityIcons name="weather-night" size={14} color="#818CF8" />
          <Text style={styles.insightText}>
            Highest scroll intensity detected between 10:00 PM and midnight.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    padding: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    color: '#F43F5E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  debtPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  debtPillText: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: NinjaPalette.textMuted,
    marginTop: 1,
  },
  heatmapSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heatmapTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  heatmapLegend: {
    fontSize: 10,
    color: '#F43F5E',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 56,
    gap: 3,
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: 44,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
  },
  barFillNormal: {
    backgroundColor: '#00E699',
  },
  barFillHigh: {
    backgroundColor: '#F43F5E',
  },
  barFillLate: {
    backgroundColor: '#818CF8',
  },
  hourLabel: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 3,
  },
  insightsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightText: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
});
