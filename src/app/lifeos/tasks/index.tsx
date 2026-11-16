import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import {
  createTask,
  createTaskList,
  deleteTask,
  getAllTasks,
  getSharedListConfigs,
  getTaskAssignments,
  getTaskLists,
  getTaskStatsSummary,
  setSharedListConfig,
  toggleTaskComplete,
  updateTask,
  type LifeOSTask,
  type LifeOSTaskList,
  type SharedListConfig,
  type TaskPriority,
  type TaskStatsSummary,
  type TaskStatus,
} from '../../../services/tasks/task-engine';
import { parseTaskNaturalLanguage } from '../../../services/tasks/nlp-parser';
import { useNinja } from '../../../context/ninja-context';

type ViewMode = 'list' | 'kanban' | 'matrix' | 'stats';
type ListFilter = 'inbox' | 'today' | 'upcoming' | 'completed' | string;

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  normal: '#10B981',
  low: '#64748B',
};

export default function TasksScreen() {
  const router = useRouter();
  const { notifyLifeOSChanged } = useNinja();

  const [tasks, setTasks] = useState<LifeOSTask[]>([]);
  const [lists, setLists] = useState<LifeOSTaskList[]>([]);
  const [stats, setStats] = useState<TaskStatsSummary | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [listFilter, setListFilter] = useState<ListFilter>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [applyNlp, setApplyNlp] = useState(true);

  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');

  const [newListModalOpen, setNewListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharedConfigs, setSharedConfigs] = useState<Record<string, SharedListConfig>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [shareMembersInput, setShareMembersInput] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high'>('all');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const refresh = useCallback(() => {
    setNowMs(Date.now());
    void (async () => {
      const [allTasks, allLists, summary, sConfigs, assignMap] = await Promise.all([
        getAllTasks(),
        getTaskLists(),
        getTaskStatsSummary(),
        getSharedListConfigs(),
        getTaskAssignments(),
      ]);
      setTasks(allTasks);
      setLists(allLists);
      setStats(summary);
      setSharedConfigs(sConfigs);
      setAssignments(assignMap);
    })();
  }, []);

  useFocusEffect(refresh);

  const parsedPreview = useMemo(() => {
    if (!quickInput.trim()) return null;
    return parseTaskNaturalLanguage(quickInput);
  }, [quickInput]);

  const handleQuickAdd = async (
    rawText: string = quickInput,
    source: 'manual' | 'voice' = 'manual'
  ) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    const parsed = parseTaskNaturalLanguage(trimmed);
    const useNlp = applyNlp && parsed.hasInterpretation;

    await createTask({
      title: useNlp ? parsed.cleanTitle : trimmed,
      priority: useNlp && parsed.priority ? parsed.priority : 'normal',
      dueAtUtc: useNlp ? parsed.dueAtUtc ?? null : null,
      dueLocal: useNlp ? parsed.dueLocal ?? null : null,
      estimatedMinutes: useNlp ? parsed.estimatedMinutes ?? null : null,
      recurrence: useNlp ? parsed.recurrence ?? null : null,
      tags: useNlp ? parsed.tags : [],
      listId:
        listFilter !== 'inbox' &&
        listFilter !== 'today' &&
        listFilter !== 'upcoming' &&
        listFilter !== 'completed'
          ? listFilter
          : 'list_inbox',
      source: useNlp ? 'nlp' : source,
    });

    setQuickInput('');
    setVoiceDraft('');
    setVoiceModalOpen(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    notifyLifeOSChanged();
    refresh();
  };

  const handleToggleComplete = async (taskId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await toggleTaskComplete(taskId);
    if (res.nextOccurrence) {
      Alert.alert(
        'Recurring Task Scheduled',
        `Next occurrence set for ${res.nextOccurrence.dueLocal ?? 'next cycle'}.`
      );
    }
    notifyLifeOSChanged();
    refresh();
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    notifyLifeOSChanged();
    refresh();
  };

  const handleMoveStatus = async (taskId: string, nextStatus: TaskStatus) => {
    await updateTask(taskId, { status: nextStatus });
    notifyLifeOSChanged();
    refresh();
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await createTaskList(newListName.trim());
    setNewListName('');
    setNewListModalOpen(false);
    refresh();
  };

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

    return tasks.filter((t) => {
      if (
        searchQuery.trim() &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.tags.some((tg) => tg.includes(searchQuery.toLowerCase()))
      ) {
        return false;
      }
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      if (listFilter === 'completed') return t.status === 'completed';
      if (t.status === 'completed' || t.status === 'cancelled') return false;

      if (listFilter === 'inbox') return true;
      if (listFilter === 'today') {
        return Boolean(t.dueAtUtc && new Date(t.dueAtUtc).getTime() <= endOfToday);
      }
      if (listFilter === 'upcoming') {
        return Boolean(t.dueAtUtc && new Date(t.dueAtUtc).getTime() > endOfToday);
      }
      return t.listId === listFilter;
    });
  }, [tasks, searchQuery, listFilter, priorityFilter]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled'),
    [tasks]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>NINJA LIFEOS</Text>
          <Text style={styles.headerTitle}>Tasks & Projects</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              const targetList =
                listFilter !== 'inbox' &&
                listFilter !== 'today' &&
                listFilter !== 'upcoming' &&
                listFilter !== 'completed'
                  ? listFilter
                  : 'list_study';
              const cur = sharedConfigs[targetList];
              setShareMembersInput(cur ? cur.authorizedMembers.join(', ') : '');
              setShareModalOpen(true);
            }}
            style={styles.iconPill}
          >
            <Ionicons name="people-outline" size={18} color="#A855F7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setVoiceModalOpen(true)} style={styles.iconPill}>
            <Ionicons name="mic-outline" size={18} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNewListModalOpen(true)} style={styles.iconPill}>
            <Ionicons name="folder-open-outline" size={18} color="#60A5FA" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Capture Bar */}
      <View style={styles.quickCaptureBox}>
        <View style={styles.quickInputRow}>
          <TextInput
            style={styles.quickInput}
            value={quickInput}
            onChangeText={setQuickInput}
            placeholder='Add task (e.g. "Revise calculus tomorrow 4pm high #exam")'
            placeholderTextColor="#64748B"
            onSubmitEditing={() => void handleQuickAdd()}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.addCircle}
            onPress={() => void handleQuickAdd()}
            disabled={!quickInput.trim()}
          >
            <Ionicons name="add" size={22} color="#070A11" />
          </TouchableOpacity>
        </View>

        {/* Explicit NLP Interpretation Preview & Confirmation */}
        {parsedPreview && parsedPreview.hasInterpretation && (
          <View style={styles.nlpBar}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.nlpHeader}>
                NLP Preview ({parsedPreview.confidence} confidence):
              </Text>
              <Text style={styles.nlpDetails}>
                Title: &quot;{parsedPreview.cleanTitle}&quot;
                {parsedPreview.dueDateLabel ? ` · 📅 ${parsedPreview.dueDateLabel}` : ''}
                {parsedPreview.priority ? ` · ⚡ ${parsedPreview.priority.toUpperCase()}` : ''}
                {parsedPreview.estimatedMinutes ? ` · ⏱ ${parsedPreview.estimatedMinutes}m` : ''}
                {parsedPreview.recurrence ? ` · 🔁 ${parsedPreview.recurrence.frequency}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.nlpToggle, applyNlp && styles.nlpToggleActive]}
              onPress={() => setApplyNlp((v) => !v)}
            >
              <Text style={[styles.nlpToggleText, applyNlp && { color: '#070A11' }]}>
                {applyNlp ? 'Confirm NLP' : 'Raw Text'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* View Switcher */}
      <View style={styles.viewTabs}>
        {(
          [
            { id: 'list', label: 'List', icon: 'format-list-bulleted' },
            { id: 'kanban', label: 'Kanban', icon: 'view-column-outline' },
            { id: 'matrix', label: 'Matrix', icon: 'grid' },
            { id: 'stats', label: 'Stats', icon: 'chart-box-outline' },
          ] as const
        ).map((tab) => {
          const active = viewMode === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.viewTab, active && styles.viewTabActive]}
              onPress={() => setViewMode(tab.id)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={15}
                color={active ? '#070A11' : '#94A3B8'}
              />
              <Text style={[styles.viewTabText, active && styles.viewTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {viewMode === 'list' && (
        <>
          <TextInput
            style={styles.searchBar}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks or #tags..."
            placeholderTextColor="#64748B"
          />
          <View style={styles.priorityFilterRow}>
            {(['all', 'urgent', 'high'] as const).map((pf) => (
              <TouchableOpacity
                key={pf}
                style={[styles.filterChip, priorityFilter === pf && styles.filterChipActive]}
                onPress={() => setPriorityFilter(pf)}
              >
                <Text style={[styles.filterText, priorityFilter === pf && styles.filterTextActive]}>
                  {pf === 'all' ? 'All Priorities' : pf.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterStrip}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {[
              { id: 'inbox', label: 'All Active' },
              { id: 'today', label: 'Today' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Completed' },
              ...lists.map((l) => ({ id: l.listId, label: l.title })),
            ].map((f) => {
              const active = listFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setListFilter(f.id)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.listScroll}>
            {filteredTasks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-done-circle-outline" size={44} color="#334155" />
                <Text style={styles.emptyTitle}>Nothing in this view</Text>
                <Text style={styles.emptySub}>Use Quick Capture above to add tasks.</Text>
              </View>
            ) : (
              filteredTasks.map((t) => {
                const isOverdue = Boolean(
                  t.dueAtUtc &&
                    t.status !== 'completed' &&
                    new Date(t.dueAtUtc).getTime() < nowMs
                );
                return (
                  <View key={t.taskId} style={styles.taskCard}>
                    <TouchableOpacity
                      style={[
                        styles.checkBox,
                        { borderColor: PRIORITY_COLORS[t.priority] },
                        t.status === 'completed' && styles.checkBoxDone,
                      ]}
                      onPress={() => void handleToggleComplete(t.taskId)}
                    >
                      {t.status === 'completed' && (
                        <Ionicons name="checkmark" size={16} color="#070A11" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => router.push(`/lifeos/tasks/detail?id=${t.taskId}` as any)}
                    >
                      <Text
                        style={[
                          styles.taskTitle,
                          t.status === 'completed' && styles.taskTitleDone,
                        ]}
                      >
                        {t.title}
                      </Text>
                      <View style={styles.metaRow}>
                        {t.dueLocal && (
                          <Text style={[styles.metaTag, isOverdue && { color: '#EF4444' }]}>
                            {isOverdue ? 'Overdue · ' : ''}
                            {t.dueLocal}
                          </Text>
                        )}
                        {t.estimatedMinutes ? (
                          <Text style={styles.metaTag}>{t.estimatedMinutes}m</Text>
                        ) : null}
                        {t.recurrence && (
                          <Text style={[styles.metaTag, { color: '#818CF8' }]}>
                            🔁 {t.recurrence.frequency}
                          </Text>
                        )}
                        {(t.subtaskCount ?? 0) > 0 && (
                          <Text style={styles.metaTag}>
                            Subtasks {t.subtasksDone}/{t.subtaskCount}
                          </Text>
                        )}
                        {t.tags.map((tg) => (
                          <Text key={tg} style={[styles.metaTag, { color: '#06B6D4' }]}>
                            #{tg}
                          </Text>
                        ))}
                        {assignments[t.taskId] && (
                          <Text style={[styles.metaTag, { color: '#A855F7' }]}>
                            @{assignments[t.taskId]}
                          </Text>
                        )}
                        {t.verifierType && t.verifierType !== 'self' && (
                          <View style={styles.verifierTag}>
                            <Ionicons name="people" size={10} color="#00E699" />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#00E699' }}>
                              {t.verifierType.toUpperCase()}
                              {t.verificationStatus === 'pending' ? ' (PENDING)' : t.verificationStatus === 'verified' ? ' (VERIFIED)' : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.taskActions}>
                      {t.status !== 'completed' && (
                        <TouchableOpacity
                          style={styles.focusMiniBtn}
                          onPress={() =>
                            router.push(
                              `/focus/pomodoro?minutes=${t.estimatedMinutes || 25}&label=${encodeURIComponent(t.title)}` as any
                            )
                          }
                        >
                          <Ionicons name="timer-outline" size={16} color="#10B981" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.deleteMiniBtn}
                        onPress={() => void handleDelete(t.taskId)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {viewMode === 'kanban' && (
        <ScrollView horizontal contentContainerStyle={styles.kanbanContainer}>
          {(['inbox', 'planned', 'in_progress', 'completed'] as TaskStatus[]).map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            const nextMap: Record<TaskStatus, TaskStatus> = {
              inbox: 'planned',
              planned: 'in_progress',
              in_progress: 'completed',
              completed: 'inbox',
              cancelled: 'inbox',
            };
            return (
              <View key={col} style={styles.kanbanCol}>
                <Text style={styles.kanbanColTitle}>
                  {col.replace('_', ' ').toUpperCase()} ({colTasks.length})
                </Text>
                <ScrollView contentContainerStyle={{ gap: 8 }}>
                  {colTasks.map((t) => (
                    <View key={t.taskId} style={styles.kanbanCard}>
                      <TouchableOpacity
                        onPress={() => router.push(`/lifeos/tasks/detail?id=${t.taskId}` as any)}
                      >
                        <Text style={styles.kanbanTitle}>{t.title}</Text>
                        <Text style={{ color: PRIORITY_COLORS[t.priority], fontSize: 10, fontWeight: '800', marginTop: 4 }}>
                          {t.priority.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.kanbanMoveBtn}
                        onPress={() => void handleMoveStatus(t.taskId, nextMap[col])}
                      >
                        <Text style={styles.kanbanMoveText}>
                          Move → {nextMap[col].replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      {viewMode === 'matrix' && (
        <ScrollView contentContainerStyle={styles.matrixGrid}>
          {[
            {
              title: 'Q1: Urgent & Important',
              color: '#EF4444',
              targetPriority: 'urgent' as TaskPriority,
              items: activeTasks.filter((t) => t.priority === 'urgent'),
            },
            {
              title: 'Q2: Important (Schedule)',
              color: '#F59E0B',
              targetPriority: 'high' as TaskPriority,
              items: activeTasks.filter((t) => t.priority === 'high'),
            },
            {
              title: 'Q3: Normal / Delegate',
              color: '#10B981',
              targetPriority: 'normal' as TaskPriority,
              items: activeTasks.filter((t) => t.priority === 'normal'),
            },
            {
              title: 'Q4: Low / Defer',
              color: '#64748B',
              targetPriority: 'low' as TaskPriority,
              items: activeTasks.filter((t) => t.priority === 'low'),
            },
          ].map((quad) => (
            <View key={quad.title} style={[styles.quadCard, { borderColor: quad.color }]}>
              <Text style={[styles.quadTitle, { color: quad.color }]}>
                {quad.title} ({quad.items.length})
              </Text>
              {quad.items.length === 0 ? (
                <Text style={styles.emptySub}>Empty quadrant</Text>
              ) : (
                quad.items.map((t) => (
                  <View key={t.taskId} style={styles.quadItem}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
                      onPress={() => void handleToggleComplete(t.taskId)}
                      onLongPress={() => router.push(`/lifeos/tasks/detail?id=${t.taskId}` as any)}
                    >
                      <Ionicons name="ellipse-outline" size={14} color={quad.color} />
                      <Text style={styles.quadItemText} numberOfLines={1}>
                        {t.title}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const order: TaskPriority[] = ['urgent', 'high', 'normal', 'low'];
                        const nextP = order[(order.indexOf(t.priority) + 1) % order.length];
                        void updateTask(t.taskId, { priority: nextP }).then(refresh);
                      }}
                    >
                      <Ionicons name="swap-vertical-outline" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {viewMode === 'stats' && stats && (
        <ScrollView contentContainerStyle={styles.statsScroll}>
          <View style={styles.statsHero}>
            <Text style={styles.statsRate}>{stats.completionRatePercent}%</Text>
            <Text style={styles.statsSub}>Overall Task Completion Rate</Text>
          </View>
          <View style={styles.statsGrid}>
            {[
              { label: 'Active Backlog', val: stats.totalActive, color: '#60A5FA' },
              { label: 'Done Today', val: stats.completedToday, color: '#10B981' },
              { label: 'Done 7 Days', val: stats.completedThisWeek, color: '#818CF8' },
              { label: 'Overdue', val: stats.overdueCount, color: '#EF4444' },
            ].map((c) => (
              <View key={c.label} style={styles.statTile}>
                <Text style={[styles.statTileVal, { color: c.color }]}>{c.val}</Text>
                <Text style={styles.statTileLbl}>{c.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.statsHero}>
            <Text style={[styles.statsSub, { marginBottom: 10, fontWeight: '800', color: '#F8FAFC' }]}>
              7-DAY COMPLETION TREND
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, width: '100%', justifyContent: 'space-around' }}>
              {stats.dailyCompletedCounts.map((pt, idx) => {
                const maxCnt = Math.max(1, ...stats.dailyCompletedCounts.map((x) => x.count));
                const h = Math.max(6, Math.round((pt.count / maxCnt) * 60));
                return (
                  <View key={`${pt.label}_${idx}`} style={{ alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 10 }}>{pt.count}</Text>
                    <View style={{ width: 16, height: h, borderRadius: 6, backgroundColor: '#10B981' }} />
                    <Text style={{ color: '#64748B', fontSize: 10 }}>{pt.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Voice Quick-Capture Modal */}
      <Modal visible={voiceModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Voice Task Capture</Text>
            <Text style={styles.modalSub}>
              Explicit microphone consent required. Dictated text is parsed by NLP locally; zero audio is recorded or retained.
            </Text>
            {!voiceConsent ? (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  setVoiceConsent(true);
                  Speech.speak('Ready for task dictation. Use your keyboard mic or type below.', {
                    rate: 1.0,
                  });
                }}
              >
                <Text style={styles.confirmBtnText}>Grant Dictation Consent</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  value={voiceDraft}
                  onChangeText={setVoiceDraft}
                  placeholder="Tap keyboard microphone to dictate task..."
                  placeholderTextColor="#64748B"
                  multiline
                />
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => void handleQuickAdd(voiceDraft, 'voice')}
                >
                  <Text style={styles.confirmBtnText}>Parse & Save Task</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setVoiceModalOpen(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New List Modal */}
      <Modal visible={newListModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Project / List</Text>
            <TextInput
              style={styles.modalInput}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="e.g. Exam Prep, Errands..."
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={() => void handleCreateList()}>
              <Text style={styles.confirmBtnText}>Create List</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setNewListModalOpen(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shared List Authorization Modal (FR-208) */}
      <Modal visible={shareModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Shared List & Collaboration</Text>
            <Text style={styles.modalSub}>
              Authorize members (e.g. Parent, Study Partner) to collaborate on this list. Open any task detail to assign owners.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={shareMembersInput}
              onChangeText={setShareMembersInput}
              placeholder="Comma-separated names (e.g. Alex, Sensei)"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                const targetList =
                  listFilter !== 'inbox' &&
                  listFilter !== 'today' &&
                  listFilter !== 'upcoming' &&
                  listFilter !== 'completed'
                    ? listFilter
                    : 'list_study';
                const members = shareMembersInput
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                void setSharedListConfig(targetList, {
                  isShared: members.length > 0,
                  authorizedMembers: members,
                  ownerRole: 'owner',
                }).then(() => {
                  setShareModalOpen(false);
                  refresh();
                });
              }}
            >
              <Text style={styles.confirmBtnText}>Save Collaboration Access</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShareModalOpen(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070A11' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  iconBtn: { padding: 6 },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 10, fontWeight: '800', color: '#10B981', letterSpacing: 1.4 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F8FAFC' },
  quickCaptureBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  quickInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  quickInput: {
    flex: 1,
    backgroundColor: '#0F1829',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#1E293B',
    fontSize: 14,
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nlpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 12,
    padding: 10,
  },
  nlpHeader: { color: '#10B981', fontSize: 11, fontWeight: '800' },
  nlpDetails: { color: '#E2E8F0', fontSize: 11 },
  nlpToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  nlpToggleActive: { backgroundColor: '#10B981' },
  nlpToggleText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  viewTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F1829',
  },
  viewTabActive: { backgroundColor: '#10B981' },
  viewTabText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  viewTabTextActive: { color: '#070A11' },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#0F1829',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  priorityFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterStrip: { maxHeight: 40, marginBottom: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterChipActive: { backgroundColor: '#1E293B', borderColor: '#10B981' },
  filterText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#10B981' },
  listScroll: { padding: 16, gap: 10, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { color: '#94A3B8', fontSize: 16, fontWeight: '800' },
  emptySub: { color: '#64748B', fontSize: 12 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  taskTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#64748B' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaTag: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  verifierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskActions: { flexDirection: 'row', gap: 6 },
  focusMiniBtn: { padding: 6, borderRadius: 8, backgroundColor: '#0F291E' },
  deleteMiniBtn: { padding: 6, borderRadius: 8, backgroundColor: '#162033' },
  kanbanContainer: { padding: 16, gap: 12 },
  kanbanCol: {
    width: 240,
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  kanbanColTitle: { color: '#10B981', fontSize: 11, fontWeight: '800', marginBottom: 10 },
  kanbanCard: {
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  kanbanTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  kanbanMoveBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  kanbanMoveText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  matrixGrid: { padding: 16, gap: 12 },
  quadCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  quadTitle: { fontSize: 13, fontWeight: '900' },
  quadItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  quadItemText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', flex: 1 },
  statsScroll: { padding: 16, gap: 14 },
  statsHero: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statsRate: { fontSize: 42, fontWeight: '900', color: '#10B981' },
  statsSub: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  statTile: {
    width: '48%',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statTileVal: { fontSize: 28, fontWeight: '900' },
  statTileLbl: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
  },
  modalTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900' },
  modalSub: { color: '#94A3B8', fontSize: 12, lineHeight: 17 },
  modalInput: {
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 46,
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#070A11', fontWeight: '900', fontSize: 14 },
  cancelLink: { alignItems: 'center', paddingVertical: 6 },
  cancelLinkText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
});

