import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HabitStatus, HabitScheduleConfig } from '../../services/habits/habit-types';
import {
  formatLocalDateString,
  parseLocalDateSafe,
  isHabitScheduledForDate,
  MONTH_NAMES,
  DAY_NAMES,
} from '../../services/habits/streak-calculator';

interface HabitCalendarViewProps {
  completions: Record<string, HabitStatus>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onCycleDateStatus: (date: string) => void;
  createdAt?: string;
  schedule?: HabitScheduleConfig;
  restDays?: number[];
}

export default function HabitCalendarView({
  completions,
  selectedDate,
  onSelectDate,
  onCycleDateStatus,
  createdAt,
  schedule,
  restDays = [0],
}: HabitCalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalDateString(today), [today]);

  const [viewYear, setViewYear] = useState<number>(() => {
    const parsed = parseLocalDateSafe(selectedDate || todayStr);
    return parsed.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const parsed = parseLocalDateSafe(selectedDate || todayStr);
    return parsed.getMonth();
  });

  const handlePrevMonth = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  const isCurrentMonthView =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const dummyHabit = useMemo(
    () => ({
      createdAt: createdAt || '2026-01-01',
      schedule,
      restDays,
    }),
    [createdAt, schedule, restDays]
  );

  // Generate 42 cells strictly aligned with calendar grid
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1, 12, 0, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0, 12, 0, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0, 12, 0, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isFuture: boolean;
      status: HabitStatus;
      isScheduled: boolean;
    }[] = [];

    // 1. Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum, 12, 0, 0);
      const str = formatLocalDateString(prevDate);
      cells.push({
        dateStr: str,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isScheduled: isHabitScheduledForDate(dummyHabit, str),
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(viewYear, viewMonth, day, 12, 0, 0);
      const str = formatLocalDateString(curDate);
      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isScheduled: isHabitScheduledForDate(dummyHabit, str),
      });
    }

    // 3. Next month filler days (fill to 35 or 42 cells)
    const targetCellCount = cells.length > 35 ? 42 : 35;
    const remaining = targetCellCount - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(viewYear, viewMonth + 1, day, 12, 0, 0);
      const str = formatLocalDateString(nextDate);
      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isScheduled: isHabitScheduledForDate(dummyHabit, str),
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayStr, completions, dummyHabit]);

  const handleCellPress = (dateStr: string, isFuture: boolean) => {
    if (isFuture) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectDate(dateStr);
    onCycleDateStatus(dateStr);
  };

  return (
    <View style={styles.card}>
      {/* Header: Month & Year + Subtitle + Navigators */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <Text style={styles.subtitle}>Track your daily progress</Text>
        </View>

        <View style={styles.navControls}>
          {!isCurrentMonthView && (
            <TouchableOpacity style={styles.todayShortcutBtn} onPress={handleJumpToToday}>
              <Text style={styles.todayShortcutText}>Today</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.navBtn}
            onPress={handlePrevMonth}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={16} color="#F8FAFC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleNextMonth}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={16} color="#F8FAFC" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Names Row (Sun Mon Tue Wed Thu Fri Sat) */}
      <View style={styles.weekdaysRow}>
        {DAY_NAMES.map((d, idx) => (
          <View key={d + idx} style={styles.weekdayCol}>
            <Text
              style={[
                styles.weekdayText,
                idx === 0 && { color: '#F59E0B' }, // Sunday
                idx === 6 && { color: '#38BDF8' }, // Saturday
              ]}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Spacious 7-Column Calendar Grid */}
      <View style={styles.grid}>
        {calendarCells.map((cell) => {
          const isSelected = cell.dateStr === selectedDate;
          const isCompleted = cell.status === 'completed' || cell.status === 'recovered';
          const isFailed = cell.status === 'not_completed';
          const isPast = cell.dateStr < todayStr;

          let cellBg = styles.cellNormalBg;
          let textColor = '#F8FAFC';
          let statusIcon = null;

          if (!cell.isCurrentMonth) {
            cellBg = styles.cellOtherMonthBg;
            textColor = '#475569';
          } else if (cell.isFuture) {
            cellBg = styles.cellFutureBg;
            textColor = '#64748B';
          } else if (isCompleted) {
            cellBg = styles.cellCompletedBg;
            textColor = '#FFFFFF';
            statusIcon = <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />;
          } else if (isFailed) {
            cellBg = styles.cellFailedBg;
            textColor = '#FFFFFF';
            statusIcon = <Ionicons name="close-circle" size={14} color="#FFFFFF" />;
          } else if (isPast) {
            cellBg = styles.cellMissedBg;
            textColor = '#64748B';
            statusIcon = <Text style={styles.dashText}>—</Text>;
          } else {
            // Today / Pending
            statusIcon = <Text style={styles.dashText}>—</Text>;
          }

          return (
            <TouchableOpacity
              key={cell.dateStr}
              style={[
                styles.cell,
                cellBg,
                cell.isToday && styles.cellToday,
                isSelected && styles.cellSelected,
              ]}
              onPress={() => handleCellPress(cell.dateStr, cell.isFuture)}
              disabled={cell.isFuture}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.dayNumber,
                  { color: textColor },
                  !cell.isCurrentMonth && { opacity: 0.35 },
                ]}
              >
                {cell.dayNumber}
              </Text>

              <View style={styles.iconContainer}>{statusIcon}</View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend Footer */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.legendLabel}>Success</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendLabel}>Failed</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
          <Text style={styles.legendLabel}>Missed</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendBox,
              { borderColor: '#00E699', borderWidth: 1.5, backgroundColor: 'transparent' },
            ]}
          />
          <Text style={styles.legendLabel}>Today</Text>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayShortcutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  todayShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E699',
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
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  cell: {
    width: '13.2%', // 7 columns with comfortable gaps
    aspectRatio: 0.85,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderWidth: 1,
  },
  cellNormalBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cellOtherMonthBg: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.03)',
    opacity: 0.3,
  },
  cellFutureBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cellCompletedBg: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  cellFailedBg: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  cellMissedBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cellToday: {
    borderColor: '#00E699',
    borderWidth: 2,
  },
  cellSelected: {
    borderColor: '#38BDF8',
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  iconContainer: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
