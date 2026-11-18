import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  createHabit,
  getHabits,
  getWeeklyHabitReview,
  recoverYesterdayHabit,
  cycleHabitStatus,
  incrementHabitProgress,
  getAllHabitCompletionsMap,
  type HabitCategory,
  type HabitItemV3,
  type HabitWeeklyReview,
  type VerifierType,
  type HabitStatus,
} from '../../services/habits/habit-service';
import {
  RecurrenceType,
  TimeOfDay,
  TargetType,
  HabitScheduleConfig,
} from '../../services/habits/habit-types';
import { getAlarms } from '../../services/alarms/alarm-engine';
import { useNinja } from '../../context/ninja-context';
import { useNinjaBack } from '../../hooks/use-ninja-back';
import HabitCycleToggle from '../../components/habits/HabitCycleToggle';
import HabitCalendarMatrix from '../../components/habits/HabitCalendarMatrix';
import VerificationInboxModal from '../../components/verification/VerificationInboxModal';
import VerifierSelectModal from '../../components/verification/VerifierSelectModal';
import { getVerificationRequests } from '../../services/verification/verification-service';
import {
  formatLocalDateString,
  parseLocalDateSafe,
  getWeekdayNameForDate,
  isHabitScheduledForDate,
  DAY_NAMES,
  FULL_DAY_NAMES,
} from '../../services/habits/streak-calculator';

export default function HabitsScreen() {
  const router = useRouter();
  const { notifyLifeOSChanged } = useNinja();
  const { handleSmartBack } = useNinjaBack({
    fallbackRoute: '/focus/ghost-launcher',
  });

  const [habits, setHabits] = useState<HabitItemV3[]>([]);
  const [weekly, setWeekly] = useState<HabitWeeklyReview | null>(null);
  const [pendingVerifCount, setPendingVerifCount] = useState<number>(0);
  const [allCompletions, setAllCompletions] = useState<Record<string, HabitStatus>>({});

  const todayStr = useMemo(() => formatLocalDateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // View Mode: Week strip vs. Full Month Interactive Matrix
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Time of Day Filter
  const [timeFilter, setTimeFilter] = useState<'ALL' | TimeOfDay>('ALL');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);

  // New Habit Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState<HabitCategory>('mind');
  const [challengeDays, setChallengeDays] = useState<7 | 21 | 30>(21);
  const [linkedFocusMin, setLinkedFocusMin] = useState<number | null>(25);
  const [linkedAlarmId, setLinkedAlarmId] = useState<string | null>(null);
  const [verifierType, setVerifierType] = useState<VerifierType>('self');
  const [verifierId, setVerifierId] = useState<string | null>(null);
  const [verifierEmail, setVerifierEmail] = useState<string | null>(null);
  const [verifierPickerOpen, setVerifierPickerOpen] = useState(false);

  // Recurrence Form State
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Mon-Sat default
  const [intervalDays, setIntervalDays] = useState<string>('2');
  const [timesPerPeriod, setTimesPerPeriod] = useState<string>('3');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');

  // Target Metric Form State
  const [targetType, setTargetType] = useState<TargetType>('boolean');
  const [targetValue, setTargetValue] = useState<string>('8');
  const [targetUnit, setTargetUnit] = useState<string>('glasses');

  // Atomic Habits Habit-Stacking Cue
  const [stackingCue, setStackingCue] = useState<string>('');

  // Deterministic 7-day strip anchored at local noon
  const dateStrip = useMemo(() => {
    const list: { dateStr: string; label: string; dayNum: number; isToday: boolean }[] = [];
    const baseNoon = new Date();
    baseNoon.setHours(12, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseNoon.getTime() - i * 86400000);
      const str = formatLocalDateString(d);
      const dayName = getWeekdayNameForDate(str);
      list.push({
        dateStr: str,
        label: i === 0 ? 'Today' : i === 1 ? 'Yest' : dayName,
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  const refresh = useCallback(() => {
    void (async () => {
      const [list, rev, , reqs, completionsMap] = await Promise.all([
        getHabits(),
        getWeeklyHabitReview(),
        getAlarms(),
        getVerificationRequests('pending'),
        getAllHabitCompletionsMap(),
      ]);
      setHabits(list);
      setWeekly(rev);
      setPendingVerifCount(reqs.length);
      setAllCompletions(completionsMap);
    })();
  }, []);

  useFocusEffect(refresh);

  const handleCycleStatus = async (habitId: string) => {
    await cycleHabitStatus(habitId, selectedDate);
    refresh();
    notifyLifeOSChanged();
  };

  const handleStepperDelta = async (habitId: string, delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await incrementHabitProgress(habitId, selectedDate, delta);
    refresh();
    notifyLifeOSChanged();
  };

  const handleRecoverYesterday = async (id: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = await recoverYesterdayHabit(id);
    setHabits(updated);
    const rev = await getWeeklyHabitReview();
    setWeekly(rev);
    notifyLifeOSChanged();
  };

  const toggleWeekdaySelection = (dayIndex: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWeekdays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length <= 1) return prev; // Keep at least 1 day
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;

    const schedule: HabitScheduleConfig = {
      recurrenceType,
      specificDays: recurrenceType === 'specific_days' ? selectedWeekdays : [0, 1, 2, 3, 4, 5, 6],
      intervalDays: recurrenceType === 'interval' ? Math.max(1, parseInt(intervalDays, 10) || 2) : undefined,
      timesPerWeek: recurrenceType === 'times_per_period' ? Math.max(1, parseInt(timesPerPeriod, 10) || 3) : undefined,
      timeOfDay,
      targetType,
      targetValue: targetType !== 'boolean' ? Math.max(1, parseInt(targetValue, 10) || 1) : 1,
      targetUnit: targetType !== 'boolean' ? targetUnit.trim() || undefined : undefined,
      habitStackTrigger: stackingCue.trim() || undefined,
    };

    // Calculate rest days from schedule
    let computedRestDays: number[] = [0];
    if (recurrenceType === 'specific_days') {
      const allDays = [0, 1, 2, 3, 4, 5, 6];
      computedRestDays = allDays.filter((d) => !selectedWeekdays.includes(d));
    } else if (recurrenceType === 'weekdays') {
      computedRestDays = [0, 6];
    } else if (recurrenceType === 'weekends') {
      computedRestDays = [1, 2, 3, 4, 5];
    }

    await createHabit({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      category: newCat,
      restDays: computedRestDays,
      challengeTargetDays: challengeDays,
      linkedFocusMinutes: linkedFocusMin,
      linkedAlarmId,
      verifierType,
      verifierId,
      verifierEmail,
      schedule,
    });

    setNewTitle('');
    setNewDesc('');
    setLinkedAlarmId(null);
    setVerifierType('self');
    setVerifierId(null);
    setVerifierEmail(null);
    setStackingCue('');
    setCreateOpen(false);
    notifyLifeOSChanged();
    refresh();
  };

  // Filter habits by time-of-day
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      if (timeFilter === 'ALL') return true;
      const tod = h.schedule?.timeOfDay || 'anytime';
      return tod === timeFilter;
    });
  }, [habits, timeFilter]);

  // Completion stats for currently selected date
  const completedOnSelectedDate = habits.filter((h) =>
    h.completedDays.includes(selectedDate)
  ).length;

  const scheduledOnSelectedDate = habits.filter((h) =>
    isHabitScheduledForDate(h, selectedDate)
  ).length;

  const disciplinePercent =
    scheduledOnSelectedDate > 0
      ? Math.round((completedOnSelectedDate / scheduledOnSelectedDate) * 100)
      : 100;

  const selectedWeekdayName = getWeekdayNameForDate(selectedDate);
  const selectedDayNoon = parseLocalDateSafe(selectedDate);

  const formatRecurrenceBadge = (h: HabitItemV3): string => {
    if (!h.schedule) {
      if (h.restDays?.includes(0) && h.restDays.length === 1) return 'Mon-Sat';
      return 'Daily';
    }
    switch (h.schedule.recurrenceType) {
      case 'daily':
        return 'Daily';
      case 'weekdays':
        return 'Weekdays (Mon-Fri)';
      case 'weekends':
        return 'Weekends';
      case 'specific_days': {
        const days = h.schedule.specificDays || [];
        if (days.length === 7) return 'Daily';
        if (days.length === 0) return 'Rest Days';
        return days.map((d) => DAY_NAMES[d]).join(', ');
      }
      case 'interval':
        return `Every ${h.schedule.intervalDays || 2} days`;
      case 'times_per_period':
        return `${h.schedule.timesPerWeek || 3}x / week`;
      default:
        return 'Custom';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with smart back to Ghost Launcher */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleSmartBack}
          accessibilityLabel="Back to Ghost Launcher"
        >
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.badge}>ATOMIC & COMPETITOR PARITY</Text>
          <Text style={styles.title}>Habit Dojo</Text>
        </View>

        {/* View Switcher: Week Strip vs. Full Month Matrix */}
        <View style={styles.viewModeSwitcher}>
          <TouchableOpacity
            style={[styles.viewTab, viewMode === 'week' && styles.viewTabActive]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('week');
            }}
          >
            <MaterialCommunityIcons
              name="view-day-outline"
              size={16}
              color={viewMode === 'week' ? '#00E699' : '#94A3B8'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewTab, viewMode === 'month' && styles.viewTabActive]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('month');
            }}
          >
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={16}
              color={viewMode === 'month' ? '#00E699' : '#94A3B8'}
            />
          </TouchableOpacity>
        </View>

        {/* Accountability Inbox Button */}
        <TouchableOpacity
          style={styles.inboxBtn}
          onPress={() => setInboxOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark" size={20} color="#818CF8" />
          {pendingVerifCount > 0 && (
            <View style={styles.inboxBadge}>
              <Text style={styles.inboxBadgeText}>{pendingVerifCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Add Habit Button */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={22} color="#070A11" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Full Month Interactive Matrix Mode */}
        {viewMode === 'month' && (
          <HabitCalendarMatrix
            completions={allCompletions}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            currentStreak={weekly?.completedThisWeek || 0}
            title="LifeOS Habit Adherence"
          />
        )}

        {/* Discipline & Weekly Review Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{disciplinePercent}%</Text>
            <Text style={styles.scoreLabel}>
              {selectedDate === todayStr ? 'Today' : selectedDate.slice(5)}
            </Text>
          </View>
          <View style={styles.heroMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.heroTitle}>
                {selectedWeekdayName}, {selectedDayNoon.getDate()} {FULL_DAY_NAMES[selectedDayNoon.getDay()]}
              </Text>
            </View>
            <Text style={styles.heroSub}>
              {completedOnSelectedDate} of {scheduledOnSelectedDate} due habits completed (+15 XP each)
            </Text>
            {weekly && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color="#F59E0B" />
                <Text style={styles.streakText}>
                  Weekly: {weekly.completedThisWeek} done · {weekly.restDaysThisWeek} rest · {weekly.adherencePercent}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Week Date Selector Strip (Always visible in Week Mode) */}
        {viewMode === 'week' && (
          <View style={styles.dateStripContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateStripScroll}
            >
              {dateStrip.map((item) => {
                const isSelected = item.dateStr === selectedDate;
                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    style={[styles.datePill, isSelected && styles.datePillActive]}
                    onPress={() => {
                      setSelectedDate(item.dateStr);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[styles.datePillLabel, isSelected && styles.datePillLabelActive]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.datePillNum, isSelected && styles.datePillNumActive]}>
                      {item.dayNum}
                    </Text>
                    {item.isToday && <View style={styles.todayIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Time-of-Day Filter Pills */}
        <View style={styles.filterBar}>
          {(
            [
              { id: 'ALL', label: 'All Routines' },
              { id: 'morning', label: '🌅 Morning' },
              { id: 'afternoon', label: '☀️ Afternoon' },
              { id: 'evening', label: '🌙 Evening' },
              { id: 'anytime', label: '⚡ Anytime' },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, timeFilter === item.id && styles.filterChipActive]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeFilter(item.id);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  timeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>
            DUE HABITS ({filteredHabits.length})
          </Text>
          <Text style={styles.sectionSub}>Tap circle or stepper to log</Text>
        </View>

        {/* Habits List with Tri-State & Numeric Stepper support */}
        {filteredHabits.map((item) => {
          let currentStatus: HabitStatus = 'not_attempted';
          if (item.completedDays.includes(selectedDate)) {
            currentStatus = 'completed';
          } else if (item.notCompletedDays.includes(selectedDate)) {
            currentStatus = 'not_completed';
          } else if (item.recoveredDays.includes(selectedDate)) {
            currentStatus = 'recovered';
          }

          const isScheduled = isHabitScheduledForDate(item, selectedDate);
          const challengePct = Math.min(
            100,
            Math.round((item.streak / Math.max(1, item.challengeTargetDays)) * 100)
          );

          const isCountHabit = item.targetType === 'count' && (item.targetValue || 0) > 1;
          const currentCount = item.currentProgress || 0;
          const target = item.targetValue || 1;

          return (
            <View
              key={item.id}
              style={[
                styles.habitCard,
                currentStatus === 'completed' && styles.habitCardDone,
                currentStatus === 'not_completed' && styles.habitCardFailed,
                !isScheduled && styles.habitCardRestDay,
              ]}
            >
              <View style={styles.habitMainRow}>
                {/* Tri-State Toggle OR Checkmark */}
                {isCountHabit ? (
                  <TouchableOpacity
                    style={[
                      styles.countBadgeWrapper,
                      currentStatus === 'completed' && styles.countBadgeDone,
                    ]}
                    onPress={() => void handleCycleStatus(item.id)}
                  >
                    <Ionicons
                      name={currentStatus === 'completed' ? 'checkmark-circle' : 'water-outline'}
                      size={28}
                      color={currentStatus === 'completed' ? '#00E699' : '#38BDF8'}
                    />
                  </TouchableOpacity>
                ) : (
                  <HabitCycleToggle
                    status={currentStatus}
                    onCycle={() => void handleCycleStatus(item.id)}
                    size={38}
                  />
                )}

                {/* Card Body */}
                <TouchableOpacity
                  style={{ flex: 1, marginHorizontal: 12 }}
                  onPress={() => router.push(`/habits/${item.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={[
                        styles.habitTitle,
                        currentStatus === 'completed' && styles.habitTitleDone,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </View>

                  {/* Atomic Habits Stacking Cue */}
                  {item.schedule?.habitStackTrigger ? (
                    <Text style={styles.stackingCueText} numberOfLines={1}>
                      ⚡ {item.schedule.habitStackTrigger}
                    </Text>
                  ) : null}

                  <View style={styles.habitMeta}>
                    <Text style={styles.categoryBadge}>{item.category.toUpperCase()}</Text>

                    {/* Recurrence Pill */}
                    <View style={styles.recurrencePill}>
                      <MaterialCommunityIcons name="repeat" size={11} color="#94A3B8" />
                      <Text style={styles.recurrenceText}>{formatRecurrenceBadge(item)}</Text>
                    </View>

                    {/* Streak Badge */}
                    <View style={styles.habitStreak}>
                      <Ionicons name="flame" size={12} color="#F59E0B" />
                      <Text style={styles.streakNum}>
                        {item.streak}/{item.challengeTargetDays}d ({challengePct}%)
                      </Text>
                    </View>

                    {/* Rest Day Indicator */}
                    {!isScheduled && (
                      <View style={styles.restDayBadge}>
                        <Ionicons name="cafe-outline" size={11} color="#F59E0B" />
                        <Text style={styles.restDayText}>Rest Day</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Arrow to detail screen */}
                <TouchableOpacity onPress={() => router.push(`/habits/${item.id}` as any)}>
                  <Ionicons name="calendar-outline" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Quantitative Stepper Toolbar (Done & Loop Parity) */}
              {isCountHabit && (
                <View style={styles.stepperContainer}>
                  <View style={styles.stepperInfo}>
                    <Text style={styles.stepperProgressText}>
                      Progress: <Text style={styles.stepperBold}>{currentCount}</Text> / {target}{' '}
                      {item.targetUnit || 'units'}
                    </Text>
                    <View style={styles.stepperProgressBar}>
                      <View
                        style={[
                          styles.stepperProgressFill,
                          { width: `${Math.min(100, Math.round((currentCount / target) * 100))}%` },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => void handleStepperDelta(item.id, -1)}
                      disabled={currentCount <= 0}
                    >
                      <Ionicons name="remove" size={16} color="#F8FAFC" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.stepBtn, styles.stepBtnAdd]}
                      onPress={() => void handleStepperDelta(item.id, 1)}
                    >
                      <Ionicons name="add" size={16} color="#070A11" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Footer Quick Actions */}
              <View style={styles.habitFooterActions}>
                <TouchableOpacity
                  style={styles.miniAction}
                  onPress={() => void handleRecoverYesterday(item.id)}
                >
                  <Ionicons name="refresh-outline" size={13} color="#06B6D4" />
                  <Text style={styles.miniActionText}>Recover Yesterday</Text>
                </TouchableOpacity>

                {item.linkedFocusMinutes ? (
                  <TouchableOpacity
                    style={styles.miniAction}
                    onPress={() =>
                      router.push(
                        `/focus/pomodoro?minutes=${item.linkedFocusMinutes}&label=${encodeURIComponent(
                          item.title
                        )}` as any
                      )
                    }
                  >
                    <Ionicons name="timer-outline" size={13} color="#10B981" />
                    <Text style={[styles.miniActionText, { color: '#10B981' }]}>
                      Start {item.linkedFocusMinutes}m Focus
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {item.linkedAlarmId ? (
                  <TouchableOpacity
                    style={styles.miniAction}
                    onPress={() => router.push('/alarms' as any)}
                  >
                    <Ionicons name="alarm-outline" size={13} color="#F59E0B" />
                    <Text style={[styles.miniActionText, { color: '#F59E0B' }]}>Alarm Linked</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* New Habit Creation & Recurrence Modal */}
      <Modal visible={createOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Habit Mission</Text>
                <TouchableOpacity onPress={() => setCreateOpen(false)}>
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Habit title (e.g. Read 20 mins, Drink water)"
                placeholderTextColor="#64748B"
              />

              <TextInput
                style={[styles.modalInput, { height: 50, textAlignVertical: 'top' }]}
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Motivation / Why this habit matters..."
                placeholderTextColor="#64748B"
                multiline
              />

              {/* Atomic Habits Stacking Cue */}
              <Text style={styles.fieldLabel}>ATOMIC HABIT STACKING CUE</Text>
              <TextInput
                style={styles.modalInput}
                value={stackingCue}
                onChangeText={setStackingCue}
                placeholder="After [Current Routine], I will [Do this habit]..."
                placeholderTextColor="#64748B"
              />

              {/* Category Chips */}
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {(['mind', 'body', 'focus', 'study', 'sleep'] as HabitCategory[]).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, newCat === c && styles.chipActive]}
                    onPress={() => setNewCat(c)}
                  >
                    <Text style={[styles.chipText, newCat === c && { color: '#070A11' }]}>
                      {c.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Recurrence Pattern Selector */}
              <Text style={styles.fieldLabel}>RECURRENCE SCHEDULE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {(
                  [
                    { id: 'daily', label: 'Every Day' },
                    { id: 'specific_days', label: 'Specific Days' },
                    { id: 'weekdays', label: 'Mon-Fri' },
                    { id: 'weekends', label: 'Sat-Sun' },
                    { id: 'interval', label: 'Interval (N Days)' },
                    { id: 'times_per_period', label: 'Times / Week' },
                  ] as const
                ).map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, recurrenceType === r.id && styles.chipActive]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRecurrenceType(r.id);
                    }}
                  >
                    <Text style={[styles.chipText, recurrenceType === r.id && { color: '#070A11' }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Specific Weekday Multi-Select Circles */}
              {recurrenceType === 'specific_days' && (
                <View style={styles.weekdayPickerRow}>
                  {DAY_NAMES.map((d, idx) => {
                    const isSelected = selectedWeekdays.includes(idx);
                    return (
                      <TouchableOpacity
                        key={d + idx}
                        style={[styles.weekdayCircle, isSelected && styles.weekdayCircleActive]}
                        onPress={() => toggleWeekdaySelection(idx)}
                      >
                        <Text
                          style={[
                            styles.weekdayCircleText,
                            isSelected && styles.weekdayCircleTextActive,
                          ]}
                        >
                          {d[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Interval Days Input */}
              {recurrenceType === 'interval' && (
                <View style={styles.inlineConfigRow}>
                  <Text style={styles.inlineConfigLabel}>Repeat every</Text>
                  <TextInput
                    style={styles.inlineInput}
                    keyboardType="number-pad"
                    value={intervalDays}
                    onChangeText={setIntervalDays}
                  />
                  <Text style={styles.inlineConfigLabel}>days</Text>
                </View>
              )}

              {/* Frequency Times / Week Input */}
              {recurrenceType === 'times_per_period' && (
                <View style={styles.inlineConfigRow}>
                  <Text style={styles.inlineConfigLabel}>Target</Text>
                  <TextInput
                    style={styles.inlineInput}
                    keyboardType="number-pad"
                    value={timesPerPeriod}
                    onChangeText={setTimesPerPeriod}
                  />
                  <Text style={styles.inlineConfigLabel}>times per week</Text>
                </View>
              )}

              {/* Time of Day Routine Picker */}
              <Text style={styles.fieldLabel}>TIME OF DAY</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {(
                  [
                    { id: 'morning', label: '🌅 Morning' },
                    { id: 'afternoon', label: '☀️ Afternoon' },
                    { id: 'evening', label: '🌙 Evening' },
                    { id: 'anytime', label: '⚡ Anytime' },
                  ] as const
                ).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, timeOfDay === t.id && styles.chipActive]}
                    onPress={() => setTimeOfDay(t.id)}
                  >
                    <Text style={[styles.chipText, timeOfDay === t.id && { color: '#070A11' }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target Metric Picker (Boolean vs Count Stepper) */}
              <Text style={styles.fieldLabel}>TARGET METRIC</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {(
                  [
                    { id: 'boolean', label: 'Yes / No (Toggle)' },
                    { id: 'count', label: 'Numeric Count (Stepper)' },
                  ] as const
                ).map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.chip, targetType === m.id && styles.chipActive]}
                    onPress={() => setTargetType(m.id)}
                  >
                    <Text style={[styles.chipText, targetType === m.id && { color: '#070A11' }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Numeric Target Configuration */}
              {targetType === 'count' && (
                <View style={styles.inlineConfigRow}>
                  <Text style={styles.inlineConfigLabel}>Target:</Text>
                  <TextInput
                    style={styles.inlineInput}
                    keyboardType="number-pad"
                    value={targetValue}
                    onChangeText={setTargetValue}
                  />
                  <TextInput
                    style={[styles.inlineInput, { width: 90 }]}
                    value={targetUnit}
                    onChangeText={setTargetUnit}
                    placeholder="glasses, pages"
                    placeholderTextColor="#64748B"
                  />
                </View>
              )}

              {/* Challenge Target Days */}
              <Text style={styles.fieldLabel}>CHALLENGE DURATION</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {([7, 21, 30] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, challengeDays === d && styles.chipActive]}
                    onPress={() => setChallengeDays(d)}
                  >
                    <Text style={[styles.chipText, challengeDays === d && { color: '#070A11' }]}>
                      {d}-Day Challenge
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Linked Focus Sprint */}
              <Text style={styles.fieldLabel}>LINKED FOCUS SESSION</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {([null, 15, 25, 45] as const).map((mins) => (
                  <TouchableOpacity
                    key={mins ?? 'none'}
                    style={[styles.chip, linkedFocusMin === mins && styles.chipActive]}
                    onPress={() => setLinkedFocusMin(mins)}
                  >
                    <Text style={[styles.chipText, linkedFocusMin === mins && { color: '#070A11' }]}>
                      {mins ? `${mins}m Focus` : 'None'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Accountability Verifier */}
              <Text style={styles.fieldLabel}>ACCOUNTABILITY VERIFIER</Text>
              <TouchableOpacity
                style={styles.verifierSelectBtn}
                onPress={() => setVerifierPickerOpen(true)}
              >
                <Ionicons
                  name={verifierType === 'self' ? 'shield-outline' : 'people'}
                  size={18}
                  color={verifierType === 'self' ? '#64748B' : '#00E699'}
                />
                <Text style={styles.verifierSelectBtnText}>
                  {verifierType.toUpperCase()}
                  {verifierEmail ? ` (${verifierEmail})` : ' (Tap to configure)'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                <Text style={styles.submitBtnText}>Initialize Habit Mission</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Verifier Picker Modal */}
      <VerifierSelectModal
        visible={verifierPickerOpen}
        currentType={verifierType}
        currentVerifierId={verifierId}
        onClose={() => setVerifierPickerOpen(false)}
        onSelect={(type, id, email) => {
          setVerifierType(type);
          setVerifierId(id || null);
          setVerifierEmail(email || null);
        }}
      />

      {/* Verification Inbox Modal */}
      <VerificationInboxModal
        visible={inboxOpen}
        onClose={() => setInboxOpen(false)}
        onUpdated={refresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
    marginRight: 8,
  },
  viewTab: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewTabActive: {
    backgroundColor: '#0F1829',
  },
  inboxBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 8,
  },
  inboxBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  inboxBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
    gap: 16,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 2,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00E699',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  heroMeta: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  dateStripContainer: {
    marginBottom: 14,
  },
  dateStripScroll: {
    gap: 8,
  },
  datePill: {
    width: 52,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  datePillActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    borderColor: '#00E699',
  },
  datePillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  datePillLabelActive: {
    color: '#00E699',
  },
  datePillNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  datePillNumActive: {
    color: '#00E699',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00E699',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    overflow: 'hidden',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#00E699',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
  },
  habitCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
    padding: 14,
  },
  habitCardDone: {
    borderColor: 'rgba(0, 230, 153, 0.4)',
    backgroundColor: 'rgba(0, 230, 153, 0.04)',
  },
  habitCardFailed: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  habitCardRestDay: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderStyle: 'dashed',
  },
  habitMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadgeWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeDone: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  habitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  habitTitleDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  stackingCueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
    marginTop: 2,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recurrencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#121D33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recurrenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  habitStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  restDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  restDayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  stepperContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperInfo: {
    flex: 1,
    marginRight: 12,
  },
  stepperProgressText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  stepperBold: {
    fontWeight: '800',
    color: '#00E699',
  },
  stepperProgressBar: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepperProgressFill: {
    height: '100%',
    backgroundColor: '#00E699',
    borderRadius: 3,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnAdd: {
    backgroundColor: '#00E699',
  },
  habitFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  miniAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#00E699',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  weekdayPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekdayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  weekdayCircleActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  weekdayCircleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  weekdayCircleTextActive: {
    color: '#070A11',
  },
  inlineConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inlineConfigLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  inlineInput: {
    width: 50,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
    color: '#00E699',
    fontWeight: '800',
    fontSize: 14,
  },
  verifierSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  verifierSelectBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  submitBtn: {
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#070A11',
  },
});
