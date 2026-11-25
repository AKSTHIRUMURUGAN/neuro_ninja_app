import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  addTaskReminder,
  assignTaskToMember,
  createTask,
  deleteTaskReminder,
  getSubtasks,
  getTaskAssignments,
  getTaskById,
  getTaskLists,
  getTaskReminders,
  toggleTaskComplete,
  updateTask,
  type LifeOSTask,
  type LifeOSTaskList,
  type TaskPriority,
  type TaskReminderRecord,
} from '../../../services/tasks/task-engine';
import { createCalendarBlock } from '../../../services/calendar/calendar-engine';
import type { RecurrenceRule } from '../../../services/tasks/recurrence-engine';
import { useNinja } from '../../../context/ninja-context';
import VerifierSelectModal from '../../../components/verification/VerifierSelectModal';
import type { VerifierType } from '../../../services/habits/habit-types';
import { dareService, type EntityStakeInfo } from '../../../services/wallet/dare-service';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notifyLifeOSChanged } = useNinja();

  const [task, setTask] = useState<LifeOSTask | null>(null);
  const [lists, setLists] = useState<LifeOSTaskList[]>([]);
  const [subtasks, setSubtasks] = useState<LifeOSTask[]>([]);
  const [reminders, setReminders] = useState<TaskReminderRecord[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [listId, setListId] = useState<string>('list_inbox');
  const [estMinutes, setEstMinutes] = useState<number>(30);
  const [showCountdown, setShowCountdown] = useState(false);
  const [tagsText, setTagsText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [verifierType, setVerifierType] = useState<VerifierType>('self');
  const [verifierId, setVerifierId] = useState<string | null>(null);
  const [verifierEmail, setVerifierEmail] = useState<string | null>(null);
  const [verifierModalOpen, setVerifierModalOpen] = useState(false);
  const [taskStake, setTaskStake] = useState<EntityStakeInfo | null>(null);
  const [selectedTaskStake, setSelectedTaskStake] = useState<number>(0);

  const loadAll = useCallback(() => {
    if (!id) return;
    void (async () => {
      const [loaded, allLists, subs, rems, assignMap] = await Promise.all([
        getTaskById(id),
        getTaskLists(),
        getSubtasks(id),
        getTaskReminders(id),
        getTaskAssignments(),
      ]);
      setLists(allLists);
      setSubtasks(subs);
      setReminders(rems);
      setAssignee(assignMap[id] ?? '');
      if (loaded) {
        setTask(loaded);
        setTitle(loaded.title);
        setDescription(loaded.description ?? '');
        setPriority(loaded.priority);
        setListId(loaded.listId ?? 'list_inbox');
        setEstMinutes(loaded.estimatedMinutes ?? 30);
        setShowCountdown(loaded.showCountdown);
        setTagsText(loaded.tags.join(', '));
        setVerifierType((loaded.verifierType as any) || 'self');
        setVerifierId(loaded.verifierId || null);
        setVerifierEmail(loaded.verifierEmail || null);
      }
      dareService.getTaskStake(id).then((stake) => {
        if (stake && stake.status === 'active') {
          setTaskStake(stake);
          setSelectedTaskStake(stake.stakeRupees);
        }
      });
    })();
  }, [id]);

  const handleSetTaskStake = async (amount: number) => {
    setSelectedTaskStake(amount);
    if (!id) return;
    if (amount === 0) {
      setTaskStake(null);
      return;
    }
    const res = await dareService.stakeTask(id, title || task?.title || 'Task Dare', amount);
    if (res.success && res.stake) {
      setTaskStake(res.stake);
      Alert.alert('Task Stake Active! ⚡', `₹${amount} locked in escrow for "${title || task?.title}". Complete on time!`);
    } else {
      Alert.alert('Error', res.error || 'Failed to lock stake');
    }
  };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSave = async () => {
    if (!id) return;
    const tags = tagsText
      .split(',')
      .map((s) => s.trim().replace(/^#/, ''))
      .filter(Boolean);
    await updateTask(id, {
      title,
      description,
      priority,
      listId,
      estimatedMinutes: estMinutes,
      showCountdown,
      tags,
      verifierType,
      verifierId,
      verifierEmail,
    });
    await assignTaskToMember(id, assignee.trim() || null);
    notifyLifeOSChanged();
    router.back();
  };

  const setDueDaysOffset = async (daysFromNow: number | null) => {
    if (!id) return;
    if (daysFromNow === null) {
      await updateTask(id, { dueAtUtc: null, dueLocal: null });
    } else {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      d.setHours(9, 0, 0, 0);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 09:00`;
      await updateTask(id, { dueAtUtc: d.toISOString(), dueLocal: local });
    }
    loadAll();
  };

  const setRecurrence = async (freq: RecurrenceRule['frequency'] | null) => {
    if (!id) return;
    await updateTask(id, {
      recurrence: freq ? { frequency: freq, interval: 1 } : null,
    });
    loadAll();
  };

  const handleAddSubtask = async () => {
    if (!id || !newSubtaskTitle.trim()) return;
    await createTask({
      title: newSubtaskTitle.trim(),
      parentTaskId: id,
      priority: 'normal',
    });
    setNewSubtaskTitle('');
    loadAll();
  };

  const handleAddReminderOffset = async (minutesFromNow: number) => {
    if (!id) return;
    const triggerDate = new Date();
    triggerDate.setMinutes(triggerDate.getMinutes() + minutesFromNow);
    await addTaskReminder(id, triggerDate);
    loadAll();
  };

  const handleTimeBlockNow = async () => {
    if (!task) return;
    const start = new Date(Date.now() + 5 * 60_000);
    const end = new Date(start.getTime() + estMinutes * 60_000);
    await createCalendarBlock({
      title: title || task.title,
      startDate: start,
      endDate: end,
      taskId: task.taskId,
      source: 'task_link',
    });
    notifyLifeOSChanged();
    Alert.alert('Time-Blocked', `Added ${estMinutes}m block starting shortly on your Calendar.`);
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Detail</Text>
        <TouchableOpacity onPress={() => void handleSave()} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Title & Notes */}
        <View style={styles.card}>
          <Text style={styles.label}>TITLE & NOTES</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Task title..."
            placeholderTextColor="#64748B"
          />
          <TextInput
            style={[styles.input, { minHeight: 74, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Notes, links, syllabus details..."
            placeholderTextColor="#64748B"
            multiline
          />
        </View>

        {/* Priority & Duration */}
        <View style={styles.card}>
          <Text style={styles.label}>PRIORITY & ESTIMATE</Text>
          <View style={styles.chipRow}>
            {(['low', 'normal', 'high', 'urgent'] as TaskPriority[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, priority === p && styles.chipActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chipRow}>
            {[15, 30, 45, 60, 90].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, estMinutes === m && styles.chipActive]}
                onPress={() => setEstMinutes(m)}
              >
                <Text style={[styles.chipText, estMinutes === m && styles.chipTextActive]}>
                  {m}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List, Due Date & Recurrence */}
        <View style={styles.card}>
          <Text style={styles.label}>LIST, SCHEDULE & RECURRENCE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {lists.map((l) => (
                <TouchableOpacity
                  key={l.listId}
                  style={[styles.chip, listId === l.listId && styles.chipActive]}
                  onPress={() => setListId(l.listId)}
                >
                  <Text style={[styles.chipText, listId === l.listId && styles.chipTextActive]}>
                    {l.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.subLabel}>
            Due: {task.dueLocal ?? 'No due date'} ({task.timezoneId ?? 'UTC'}) · Repeat:{' '}
            {task.recurrence?.frequency ?? 'None'}
          </Text>

          <View style={styles.chipRow}>
            <TouchableOpacity style={styles.chip} onPress={() => void setDueDaysOffset(0)}>
              <Text style={styles.chipText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => void setDueDaysOffset(1)}>
              <Text style={styles.chipText}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => void setDueDaysOffset(7)}>
              <Text style={styles.chipText}>+7 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => void setDueDaysOffset(null)}>
              <Text style={styles.chipText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            {([null, 'daily', 'weekly', 'monthly'] as (RecurrenceRule['frequency'] | null)[]).map(
              (freq) => {
                const active = (task.recurrence?.frequency ?? null) === freq;
                return (
                  <TouchableOpacity
                    key={freq ?? 'none'}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => void setRecurrence(freq)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {freq ? `Repeat ${freq}` : 'No Repeat'}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          <TextInput
            style={styles.input}
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="Tags comma-separated (e.g. exam, calculus)"
            placeholderTextColor="#64748B"
          />

          <TextInput
            style={styles.input}
            value={assignee}
            onChangeText={setAssignee}
            placeholder="Assign collaborator (optional, e.g. Alex)"
            placeholderTextColor="#64748B"
          />

          <View style={styles.switchRow}>
            <Text style={styles.rowText}>Pin Countdown on LifeOS Hub</Text>
            <Switch value={showCountdown} onValueChange={setShowCountdown} thumbColor="#10B981" />
          </View>

          {/* Accountability Verifier */}
          <TouchableOpacity
            style={[styles.chip, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginTop: 4 }]}
            onPress={() => setVerifierModalOpen(true)}
          >
            <Ionicons
              name={verifierType === 'self' ? 'shield-outline' : 'people'}
              size={18}
              color={verifierType === 'self' ? '#64748B' : '#00E699'}
            />
            <Text style={[styles.chipText, { flex: 1 }]}>
              Accountability: <Text style={{ color: '#00E699', fontWeight: '800' }}>{verifierType.toUpperCase()}</Text>
              {verifierEmail ? ` (${verifierEmail})` : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Subtasks */}
        <View style={styles.card}>
          <Text style={styles.label}>SUBTASKS ({subtasks.length})</Text>
          {subtasks.map((s) => (
            <TouchableOpacity
              key={s.taskId}
              style={styles.subRow}
              onPress={() => {
                void toggleTaskComplete(s.taskId).then(loadAll);
              }}
            >
              <Ionicons
                name={s.status === 'completed' ? 'checkbox' : 'square-outline'}
                size={18}
                color="#10B981"
              />
              <Text
                style={[
                  styles.rowText,
                  s.status === 'completed' && { textDecorationLine: 'line-through', color: '#64748B' },
                ]}
              >
                {s.title}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add subtask step..."
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity style={styles.smallAddBtn} onPress={() => void handleAddSubtask()}>
              <Ionicons name="add" size={20} color="#070A11" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Multiple Reminders */}
        <View style={styles.card}>
          <Text style={styles.label}>REMINDERS ({reminders.length})</Text>
          {reminders.map((r) => (
            <View key={r.reminderId} style={styles.subRow}>
              <Ionicons name="notifications-outline" size={16} color="#F59E0B" />
              <Text style={[styles.rowText, { flex: 1 }]}>
                {new Date(r.triggerAtUtc).toLocaleString()}
              </Text>
              <TouchableOpacity onPress={() => void deleteTaskReminder(r.reminderId).then(loadAll)}>
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.chipRow}>
            {[
              { label: '+15 min', mins: 15 },
              { label: '+1 hour', mins: 60 },
              { label: '+3 hours', mins: 180 },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.mins}
                style={styles.chip}
                onPress={() => void handleAddReminderOffset(opt.mins)}
              >
                <Text style={styles.chipText}>Remind {opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Real-Money Task Escrow Dare */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flash" size={18} color="#00E699" />
              <Text style={styles.cardLabel}>TASK ESCROW DARE</Text>
            </View>
            {taskStake ? (
              <Text style={{ color: '#00E699', fontWeight: '800', fontSize: 13 }}>₹{taskStake.stakeRupees} LOCKED</Text>
            ) : (
              <Text style={{ color: '#94A3B8', fontSize: 11 }}>No Stake</Text>
            )}
          </View>
          <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 12, lineHeight: 16 }}>
            Put real money on the line! Finish this task on time to reclaim your stake + bonus XP.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 5, 10, 25, 50].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.stakeChip,
                  (taskStake ? taskStake.stakeRupees === amt : selectedTaskStake === amt) && styles.stakeChipSelected,
                ]}
                onPress={() => handleSetTaskStake(amt)}
              >
                <Text
                  style={[
                    styles.stakeChipText,
                    (taskStake ? taskStake.stakeRupees === amt : selectedTaskStake === amt) && styles.stakeChipTextSelected,
                  ]}
                >
                  {amt === 0 ? 'None' : `₹${amt}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            onPress={() =>
              router.push(
                `/focus/pomodoro?minutes=${estMinutes}&label=${encodeURIComponent(title)}` as any
              )
            }
          >
            <Ionicons name="timer-outline" size={18} color="#070A11" />
            <Text style={[styles.actionBtnText, { color: '#070A11' }]}>Start Focus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1E293B', borderColor: '#60A5FA', borderWidth: 1 }]}
            onPress={() => void handleTimeBlockNow()}
          >
            <Ionicons name="calendar-outline" size={18} color="#60A5FA" />
            <Text style={[styles.actionBtnText, { color: '#60A5FA' }]}>Time-Block</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <VerifierSelectModal
        visible={verifierModalOpen}
        currentType={verifierType}
        currentVerifierId={verifierId}
        onClose={() => setVerifierModalOpen(false)}
        onSelect={(type, id, email) => {
          setVerifierType(type);
          setVerifierId(id || null);
          setVerifierEmail(email || null);
        }}
      />
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  iconBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  saveBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: { color: '#070A11', fontWeight: '900' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  label: { color: '#10B981', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  subLabel: { color: '#94A3B8', fontSize: 12 },
  input: {
    backgroundColor: '#162033',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, backgroundColor: '#162033' },
  chipActive: { backgroundColor: '#10B981' },
  chipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#070A11' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  smallAddBtn: {
    width: 42,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: { fontWeight: '900', fontSize: 14 },
  cardLabel: { color: '#00E699', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  stakeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stakeChipSelected: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  stakeChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  stakeChipTextSelected: {
    color: '#00E699',
    fontWeight: '900',
  },
});

