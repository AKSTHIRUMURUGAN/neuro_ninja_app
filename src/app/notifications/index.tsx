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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../../constants/theme';
import {
  getBatchedNotifications,
  dismissBatchedNotification,
  clearAllBatchedNotifications,
  saveBatchedNotification,
  type BatchedNotificationItem,
} from '../../services/storage';

export default function NotificationIntelligenceScreen() {
  const router = useRouter();
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [notifications, setNotifications] = useState<BatchedNotificationItem[]>([]);

  useEffect(() => {
    void (async () => {
      const stored = await getBatchedNotifications();
      if (stored.length > 0) {
        setNotifications(stored);
      } else {
        // Initial real template notification
        const initialItem: BatchedNotificationItem = {
          id: 'n_init_1',
          appName: 'NeuroNinja Shield',
          pkg: 'com.neuroninja.app',
          title: 'Distraction Barrier Active',
          body: 'Social notifications from Instagram, YouTube, and TikTok are held until the next batch digest.',
          timestamp: 'Just now',
          receivedAtMs: Date.now(),
          icon: 'shield-check',
          color: '#00E699',
        };
        const list = await saveBatchedNotification(initialItem);
        setNotifications(list);
      }
    })();
  }, []);

  const handleClearInbox = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await clearAllBatchedNotifications();
    setNotifications([]);
    Alert.alert('Inbox Cleared', 'All held notifications have been cleared.');
  };

  const handleDismiss = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await dismissBatchedNotification(id);
    setNotifications(updated);
  };

  const handleAddTestIntercept = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newItem: BatchedNotificationItem = {
      id: `n_${Date.now()}`,
      appName: 'Instagram',
      pkg: 'com.instagram.android',
      title: 'Intercepted Social Ping',
      body: 'Someone commented on a post. Stored silently without screen wake.',
      timestamp: 'Just now',
      receivedAtMs: Date.now(),
      icon: 'instagram',
      color: '#EC4899',
    };
    const updated = await saveBatchedNotification(newItem);
    setNotifications(updated);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>MINIMALIST PHONE PARITY</Text>
          <Text style={styles.title}>Notification Filter</Text>
        </View>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearInbox}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Master Control Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>STAGE & FILTER ENGINE</Text>

          <View style={styles.row}>
            <MaterialCommunityIcons name="bell-cancel" size={22} color="#00E699" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Batch Distracting Pings</Text>
              <Text style={styles.rowSub}>Hides social notifications and batches for scheduled review</Text>
            </View>
            <Switch
              value={filterEnabled}
              onValueChange={setFilterEnabled}
              thumbColor={filterEnabled ? '#00E699' : '#64748B'}
              trackColor={{ false: '#334155', true: '#0F291E' }}
            />
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="weather-night" size={22} color="#818CF8" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Bedtime Quiet Hours</Text>
              <Text style={styles.rowSub}>10:00 PM – 7:00 AM zero vibration lockout</Text>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
              thumbColor={quietHoursEnabled ? '#818CF8' : '#64748B'}
              trackColor={{ false: '#334155', true: '#1E1B4B' }}
            />
          </View>
        </View>

        {/* Batch Delivery Schedule */}
        <View style={styles.scheduleBox}>
          <Text style={styles.scheduleHeading}>BATCH RELEASE WINDOWS</Text>
          <View style={styles.windowsRow}>
            <View style={styles.windowPill}>
              <Text style={styles.windowTime}>12:30 PM</Text>
              <Text style={styles.windowLabel}>Midday Digest</Text>
            </View>
            <View style={styles.windowPill}>
              <Text style={styles.windowTime}>06:30 PM</Text>
              <Text style={styles.windowLabel}>Evening Debrief</Text>
            </View>
          </View>
        </View>

        {/* Held Notifications Inbox */}
        <View style={styles.inboxSection}>
          <View style={styles.inboxHeader}>
            <Text style={styles.inboxTitle}>Held Notifications ({notifications.length})</Text>
            <Text style={styles.inboxSub}>Protected from screen shade</Text>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="bell-check-outline" size={32} color="#00E699" />
              <Text style={styles.emptyTitle}>Zero Distraction Noise</Text>
              <Text style={styles.emptySub}>No pending held notifications. Your mind is undisturbed.</Text>
            </View>
          ) : (
            notifications.map((n) => (
              <View key={n.id} style={styles.notifCard}>
                <View style={[styles.notifIconBox, { backgroundColor: `${n.color}20` }]}>
                  <MaterialCommunityIcons name={n.icon as any} size={20} color={n.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.notifTop}>
                    <Text style={styles.notifApp}>{n.appName}</Text>
                    <Text style={styles.notifTime}>{n.timestamp}</Text>
                  </View>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody} numberOfLines={2}>
                    {n.body}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ padding: 6, marginLeft: 6 }}
                  onPress={() => void handleDismiss(n.id)}
                >
                  <Ionicons name="close" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleAddTestIntercept}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#00E699" />
            <Text style={styles.testBtnText}>Simulate Intercepted Notification</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  badge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  clearBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  rowSub: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
  },
  scheduleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  scheduleHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  windowsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  windowPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  windowTime: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00E699',
  },
  windowLabel: {
    fontSize: 10,
    color: NinjaPalette.textMuted,
    marginTop: 2,
  },
  inboxSection: {
    gap: 12,
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inboxTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  inboxSub: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.15)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  notifIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifApp: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  notifTime: {
    fontSize: 10,
    color: '#64748B',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    lineHeight: 15,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.05)',
    marginTop: 14,
  },
  testBtnText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
});

