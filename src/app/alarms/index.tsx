import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import {
  canScheduleExactAlarms,
  deleteAlarm,
  getAlarms,
  openExactAlarmSettings,
  toggleAlarm,
  type MissionAlarm,
} from '../../services/alarms/alarm-engine';

export default function AlarmsScreen() {
  const router = useRouter();
  const [alarms, setAlarms] = useState<MissionAlarm[]>([]);
  const [exactOk, setExactOk] = useState(true);

  const loadData = useCallback(() => {
    void getAlarms().then(setAlarms);
    void canScheduleExactAlarms().then(setExactOk);
  }, []);

  useFocusEffect(loadData);

  const handleToggle = async (id: string) => {
    const updated = await toggleAlarm(id);
    setAlarms(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = await deleteAlarm(id);
    setAlarms(updated);
  };

  const formatDays = (days: number[]) => {
    const map = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    if (!days || days.length === 0) return 'Once';
    if (days.length === 7) return 'Every day';
    return days.map((d) => map[d]).join(' · ');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.badge}>SMART MISSION ALARMS</Text>
          <Text style={styles.title}>Mission Alarms</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/alarms/create' as any)}
        >
          <Ionicons name="add" size={24} color="#070A11" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!exactOk && (
          <TouchableOpacity style={styles.permWarning} onPress={openExactAlarmSettings}>
            <Ionicons name="warning-outline" size={20} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>Exact Alarm Permission Disabled</Text>
              <Text style={styles.permSub}>
                Android may delay alarms in Doze mode. Tap to enable Exact Alarms.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Quick Links Row */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/alarms/ring' as any)}
          >
            <Ionicons name="alarm-outline" size={18} color="#EF4444" />
            <Text style={styles.quickBtnText}>Simulate Ring</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push('/lifeos/sleep' as any)}
          >
            <Ionicons name="moon-outline" size={18} color="#818CF8" />
            <Text style={styles.quickBtnText}>Sleep & Sounds</Text>
          </TouchableOpacity>
        </View>

        {alarms.map((alarm) => (
          <TouchableOpacity
            key={alarm.id}
            style={styles.alarmCard}
            onPress={() => router.push(`/alarms/create?id=${alarm.id}` as any)}
            activeOpacity={0.85}
          >
            <View style={styles.alarmMeta}>
              <Text style={styles.alarmTime}>{alarm.time}</Text>
              <Text style={styles.alarmLabel}>{alarm.label}</Text>
              <View style={styles.tagsRow}>
                <View style={styles.missionTag}>
                  <Ionicons name="flash" size={11} color="#00E699" />
                  <Text style={styles.missionTagText}>{alarm.mission.toUpperCase()}</Text>
                </View>
                {alarm.wakeCheckEnabled && (
                  <View style={styles.wakeTag}>
                    <Text style={styles.wakeTagText}>WAKE CHECK</Text>
                  </View>
                )}
              </View>
              <Text style={styles.alarmDays}>{formatDays(alarm.days)}</Text>
            </View>

            <View style={styles.alarmActions}>
              <Switch
                value={alarm.isEnabled}
                onValueChange={() => void handleToggle(alarm.id)}
                thumbColor={alarm.isEnabled ? '#00E699' : '#64748B'}
                trackColor={{ false: '#334155', true: '#0F291E' }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      `/alarms/ring?alarmId=${encodeURIComponent(alarm.id)}&mission=${alarm.mission}&label=${encodeURIComponent(alarm.label)}&soundId=${alarm.soundId}` as any
                    )
                  }
                  style={styles.iconSmall}
                >
                  <Ionicons name="play-outline" size={17} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconSmall}
                  onPress={() => void handleDelete(alarm.id)}
                >
                  <Ionicons name="trash-outline" size={17} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 6 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { fontSize: 10, fontWeight: '800', color: '#00E699', letterSpacing: 1.5 },
  title: { fontSize: 22, fontWeight: '900', color: '#F8FAFC' },
  scroll: { padding: 18, gap: 14, paddingBottom: 40 },
  permWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  permTitle: { color: '#FBBF24', fontWeight: '800', fontSize: 13 },
  permSub: { color: '#FDE68A', fontSize: 11, marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F1829',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  quickBtnText: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  alarmCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  alarmMeta: { flex: 1 },
  alarmTime: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  alarmLabel: { fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginTop: 2 },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  missionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F291E',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  missionTagText: { fontSize: 10, fontWeight: '700', color: '#00E699' },
  wakeTag: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  wakeTagText: { fontSize: 10, fontWeight: '700', color: '#818CF8' },
  alarmDays: { fontSize: 12, color: '#64748B', marginTop: 8 },
  alarmActions: { alignItems: 'flex-end', gap: 12 },
  iconSmall: { padding: 6, borderRadius: 8, backgroundColor: '#162033' },
});
