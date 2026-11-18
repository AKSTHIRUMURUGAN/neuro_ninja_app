import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  cycleHabitStatus,
  deleteHabit,
  updateHabit,
  type HabitItemV3,
  type HabitStatus,
} from '../../services/habits/habit-service';
import {
  calculateHabitComprehensiveStats,
  formatLocalDateString,
  type HabitDetailedStatsResult,
} from '../../services/habits/streak-calculator';
import HabitCalendarView from '../../components/habits/HabitCalendarView';
import HabitStatisticsView from '../../components/habits/HabitStatisticsView';
import HabitEditView from '../../components/habits/HabitEditView';
import { useNinja } from '../../context/ninja-context';
import { useNinjaBack } from '../../hooks/use-ninja-back';

type TabType = 'calendar' | 'statistics' | 'edit';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { notifyLifeOSChanged } = useNinja();
  const { handleSmartBack } = useNinjaBack({
    fallbackRoute: '/habits',
  });

  const [activeTab, setActiveTab] = useState<TabType>('statistics');
  const [habit, setHabit] = useState<HabitItemV3 | null>(null);
  const [completions, setCompletions] = useState<Record<string, HabitStatus>>({});
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatLocalDateString(new Date())
  );
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [h, compMap] = await Promise.all([
        getHabitById(id),
        getHabitCompletionsMap(id, new Date().getFullYear(), new Date().getMonth() + 1),
      ]);
      setHabit(h);
      setCompletions(compMap);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Comprehensive analytics calculation
  const stats: HabitDetailedStatsResult = useMemo(() => {
    if (!habit) {
      return {
        totalDays: 1,
        completedCount: 0,
        notCompletedCount: 0,
        missedCount: 0,
        completionRate: 0,
        failureRate: 0,
        missedRate: 0,
        habitScore: 0,
        currentStreak: 0,
        bestStreak: 0,
        thisWeek: 0,
        thisMonth: 0,
        thisYear: 0,
      };
    }
    return calculateHabitComprehensiveStats(completions, {
      createdAt: habit.createdAt,
      schedule: habit.schedule,
      restDays: habit.restDays,
      longestStreak: habit.longestStreak,
    });
  }, [habit, completions]);

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

    // Execute SQLite cycle and reload fresh data
    const res = await cycleHabitStatus(id, dateStr);
    setCompletions((prev) => ({ ...prev, [dateStr]: res.newStatus }));

    const updatedHabit = await getHabitById(id);
    setHabit(updatedHabit);

    notifyLifeOSChanged();
  };

  const handleUpdateHabit = async (updates: Partial<HabitItemV3>) => {
    if (!id) return;
    await updateHabit(id, updates);
    await loadData();
    notifyLifeOSChanged();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit and all its completion history?',
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

  const handleTabChange = (tab: TabType) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  if (loading || !habit) {
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
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerCategory}>{habit.category.toUpperCase()} HABIT</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {habit.title}
          </Text>
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Top 3-Segment Tab Bar: [Calendar] [Statistics] [Edit] */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'calendar' && styles.tabItemActive]}
          onPress={() => handleTabChange('calendar')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeTab === 'calendar' ? '#070A11' : '#94A3B8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'calendar' && styles.tabLabelActive]}>
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'statistics' && styles.tabItemActive]}
          onPress={() => handleTabChange('statistics')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="bar-chart-outline"
            size={16}
            color={activeTab === 'statistics' ? '#070A11' : '#94A3B8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'statistics' && styles.tabLabelActive]}>
            Statistics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'edit' && styles.tabItemActive]}
          onPress={() => handleTabChange('edit')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={activeTab === 'edit' ? '#070A11' : '#94A3B8'}
          />
          <Text style={[styles.tabLabel, activeTab === 'edit' && styles.tabLabelActive]}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'calendar' && (
          <HabitCalendarView
            completions={completions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onCycleDateStatus={handleCycleDateStatus}
            createdAt={habit.createdAt}
            schedule={habit.schedule}
            restDays={habit.restDays}
          />
        )}

        {activeTab === 'statistics' && (
          <HabitStatisticsView stats={stats} completions={completions} />
        )}

        {activeTab === 'edit' && (
          <HabitEditView
            habit={habit}
            onSave={handleUpdateHabit}
            onDelete={handleDelete}
          />
        )}
      </ScrollView>
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
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerCategory: {
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#00E699',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabLabelActive: {
    color: '#070A11',
    fontWeight: '800',
  },
  scroll: {
    padding: 16,
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
});
