import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ChartDataItem,
  getHabitMonthlyCompletions,
  getHabitWeeklyCompletions,
  getHabitYearlyCompletions,
} from '../../services/habits/streak-calculator';
import { HabitStatus } from '../../services/habits/habit-types';

interface HabitPeriodBarChartProps {
  completions: Record<string, HabitStatus>;
}

export default function HabitPeriodBarChart({ completions }: HabitPeriodBarChartProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const handlePrevYear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedYear((y) => y - 1);
  };

  const handleNextYear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedYear((y) => y + 1);
  };

  const handlePeriodChange = (newPeriod: 'week' | 'month' | 'year') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(newPeriod);
  };

  let chartData: ChartDataItem[] = [];
  if (period === 'month') {
    chartData = getHabitMonthlyCompletions(completions, selectedYear);
  } else if (period === 'week') {
    chartData = getHabitWeeklyCompletions(completions);
  } else {
    chartData = getHabitYearlyCompletions(completions);
  }

  const maxVal = Math.max(...chartData.map((d) => d.completions), 1);
  const totalCompletions = chartData.reduce((acc, d) => acc + d.completions, 0);
  const averageCompletions = chartData.length > 0 ? (totalCompletions / chartData.length).toFixed(1) : '0';
  const bestItem = chartData.reduce(
    (best, cur) => (cur.completions > best.completions ? cur : best),
    { label: 'None', completions: 0, maxDays: 0 }
  );

  const currentMonthIdx = new Date().getMonth();
  const currentYearNum = new Date().getFullYear();

  return (
    <View style={styles.card}>
      {/* Header with Year / Title & Navigator */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>
            {period === 'year' ? 'Years' : period === 'week' ? 'Weeks' : selectedYear}
          </Text>
          <Text style={styles.subtitle}>Times completed</Text>
        </View>

        {period === 'month' && (
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.navBtn} onPress={handlePrevYear} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={16} color="#F8FAFC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={handleNextYear} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={16} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bar Chart Visualization */}
      <View style={styles.chartContainer}>
        <View style={styles.barsRow}>
          {chartData.map((item, index) => {
            const isCurrent =
              period === 'month' && index === currentMonthIdx && selectedYear === currentYearNum;
            const barHeightPercent = Math.max(item.completions > 0 ? 8 : 2, (item.completions / maxVal) * 100);

            return (
              <View key={`${item.label}-${index}`} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${barHeightPercent}%`,
                        backgroundColor: isCurrent
                          ? '#EC4899'
                          : item.completions > 0
                          ? '#38BDF8'
                          : 'rgba(255, 255, 255, 0.08)',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    isCurrent && { color: '#EC4899', fontWeight: '800' },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Filter Switcher: Week | Month | Year */}
      <View style={styles.switcherContainer}>
        <TouchableOpacity
          style={[styles.switcherBtn, period === 'week' && styles.switcherBtnActive]}
          onPress={() => handlePeriodChange('week')}
          activeOpacity={0.7}
        >
          <Text style={[styles.switcherText, period === 'week' && styles.switcherTextActive]}>
            Week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switcherBtn, period === 'month' && styles.switcherBtnActive]}
          onPress={() => handlePeriodChange('month')}
          activeOpacity={0.7}
        >
          <Text style={[styles.switcherText, period === 'month' && styles.switcherTextActive]}>
            Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switcherBtn, period === 'year' && styles.switcherBtnActive]}
          onPress={() => handlePeriodChange('year')}
          activeOpacity={0.7}
        >
          <Text style={[styles.switcherText, period === 'year' && styles.switcherTextActive]}>
            Year
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Footer */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryText}>
          Total: <Text style={styles.boldText}>{totalCompletions}</Text> completions  •  Avg:{' '}
          <Text style={styles.boldText}>{averageCompletions}</Text>/{period}  •  Best:{' '}
          <Text style={styles.boldText}>
            {bestItem.label} ({bestItem.completions})
          </Text>
        </Text>
      </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartContainer: {
    height: 120,
    marginVertical: 10,
    justifyContent: 'flex-end',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    gap: 4,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 3,
    marginTop: 14,
  },
  switcherBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  switcherBtnActive: {
    backgroundColor: '#EC4899',
  },
  switcherText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  switcherTextActive: {
    color: '#FFFFFF',
  },
  summaryStrip: {
    marginTop: 14,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  boldText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
});
