import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import {
  SLEEP_SOUND_TRACKS,
  deleteAllSleepData,
  deleteSleepDiaryEntry,
  getSleepDiaryEntries,
  getSleepSchedule,
  getSleepSoundResearchState,
  logSleepDiaryEntry,
  saveSleepSchedule,
  saveSleepSoundResearchState,
  startSleepSound,
  stopSleepSound,
  type SleepDiaryEntry,
  type SleepScheduleConfig,
  type SleepSoundOptInResearchState,
} from '../../../services/sleep/sleep-engine';

export default function SleepScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<SleepDiaryEntry[]>([]);
  const [schedule, setSchedule] = useState<SleepScheduleConfig | null>(null);
  const [research, setResearch] = useState<SleepSoundOptInResearchState | null>(null);

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [sleepTimerMin, setSleepTimerMin] = useState<number>(30);

  const [hoursSleptInput, setHoursSleptInput] = useState('7.5');
  const [qualityStars, setQualityStars] = useState(4);
  const [notesInput, setNotesInput] = useState('');

  const refresh = useCallback(() => {
    void (async () => {
      const [diary, sched, resState] = await Promise.all([
        getSleepDiaryEntries(),
        getSleepSchedule(),
        getSleepSoundResearchState(),
      ]);
      setEntries(diary);
      setSchedule(sched);
      setResearch(resState);
    })();
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    return () => stopSleepSound();
  }, []);

  const handleLogSleep = async () => {
    const hrs = Math.max(1, Math.min(16, parseFloat(hoursSleptInput) || 7.5));
    const wake = new Date();
    const sleepStart = new Date(wake.getTime() - hrs * 3600_000);
    await logSleepDiaryEntry({
      sleepStart,
      wakeTime: wake,
      subjectiveQuality: qualityStars,
      notes: notesInput.trim() || undefined,
      source: 'manual',
    });
    setNotesInput('');
    refresh();
  };

  const handleToggleTrack = async (track: (typeof SLEEP_SOUND_TRACKS)[number]) => {
    if (playingTrackId === track.id) {
      stopSleepSound();
      setPlayingTrackId(null);
    } else {
      await startSleepSound(track, sleepTimerMin);
      setPlayingTrackId(track.id);
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Sleep Observations?',
      'Removes all local sleep diary entries and resets optional sound research opt-in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => void deleteAllSleepData().then(refresh),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.kicker}>REST & RECOVERY</Text>
          <Text style={styles.headerTitle}>Sleep & Bedtime</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Bedtime Schedule */}
        {schedule && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>BEDTIME WIND-DOWN SCHEDULE</Text>
                <Text style={styles.schedTitle}>
                  Sleep {schedule.targetBedtimeHHMM} → Wake {schedule.targetWakeHHMM}
                </Text>
                <Text style={styles.subText}>
                  Notification fires {schedule.windDownMinutesBefore}m before bedtime
                </Text>
              </View>
              <Switch
                value={schedule.enabled}
                onValueChange={(val) =>
                  void saveSleepSchedule({ ...schedule, enabled: val }).then(setSchedule)
                }
                thumbColor="#06B6D4"
              />
            </View>
            <View style={styles.chipRow}>
              {['21:30', '22:00', '22:30', '23:00', '23:30'].map((bt) => (
                <TouchableOpacity
                  key={bt}
                  style={[styles.chip, schedule.targetBedtimeHHMM === bt && styles.chipActive]}
                  onPress={() =>
                    void saveSleepSchedule({ ...schedule, targetBedtimeHHMM: bt }).then(setSchedule)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      schedule.targetBedtimeHHMM === bt && { color: '#070A11' },
                    ]}
                  >
                    Bed {bt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sleep Sounds & Audio Timer */}
        <View style={styles.card}>
          <Text style={styles.label}>SLEEP SOUNDS & BEDTIME TIMER</Text>
          <View style={styles.chipRow}>
            {[15, 30, 45, 60, 0].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, sleepTimerMin === m && styles.chipActive]}
                onPress={() => setSleepTimerMin(m)}
              >
                <Text style={[styles.chipText, sleepTimerMin === m && { color: '#070A11' }]}>
                  {m === 0 ? 'Loop' : `${m}m Timer`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ gap: 8 }}>
            {SLEEP_SOUND_TRACKS.map((track) => {
              const playing = playingTrackId === track.id;
              return (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.soundRow, playing && styles.soundRowActive]}
                  onPress={() => void handleToggleTrack(track)}
                >
                  <MaterialCommunityIcons
                    name={track.icon as any}
                    size={22}
                    color={playing ? '#06B6D4' : '#94A3B8'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.soundTitle}>{track.title}</Text>
                    <Text style={styles.subText}>{track.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={playing ? 'pause-circle' : 'play-circle'}
                    size={28}
                    color={playing ? '#06B6D4' : '#CBD5E1'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Log Sleep Diary */}
        <View style={styles.card}>
          <Text style={styles.label}>LOG SLEEP DIARY</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Text style={styles.subText}>Hours slept:</Text>
            <TextInput
              style={[styles.input, { width: 80, textAlign: 'center' }]}
              value={hoursSleptInput}
              onChangeText={setHoursSleptInput}
              keyboardType="decimal-pad"
            />
            <View style={{ flexDirection: 'row', gap: 4, marginLeft: 'auto' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setQualityStars(star)}>
                  <Ionicons
                    name={star <= qualityStars ? 'star' : 'star-outline'}
                    size={20}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={notesInput}
            onChangeText={setNotesInput}
            placeholder="Dream or rest observation (private, stays on device)..."
            placeholderTextColor="#64748B"
          />
          <TouchableOpacity style={styles.logBtn} onPress={() => void handleLogSleep()}>
            <Text style={styles.logBtnText}>Save Sleep Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Sleep Diary History & Weekly Chart */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>RECENT SLEEP OBSERVATIONS ({entries.length})</Text>
            <TouchableOpacity onPress={handleDeleteAll}>
              <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800' }}>Delete All</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subText}>
            Self-reported sleep logs only — not a medical diagnosis.
          </Text>
          {entries.length > 0 && (
            <View style={styles.chartRow}>
              {entries.slice(0, 7).reverse().map((e) => {
                const hrs = Math.min(12, e.durationMinutes / 60);
                const barH = Math.max(8, Math.round((hrs / 10) * 68));
                return (
                  <View key={e.entryId} style={styles.chartCol}>
                    <Text style={styles.chartVal}>{hrs.toFixed(1)}</Text>
                    <View style={[styles.chartBar, { height: barH }]} />
                    <Text style={styles.chartDay}>
                      {new Date(e.createdAt).toLocaleDateString(undefined, { weekday: 'narrow' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {entries.length === 0 ? (
            <Text style={styles.subText}>No sleep entries logged yet.</Text>
          ) : (
            entries.map((e) => (
              <View key={e.entryId} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.soundTitle}>
                    {(e.durationMinutes / 60).toFixed(1)}h · Quality {e.subjectiveQuality}/5
                  </Text>
                  <Text style={styles.subText}>
                    {new Date(e.createdAt).toLocaleDateString()}
                    {e.notes ? ` · ${e.notes}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => void deleteSleepDiaryEntry(e.entryId).then(refresh)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Privacy-Gated Sound Event Opt-In Research Card (FR-193) */}
        {research && (
          <View style={styles.card}>
            <Text style={styles.label}>PRIVACY-GATED SOUND ANALYSIS (RESEARCH OPT-IN)</Text>
            <Text style={styles.subText}>
              Optional local sound-event insights require explicit microphone consent, visible active indicator, and short local retention. Never uploads audio or performs clinical sleep diagnosis.
            </Text>
            <View style={styles.rowBetween}>
              <Text style={styles.soundTitle}>Explicit Consent Opt-In</Text>
              <Switch
                value={research.micConsentGranted}
                onValueChange={(granted) => {
                  const next = {
                    ...research,
                    micConsentGranted: granted,
                    localInsightsEnabled: granted,
                  };
                  setResearch(next);
                  void saveSleepSoundResearchState(next);
                }}
                thumbColor="#06B6D4"
              />
            </View>
            {research.micConsentGranted && (
              <>
                <View style={styles.chipRow}>
                  {([1, 7, 30] as const).map((days) => (
                    <TouchableOpacity
                      key={days}
                      style={[styles.chip, research.retentionDays === days && styles.chipActive]}
                      onPress={() => {
                        const next = { ...research, retentionDays: days };
                        setResearch(next);
                        void saveSleepSoundResearchState(next);
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          research.retentionDays === days && { color: '#070A11' },
                        ]}
                      >
                        Retain {days}d
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ color: '#06B6D4', fontSize: 11, fontWeight: '700' }}>
                  MIC STANDBY CONSENT RECORDED · Retention: {research.retentionDays}d · Local-only (not active in background)
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
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
  kicker: { fontSize: 10, fontWeight: '800', color: '#06B6D4', letterSpacing: 1.4 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F8FAFC' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  label: { color: '#06B6D4', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schedTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', marginTop: 4 },
  subText: { color: '#94A3B8', fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#162033' },
  chipActive: { backgroundColor: '#06B6D4' },
  chipText: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  soundRowActive: { borderColor: '#06B6D4' },
  soundTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: '#162033',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logBtn: { backgroundColor: '#06B6D4', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  logBtnText: { color: '#070A11', fontWeight: '900' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#162033',
    padding: 10,
    borderRadius: 10,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 10,
  },
  chartCol: { alignItems: 'center', gap: 4, flex: 1 },
  chartBar: { width: 16, borderRadius: 6, backgroundColor: '#06B6D4' },
  chartVal: { color: '#94A3B8', fontSize: 10, fontWeight: '700' },
  chartDay: { color: '#64748B', fontSize: 10, fontWeight: '700' },
});

