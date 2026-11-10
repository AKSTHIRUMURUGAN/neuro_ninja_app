import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  getHabits,
  toggleHabitToday,
  type HabitItem,
} from '../../services/habits/habit-service';
import { getTodayKey } from '../../services/storage';

export default function HabitsScreen() {
  const router = useRouter();
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const today = getTodayKey();

  useEffect(() => {
    void (async () => {
      const list = await getHabits();
      setHabits(list);
    })();
  }, []);

  const handleToggle = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await toggleHabitToday(id);
    setHabits(updated);
  };

  const completedCount = habits.filter((h) => h.completedDays.includes(today)).length;
  const disciplinePercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.badge}>ROUTINE INTELLIGENCE</Text>
          <Text style={styles.title}>Habit Matrix</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Discipline Score Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{disciplinePercent}%</Text>
            <Text style={styles.scoreLabel}>Discipline</Text>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroTitle}>Today&apos;s Focus Matrix</Text>
            <Text style={styles.heroSub}>
              {completedCount} of {habits.length} daily habits conquered
            </Text>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color="#F59E0B" />
              <Text style={styles.streakText}>5-Day Discipline Streak</Text>
            </View>
          </View>
        </View>

        {/* Daily Habits List */}
        <Text style={styles.sectionHeading}>DAILY DISCIPLINES</Text>
        {habits.map((item) => {
          const isDone = item.completedDays.includes(today);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.habitCard, isDone && styles.habitCardDone]}
              onPress={() => void handleToggle(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                {isDone && <Ionicons name="checkmark" size={18} color="#070A11" />}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.habitTitle, isDone && styles.habitTitleDone]}>
                  {item.title}
                </Text>
                <View style={styles.habitMeta}>
                  <Text style={styles.categoryBadge}>{item.category.toUpperCase()}</Text>
                  <View style={styles.habitStreak}>
                    <Ionicons name="flame" size={12} color="#F59E0B" />
                    <Text style={styles.streakNum}>{item.streak} days</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 20,
  },
  scoreCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#0F291E',
    borderWidth: 3,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00E699',
  },
  scoreLabel: {
    fontSize: 9,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  heroMeta: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
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
    backgroundColor: '#292211',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.5,
    marginTop: 8,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  habitCardDone: {
    borderColor: '#00E699',
    backgroundColor: '#0F291E',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  habitTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  habitTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  habitStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakNum: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
});

