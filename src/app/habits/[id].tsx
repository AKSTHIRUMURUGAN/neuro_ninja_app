import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  getHabitById,
  getHabitCompletionsMap,
  getHabitStats,
  cycleHabitStatus,
  deleteHabit,
  updateHabit,
  type HabitItemV3,
  type HabitStatus,
  type HabitStats,
  type VerifierType,
} from '../../services/habits/habit-service';
import HabitCalendarMatrix from '../../components/habits/HabitCalendarMatrix';
import HabitStreakCard from '../../components/habits/HabitStreakCard';
import VerifierSelectModal from '../../components/verification/VerifierSelectModal';
import { formatLocalDateString } from '../../services/habits/streak-calculator';
import { useNinja } from '../../context/ninja-context';
import { useNinjaBack } from '../../hooks/use-ninja-back';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { notifyLifeOSChanged } = useNinja();
  const { handleSmartBack } = useNinjaBack({
    fallbackRoute: '/habits',
  });

  const [habit, setHabit] = useState<HabitItemV3 | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [completions, setCompletions] = useState<Record<string, HabitStatus>>({});
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatLocalDateString(new Date())
  );
  const [loading, setLoading] = useState(true);
  const [verifierModalOpen, setVerifierModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [h, s, compMap] = await Promise.all([
        getHabitById(id),
        getHabitStats(id),
        getHabitCompletionsMap(id, new Date().getFullYear(), new Date().getMonth() + 1),
      ]);
      setHabit(h);
      setStats(s);
      setCompletions(compMap);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCycleDateStatus = async (dateStr: string) => {
    if (!id) return;
    setSelectedDate(dateStr);

    // Optimistic UI update
    const current = completions[dateStr] || 'not_attempted';
    let next: HabitStatus;
    if (current === 'not_attempted') next = 'not_completed';
    else if (current === 'not_completed') next = 'completed';
    else next = 'not_attempted';

    setCompletions((prev) => ({ ...prev, [dateStr]: next }));

    // Execute SQLite cycle and reload fresh stats
    const res = await cycleHabitStatus(id, dateStr);
    setCompletions((prev) => ({ ...prev, [dateStr]: res.newStatus }));

    const updatedStats = await getHabitStats(id);
    setStats(updatedStats);

    const updatedHabit = await getHabitById(id);
    setHabit(updatedHabit);

    notifyLifeOSChanged();
  };

  const handleVerifierSelected = async (
    type: VerifierType,
    verifierId?: string | null,
    verifierEmail?: string | null
  ) => {
    if (!id) return;
    await updateHabit(id, {
      verifierType: type,
      verifierId: verifierId ?? null,
      verifierEmail: verifierEmail ?? null,
    });
    await loadData();
    notifyLifeOSChanged();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit and all its history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteHabit(id);
            notifyLifeOSChanged();
            router.back();
          },
        },
      ]
    );
  };

  if (loading || !habit || !stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00E699" />
          <Text style={styles.loadingText}>Loading Habit Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.headerBadge}>{habit.category.toUpperCase()} HABIT</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {habit.title}
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Habit Meta Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${habit.color}20` }]}>
              <Ionicons name={habit.icon as any} size={22} color={habit.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.habitTitle}>{habit.title}</Text>
              {habit.description ? (
                <Text style={styles.habitDesc}>{habit.description}</Text>
              ) : null}
            </View>
          </View>

          {/* Verifier Badge / Change Button */}
          <TouchableOpacity
            style={styles.verifierRow}
            onPress={() => setVerifierModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.verifierInfo}>
              <Ionicons
                name={habit.verifierType === 'self' ? 'shield-outline' : 'people'}
                size={16}
                color={habit.verifierType === 'self' ? '#64748B' : '#00E699'}
              />
              <Text style={styles.verifierText}>
                Verifier:{' '}
                <Text style={{ fontWeight: '700', color: '#F8FAFC' }}>
                  {habit.verifierType.toUpperCase()}
                  {habit.verifierEmail ? ` (${habit.verifierEmail})` : ''}
                </Text>
              </Text>
            </View>
            <Text style={styles.changeVerifierText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Streaks & Challenge Card */}
        <HabitStreakCard stats={stats} targetDays={habit.challengeTargetDays} />

        {/* Calendar Heatmap Matrix */}
        <Text style={styles.sectionHeader}>COMPLETION MATRIX & HEATMAP</Text>
        <HabitCalendarMatrix
          completions={completions}
          selectedDate={selectedDate}
          onCycleDateStatus={handleCycleDateStatus}
          onSelectDate={(date) => setSelectedDate(date)}
          restDays={habit.restDays}
          createdAt={habit.createdAt}
          schedule={habit.schedule}
          title={habit.title}
          currentStreak={stats?.currentStreak || habit.streak}
        />

        {/* Rewards Info */}
        <View style={styles.rewardsCard}>
          <View style={styles.rewardItem}>
            <Ionicons name="flash" size={18} color="#00E699" />
            <Text style={styles.rewardText}>+{habit.xpReward} XP per day</Text>
          </View>
          <View style={styles.rewardItem}>
            <Ionicons name="logo-usd" size={18} color="#F59E0B" />
            <Text style={styles.rewardText}>+{habit.coinReward} Coins per day</Text>
          </View>
        </View>
      </ScrollView>

      {/* Verifier Modal */}
      <VerifierSelectModal
        visible={verifierModalOpen}
        currentType={habit.verifierType}
        currentVerifierId={habit.verifierId}
        onClose={() => setVerifierModalOpen(false)}
        onSelect={handleVerifierSelected}
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  scroll: {
    padding: 16,
  },
  metaCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  habitDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  verifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  verifierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifierText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  changeVerifierText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818CF8',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    letterSpacing: 1,
  },
  rewardsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
});
