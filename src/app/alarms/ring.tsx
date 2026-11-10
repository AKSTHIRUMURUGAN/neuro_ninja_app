import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MathMission } from '../../components/alarms/math-mission';
import { ShakeMission } from '../../components/alarms/shake-mission';

export default function AlarmRingScreen() {
  const router = useRouter();
  const [activeMission, setActiveMission] = useState<'math' | 'shake'>('math');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Vibration / alarm interval
    const interval = setInterval(() => {
      if (!isDismissed) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isDismissed]);

  const handleMissionSuccess = async () => {
    setIsDismissed(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Alarm Silenced!', 'Mission accomplished. Your prefrontal cortex is fully awake!', [
      { text: 'Enter Dojo', onPress: () => router.replace('/(tabs)' as any) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Urgent Alarm Header */}
        <View style={styles.header}>
          <View style={styles.alarmIconBox}>
            <Ionicons name="alarm" size={40} color="#EF4444" />
          </View>
          <Text style={styles.alarmTime}>06:30 AM</Text>
          <Text style={styles.alarmTitle}>Ninja Morning Wakeup</Text>
          <Text style={styles.alarmSub}>
            Dismiss locked behind cognitive mission. Solve to silence.
          </Text>

          {/* Mission Switcher */}
          <View style={styles.missionSwitcher}>
            <TouchableOpacity
              style={[styles.switcherBtn, activeMission === 'math' && styles.switcherBtnActive]}
              onPress={() => setActiveMission('math')}
            >
              <Text style={[styles.switcherText, activeMission === 'math' && styles.switcherTextActive]}>
                Math Sprint
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switcherBtn, activeMission === 'shake' && styles.switcherBtnActive]}
              onPress={() => setActiveMission('shake')}
            >
              <Text style={[styles.switcherText, activeMission === 'shake' && styles.switcherTextActive]}>
                Kinetic Shake
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mission Component */}
        <View style={styles.missionArea}>
          {activeMission === 'math' ? (
            <MathMission difficulty="medium" onCompleted={() => void handleMissionSuccess()} />
          ) : (
            <ShakeMission targetShakes={20} onCompleted={() => void handleMissionSuccess()} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  alarmIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  alarmTime: {
    fontSize: 40,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  alarmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 4,
  },
  alarmSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  missionSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 4,
    marginTop: 16,
    gap: 6,
  },
  switcherBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  switcherBtnActive: {
    backgroundColor: '#0F172A',
  },
  switcherText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  switcherTextActive: {
    color: '#00E699',
  },
  missionArea: {
    flex: 1,
    justifyContent: 'center',
  },
});

