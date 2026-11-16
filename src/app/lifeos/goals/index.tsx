import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { goalService } from '../../../services/goals/goal-service';
import type { GoalItem, GoalCategory, GoalType } from '../../../services/goals/goal-types';

const CATEGORIES: { label: string; value: GoalCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Personal', value: 'personal' },
  { label: 'Career', value: 'career' },
  { label: 'Health', value: 'health' },
  { label: 'Education', value: 'education' },
  { label: 'Financial', value: 'financial' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<GoalCategory | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<GoalType>('short-term');
  const [newCat, setNewCat] = useState<GoalCategory>('personal');
  const [newTargetDays, setNewTargetDays] = useState('30');

  const loadGoals = useCallback(async () => {
    try {
      const data = await goalService.getGoals(
        selectedCat !== 'all' ? { category: selectedCat } : undefined
      );
      setGoals(data);
    } catch (e) {
      console.error('[GoalsScreen] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCat]);

  useEffect(() => {
    let isMounted = true;
    goalService
      .getGoals(selectedCat !== 'all' ? { category: selectedCat } : undefined)
      .then(data => {
        if (isMounted) {
          setGoals(data);
          setLoading(false);
        }
      })
      .catch(e => {
        console.error('[GoalsScreen] load error:', e);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCat]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a goal title.');
      return;
    }

    const days = parseInt(newTargetDays, 10) || 30;
    const targetDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await goalService.createGoal({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      type: newType,
      category: newCat,
      targetDate,
      coinReward: newType === 'long-term' ? 300 : 150,
      xpReward: newType === 'long-term' ? 600 : 300,
    });

    setNewTitle('');
    setNewDesc('');
    setShowCreateModal(false);
    loadGoals();
  };

  const handleStepProgress = async (goal: GoalItem) => {
    if (goal.status === 'completed') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextProgress = Math.min(100, goal.progress + 25);
    await goalService.updateGoalProgress(goal.id, nextProgress);

    if (nextProgress >= 100) {
      Alert.alert(
        '🎯 Goal Accomplished!',
        `Congratulations! You earned +${goal.coinReward} Focus Coins & +${goal.xpReward} Karma XP!`
      );
    }
    loadGoals();
  };

  const completedCount = goals.filter(g => g.status === 'completed').length;
  const overallAvg =
    goals.length > 0
      ? Math.round(goals.reduce((acc, curr) => acc + curr.progress, 0) / goals.length)
      : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goals & Objectives</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#070A11" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Metric Progress Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroBadge}>STRATEGIC OKR</Text>
            <Text style={styles.heroHeadline}>
              {completedCount} of {goals.length} Goals Complete
            </Text>
            <Text style={styles.heroSub}>Average completion momentum at {overallAvg}%</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillVal}>{overallAvg}%</Text>
          </View>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map(cat => {
            const active = selectedCat === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedCat(cat.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Goal Items List */}
        {goals.map(goal => {
          const isDone = goal.status === 'completed';
          return (
            <View key={goal.id} style={[styles.goalCard, isDone && styles.goalCardDone]}>
              <View style={styles.goalTopRow}>
                <View style={styles.catBadge}>
                  <Text style={styles.catText}>{goal.category.toUpperCase()}</Text>
                </View>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardText}>+{goal.coinReward} Coins</Text>
                </View>
              </View>

              <Text style={[styles.goalTitle, isDone && styles.goalTitleDone]}>{goal.title}</Text>
              {goal.description && <Text style={styles.goalDesc}>{goal.description}</Text>}

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>PROGRESS</Text>
                  <Text style={styles.progressVal}>{goal.progress}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${goal.progress}%` }]} />
                </View>
              </View>

              {/* Bottom Target Date & Action */}
              <View style={styles.goalBottomRow}>
                <View style={styles.targetDateBox}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={styles.targetDateText}>
                    Target: {goal.targetDate || 'Continuous'}
                  </Text>
                </View>

                {!isDone ? (
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleStepProgress(goal)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="flash" size={14} color="#070A11" style={{ marginRight: 4 }} />
                    <Text style={styles.stepBtnText}>+25% Step</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#00E699" />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {goals.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <Ionicons name="flag-outline" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No goals found</Text>
            <Text style={styles.emptySub}>Set your first ambitious objective to conquer!</Text>
          </View>
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set New Objective</Text>

            <Text style={styles.inputLabel}>GOAL TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Master Deep Work & Clean Habits"
              placeholderTextColor="#64748B"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="Key results, metric targets, or purpose..."
              placeholderTextColor="#64748B"
              multiline
              value={newDesc}
              onChangeText={setNewDesc}
            />

            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={[styles.pillRow, { flexWrap: 'wrap' }]}>
              {(['personal', 'career', 'health', 'education', 'financial'] as GoalCategory[]).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.smallPill, newCat === cat && styles.smallPillActive, { flex: undefined, minWidth: 70, paddingHorizontal: 10 }]}
                  onPress={() => setNewCat(cat)}
                >
                  <Text style={[styles.pillText, newCat === cat && styles.pillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>TIMEFRAME</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.smallPill, newType === 'short-term' && styles.smallPillActive]}
                    onPress={() => setNewType('short-term')}
                  >
                    <Text style={[styles.pillText, newType === 'short-term' && styles.pillTextActive]}>
                      Short-Term
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallPill, newType === 'long-term' && styles.smallPillActive]}
                    onPress={() => setNewType('long-term')}
                  >
                    <Text style={[styles.pillText, newType === 'long-term' && styles.pillTextActive]}>
                      Long-Term
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ width: 100 }}>
                <Text style={styles.inputLabel}>DAYS TARGET</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  keyboardType="numeric"
                  placeholderTextColor="#64748B"
                  value={newTargetDays}
                  onChangeText={setNewTargetDays}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreateModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
                <Text style={styles.createText}>Create Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  heroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    marginBottom: 20,
  },
  heroLeft: {
    flex: 1,
  },
  heroBadge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroHeadline: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  heroPill: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 2,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  heroPillVal: {
    color: '#00E699',
    fontSize: 16,
    fontWeight: '900',
  },
  filterRow: {
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  goalCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  goalCardDone: {
    borderColor: 'rgba(0, 230, 153, 0.4)',
    opacity: 0.85,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rewardPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rewardText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  goalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  goalTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  goalDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  progressVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#070A11',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E699',
    borderRadius: 4,
  },
  goalBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  targetDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetDateText: {
    color: '#64748B',
    fontSize: 12,
  },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E699',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepBtnText: {
    color: '#070A11',
    fontSize: 12,
    fontWeight: '800',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 17, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 18,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  smallPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#070A11',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  smallPillActive: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  createBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#00E699',
    alignItems: 'center',
  },
  createText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
  },
});
