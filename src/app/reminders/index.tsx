import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNinjaAlert } from '../../context/ninja-alert-context';

import {
  getReminders,
  toggleReminder,
  type SmartReminder,
} from '../../services/reminders/reminder-service';
import {
  triggerLiveReminderTestAlert,
  getTodayWaterLog,
  WATER_LOG_KEY,
  type WaterLog,
} from '../../services/reminders/smart-reminder-engine';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RemindersScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();
  const [reminders, setReminders] = useState<SmartReminder[]>([]);
  const [waterLog, setWaterLog] = useState<WaterLog>({
    date: new Date().toISOString().split('T')[0],
    glasses: 0,
    totalMl: 0,
    lastDrankAt: '',
  });

  useEffect(() => {
    void (async () => {
      const [list, wLog] = await Promise.all([getReminders(), getTodayWaterLog()]);
      setReminders(list);
      setWaterLog(wLog);
    })();
  }, []);

  const handleToggle = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleReminder(id);
    setReminders(updated);
    const item = updated.find((r) => r.id === id);
    showToast({
      title: item?.isEnabled ? 'Reminder Active' : 'Reminder Paused',
      message: item?.isEnabled ? `Scheduled real notifications for ${item.title}` : `Cancelled notifications for ${item?.title}`,
      type: item?.isEnabled ? 'success' : 'info',
      icon: item?.isEnabled ? 'bell-ring' : 'bell-off',
    });
  };

  const handleTestAlert = async (r: SmartReminder) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Fire a REAL system notification in Android notification shade
    await triggerLiveReminderTestAlert(r);

    showToast({
      title: `⚡ System Notification Sent!`,
      message: `Check your Android notification bar for "${r.title}".`,
      type: 'success',
      icon: 'bell-ring',
    });
  };

  const handleQuickAddWater = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated: WaterLog = {
      date: new Date().toISOString().split('T')[0],
      glasses: waterLog.glasses + 1,
      totalMl: (waterLog.glasses + 1) * 250,
      lastDrankAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    await AsyncStorage.setItem(WATER_LOG_KEY, JSON.stringify(updated));
    setWaterLog(updated);
    showToast({
      title: '💧 +250ml Logged!',
      message: `Today's total: ${updated.totalMl}ml (${updated.glasses} glasses). +10 XP awarded!`,
      type: 'success',
      icon: 'water',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.badge}>PROACTIVE RE-ROUTING</Text>
          <Text style={styles.title}>Smart Reminders</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Real Hydration Tracker Card */}
        <View style={styles.waterCard}>
          <View style={styles.waterLeft}>
            <View style={styles.waterIconCircle}>
              <Ionicons name="water" size={24} color="#38BDF8" />
            </View>
            <View>
              <Text style={styles.waterTitle}>Daily Hydration Goal</Text>
              <Text style={styles.waterSub}>
                {waterLog.totalMl}ml / 2000ml ({waterLog.glasses} glasses logged)
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.waterAddBtn}
            onPress={handleQuickAddWater}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color="#070A11" />
            <Text style={styles.waterAddBtnText}>+250ml</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#00E699" />
          <Text style={styles.infoText}>
            Smart Reminders detect prolonged physical inertia and screen fatigue, sending
            proactive micro-interventions.
          </Text>
        </View>

        {reminders.map((item) => (
          <View key={item.id} style={styles.reminderCard}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon as any} size={24} color="#00E699" />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Switch
                  value={item.isEnabled}
                  onValueChange={() => void handleToggle(item.id)}
                  thumbColor={item.isEnabled ? '#00E699' : '#64748B'}
                  trackColor={{ false: '#334155', true: '#0F291E' }}
                />
              </View>

              <Text style={styles.cardDesc}>{item.description}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.intervalText}>
                  {item.intervalMinutes ? `Every ${item.intervalMinutes} mins` : `At ${item.time}`}
                </Text>

                <TouchableOpacity
                  style={styles.testBtn}
                  onPress={() => void handleTestAlert(item)}
                >
                  <Text style={styles.testBtnText}>Test Alert</Text>
                </TouchableOpacity>
              </View>
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
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1E36',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  waterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waterIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  waterSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
    marginTop: 2,
  },
  waterAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  waterAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#070A11',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F291E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00E699',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 17,
  },
  reminderCard: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intervalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
  },
  testBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
});

