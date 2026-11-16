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
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  createHabit,
  getHabits,
  getWeeklyHabitReview,
  recoverYesterdayHabit,
  cycleHabitStatus,
  type HabitCategory,
  type HabitItemV3,
  type HabitWeeklyReview,
  type VerifierType,
  type HabitStatus,
} from '../../services/habits/habit-service';
import { getAlarms } from '../../services/alarms/alarm-engine';
import { useNinja } from '../../context/ninja-context';
import HabitCycleToggle from '../../components/habits/HabitCycleToggle';
import VerificationInboxModal from '../../components/verification/VerificationInboxModal';
import VerifierSelectModal from '../../components/verification/VerifierSelectModal';
import { getVerificationRequests } from '../../services/verification/verification-service';
import { formatLocalDateString } from '../../services/habits/streak-calculator';

export default function HabitsScreen() {
  const router = useRouter();
  const { notifyLifeOSChanged } = useNinja();

  const [habits, setHabits] = useState<HabitItemV3[]>([]);
  const [weekly, setWeekly] = useState<HabitWeeklyReview | null>(null);
  const [pendingVerifCount, setPendingVerifCount] = useState<number>(0);

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatLocalDateString(new Date())
  );

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

  const todayStr = useMemo(() => formatLocalDateString(new Date()), []);

  // Generate 7 recent days for the date strip
  const dateStrip = useMemo(() => {
    const list: { dateStr: string; label: string; dayNum: number; isToday: boolean }[] = [];
    const base = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(base.getDate() - i);
      const str = formatLocalDateString(d);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      list.push({
        dateStr: str,
        label: i === 0 ? 'Today' : i === 1 ? 'Yest' : dayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  const refresh = useCallback(() => {
    void (async () => {
      const [list, rev, , reqs] = await Promise.all([
        getHabits(),
        getWeeklyHabitReview(),
        getAlarms(),
        getVerificationRequests('pending'),
      ]);
      setHabits(list);
      setWeekly(rev);
      setPendingVerifCount(reqs.length);
    })();
  }, []);

  useFocusEffect(refresh);

  const handleCycleStatus = async (habitId: string) => {
    await cycleHabitStatus(habitId, selectedDate);
    const [updatedList, updatedWeekly] = await Promise.all([
      getHabits(),
      getWeeklyHabitReview(),
    ]);
    setHabits(updatedList);
    setWeekly(updatedWeekly);
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

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createHabit({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      category: newCat,
      restDays: [0], // Sunday rest day by default
      challengeTargetDays: challengeDays,
      linkedFocusMinutes: linkedFocusMin,
      linkedAlarmId,
      verifierType,
      verifierId,
      verifierEmail,
    });
    setNewTitle('');
    setNewDesc('');
    setLinkedAlarmId(null);
    setVerifierType('self');
    setVerifierId(null);
    setVerifierEmail(null);
    setCreateOpen(false);
    notifyLifeOSChanged();
    refresh();
  };

  const completedOnSelectedDate = habits.filter((h) =>
    h.completedDays.includes(selectedDate)
  ).length;

  const disciplinePercent =
    habits.length > 0
      ? Math.round((completedOnSelectedDate / habits.length) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.badge}>RECOVERY-FRIENDLY & VERIFIED</Text>
          <Text style={styles.title}>Habit Matrix</Text>
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
        {/* Discipline & Weekly Review Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{disciplinePercent}%</Text>
            <Text style={styles.scoreLabel}>
              {selectedDate === todayStr ? 'Today' : selectedDate.slice(5)}
            </Text>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroTitle}>
              {new Date(selectedDate).getDay() === 0 ? 'Rest & Recovery Day' : 'Habit Focus Matrix'}
            </Text>
            <Text style={styles.heroSub}>
              {completedOnSelectedDate} of {habits.length} habits done (+15 XP each)
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

        {/* Date Selector Strip (View & Cycle any day) */}
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

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>HABITS & 21-DAY CHALLENGES</Text>
          <Text style={styles.sectionSub}>Tap circle to cycle status</Text>
        </View>

        {/* Habits List with Tri-State Toggle */}
        {habits.map((item) => {
          let currentStatus: HabitStatus = 'not_attempted';
          if (item.completedDays.includes(selectedDate)) {
            currentStatus = 'completed';
          } else if (item.notCompletedDays.includes(selectedDate)) {
            currentStatus = 'not_completed';
          } else if (item.recoveredDays.includes(selectedDate)) {
            currentStatus = 'recovered';
          }

          const challengePct = Math.min(
            100,
            Math.round((item.streak / Math.max(1, item.challengeTargetDays)) * 100)
          );

          return (
            <View
              key={item.id}
              style={[
                styles.habitCard,
                currentStatus === 'completed' && styles.habitCardDone,
                currentStatus === 'not_completed' && styles.habitCardFailed,
              ]}
            >
              <View style={styles.habitMainRow}>
                {/* Tri-State Toggle */}
                <HabitCycleToggle
                  status={currentStatus}
                  onCycle={() => void handleCycleStatus(item.id)}
                  size={38}
                />

                {/* Card Body - Tap to open Habit Analytics & Calendar Screen */}
                <TouchableOpacity
                  style={{ flex: 1, marginHorizontal: 12 }}
                  onPress={() => router.push(`/habits/${item.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.habitTitle,
                      currentStatus === 'completed' && styles.habitTitleDone,
                    ]}
                  >
                    {item.title}
                  </Text>

                  <View style={styles.habitMeta}>
                    <Text style={styles.categoryBadge}>{item.category.toUpperCase()}</Text>

                    <View style={styles.habitStreak}>
                      <Ionicons name="flame" size={12} color="#F59E0B" />
                      <Text style={styles.streakNum}>
                        {item.streak}/{item.challengeTargetDays}d ({challengePct}%)
                      </Text>
                    </View>

                    {item.verifierType !== 'self' && (
                      <View style={styles.verifierBadge}>
                        <Ionicons name="people" size={11} color="#00E699" />
                        <Text style={styles.verifierBadgeText}>
                          {item.verifierType.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Arrow to detail screen */}
                <TouchableOpacity onPress={() => router.push(`/habits/${item.id}` as any)}>
                  <Ionicons name="calendar-outline" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

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

      {/* New Habit Creation Modal */}
      <Modal visible={createOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
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
              placeholder="Habit title (e.g. Read 20 mins before bed)"
              placeholderTextColor="#64748B"
            />

            <TextInput
              style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Why this habit matters (optional motivation note)..."
              placeholderTextColor="#64748B"
              multiline
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

            {/* Accountability Partner */}
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
              <Text style={styles.submitBtnText}>Initialize Habit</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
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
    marginBottom: 16,
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
    fontWeight: '700',
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
    color: '#F59E0B',
    fontWeight: '600',
  },
  dateStripContainer: {
    marginBottom: 16,
  },
  dateStripScroll: {
    gap: 8,
  },
  datePill: {
    width: 52,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    position: 'relative',
  },
  datePillActive: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  datePillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  datePillLabelActive: {
    color: '#070A11',
  },
  datePillNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  datePillNumActive: {
    color: '#070A11',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00E699',
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
    color: '#64748B',
    letterSpacing: 1,
  },
  sectionSub: {
    fontSize: 10,
    color: '#818CF8',
    fontWeight: '600',
  },
  habitCard: {
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  habitCardDone: {
    borderColor: 'rgba(0, 230, 153, 0.3)',
    backgroundColor: 'rgba(0, 230, 153, 0.03)',
  },
  habitCardFailed: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  habitMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  habitTitleDone: {
    color: '#00E699',
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
    color: '#818CF8',
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  habitStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakNum: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  verifierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifierBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
  },
  habitFooterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  miniAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniActionText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipActive: {
    backgroundColor: '#00E699',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  verifierSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  verifierSelectBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  submitBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#070A11',
  },
});
