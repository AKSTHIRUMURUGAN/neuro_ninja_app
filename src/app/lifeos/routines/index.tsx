import React, { useState, useCallback } from 'react';
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
import {
  ROUTINE_TEMPLATES,
  createRoutine,
  createRoutineFromTemplate,
  deleteRoutine,
  getActiveRoutineRun,
  getAllRoutines,
  swapRoutineSteps,
  type LinkedStepAction,
  type RoutineCategory,
  type RoutineDefinition,
  type RoutineRunState,
} from '../../../services/routines/routine-engine';
import { useNinja } from '../../../context/ninja-context';

export default function RoutinesScreen() {
  const router = useRouter();
  const { notifyLifeOSChanged } = useNinja();

  const [routines, setRoutines] = useState<RoutineDefinition[]>([]);
  const [activeRun, setActiveRun] = useState<RoutineRunState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState<RoutineCategory>('study');
  const [newTime, setNewTime] = useState('07:30');
  const [draftSteps, setDraftSteps] = useState<
    { title: string; durationSeconds: number; linkedAction?: LinkedStepAction | null }[]
  >([
    { title: 'Engage Shield & clear workspace', durationSeconds: 120, linkedAction: 'activate_profile' },
    { title: 'Deep focus session', durationSeconds: 1500, linkedAction: 'start_focus' },
  ]);
  const [stepTitleInput, setStepTitleInput] = useState('');
  const [stepActionInput, setStepActionInput] = useState<LinkedStepAction | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const [all, run] = await Promise.all([getAllRoutines(), getActiveRoutineRun()]);
      setRoutines(all);
      setActiveRun(run);
    })();
  }, []);

  useFocusEffect(refresh);

  const handleSaveCustomRoutine = async () => {
    if (!newTitle.trim() || draftSteps.length === 0) return;
    await createRoutine({
      title: newTitle.trim(),
      category: newCat,
      scheduleTime: newTime.trim() || undefined,
      steps: draftSteps,
    });
    setCreateOpen(false);
    setNewTitle('');
    notifyLifeOSChanged();
    refresh();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>STEP-BY-STEP RITUALS</Text>
          <Text style={styles.headerTitle}>Routine Engine</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={22} color="#070A11" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeRun && (
          <TouchableOpacity
            style={styles.resumeBanner}
            onPress={() =>
              router.push(`/lifeos/routines/player?routineId=${activeRun.routineId}` as any)
            }
          >
            <Ionicons name="play-circle" size={28} color="#A855F7" />
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeTitle}>Active Routine In Progress</Text>
              <Text style={styles.resumeSub}>
                Status: {activeRun.status.toUpperCase()} · Tap to resume exact step
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>YOUR ROUTINES</Text>
        {routines.map((r) => {
          const totalMin = Math.round(
            r.steps.reduce((acc, s) => acc + s.durationSeconds, 0) / 60
          );
          return (
            <View key={r.routineId} style={styles.routineCard}>
              <View style={styles.routineHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catTag}>{r.category.toUpperCase()}</Text>
                  <Text style={styles.routineTitle}>{r.title}</Text>
                  <Text style={styles.routineMeta}>
                    {r.steps.length} steps · ~{totalMin} min
                    {r.scheduleTime ? ` · Daily ${r.scheduleTime}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={() =>
                    router.push(`/lifeos/routines/player?routineId=${r.routineId}` as any)
                  }
                >
                  <Ionicons name="play" size={16} color="#070A11" />
                  <Text style={styles.startText}>Start</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.stepsList}>
                {r.steps.map((s, idx) => (
                  <View key={s.stepId} style={styles.stepRow}>
                    <Text style={styles.stepIndex}>{idx + 1}.</Text>
                    <Text style={styles.stepTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Text style={styles.stepDur}>{Math.round(s.durationSeconds / 60)}m</Text>
                    {idx > 0 && (
                      <TouchableOpacity
                        onPress={() =>
                          void swapRoutineSteps(
                            r.routineId,
                            s.stepId,
                            r.steps[idx - 1].stepId
                          ).then(refresh)
                        }
                      >
                        <Ionicons name="chevron-up" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.deleteLink}
                onPress={() =>
                  void deleteRoutine(r.routineId).then(() => {
                    notifyLifeOSChanged();
                    refresh();
                  })
                }
              >
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                <Text style={styles.deleteText}>Delete Routine</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={styles.sectionLabel}>TEMPLATES (1-TAP ADD)</Text>
        <View style={{ gap: 10 }}>
          {ROUTINE_TEMPLATES.map((tpl) => (
            <TouchableOpacity
              key={tpl.title}
              style={styles.templateCard}
              onPress={() =>
                void createRoutineFromTemplate(tpl).then(() => {
                  notifyLifeOSChanged();
                  refresh();
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.catTag}>{tpl.category.toUpperCase()}</Text>
                <Text style={styles.templateTitle}>{tpl.title}</Text>
                <Text style={styles.routineMeta}>{tpl.steps.length} guided steps</Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color="#10B981" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={createOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Build Custom Routine</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Routine title..."
              placeholderTextColor="#64748B"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['morning', 'study', 'work', 'exercise', 'evening', 'sleep'] as RoutineCategory[]).map(
                  (c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.catChip, newCat === c && styles.catChipActive]}
                      onPress={() => setNewCat(c)}
                    >
                      <Text style={[styles.catChipText, newCat === c && { color: '#070A11' }]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </ScrollView>
            <TextInput
              style={styles.modalInput}
              value={newTime}
              onChangeText={setNewTime}
              placeholder="Reminder HH:MM (e.g. 07:30)"
              placeholderTextColor="#64748B"
            />
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {(
                [
                  { id: null, label: 'No Link' },
                  { id: 'start_focus', label: 'Start Focus' },
                  { id: 'activate_profile', label: 'Arm Shield' },
                  { id: 'show_task', label: 'Open Tasks' },
                ] as { id: LinkedStepAction | null; label: string }[]
              ).map((act) => (
                <TouchableOpacity
                  key={String(act.id)}
                  style={[styles.catChip, stepActionInput === act.id && styles.catChipActive]}
                  onPress={() => setStepActionInput(act.id)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      stepActionInput === act.id && { color: '#070A11' },
                    ]}
                  >
                    {act.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={stepTitleInput}
                onChangeText={setStepTitleInput}
                placeholder="Add step title..."
                placeholderTextColor="#64748B"
              />
              <TouchableOpacity
                style={styles.addStepBtn}
                onPress={() => {
                  if (!stepTitleInput.trim()) return;
                  setDraftSteps((prev) => [
                    ...prev,
                    {
                      title: stepTitleInput.trim(),
                      durationSeconds: 300,
                      linkedAction: stepActionInput,
                    },
                  ]);
                  setStepTitleInput('');
                  setStepActionInput(null);
                }}
              >
                <Ionicons name="add" size={20} color="#070A11" />
              </TouchableOpacity>
            </View>
            <Text style={styles.routineMeta}>
              Steps queued: {draftSteps.map((s) => s.title).join(' → ')}
            </Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => void handleSaveCustomRoutine()}>
              <Text style={styles.confirmBtnText}>Create Routine</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCreateOpen(false)} style={styles.cancelLink}>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  iconBtn: { padding: 6 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 10, fontWeight: '800', color: '#A855F7', letterSpacing: 1.4 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F8FAFC' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  resumeTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  resumeSub: { color: '#D8B4FE', fontSize: 12 },
  sectionLabel: { color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 6 },
  routineCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  routineHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catTag: { color: '#A855F7', fontSize: 10, fontWeight: '800' },
  routineTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  routineMeta: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  startText: { color: '#070A11', fontWeight: '900', fontSize: 13 },
  stepsList: { gap: 6, backgroundColor: '#162033', borderRadius: 12, padding: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepIndex: { color: '#64748B', fontSize: 12, fontWeight: '800', width: 18 },
  stepTitle: { flex: 1, color: '#E2E8F0', fontSize: 13 },
  stepDur: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  deleteLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  deleteText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  templateTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
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
  modalInput: {
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#162033' },
  catChipActive: { backgroundColor: '#A855F7' },
  catChipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  addStepBtn: {
    width: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: { backgroundColor: '#A855F7', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmBtnText: { color: '#070A11', fontWeight: '900' },
  cancelLink: { alignItems: 'center', paddingVertical: 6 },
  cancelLinkText: { color: '#94A3B8', fontWeight: '700' },
});

