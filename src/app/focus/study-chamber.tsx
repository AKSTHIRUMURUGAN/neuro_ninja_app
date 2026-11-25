import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  getSynchronizedLoungeCycle,
  getInitialLoungeParticipants,
  type StudyLoungeCycleState,
  type LoungeParticipant,
  type LoungeBreachLog,
} from '../../services/focus/study-lounge-service';
import { useNinjaAlert } from '../../context/ninja-alert-context';

export default function StudyChamberScreen() {
  const router = useRouter();
  const { title = 'Multiplayer Study Chamber', hostName = 'Kota Sensei' } = useLocalSearchParams<{
    title: string;
    hostName: string;
  }>();
  const { showToast, showAlert } = useNinjaAlert();

  const [cycle, setCycle] = useState<StudyLoungeCycleState>(getSynchronizedLoungeCycle());
  const [participants, setParticipants] = useState<LoungeParticipant[]>(getInitialLoungeParticipants());
  const [breaches, setBreaches] = useState<LoungeBreachLog[]>([
    {
      id: 'b1',
      userName: 'Dr. Arya',
      timestamp: '12m ago',
      message: 'Completed 25m Focus Block without distraction',
      durationFocused: '25m',
    },
    {
      id: 'b2',
      userName: 'Alex H.',
      timestamp: '4m ago',
      message: 'Breached focus: opened Instagram during study sprint',
      durationFocused: '14m',
    },
  ]);

  // AppState listener to detect focus exit/breach
  const appStateRef = useRef<AppStateStatus>((AppState.currentState ?? 'active') as AppStateStatus);

  useEffect(() => {
    // 1-second interval to tick the synchronized clock
    const timer = setInterval(() => {
      setCycle(getSynchronizedLoungeCycle());
    }, 1000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // User left chamber
        const newBreach: LoungeBreachLog = {
          id: `b_${Date.now()}`,
          userName: 'You (Ninja)',
          timestamp: 'Just now',
          message: 'Breached focus: exited study chamber during active sprint!',
          durationFocused: 'Partial',
        };
        setBreaches((prev) => [newBreach, ...prev]);
        setParticipants((prev) =>
          prev.map((p) => (p.id === 'user_self' ? { ...p, status: 'breached' } : p))
        );
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        setCycle(getSynchronizedLoungeCycle());
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const handleSendCheer = async (emoji: string, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast({
      title: `${emoji} Cheer Sent!`,
      message: `You boosted fellow Ninjas in ${title} with ${name}.`,
      type: 'success',
      icon: 'sparkles',
    });
  };

  const handleLeaveChamber = () => {
    showAlert({
      title: 'Leave Study Chamber?',
      message: 'Leaving now will end your synchronized multiplayer sprint session.',
      type: 'warning',
      icon: 'door-open',
      buttons: [
        { text: 'Stay Focused', onPress: () => {} },
        {
          text: 'Leave Chamber',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleLeaveChamber}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.badge}>LIVE SYNCHRONOUS LOUNGE</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Sync Live</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Main Countdown Hero */}
        <View
          style={[
            styles.timerCard,
            { borderColor: cycle.isStudySprint ? '#00E699' : '#38BDF8' },
          ]}
        >
          <View
            style={[
              styles.phasePill,
              { backgroundColor: cycle.isStudySprint ? 'rgba(0, 230, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)' },
            ]}
          >
            <Text
              style={[
                styles.phaseText,
                { color: cycle.isStudySprint ? '#00E699' : '#38BDF8' },
              ]}
            >
              {cycle.phaseLabel}
            </Text>
          </View>

          <Text style={styles.countdownDigits}>{cycle.formattedTime}</Text>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${cycle.progressPercent}%`,
                  backgroundColor: cycle.isStudySprint ? '#00E699' : '#38BDF8',
                },
              ]}
            />
          </View>

          <Text style={styles.syncNotice}>
            ⏱️ Globally anchored clock. All peers in this room see this exact second.
          </Text>
        </View>

        {/* Cheer Reactions Strip */}
        <View style={styles.cheerSection}>
          <Text style={styles.sectionHeader}>CHEER ROOM PEERS</Text>
          <View style={styles.cheerRow}>
            {[
              { emoji: '🔥', label: 'Fire' },
              { emoji: '👏', label: 'Bravo' },
              { emoji: '☕', label: 'Chai' },
              { emoji: '⚡', label: 'Focus' },
            ].map((c) => (
              <TouchableOpacity
                key={c.label}
                style={styles.cheerBtn}
                onPress={() => void handleSendCheer(c.emoji, c.label)}
                activeOpacity={0.7}
              >
                <Text style={styles.cheerEmoji}>{c.emoji}</Text>
                <Text style={styles.cheerLabel}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Live Participants List */}
        <View style={styles.participantsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>CHAMBER PEERS ({participants.length})</Text>
            <Text style={styles.hostBadge}>Host: {hostName}</Text>
          </View>

          {participants.map((p) => (
            <View key={p.id} style={styles.participantRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{p.avatar}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.participantName}>{p.name}</Text>
                  {p.role === 'Host' && (
                    <View style={styles.roleHost}>
                      <Text style={styles.roleHostText}>Host</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.participantSub}>
                  {p.focusMinutesToday}m focused today · 🔥 {p.streakDays}d streak
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  p.status === 'focused'
                    ? styles.statusFocused
                    : p.status === 'resting'
                    ? styles.statusResting
                    : styles.statusBreached,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    p.status === 'focused'
                      ? { color: '#00E699' }
                      : p.status === 'resting'
                      ? { color: '#38BDF8' }
                      : { color: '#EF4444' },
                  ]}
                >
                  {p.status === 'focused' ? 'Focused' : p.status === 'resting' ? 'Resting' : 'Breached'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Focus Breach & Activity Feed */}
        <View style={styles.breachSection}>
          <Text style={styles.sectionHeader}>ROOM ACCOUNTABILITY FEED</Text>
          {breaches.map((b) => (
            <View key={b.id} style={styles.breachCard}>
              <Ionicons
                name={b.message.includes('Breached') ? 'alert-circle' : 'checkmark-circle'}
                size={18}
                color={b.message.includes('Breached') ? '#EF4444' : '#00E699'}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.breachUser}>{b.userName} · <Text style={styles.breachTime}>{b.timestamp}</Text></Text>
                <Text style={styles.breachMessage}>{b.message}</Text>
              </View>
            </View>
          ))}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  timerCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  phasePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownDigits: {
    fontSize: 54,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  syncNotice: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hostBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818CF8',
  },
  cheerSection: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cheerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cheerBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cheerEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  cheerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  participantsSection: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  roleHost: {
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleHostText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#818CF8',
  },
  participantSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusFocused: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  statusResting: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusBreached: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  breachSection: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  breachCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  breachUser: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  breachTime: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
  },
  breachMessage: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
});
