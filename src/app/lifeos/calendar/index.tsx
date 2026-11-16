import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import {
  connectReadOnlyExternalCalendar,
  createCalendarBlock,
  deleteCalendarBlock,
  detectConflicts,
  disconnectExternalCalendar,
  exportBlockToExternalCalendar,
  generatePlanMyDayProposals,
  getBlocksForDay,
  getBlocksInRange,
  getExternalCalendarState,
  updateCalendarBlockTime,
  type CalendarBlock,
  type ExternalCalendarState,
  type ProposedScheduleBlock,
} from '../../../services/calendar/calendar-engine';
import { getLocalTimezoneId } from '../../../services/database/database';
import { getAllTasks, updateTask, type LifeOSTask } from '../../../services/tasks/task-engine';
import { useNinja } from '../../../context/ninja-context';

type CalendarView = 'day' | 'week' | 'month' | 'agenda';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00..23:00

export default function CalendarScreen() {
  const router = useRouter();
  const { notifyLifeOSChanged } = useNinja();

  const [view, setView] = useState<CalendarView>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [dayBlocks, setDayBlocks] = useState<CalendarBlock[]>([]);
  const [rangeBlocks, setRangeBlocks] = useState<CalendarBlock[]>([]);
  const [extState, setExtState] = useState<ExternalCalendarState | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [blockTitle, setBlockTitle] = useState('');
  const [startHour, setStartHour] = useState(9);
  const [durationMin, setDurationMin] = useState(60);
  const [conflictWarning, setConflictWarning] = useState<CalendarBlock[]>([]);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [proposals, setProposals] = useState<ProposedScheduleBlock[]>([]);

  const [eodOpen, setEodOpen] = useState(false);
  const [eodTasks, setEodTasks] = useState<{ done: LifeOSTask[]; pending: LifeOSTask[] }>({
    done: [],
    pending: [],
  });

  const refresh = useCallback(() => {
    void (async () => {
      const startMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 7);
      const [dBlocks, rBlocks, ext] = await Promise.all([
        getBlocksForDay(selectedDate),
        getBlocksInRange(startMonth.toISOString(), endMonth.toISOString()),
        getExternalCalendarState(),
      ]);
      setDayBlocks(dBlocks);
      setRangeBlocks(rBlocks);
      setExtState(ext);
    })();
  }, [selectedDate]);

  useFocusEffect(refresh);

  const shiftDay = (deltaDays: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + deltaDays);
    setSelectedDate(next);
  };

  const openCreatorAtHour = async (hour: number) => {
    setStartHour(hour);
    setBlockTitle('');
    setDurationMin(60);
    const s = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, 0, 0);
    const e = new Date(s.getTime() + 60 * 60_000);
    const conflicts = await detectConflicts(s.toISOString(), e.toISOString());
    setConflictWarning(conflicts);
    setCreateOpen(true);
  };

  const checkDraftConflicts = async (hour: number, dur: number) => {
    setStartHour(hour);
    setDurationMin(dur);
    const s = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, 0, 0);
    const e = new Date(s.getTime() + dur * 60_000);
    const conflicts = await detectConflicts(s.toISOString(), e.toISOString());
    setConflictWarning(conflicts);
  };

  const handleCreateBlock = async () => {
    if (!blockTitle.trim()) return;
    const s = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      startHour,
      0,
      0
    );
    const e = new Date(s.getTime() + durationMin * 60_000);
    await createCalendarBlock({
      title: blockTitle.trim(),
      startDate: s,
      endDate: e,
      source: 'manual',
    });
    setCreateOpen(false);
    notifyLifeOSChanged();
    refresh();
  };

  const handleOpenPlanMyDay = async () => {
    const drafts = await generatePlanMyDayProposals(selectedDate);
    setProposals(drafts);
    setPlanModalOpen(true);
  };

  const handleApproveProposal = async (prop: ProposedScheduleBlock) => {
    await createCalendarBlock({
      title: prop.title,
      taskId: prop.taskId,
      startDate: new Date(prop.startAtUtc),
      endDate: new Date(prop.endAtUtc),
      color: '#818CF8',
      source: 'ai_approved',
    });
    setProposals((prev) => prev.filter((p) => p.proposalId !== prop.proposalId));
    notifyLifeOSChanged();
    refresh();
  };

  const handleConnectExternal = async () => {
    if (extState?.connected) {
      await disconnectExternalCalendar();
      Alert.alert('Disconnected', 'External read-only calendar events cleared.');
      refresh();
      return;
    }
    Alert.alert(
      'Read-Only Calendar Access',
      'NeuroNinja requests read-only calendar access to show existing events and detect schedule conflicts. External events are never edited automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect Read-Only',
          onPress: () => {
            void connectReadOnlyExternalCalendar().then(({ state, importedCount }) => {
              if (!state.readGranted) {
                Alert.alert('Permission Denied', 'OS Calendar permission was not granted.');
              } else {
                Alert.alert('Synced', `Imported ${importedCount} read-only external events.`);
              }
              refresh();
            });
          },
        },
      ]
    );
  };

  const handleOpenEodReview = async () => {
    const all = await getAllTasks();
    const todayStart = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ).getTime();
    const done = all.filter(
      (t) => t.status === 'completed' && t.completedAt && new Date(t.completedAt).getTime() >= todayStart
    );
    const pending = all.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    setEodTasks({ done, pending });
    setEodOpen(true);
  };

  const deferPendingToTomorrow = async () => {
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const local = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')} 09:00`;

    for (const t of eodTasks.pending.slice(0, 10)) {
      await updateTask(t.taskId, {
        dueAtUtc: tomorrow.toISOString(),
        dueLocal: local,
        status: 'planned',
      });
    }
    setEodOpen(false);
    notifyLifeOSChanged();
    Alert.alert('Carried Over', 'Pending tasks rescheduled for tomorrow at 09:00.');
  };

  const weekDays = useMemo(() => {
    const base = new Date(selectedDate);
    const dow = base.getDay();
    base.setDate(base.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const monthCells = useMemo(() => {
    const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const offset = first.getDay();
    const cells: (number | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [selectedDate]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>TIME BLOCKING · {getLocalTimezoneId()}</Text>
          <Text style={styles.headerTitle}>
            {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={styles.iconPill} onPress={() => void handleConnectExternal()}>
            <Ionicons
              name={extState?.connected ? 'cloud-done-outline' : 'cloud-outline'}
              size={18}
              color={extState?.connected ? '#10B981' : '#94A3B8'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconPill} onPress={() => void openCreatorAtHour(9)}>
            <Ionicons name="add" size={20} color="#10B981" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Navigation + Plan My Day + EOD Review */}
      <View style={styles.actionStrip}>
        <TouchableOpacity onPress={() => shiftDay(-1)} style={styles.navArrow}>
          <Ionicons name="chevron-back" size={16} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.todayChip}>
          <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => shiftDay(1)} style={styles.navArrow}>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.aiPlanBtn} onPress={() => void handleOpenPlanMyDay()}>
          <Ionicons name="sparkles-outline" size={14} color="#070A11" />
          <Text style={styles.aiPlanText}>Plan My Day</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.eodBtn} onPress={() => void handleOpenEodReview()}>
          <Text style={styles.eodText}>EOD Review</Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.viewTabs}>
        {(['day', 'week', 'month', 'agenda'] as CalendarView[]).map((v) => {
          const active = view === v;
          return (
            <TouchableOpacity
              key={v}
              style={[styles.viewTab, active && styles.viewTabActive]}
              onPress={() => setView(v)}
            >
              <Text style={[styles.viewTabText, active && styles.viewTabTextActive]}>
                {v.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {view === 'day' && (
        <ScrollView contentContainerStyle={styles.timelineScroll}>
          {HOURS.map((hr) => {
            const hourBlocks = dayBlocks.filter(
              (b) => new Date(b.startAtUtc).getHours() === hr
            );
            return (
              <View key={hr} style={styles.hourRow}>
                <TouchableOpacity onPress={() => void openCreatorAtHour(hr)} style={styles.hourLabelBox}>
                  <Text style={styles.hourLabel}>{String(hr).padStart(2, '0')}:00</Text>
                </TouchableOpacity>
                <View style={styles.hourSlot}>
                  {hourBlocks.length === 0 ? (
                    <TouchableOpacity
                      style={styles.emptySlotTap}
                      onPress={() => void openCreatorAtHour(hr)}
                    />
                  ) : (
                    hourBlocks.map((b) => {
                      const s = new Date(b.startAtUtc);
                      const e = new Date(b.endAtUtc);
                      const mins = Math.round((e.getTime() - s.getTime()) / 60_000);
                      const isExternal = b.source === 'external_readonly';
                      return (
                        <View
                          key={b.blockId}
                          style={[styles.blockCard, { borderLeftColor: b.color }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.blockTitle}>{b.title}</Text>
                            <Text style={styles.blockMeta}>
                              {s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                              {e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({mins}m)
                              {isExternal ? ' · External (Read-Only)' : ''}
                            </Text>
                          </View>
                          {!isExternal && (
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                              <TouchableOpacity
                                style={styles.shiftBtn}
                                onPress={() =>
                                  router.push(
                                    `/focus/pomodoro?minutes=${Math.max(5, mins)}&label=${encodeURIComponent(b.title)}` as any
                                  )
                                }
                              >
                                <Ionicons name="timer-outline" size={14} color="#10B981" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.shiftBtn}
                                onPress={() => {
                                  Alert.alert(
                                    'Export to Device Calendar?',
                                    `Grant write access and export "${b.title}" to your OS calendar?`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                        text: 'Export',
                                        onPress: () =>
                                          void exportBlockToExternalCalendar(b).then((r) =>
                                            Alert.alert('Calendar Export', r.message)
                                          ),
                                      },
                                    ]
                                  );
                                }}
                              >
                                <Ionicons name="share-outline" size={14} color="#60A5FA" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.shiftBtn}
                                onPress={() => {
                                  const ns = new Date(s.getTime() + 30 * 60_000);
                                  const ne = new Date(e.getTime() + 30 * 60_000);
                                  void updateCalendarBlockTime(b.blockId, ns, ne).then(refresh);
                                }}
                              >
                                <Text style={styles.shiftText}>+30m</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() =>
                                  void deleteCalendarBlock(b.blockId).then(() => {
                                    notifyLifeOSChanged();
                                    refresh();
                                  })
                                }
                              >
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {view === 'week' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {weekDays.map((d) => {
            const dStr = d.toDateString();
            const blocks = rangeBlocks.filter(
              (b) => new Date(b.startAtUtc).toDateString() === dStr
            );
            const isSelected = dStr === selectedDate.toDateString();
            return (
              <TouchableOpacity
                key={dStr}
                style={[styles.weekCard, isSelected && { borderColor: '#10B981' }]}
                onPress={() => {
                  setSelectedDate(d);
                  setView('day');
                }}
              >
                <View style={styles.weekHeader}>
                  <Text style={styles.weekDayText}>
                    {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.weekCount}>{blocks.length} blocks</Text>
                </View>
                {blocks.slice(0, 3).map((b) => (
                  <Text key={b.blockId} style={styles.weekBlockLine} numberOfLines={1}>
                    • {new Date(b.startAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {b.title}
                  </Text>
                ))}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {view === 'month' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.monthGrid}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((lbl) => (
              <Text key={lbl} style={styles.monthDow}>
                {lbl}
              </Text>
            ))}
            {monthCells.map((dayNum, idx) => {
              if (!dayNum) return <View key={`empty_${idx}`} style={styles.monthCell} />;
              const cellDate = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                dayNum
              );
              const count = rangeBlocks.filter(
                (b) => new Date(b.startAtUtc).toDateString() === cellDate.toDateString()
              ).length;
              const isSelected = dayNum === selectedDate.getDate();
              return (
                <TouchableOpacity
                  key={dayNum}
                  style={[styles.monthCell, isSelected && styles.monthCellActive]}
                  onPress={() => {
                    setSelectedDate(cellDate);
                    setView('day');
                  }}
                >
                  <Text style={[styles.monthNum, isSelected && { color: '#070A11' }]}>{dayNum}</Text>
                  {count > 0 && <View style={styles.monthDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {view === 'agenda' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {rangeBlocks.length === 0 ? (
            <Text style={styles.emptyText}>No scheduled blocks this month yet.</Text>
          ) : (
            rangeBlocks.map((b) => (
              <View key={b.blockId} style={styles.agendaRow}>
                <View style={[styles.agendaBar, { backgroundColor: b.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.blockTitle}>{b.title}</Text>
                  <Text style={styles.blockMeta}>
                    {new Date(b.startAtUtc).toLocaleDateString()} ·{' '}
                    {new Date(b.startAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create Time Block Modal with Conflict Warning */}
      <Modal visible={createOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Create Time Block</Text>
            <TextInput
              style={styles.modalInput}
              value={blockTitle}
              onChangeText={setBlockTitle}
              placeholder="Block title (e.g. Organic Chemistry)"
              placeholderTextColor="#64748B"
            />
            <Text style={styles.modalSub}>Start Hour: {String(startHour).padStart(2, '0')}:00</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[startHour - 1, startHour, startHour + 1].map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.smallChip, startHour === h && styles.smallChipActive]}
                  onPress={() => void checkDraftConflicts(Math.max(0, Math.min(23, h)), durationMin)}
                >
                  <Text style={styles.smallChipText}>{String(Math.max(0, h)).padStart(2, '0')}:00</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[30, 60, 90, 120].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.smallChip, durationMin === d && styles.smallChipActive]}
                  onPress={() => void checkDraftConflicts(startHour, d)}
                >
                  <Text style={styles.smallChipText}>{d}m</Text>
                </TouchableOpacity>
              ))}
            </View>
            {conflictWarning.length > 0 && (
              <View style={styles.conflictBanner}>
                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                <Text style={styles.conflictText}>
                  Overlaps with: {conflictWarning.map((c) => c.title).join(', ')}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.confirmBtn} onPress={() => void handleCreateBlock()}>
              <Text style={styles.confirmBtnText}>Save Time Block</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCreateOpen(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Plan My Day Review Modal (Explicit Approval Required) */}
      <Modal visible={planModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Proposed Daily Schedule</Text>
            <Text style={styles.modalSub}>
              Review suggested time blocks for unscheduled tasks. Nothing is added until you approve each block.
            </Text>
            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8 }}>
              {proposals.length === 0 ? (
                <Text style={styles.emptyText}>No unscheduled tasks fit today&apos;s remaining open slots.</Text>
              ) : (
                proposals.map((p) => (
                  <View key={p.proposalId} style={styles.proposalCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.blockTitle}>{p.title}</Text>
                      <Text style={styles.blockMeta}>
                        {new Date(p.startAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(p.endAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {p.rationale}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.approveMini}
                      onPress={() => void handleApproveProposal(p)}
                    >
                      <Text style={styles.approveMiniText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setPlanModalOpen(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* End-of-Day Review Modal */}
      <Modal visible={eodOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>End-of-Day Review</Text>
            <Text style={styles.modalSub}>
              Completed today: {eodTasks.done.length} · Carrying over: {eodTasks.pending.length}
            </Text>
            {eodTasks.pending.length > 0 && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => void deferPendingToTomorrow()}
              >
                <Text style={styles.confirmBtnText}>Carry Over Pending to Tomorrow</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setEodOpen(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Close</Text>
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
  kicker: { fontSize: 10, fontWeight: '800', color: '#60A5FA', letterSpacing: 1.4 },
  headerTitle: { fontSize: 19, fontWeight: '900', color: '#F8FAFC' },
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  navArrow: { padding: 6, backgroundColor: '#0F1829', borderRadius: 8 },
  todayChip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0F1829', borderRadius: 8 },
  todayText: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  aiPlanBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  aiPlanText: { color: '#070A11', fontSize: 11, fontWeight: '900' },
  eodBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  eodText: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
  viewTabs: { flexDirection: 'row', gap: 6, padding: 14 },
  viewTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0F1829',
    alignItems: 'center',
  },
  viewTabActive: { backgroundColor: '#60A5FA' },
  viewTabText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  viewTabTextActive: { color: '#070A11' },
  timelineScroll: { paddingHorizontal: 14, paddingBottom: 40 },
  hourRow: { flexDirection: 'row', minHeight: 54, borderBottomWidth: 1, borderBottomColor: '#0F1829' },
  hourLabelBox: { width: 52, paddingTop: 6 },
  hourLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  hourSlot: { flex: 1, paddingVertical: 4, gap: 6 },
  emptySlotTap: { flex: 1, minHeight: 40 },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 4,
  },
  blockTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '800' },
  blockMeta: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  shiftBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1E293B',
    borderRadius: 6,
  },
  shiftText: { color: '#60A5FA', fontSize: 10, fontWeight: '800' },
  weekCard: {
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDayText: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  weekCount: { color: '#60A5FA', fontSize: 12, fontWeight: '700' },
  weekBlockLine: { color: '#94A3B8', fontSize: 12 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDow: {
    width: '14.28%',
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  monthCell: {
    width: '14.28%',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  monthCellActive: { backgroundColor: '#10B981' },
  monthNum: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  monthDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#60A5FA', marginTop: 2 },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F1829',
    borderRadius: 12,
    padding: 12,
  },
  agendaBar: { width: 4, height: 32, borderRadius: 2 },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 24, fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  modalTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900' },
  modalSub: { color: '#94A3B8', fontSize: 12 },
  modalInput: {
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
  },
  smallChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#162033', borderRadius: 10 },
  smallChipActive: { backgroundColor: '#60A5FA' },
  smallChipText: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    padding: 10,
    borderRadius: 10,
  },
  conflictText: { flex: 1, color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#070A11', fontWeight: '900' },
  cancelLink: { alignItems: 'center', paddingVertical: 6 },
  cancelLinkText: { color: '#94A3B8', fontWeight: '700' },
  proposalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 10,
  },
  approveMini: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveMiniText: { color: '#070A11', fontSize: 11, fontWeight: '900' },
});

