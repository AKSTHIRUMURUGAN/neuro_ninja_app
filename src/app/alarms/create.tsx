import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ALARM_SOUNDS,
  addOrUpdateAlarm,
  canScheduleExactAlarms,
  getAlarmById,
  openExactAlarmSettings,
  previewSound,
  stopPreviewSound,
  type AlarmMissionConfig,
  type MissionType,
} from '../../services/alarms/alarm-engine';
import { getAllRoutines, type RoutineDefinition } from '../../services/routines/routine-engine';
import { getHabits, type HabitItemV2 } from '../../services/habits/habit-service';
import { MathMission } from '../../components/alarms/math-mission';
import { MemoryMission } from '../../components/alarms/memory-mission';
import { TypingMission } from '../../components/alarms/typing-mission';
import { ShakeMission } from '../../components/alarms/shake-mission';
import { MovementMission } from '../../components/alarms/movement-mission';
import { QRMission } from '../../components/alarms/qr-mission';
import { PhotoMission } from '../../components/alarms/photo-mission';
import { useNinja } from '../../context/ninja-context';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MISSION_CATALOG: {
  type: MissionType;
  title: string;
  desc: string;
  requirement: string;
  icon: string;
  color: string;
}[] = [
  {
    type: 'math',
    title: 'Math Sprint',
    desc: 'Solve arithmetic equations to activate prefrontal cortex',
    requirement: 'No sensor needed',
    icon: 'calculator-outline',
    color: '#00E699',
  },
  {
    type: 'memory',
    title: 'Memory Pattern',
    desc: 'Reproduce glowing tile sequences accurately',
    requirement: 'No sensor needed',
    icon: 'grid-outline',
    color: '#818CF8',
  },
  {
    type: 'typing',
    title: 'Mindful Typing',
    desc: 'Type an intentional morning affirmation phrase',
    requirement: 'Keyboard input',
    icon: 'create-outline',
    color: '#06B6D4',
  },
  {
    type: 'shake',
    title: 'Kinetic Shake',
    desc: 'Vigorously shake phone with calibrated motion counter',
    requirement: 'Accelerometer + tap fallback',
    icon: 'barbell-outline',
    color: '#F59E0B',
  },
  {
    type: 'movement',
    title: 'Walk Steps',
    desc: 'Take physical steps out of bed to confirm alertness',
    requirement: 'Motion step sensor + fallback',
    icon: 'walk-outline',
    color: '#10B981',
  },
  {
    type: 'qr',
    title: 'QR / Barcode Scan',
    desc: 'Scan a registered bathroom/kitchen code to dismiss',
    requirement: 'Camera permission',
    icon: 'qr-code-outline',
    color: '#EC4899',
  },
  {
    type: 'photo',
    title: 'Location Photo',
    desc: 'Snap your pre-selected room spot (on-device only)',
    requirement: 'Camera permission (local only)',
    icon: 'camera-outline',
    color: '#38BDF8',
  },
];

export default function CreateAlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { notifyLifeOSChanged } = useNinja();

  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(30);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [label, setLabel] = useState('Morning Ninja Mission');
  const [soundId, setSoundId] = useState<string>('zen_bell');
  const [vibrate, setVibrate] = useState(true);
  const [mission, setMission] = useState<MissionType>('math');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [config, setConfig] = useState<AlarmMissionConfig>({
    questionCount: 3,
    memoryLength: 4,
    memoryMode: 'sequence',
    typingPhrase: 'Discipline creates freedom',
    targetShakes: 20,
    shakeSensitivity: 'medium',
    targetSteps: 15,
  });
  const [snoozeLimit, setSnoozeLimit] = useState(3);
  const [snoozeInterval, setSnoozeInterval] = useState(5);
  const [wakeCheckEnabled, setWakeCheckEnabled] = useState(true);
  const [wakeCheckDelay, setWakeCheckDelay] = useState(3);
  const [linkedRoutineId, setLinkedRoutineId] = useState<string | null>(null);
  const [linkedHabitId, setLinkedHabitId] = useState<string | null>(null);
  const [routines, setRoutines] = useState<RoutineDefinition[]>([]);
  const [habits, setHabits] = useState<HabitItemV2[]>([]);
  const [exactOk, setExactOk] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    void canScheduleExactAlarms().then(setExactOk);
    void getAllRoutines().then(setRoutines);
    void getHabits().then(setHabits);
    if (params.id) {
      void getAlarmById(params.id).then((existing) => {
        if (!existing) return;
        const [h, m] = existing.time.split(':').map(Number);
        setHour(h);
        setMinute(m);
        setDays(existing.days);
        setLabel(existing.label);
        setSoundId(existing.soundId);
        setVibrate(existing.vibrate);
        setMission(existing.mission);
        setDifficulty(existing.difficulty);
        setConfig((prev) => ({ ...prev, ...existing.missionConfig }));
        setSnoozeLimit(existing.snoozeLimit);
        setSnoozeInterval(existing.snoozeIntervalMinutes);
        setWakeCheckEnabled(existing.wakeCheckEnabled);
        setWakeCheckDelay(existing.wakeCheckDelayMinutes || 3);
        setLinkedRoutineId(existing.linkedRoutineId ?? null);
        setLinkedHabitId(existing.linkedHabitId ?? null);
      });
    }
    return () => stopPreviewSound();
  }, [params.id]);

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const handleSave = async () => {
    stopPreviewSound();
    const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    await addOrUpdateAlarm({
      id: params.id,
      label: label.trim() || 'Ninja Alarm',
      time: hhmm,
      days,
      isEnabled: true,
      mission,
      missionConfig: { ...config, difficulty },
      difficulty,
      soundId,
      vibrate,
      snoozeLimit,
      snoozeIntervalMinutes: snoozeInterval,
      wakeCheckEnabled,
      wakeCheckDelayMinutes: wakeCheckDelay,
      linkedRoutineId,
      linkedHabitId,
    });
    notifyLifeOSChanged();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{params.id ? 'Edit Alarm' : 'New Mission Alarm'}</Text>
        <TouchableOpacity onPress={() => void handleSave()} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Step 1: Time & Repeat */}
        <View style={styles.card}>
          <Text style={styles.stepTag}>1. TIME & REPEAT SCHEDULE</Text>
          <View style={styles.timePickerRow}>
            <View style={styles.timeCol}>
              <TouchableOpacity onPress={() => setHour((h) => (h + 1) % 24)} style={styles.stepArrow}>
                <Ionicons name="chevron-up" size={22} color="#10B981" />
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{String(hour).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => setHour((h) => (h + 23) % 24)} style={styles.stepArrow}>
                <Ionicons name="chevron-down" size={22} color="#10B981" />
              </TouchableOpacity>
            </View>
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.timeCol}>
              <TouchableOpacity onPress={() => setMinute((m) => (m + 5) % 60)} style={styles.stepArrow}>
                <Ionicons name="chevron-up" size={22} color="#10B981" />
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{String(minute).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => setMinute((m) => (m + 55) % 60)} style={styles.stepArrow}>
                <Ionicons name="chevron-down" size={22} color="#10B981" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.daysRow}>
            {DAY_LABELS.map((dLabel, idx) => {
              const active = days.includes(idx);
              return (
                <TouchableOpacity
                  key={dLabel}
                  onPress={() => toggleDay(idx)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                    {dLabel[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2: Label & Sound */}
        <View style={styles.card}>
          <Text style={styles.stepTag}>2. LABEL & AUDIO STREAM</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Alarm label..."
            placeholderTextColor="#64748B"
          />
          <View style={styles.soundGrid}>
            {ALARM_SOUNDS.map((s) => {
              const active = soundId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.soundChip, active && styles.soundChipActive]}
                  onPress={() => {
                    setSoundId(s.id);
                    void previewSound(s.id, false);
                  }}
                >
                  <Ionicons name="volume-high-outline" size={14} color={active ? '#070A11' : '#94A3B8'} />
                  <Text style={[styles.soundText, active && styles.soundTextActive]}>{s.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.rowLabel}>Vibration Pattern</Text>
            <Switch value={vibrate} onValueChange={setVibrate} thumbColor="#10B981" />
          </View>
        </View>

        {/* Step 3: Mission Selection */}
        <View style={styles.card}>
          <Text style={styles.stepTag}>3. SELECT WAKE-UP MISSION</Text>
          <View style={{ gap: 8 }}>
            {MISSION_CATALOG.map((m) => {
              const selected = mission === m.type;
              return (
                <TouchableOpacity
                  key={m.type}
                  style={[styles.missionCard, selected && { borderColor: m.color, backgroundColor: '#131F36' }]}
                  onPress={() => setMission(m.type)}
                >
                  <Ionicons name={m.icon as any} size={22} color={m.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missionTitle}>{m.title}</Text>
                    <Text style={styles.missionDesc}>{m.desc}</Text>
                    <Text style={[styles.reqTag, { color: m.color }]}>{m.requirement}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={m.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 4: Mission Configuration & Live Preview */}
        <View style={styles.card}>
          <Text style={styles.stepTag}>4. CONFIGURE & TEST MISSION</Text>

          {mission === 'math' && (
            <View style={{ gap: 10 }}>
              <View style={styles.rowChips}>
                {(['easy', 'medium', 'hard'] as const).map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.optionPill, difficulty === lvl && styles.optionPillActive]}
                    onPress={() => setDifficulty(lvl)}
                  >
                    <Text style={[styles.optionPillText, difficulty === lvl && styles.optionPillTextActive]}>
                      {lvl.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rowChips}>
                {[1, 3, 5].map((cnt) => (
                  <TouchableOpacity
                    key={cnt}
                    style={[styles.optionPill, config.questionCount === cnt && styles.optionPillActive]}
                    onPress={() => setConfig((c) => ({ ...c, questionCount: cnt }))}
                  >
                    <Text style={[styles.optionPillText, config.questionCount === cnt && styles.optionPillTextActive]}>
                      {cnt} {cnt === 1 ? 'Question' : 'Questions'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {mission === 'memory' && (
            <View style={{ gap: 10 }}>
              <View style={styles.rowChips}>
                {(['sequence', 'numbers'] as const).map((mMode) => (
                  <TouchableOpacity
                    key={mMode}
                    style={[styles.optionPill, config.memoryMode === mMode && styles.optionPillActive]}
                    onPress={() => setConfig((c) => ({ ...c, memoryMode: mMode }))}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        config.memoryMode === mMode && styles.optionPillTextActive,
                      ]}
                    >
                      {mMode === 'numbers' ? 'Number Order 1-9' : 'Pattern Sequence'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {config.memoryMode !== 'numbers' && (
                <View style={styles.rowChips}>
                  {[3, 4, 6].map((len) => (
                    <TouchableOpacity
                      key={len}
                      style={[styles.optionPill, config.memoryLength === len && styles.optionPillActive]}
                      onPress={() => setConfig((c) => ({ ...c, memoryLength: len }))}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          config.memoryLength === len && styles.optionPillTextActive,
                        ]}
                      >
                        {len}-Tile Sequence
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {mission === 'typing' && (
            <TextInput
              style={styles.input}
              value={config.typingPhrase}
              onChangeText={(txt) => setConfig((c) => ({ ...c, typingPhrase: txt }))}
              placeholder="Phrase to type when waking up..."
              placeholderTextColor="#64748B"
            />
          )}

          {mission === 'shake' && (
            <View style={{ gap: 10 }}>
              <View style={styles.rowChips}>
                {[10, 20, 35].map((cnt) => (
                  <TouchableOpacity
                    key={cnt}
                    style={[styles.optionPill, config.targetShakes === cnt && styles.optionPillActive]}
                    onPress={() => setConfig((c) => ({ ...c, targetShakes: cnt }))}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        config.targetShakes === cnt && styles.optionPillTextActive,
                      ]}
                    >
                      {cnt} Shakes
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rowChips}>
                {(['low', 'medium', 'high'] as const).map((sens) => (
                  <TouchableOpacity
                    key={sens}
                    style={[styles.optionPill, config.shakeSensitivity === sens && styles.optionPillActive]}
                    onPress={() => setConfig((c) => ({ ...c, shakeSensitivity: sens }))}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        config.shakeSensitivity === sens && styles.optionPillTextActive,
                      ]}
                    >
                      Calibrate: {sens.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {mission === 'movement' && (
            <View style={styles.rowChips}>
              {[10, 20, 40].map((steps) => (
                <TouchableOpacity
                  key={steps}
                  style={[styles.optionPill, config.targetSteps === steps && styles.optionPillActive]}
                  onPress={() => setConfig((c) => ({ ...c, targetSteps: steps }))}
                >
                  <Text style={[styles.optionPillText, config.targetSteps === steps && styles.optionPillTextActive]}>
                    {steps} Steps
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {mission === 'qr' && (
            <Text style={styles.infoNote}>
              {config.qrHash
                ? `Registered QR/Barcode: "${config.qrLabel}"`
                : 'Tap "Test / Setup Mission" below to scan & register a household QR or barcode.'}
            </Text>
          )}

          {mission === 'photo' && (
            <Text style={styles.infoNote}>
              {config.photoSignature
                ? `Reference room photo saved (${config.photoLocationLabel ?? 'Wake spot'}).`
                : 'Tap "Test / Setup Mission" below to capture your local reference spot photo.'}
            </Text>
          )}

          <TouchableOpacity style={styles.previewBtn} onPress={() => setPreviewModalOpen(true)}>
            <Ionicons name="play-circle-outline" size={18} color="#070A11" />
            <Text style={styles.previewBtnText}>
              {mission === 'qr' || mission === 'photo' ? 'Test / Register Station' : 'Preview Mission Live'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 5: Snooze, Wake-up Check & Routine/Habit Link */}
        <View style={styles.card}>
          <Text style={styles.stepTag}>5. SNOOZE, WAKE-UP CHECK & LINKS</Text>
          <View style={styles.rowChips}>
            {[0, 1, 3].map((lim) => (
              <TouchableOpacity
                key={lim}
                style={[styles.optionPill, snoozeLimit === lim && styles.optionPillActive]}
                onPress={() => setSnoozeLimit(lim)}
              >
                <Text style={[styles.optionPillText, snoozeLimit === lim && styles.optionPillTextActive]}>
                  {lim === 0 ? 'No Snooze' : `Max ${lim} Snoozes`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {snoozeLimit > 0 && (
            <View style={styles.rowChips}>
              {[5, 10, 15].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[styles.optionPill, snoozeInterval === mins && styles.optionPillActive]}
                  onPress={() => setSnoozeInterval(mins)}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      snoozeInterval === mins && styles.optionPillTextActive,
                    ]}
                  >
                    Snooze {mins}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Wake-Up Check (+{wakeCheckDelay}m after dismiss)</Text>
              <Text style={styles.infoNote}>Gentle check-in notification to verify you stayed awake.</Text>
            </View>
            <Switch value={wakeCheckEnabled} onValueChange={setWakeCheckEnabled} thumbColor="#10B981" />
          </View>

          {wakeCheckEnabled && (
            <View style={styles.rowChips}>
              {[1, 3, 5, 10].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.optionPill, wakeCheckDelay === d && styles.optionPillActive]}
                  onPress={() => setWakeCheckDelay(d)}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      wakeCheckDelay === d && styles.optionPillTextActive,
                    ]}
                  >
                    Check +{d}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {routines.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.infoNote}>Auto-suggest routine on dismiss:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.optionPill, !linkedRoutineId && styles.optionPillActive]}
                    onPress={() => setLinkedRoutineId(null)}
                  >
                    <Text style={[styles.optionPillText, !linkedRoutineId && styles.optionPillTextActive]}>
                      None
                    </Text>
                  </TouchableOpacity>
                  {routines.map((r) => (
                    <TouchableOpacity
                      key={r.routineId}
                      style={[styles.optionPill, linkedRoutineId === r.routineId && styles.optionPillActive]}
                      onPress={() => setLinkedRoutineId(r.routineId)}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          linkedRoutineId === r.routineId && styles.optionPillTextActive,
                        ]}
                      >
                        {r.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {habits.length > 0 && (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.infoNote}>Auto check-in habit on dismiss:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.optionPill, !linkedHabitId && styles.optionPillActive]}
                    onPress={() => setLinkedHabitId(null)}
                  >
                    <Text style={[styles.optionPillText, !linkedHabitId && styles.optionPillTextActive]}>
                      None
                    </Text>
                  </TouchableOpacity>
                  {habits.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      style={[styles.optionPill, linkedHabitId === h.id && styles.optionPillActive]}
                      onPress={() => setLinkedHabitId(h.id)}
                    >
                      <Text
                        style={[
                          styles.optionPillText,
                          linkedHabitId === h.id && styles.optionPillTextActive,
                        ]}
                      >
                        {h.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Step 6 & 7: Emergency Fallback & Permission Check */}
        <View style={styles.card}>
          <Text style={styles.stepTag}>6 & 7. SAFETY & EXACT ALARM STATUS</Text>
          <Text style={styles.infoNote}>
            Every NeuroNinja alarm includes a 3-second Emergency Dismiss fallback so you can always silence an alarm if a sensor fails or in emergencies.
          </Text>
          <View style={styles.permBanner}>
            <Ionicons
              name={exactOk ? 'shield-checkmark' : 'warning-outline'}
              size={18}
              color={exactOk ? '#10B981' : '#F59E0B'}
            />
            <Text style={styles.permText}>
              {exactOk
                ? 'Exact Alarm Clock Permission: Active (Boot & Doze resilient)'
                : 'Exact Alarm permission restricted — tap to grant exact alarm timing.'}
            </Text>
            {!exactOk && (
              <TouchableOpacity onPress={openExactAlarmSettings}>
                <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 12 }}>Grant</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Live Mission Preview Modal */}
      <Modal visible={previewModalOpen} animationType="slide" onRequestClose={() => setPreviewModalOpen(false)}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPreviewModalOpen(false)} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mission Preview</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            {mission === 'math' && (
              <MathMission
                difficulty={difficulty}
                questionCount={config.questionCount}
                onCompleted={() => {
                  setPreviewModalOpen(false);
                  Alert.alert('Preview Passed', 'Math Sprint is calibrated and ready.');
                }}
              />
            )}
            {mission === 'memory' && (
              <MemoryMission
                sequenceLength={config.memoryLength}
                mode={config.memoryMode}
                onCompleted={() => {
                  setPreviewModalOpen(false);
                  Alert.alert('Preview Passed', 'Memory challenge verified.');
                }}
              />
            )}
            {mission === 'typing' && (
              <TypingMission
                phrase={config.typingPhrase}
                onCompleted={() => {
                  setPreviewModalOpen(false);
                  Alert.alert('Preview Passed', 'Typing Commitment verified.');
                }}
              />
            )}
            {mission === 'shake' && (
              <ShakeMission
                targetShakes={config.targetShakes}
                sensitivity={config.shakeSensitivity}
                onCompleted={() => {
                  setPreviewModalOpen(false);
                  Alert.alert('Preview Passed', 'Kinetic Shake sensor verified.');
                }}
              />
            )}
            {mission === 'movement' && (
              <MovementMission
                targetSteps={config.targetSteps}
                onCompleted={() => {
                  setPreviewModalOpen(false);
                  Alert.alert('Preview Passed', 'Movement counter verified.');
                }}
              />
            )}
            {mission === 'qr' && (
              <QRMission
                mode="setup"
                onCodeRegistered={(hash, rawLabel) => {
                  setConfig((c) => ({ ...c, qrHash: hash, qrLabel: rawLabel }));
                }}
                onCompleted={() => {
                  setPreviewModalOpen(false);
                  Alert.alert('QR Station Registered', 'Salted hash stored locally.');
                }}
              />
            )}
            {mission === 'photo' && (
              <PhotoMission
                mode="setup"
                onPhotoRegistered={(uri, locLabel) => {
                  setConfig((c) => ({ ...c, photoSignature: uri, photoLocationLabel: locLabel }));
                }}
                onCompleted={() => {
                  setPreviewModalOpen(false);
                  Alert.alert('Spot Registered', 'Reference photo stored locally.');
                }}
              />
            )}
          </View>
        </SafeAreaView>
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  saveBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: { color: '#070A11', fontWeight: '900', fontSize: 14 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
  },
  stepTag: { fontSize: 10, fontWeight: '800', color: '#10B981', letterSpacing: 1.4 },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  timeCol: { alignItems: 'center', gap: 4 },
  stepArrow: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  timeDigit: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', minWidth: 68, textAlign: 'center' },
  timeColon: { fontSize: 40, fontWeight: '900', color: '#64748B' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayChip: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: '#10B981' },
  dayChipText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  dayChipTextActive: { color: '#070A11' },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  soundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  soundChipActive: { backgroundColor: '#10B981' },
  soundText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  soundTextActive: { color: '#070A11' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#162033',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  missionTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  missionDesc: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  reqTag: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  optionPillActive: { backgroundColor: '#10B981' },
  optionPillText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  optionPillTextActive: { color: '#070A11' },
  infoNote: { color: '#94A3B8', fontSize: 12, lineHeight: 17 },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 12,
  },
  previewBtnText: { color: '#070A11', fontWeight: '900', fontSize: 14 },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#162033',
    padding: 12,
    borderRadius: 12,
  },
  permText: { flex: 1, color: '#CBD5E1', fontSize: 12 },
});

