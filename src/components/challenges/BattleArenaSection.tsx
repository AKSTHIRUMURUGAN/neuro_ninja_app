import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getBattleArenas,
  createBattleArena,
  joinArena,
} from '../../services/challenges/battle-arena-service';
import type {
  BattleArena,
  ArenaTask,
  ArenaHabit,
} from '../../services/challenges/battle-arena-types';
import { useNinjaAlert } from '../../context/ninja-alert-context';

type ArenaSubTab = 'active' | 'invited' | 'pending' | 'completed' | 'lobby';

export default function BattleArenaSection() {
  const { showToast } = useNinjaAlert();
  const [subTab, setSubTab] = useState<ArenaSubTab>('completed');
  const [arenas, setArenas] = useState<BattleArena[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedArena, setSelectedArena] = useState<BattleArena | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7);
  const [stakeAmount, setStakeAmount] = useState(10);
  const [taskInput, setTaskInput] = useState('');
  const [habitInput, setHabitInput] = useState('');
  const [stagedTasks, setStagedTasks] = useState<ArenaTask[]>([]);
  const [stagedHabits, setStagedHabits] = useState<ArenaHabit[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');

  const refreshArenas = async () => {
    setIsLoading(true);
    const list = await getBattleArenas();
    setArenas(list);
    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    void getBattleArenas().then((list) => {
      if (isMounted) {
        setArenas(list);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredArenas = arenas.filter((a) => {
    if (subTab === 'lobby') return a.status === 'pending' || !a.isCreator;
    return a.status === subTab;
  });

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    setStagedTasks((prev) => [
      ...prev,
      { id: `t_${Date.now()}`, title: taskInput.trim(), points: 15, completed: false },
    ]);
    setTaskInput('');
  };

  const handleAddHabit = () => {
    if (!habitInput.trim()) return;
    setStagedHabits((prev) => [
      ...prev,
      {
        id: `h_${Date.now()}`,
        title: habitInput.trim(),
        points: 10,
        frequency: 'daily',
        targetDays: duration,
        completedDays: 0,
      },
    ]);
    setHabitInput('');
  };

  const handleCreateSubmit = async () => {
    if (!title.trim()) {
      showToast({
        title: 'Title Required',
        message: 'Please provide a title for the arena.',
        type: 'warning',
        icon: 'alert-outline',
      });
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newArena = await createBattleArena({
      title: title.trim(),
      description: description.trim(),
      type: 'collection',
      duration,
      stakeAmount,
      visibility: 'public',
      tasks: stagedTasks.length > 0 ? stagedTasks : [{ id: 't_def', title: 'Daily Deep Focus Sprint', points: 20 }],
      habits: stagedHabits.length > 0 ? stagedHabits : [{ id: 'h_def', title: 'Zero Doomscroll Day', points: 15, frequency: 'daily', targetDays: duration }],
      participantEmails: inviteEmail ? [inviteEmail.trim()] : undefined,
    });

    setIsCreateOpen(false);
    setTitle('');
    setDescription('');
    setStagedTasks([]);
    setStagedHabits([]);
    setInviteEmail('');
    await refreshArenas();
    setSubTab('active');

    showToast({
      title: '⚔️ Arena Launched!',
      message: `"${newArena.title}" is live. Stake locked in escrow.`,
      type: 'success',
      icon: 'sword-cross',
    });
  };

  const handleJoinLobbyArena = async (arena: BattleArena) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await joinArena(arena.id);
    await refreshArenas();
    showToast({
      title: 'Joined Arena!',
      message: `You are now competing in ${arena.title}!`,
      type: 'success',
      icon: 'check',
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Banner Matching Web */}
      <View style={styles.webHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="sword-cross" size={20} color="#00E699" />
            <Text style={styles.sectionTitle}>Battle Arenas</Text>
          </View>
          <Text style={styles.sectionSub}>
            Compete with friends, stake coins/INR, and conquer challenges together
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createArenaBtn}
          onPress={() => setIsCreateOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#070A11" />
          <Text style={styles.createArenaBtnText}>Create Arena</Text>
        </TouchableOpacity>
      </View>

      {/* 5 Sub-Tabs Mirroring Web: Active | Invited | Pending | Completed | Arena Lobby */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subTabsScroll}
      >
        {(
          [
            { id: 'active', label: 'Active' },
            { id: 'invited', label: 'Invited ✉️' },
            { id: 'pending', label: 'Pending' },
            { id: 'completed', label: 'Completed' },
            { id: 'lobby', label: 'Arena Lobby ⚔️' },
          ] as { id: ArenaSubTab; label: string }[]
        ).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.subTabPill, subTab === t.id && styles.subTabPillActive]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSubTab(t.id);
            }}
          >
            <Text
              style={[
                styles.subTabPillText,
                subTab === t.id && styles.subTabPillTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Arena Cards List */}
      {isLoading ? (
        <ActivityIndicator size="small" color="#00E699" style={{ marginVertical: 20 }} />
      ) : filteredArenas.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="trophy-outline" size={32} color="#64748B" />
          <Text style={styles.emptyText}>No arenas found in {subTab}</Text>
        </View>
      ) : (
        <View style={styles.cardList}>
          {filteredArenas.map((arena) => (
            <View key={arena.id} style={styles.arenaCard}>
              <View style={styles.cardTopHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="trophy-outline" size={18} color="#00E699" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.cardTitle}>{arena.title}</Text>
                    <Text style={styles.cardDesc}>{arena.description}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    arena.status === 'completed'
                      ? styles.statusCompleted
                      : arena.status === 'active'
                      ? styles.statusActive
                      : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      arena.status === 'completed'
                        ? { color: '#00E699' }
                        : arena.status === 'active'
                        ? { color: '#38BDF8' }
                        : { color: '#F59E0B' },
                    ]}
                  >
                    {arena.status}
                  </Text>
                </View>
              </View>

              {/* Arena Meta Info Bar Matching Web */}
              <View style={styles.metaBar}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="sword-cross" size={14} color="#818CF8" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    Epic Battle Arena (Custom Tasks & Habits)
                  </Text>
                </View>

                <View style={styles.metaRowSecondary}>
                  <View style={styles.metaPill}>
                    <Ionicons name="time-outline" size={13} color="#00E699" />
                    <Text style={styles.metaPillText}>{arena.duration} days</Text>
                  </View>

                  <View style={styles.metaPill}>
                    <Ionicons name="people-outline" size={13} color="#818CF8" />
                    <Text style={styles.metaPillText}>
                      {arena.participants.length} participants
                    </Text>
                  </View>

                  <View style={styles.metaPill}>
                    <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                    <Text style={styles.metaPillText}>
                      {arena.status === 'completed' ? 'Completed' : arena.status === 'active' ? 'Active' : 'Pending'}
                    </Text>
                  </View>

                  {arena.stakeAmount > 0 && (
                    <View style={styles.metaPill}>
                      <Ionicons name="cash-outline" size={13} color="#F59E0B" />
                      <Text style={styles.metaPillText}>₹{arena.stakeAmount}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActionRow}>
                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() => setSelectedArena(arena)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewDetailsBtnText}>View Details</Text>
                </TouchableOpacity>

                {subTab === 'lobby' && (
                  <TouchableOpacity
                    style={styles.joinLobbyBtn}
                    onPress={() => void handleJoinLobbyArena(arena)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.joinLobbyBtnText}>Join Arena ⚔️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Arena Details Modal */}
      <Modal visible={selectedArena !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedArena?.title}</Text>
                <Text style={styles.modalSub}>{selectedArena?.description}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedArena(null)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14 }}>
              {/* Leaderboard */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>ARENA LEADERBOARD</Text>
                {selectedArena?.participants.map((p, idx) => (
                  <View key={p.userId} style={styles.participantRow}>
                    <Text style={styles.rankNum}>#{idx + 1}</Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.pName}>{p.name}</Text>
                      <Text style={styles.pSub}>Score: {p.score} pts · Status: {p.status}</Text>
                    </View>
                    <View style={styles.pBadge}>
                      <Text style={styles.pBadgeText}>Lvl {p.level || 13}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Tasks Checklist */}
              {selectedArena?.tasks && selectedArena.tasks.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>ARENA TASKS</Text>
                  {selectedArena.tasks.map((t) => (
                    <View key={t.id} style={styles.taskItem}>
                      <Ionicons
                        name={t.completed ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={t.completed ? '#00E699' : '#64748B'}
                      />
                      <Text style={[styles.taskItemText, t.completed && { textDecorationLine: 'line-through', color: '#64748B' }]}>
                        {t.title} (+{t.points} pts)
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Habits Checklist */}
              {selectedArena?.habits && selectedArena.habits.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>ARENA HABITS</Text>
                  {selectedArena.habits.map((h) => (
                    <View key={h.id} style={styles.taskItem}>
                      <MaterialCommunityIcons name="fire" size={18} color="#F59E0B" />
                      <Text style={styles.taskItemText}>
                        {h.title} ({h.completedDays || 0}/{h.targetDays || 7} days) · +{h.points} pts
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Arena Modal */}
      <Modal visible={isCreateOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Create Battle Arena</Text>
                <Text style={styles.modalSub}>Stake coins/INR with friends on habits & tasks</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <View>
                <Text style={styles.inputLabel}>Arena Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 7-Day IIT JEE Deep Work Grind"
                  placeholderTextColor="#64748B"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Rules, goals, and consequences..."
                  placeholderTextColor="#64748B"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Duration (Days)</Text>
                  <View style={styles.pillRow}>
                    {[3, 7, 14, 30].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.smallPill, duration === d && styles.smallPillActive]}
                        onPress={() => setDuration(d)}
                      >
                        <Text style={[styles.smallPillText, duration === d && styles.smallPillTextActive]}>{d}d</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Stake Amount (₹)</Text>
                  <View style={styles.pillRow}>
                    {[10, 25, 50, 100].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.smallPill, stakeAmount === amt && styles.smallPillActive]}
                        onPress={() => setStakeAmount(amt)}
                      >
                        <Text style={[styles.smallPillText, stakeAmount === amt && styles.smallPillTextActive]}>₹{amt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Task staking input */}
              <View>
                <Text style={styles.inputLabel}>Add Arena Tasks</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="Task: e.g. Solve 25 Physics MCQs"
                    placeholderTextColor="#64748B"
                    value={taskInput}
                    onChangeText={setTaskInput}
                  />
                  <TouchableOpacity style={styles.addMiniBtn} onPress={handleAddTask}>
                    <Text style={styles.addMiniBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {stagedTasks.map((t) => (
                  <Text key={t.id} style={styles.stagedItem}>✓ {t.title} (+{t.points} pts)</Text>
                ))}
              </View>

              {/* Habit staking input */}
              <View>
                <Text style={styles.inputLabel}>Add Arena Habits</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="Habit: e.g. Morning 5:30 AM Wakeup"
                    placeholderTextColor="#64748B"
                    value={habitInput}
                    onChangeText={setHabitInput}
                  />
                  <TouchableOpacity style={styles.addMiniBtn} onPress={handleAddHabit}>
                    <Text style={styles.addMiniBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {stagedHabits.map((h) => (
                  <Text key={h.id} style={styles.stagedItem}>🔥 {h.title} (Daily)</Text>
                ))}
              </View>

              <View>
                <Text style={styles.inputLabel}>Invite Friend (Email / User)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="friend@example.com"
                  placeholderTextColor="#64748B"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                />
              </View>

              <TouchableOpacity
                style={styles.launchBtn}
                onPress={() => void handleCreateSubmit()}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="sword-cross" size={18} color="#070A11" />
                <Text style={styles.launchBtnText}>Lock Stake & Launch Arena</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  webHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sectionSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  createArenaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E699',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    marginLeft: 8,
  },
  createArenaBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#070A11',
  },
  subTabsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  subTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  subTabPillActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  subTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabPillTextActive: {
    color: '#00E699',
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  cardList: {
    gap: 12,
  },
  arenaCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  cardTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  cardDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  statusActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  metaBar: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  metaRowSecondary: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  viewDetailsBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  joinLobbyBtn: {
    flex: 1,
    backgroundColor: '#00E699',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  joinLobbyBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#070A11',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A101D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  detailSection: {
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00E699',
    width: 24,
  },
  pName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  pSub: {
    fontSize: 11,
    color: '#64748B',
  },
  pBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818CF8',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  taskItemText: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0F1829',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 13,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  smallPillActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  smallPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  smallPillTextActive: {
    color: '#00E699',
    fontWeight: '800',
  },
  addMiniBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMiniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E699',
  },
  stagedItem: {
    fontSize: 11,
    color: '#00E699',
    marginTop: 4,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    marginTop: 8,
  },
  launchBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
});
