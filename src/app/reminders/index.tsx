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

export default function RemindersScreen() {
  const router = useRouter();
  const { showAlert } = useNinjaAlert();
  const [reminders, setReminders] = useState<SmartReminder[]>([]);

  useEffect(() => {
    void (async () => {
      const list = await getReminders();
      setReminders(list);
    })();
  }, []);

  const handleToggle = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleReminder(id);
    setReminders(updated);
  };

  const handleTestAlert = async (r: SmartReminder) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showAlert({
      title: r.title,
      message: r.description,
      type: 'warning',
      icon: 'bell-ring',
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

