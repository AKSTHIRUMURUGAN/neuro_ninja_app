import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HabitStatus } from '../../services/habits/habit-types';
import { formatLocalDateString } from '../../services/habits/streak-calculator';

interface HabitCalendarMatrixProps {
  completions: Record<string, HabitStatus>;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate?: (date: string) => void;
  onCycleDateStatus?: (date: string) => void;
  restDays?: number[];
  createdAt?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function HabitCalendarMatrix({
  completions,
  selectedDate,
  onSelectDate,
  onCycleDateStatus,
  restDays = [0],
  createdAt,
}: HabitCalendarMatrixProps) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0 - 11

  const todayStr = formatLocalDateString(new Date());

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Generate 42 calendar grid cells (6 rows x 7 days)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0..6
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isFuture: boolean;
      status: HabitStatus;
      isRestDay: boolean;
    }[] = [];

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const str = formatLocalDateString(d);
      cells.push({
        dateStr: str,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isRestDay: restDays.includes(d.getDay()),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const str = formatLocalDateString(d);
      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isRestDay: restDays.includes(d.getDay()),
      });
    }

    // Next month filler days up to complete 35 or 42 cells
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      const str = formatLocalDateString(d);
      cells.push({
        dateStr: str,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isFuture: str > todayStr,
        status: completions[str] || 'not_attempted',
        isRestDay: restDays.includes(d.getDay()),
      });
    }

    return cells;
  }, [year, month, todayStr, completions, restDays]);

  const handleCellPress = async (dateStr: string, isFuture: boolean) => {
    if (isFuture) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onCycleDateStatus) {
      onCycleDateStatus(dateStr);
    } else if (onSelectDate) {
      onSelectDate(dateStr);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Month Navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </Text>

        <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={20} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      {/* Weekday Names Header */}
      <View style={styles.weekdaysRow}>
        {DAY_NAMES.map((d, idx) => (
          <Text
            key={d}
            style={[
              styles.weekdayText,
              idx === 0 && { color: '#F59E0B' }, // Sunday highlight
            ]}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {calendarCells.map((cell) => {
          const isSelected = cell.dateStr === selectedDate;

          let cellStyle: ViewStyle = styles.cellNormal;
          let textStyle: TextStyle = styles.textNormal;
          let icon = null;

          if (!cell.isCurrentMonth) {
            cellStyle = styles.cellOtherMonth;
            textStyle = styles.textDim;
          } else if (cell.isFuture) {
            cellStyle = styles.cellFuture;
            textStyle = styles.textFuture;
          } else if (cell.status === 'completed') {
            cellStyle = styles.cellCompleted;
            textStyle = styles.textCompleted;
            icon = <Ionicons name="checkmark" size={10} color="#070A11" style={styles.badgeIcon} />;
          } else if (cell.status === 'not_completed') {
            cellStyle = styles.cellFailed;
            textStyle = styles.textFailed;
            icon = <Ionicons name="close" size={10} color="#FFFFFF" style={styles.badgeIcon} />;
          } else if (cell.status === 'recovered') {
            cellStyle = styles.cellRecovered;
            textStyle = styles.textRecovered;
          } else {
            // Not attempted past day
            if (cell.dateStr < todayStr) {
              cellStyle = styles.cellMissedPast;
              textStyle = styles.textMissedPast;
            }
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
              {icon}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend Footer */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#00E699' }]} />
          <Text style={styles.legendLabel}>Done</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendLabel}>Missed</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(51, 65, 85, 0.6)' }]} />
          <Text style={styles.legendLabel}>Pending</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { borderColor: '#3B82F6', borderWidth: 1.5, backgroundColor: 'transparent' }]} />
          <Text style={styles.legendLabel}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
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
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
  },
  cell: {
    width: 38,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cellNormal: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  textNormal: {
    color: '#94A3B8',
  },
  cellOtherMonth: {
    backgroundColor: 'transparent',
    opacity: 0.25,
  },
  textDim: {
    color: '#475569',
  },
  cellFuture: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    opacity: 0.35,
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
    fontWeight: '800',
  },
  cellFailed: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  textFailed: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cellRecovered: {
    backgroundColor: '#F59E0B',
  },
  textRecovered: {
    color: '#070A11',
    fontWeight: '700',
  },
  cellMissedPast: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  textMissedPast: {
    color: '#94A3B8',
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: '#818CF8',
  },
  badgeIcon: {
    position: 'absolute',
    bottom: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 14,
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
    color: '#94A3B8',
    fontWeight: '500',
  },
});
