import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HabitStatus, HabitScheduleConfig } from '../../services/habits/habit-types';
import {
  formatLocalDateString,
  parseLocalDateSafe,
  isHabitScheduledForDate,
  DAY_NAMES,
  MONTH_NAMES,
} from '../../services/habits/streak-calculator';

interface HabitCalendarMatrixProps {
  completions: Record<string, HabitStatus>;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate?: (date: string) => void;
  onCycleDateStatus?: (date: string) => void;
  restDays?: number[];
  createdAt?: string;
  schedule?: HabitScheduleConfig;
  title?: string;
  currentStreak?: number;
}

export default function HabitCalendarMatrix({
  completions,
  selectedDate,
  onSelectDate,
  onCycleDateStatus,
  restDays = [0],
  createdAt,
  schedule,
  title,
  currentStreak = 0,
}: HabitCalendarMatrixProps) {
  // Current date anchor at noon local
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalDateString(today), [today]);

  // View state for browsing months
  const [viewYear, setViewYear] = useState<number>(() => {
    const parsed = parseLocalDateSafe(selectedDate || todayStr);
    return parsed.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const parsed = parseLocalDateSafe(selectedDate || todayStr);
    return parsed.getMonth(); // 0 - 11
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
    if (onSelectDate) {
      onSelectDate(todayStr);
    }
  };

  const isCurrentMonthView =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Helper dummy habit for schedule check
  const dummyHabit = useMemo(() => {
    const effectiveSchedule: HabitScheduleConfig = schedule || {
      recurrenceType: 'specific_days',
      specificDays: [1, 2, 3, 4, 5, 6], // default Mon-Sat
      timeOfDay: 'anytime',
      targetType: 'boolean',
      targetValue: 1,
    };
    return {
      createdAt: createdAt || '2026-01-01',
      schedule: effectiveSchedule,
      restDays: restDays || [0],
    };
  }, [restDays, createdAt, schedule]);

  // Generate 35 or 42 calendar grid cells strictly aligned with local noon
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1, 12, 0, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
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
      isRestDay: boolean;
    }[] = [];

    // 1. Previous month filler days (leading empty slots)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum, 12, 0, 0);
      const str = formatLocalDateString(prevDate);
      const scheduled = isHabitScheduledForDate(dummyHabit, str);
      const isRest = !scheduled || restDays.includes(prevDate.getDay());

      cells.push({
        dateStr: str,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isScheduled: scheduled,
        isRestDay: isRest,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(viewYear, viewMonth, day, 12, 0, 0);
      const str = formatLocalDateString(curDate);
      const scheduled = isHabitScheduledForDate(dummyHabit, str);
      const isRest = !scheduled || restDays.includes(curDate.getDay());

      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isScheduled: scheduled,
        isRestDay: isRest,
      });
    }

    // 3. Next month filler days (trailing slots to complete 35 or 42 cells)
    const targetCellCount = cells.length > 35 ? 42 : 35;
    const remaining = targetCellCount - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(viewYear, viewMonth + 1, day, 12, 0, 0);
      const str = formatLocalDateString(nextDate);
      const scheduled = isHabitScheduledForDate(dummyHabit, str);
      const isRest = !scheduled || restDays.includes(nextDate.getDay());

      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isScheduled: scheduled,
        isRestDay: isRest,
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayStr, completions, restDays, dummyHabit]);

  // Compute Monthly Adherence Statistics
  const monthStats = useMemo(() => {
    let completedCount = 0;
    let scheduledPastCount = 0;
    let restDaysCount = 0;

    calendarCells.forEach((c) => {
      if (!c.isCurrentMonth) return;
      if (c.status === 'completed' || c.status === 'recovered') {
        completedCount++;
      }
      if (!c.isFuture) {
        if (c.isScheduled) {
          scheduledPastCount++;
        } else {
          restDaysCount++;
        }
      }
    });

    const adherenceRate =
      scheduledPastCount > 0 ? Math.round((completedCount / scheduledPastCount) * 100) : 100;

    return {
      completedCount,
      scheduledPastCount,
      restDaysCount,
      adherenceRate: Math.min(100, adherenceRate),
    };
  }, [calendarCells]);

  // Compute 90-Day Contribution Heatmap Data (Everyday & GitHub Parity)
  const heatmapData = useMemo(() => {
    const list: {
      dateStr: string;
      status: HabitStatus;
      isToday: boolean;
      level: 0 | 1 | 2; // 0=none/rest, 1=scheduled, 2=completed
    }[] = [];

    const baseNoon = new Date();
    baseNoon.setHours(12, 0, 0, 0);

    for (let i = 89; i >= 0; i--) {
      const d = new Date(baseNoon.getTime() - i * 86400000);
      const str = formatLocalDateString(d);
      const status = completions[str] || 'not_attempted';
      let level: 0 | 1 | 2 = 0;
      if (status === 'completed' || status === 'recovered') {
        level = 2;
      } else if (isHabitScheduledForDate(dummyHabit, str)) {
        level = 1;
      }

      list.push({
        dateStr: str,
        status,
        isToday: str === todayStr,
        level,
      });
    }
    return list;
  }, [completions, todayStr, dummyHabit]);

  const handleCellPress = async (dateStr: string, isFuture: boolean) => {
    if (isFuture) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onSelectDate) {
      onSelectDate(dateStr);
    }
    if (onCycleDateStatus) {
      onCycleDateStatus(dateStr);
    }
  };

  return (
    <View style={styles.container}>
      {/* Month Navigation Header */}
      <View style={styles.monthHeader}>
        <View style={styles.monthTitleWrapper}>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          {!isCurrentMonthView && (
            <TouchableOpacity style={styles.todayShortcutBtn} onPress={handleJumpToToday}>
              <Text style={styles.todayShortcutText}>Jump to Today</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.navControls}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handlePrevMonth}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color="#F8FAFC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleNextMonth}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={18} color="#F8FAFC" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Monthly Adherence Quick Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{monthStats.adherenceRate}%</Text>
          <Text style={styles.statLabel}>Adherence</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#00E699' }]}>
            {monthStats.completedCount}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
            {monthStats.restDaysCount}
          </Text>
          <Text style={styles.statLabel}>Rest Days</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#38BDF8' }]}>{currentStreak}d</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
      </View>

      {/* Weekday Names Header (S M T W T F S) */}
      <View style={styles.weekdaysRow}>
        {DAY_NAMES.map((d, idx) => (
          <Text
            key={d + idx}
            style={[
              styles.weekdayText,
              idx === 0 && { color: '#F59E0B' }, // Sunday highlight
              idx === 6 && { color: '#A855F7' }, // Saturday highlight
            ]}
          >
            {d[0]}
          </Text>
        ))}
      </View>

      {/* 5x7 or 6x7 Month Grid */}
      <View style={styles.grid}>
        {calendarCells.map((cell) => {
          const isSelected = cell.dateStr === selectedDate;

          let cellStyle: ViewStyle = styles.cellNormal;
          let textStyle: TextStyle = styles.textNormal;
          let badgeIcon = null;

          if (!cell.isCurrentMonth) {
            cellStyle = styles.cellOtherMonth;
            textStyle = styles.textDim;
          } else if (cell.isFuture) {
            cellStyle = styles.cellFuture;
            textStyle = styles.textFuture;
          } else if (cell.status === 'completed') {
            cellStyle = styles.cellCompleted;
            textStyle = styles.textCompleted;
            badgeIcon = <Ionicons name="checkmark" size={10} color="#070A11" />;
          } else if (cell.status === 'recovered') {
            cellStyle = styles.cellRecovered;
            textStyle = styles.textRecovered;
            badgeIcon = <MaterialCommunityIcons name="shield-check" size={10} color="#070A11" />;
          } else if (cell.status === 'not_completed') {
            cellStyle = styles.cellFailed;
            textStyle = styles.textFailed;
            badgeIcon = <Ionicons name="close" size={10} color="#FFFFFF" />;
          } else if (cell.isRestDay) {
            // Scheduled off-day / non-penalized rest
            cellStyle = styles.cellRestDay;
            textStyle = styles.textRestDay;
            badgeIcon = <Ionicons name="cafe-outline" size={9} color="#F59E0B" />;
          } else if (cell.dateStr < todayStr) {
            // Uncompleted past day
            cellStyle = styles.cellMissedPast;
            textStyle = styles.textMissedPast;
          }

          return (
            <TouchableOpacity
              key={cell.dateStr}
              style={[
                styles.cell,
                cellStyle,
                cell.isToday && styles.cellToday,
                isSelected && styles.cellSelected,
              ]}
              onPress={() => void handleCellPress(cell.dateStr, cell.isFuture)}
              disabled={cell.isFuture}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayText, textStyle]}>{cell.dayNumber}</Text>
              {badgeIcon ? <View style={styles.badgeWrapper}>{badgeIcon}</View> : null}
              {cell.isToday && <View style={styles.todayIndicatorDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 90-Day Contribution Heatmap (Everyday & GitHub Strip) */}
      <View style={styles.heatmapSection}>
        <View style={styles.heatmapHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="fire" size={16} color="#00E699" />
            <Text style={styles.heatmapTitle}>90-DAY HABIT CHAIN</Text>
          </View>
          <Text style={styles.heatmapSub}>Last 13 Weeks Adherence</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.heatmapScroll}
        >
          <View style={styles.heatmapMatrix}>
            {heatmapData.map((d) => {
              const isSelected = d.dateStr === selectedDate;
              return (
                <TouchableOpacity
                  key={'heat_' + d.dateStr}
                  style={[
                    styles.heatSquare,
                    d.level === 2 && styles.heatDone,
                    d.level === 1 && styles.heatScheduled,
                    d.level === 0 && styles.heatOff,
                    d.isToday && styles.heatTodayBorder,
                    isSelected && styles.heatSelectedBorder,
                  ]}
                  onPress={() => onSelectDate && onSelectDate(d.dateStr)}
                  activeOpacity={0.7}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Legend Footer */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#00E699' }]} />
          <Text style={styles.legendLabel}>Done</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendBox,
              { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B', borderWidth: 1 },
            ]}
          />
          <Text style={styles.legendLabel}>Rest / Off</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendLabel}>Missed</Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendBox,
              { borderColor: '#38BDF8', borderWidth: 1.5, backgroundColor: 'transparent' },
            ]}
          />
          <Text style={styles.legendLabel}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  todayShortcutBtn: {
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  todayShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E699',
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#121D33',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
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
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeWrapper: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayIndicatorDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  cellNormal: {
    backgroundColor: '#1A2438',
  },
  textNormal: {
    color: '#F8FAFC',
  },
  cellOtherMonth: {
    backgroundColor: 'transparent',
    opacity: 0.25,
  },
  textDim: {
    color: '#64748B',
  },
  cellFuture: {
    backgroundColor: 'rgba(30, 41, 59, 0.35)',
    opacity: 0.45,
  },
  textFuture: {
    color: '#475569',
  },
  cellCompleted: {
    backgroundColor: '#00E699',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  textCompleted: {
    color: '#070A11',
    fontWeight: '900',
  },
  cellRecovered: {
    backgroundColor: '#38BDF8',
    borderColor: '#7DD3FC',
  },
  textRecovered: {
    color: '#070A11',
    fontWeight: '900',
  },
  cellFailed: {
    backgroundColor: '#EF4444',
  },
  textFailed: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cellRestDay: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderStyle: 'dashed',
  },
  textRestDay: {
    color: '#F59E0B',
  },
  cellMissedPast: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  textMissedPast: {
    color: '#FCA5A5',
  },
  cellToday: {
    borderColor: '#38BDF8',
    borderWidth: 1.5,
  },
  cellSelected: {
    borderColor: '#00E699',
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  heatmapSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heatmapTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 0.5,
  },
  heatmapSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  heatmapScroll: {
    paddingVertical: 4,
  },
  heatmapMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 48,
    width: 320,
    gap: 4,
  },
  heatSquare: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  heatDone: {
    backgroundColor: '#00E699',
  },
  heatScheduled: {
    backgroundColor: '#1E293B',
  },
  heatOff: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  heatTodayBorder: {
    borderColor: '#38BDF8',
    borderWidth: 1,
  },
  heatSelectedBorder: {
    borderColor: '#F8FAFC',
    borderWidth: 1.2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
