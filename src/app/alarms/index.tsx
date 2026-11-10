import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  getAlarms,
  toggleAlarm,
  addAlarm,
  deleteAlarm,
  type MissionAlarm,
} from '../../services/alarms/alarm-engine';

export default function AlarmsScreen() {
  const router = useRouter();
  const [alarms, setAlarms] = useState<MissionAlarm[]>([]);

  useEffect(() => {
    void (async () => {
      const list = await getAlarms();
      setAlarms(list);
    })();
  }, []);

  const handleToggle = async (id: string) => {
    const updated = await toggleAlarm(id);
    setAlarms(updated);
  };

  const handleAddQuickAlarm = async () => {
    const updated = await addAlarm({
      label: 'Evening Study Routine',
      time: '20:00',
      days: [1, 2, 3, 4, 5],
      isEnabled: true,
      mission: 'math',
      difficulty: 'medium',
      snoozeCount: 0,
      wakeCheckEnabled: true,
    });
    setAlarms(updated);
    Alert.alert('Alarm Created', 'Evening Study Routine set for 20:00 with Math Mission.');
  };

  const handleDelete = async (id: string) => {
    const updated = await deleteAlarm(id);
    setAlarms(updated);
  };

  const formatDays = (days: number[]) => {
    const map = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return days.map((d) => map[d]).join(' · ');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.badge}>SMART ALARMS</Text>
          <Text style={styles.title}>Mission Alarms</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => void handleAddQuickAlarm()}>
          <Ionicons name="add" size={24} color="#00E699" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Test Alarm Simulation Banner */}
        <TouchableOpacity
          style={styles.simulationBanner}
          onPress={() => router.push('/alarms/ring' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.bannerIcon}>
            <Ionicons name="alarm-outline" size={24} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Test Alarm Ringing Mission</Text>
            <Text style={styles.bannerSub}>Simulate unstoppable wake-up challenge</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Alarms List */}
        {alarms.map((alarm) => (
          <View key={alarm.id} style={styles.alarmCard}>
            <View style={styles.alarmMeta}>
              <Text style={styles.alarmTime}>{alarm.time}</Text>
              <Text style={styles.alarmLabel}>{alarm.label}</Text>
              <View style={styles.missionTag}>
                <Ionicons
                  name={alarm.mission === 'math' ? 'calculator' : 'barbell'}
                  size={12}
                  color="#00E699"
                />
                <Text style={styles.missionTagText}>
                  {alarm.mission.toUpperCase()} MISSION · {alarm.difficulty.toUpperCase()}
                </Text>
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
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => void handleDelete(alarm.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  addBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#0F291E',
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
  simulationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  bannerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  alarmCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  alarmMeta: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  alarmLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 4,
  },
  missionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F291E',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  missionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E699',
  },
  alarmDays: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  alarmActions: {
    alignItems: 'center',
    gap: 14,
  },
  deleteBtn: {
    padding: 6,
  },
});

