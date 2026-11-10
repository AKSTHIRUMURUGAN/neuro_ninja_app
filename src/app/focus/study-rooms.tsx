import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../../constants/theme';

interface StudyRoom {
  id: string;
  title: string;
  category: 'exam' | 'craft' | 'reading';
  activeParticipants: number;
  currentCycle: string;
  hostName: string;
  badgeColor: string;
}

const INITIAL_ROOMS: StudyRoom[] = [
  {
    id: 'room_jee',
    title: 'JEE Advanced Rankers Sprint',
    category: 'exam',
    activeParticipants: 312,
    currentCycle: '19m in 50m Study Sprint',
    hostName: 'Kota Sensei',
    badgeColor: '#EF4444',
  },
  {
    id: 'room_neet',
    title: 'NEET Medical Cadre Focus',
    category: 'exam',
    activeParticipants: 284,
    currentCycle: '12m in 25m Pomodoro',
    hostName: 'Dr. Arya',
    badgeColor: '#00E699',
  },
  {
    id: 'room_upsc',
    title: 'UPSC Civil Services 2026',
    category: 'exam',
    activeParticipants: 420,
    currentCycle: '45m in 60m Deep Detox',
    hostName: 'Dharma Ninja',
    badgeColor: '#F59E0B',
  },
  {
    id: 'room_code',
    title: 'Fullstack Devs Flow State',
    category: 'craft',
    activeParticipants: 195,
    currentCycle: '22m in 50m Sprint',
    hostName: 'Kernel Kage',
    badgeColor: '#60A5FA',
  },
  {
    id: 'room_gate',
    title: 'GATE CS & Algorithms',
    category: 'exam',
    activeParticipants: 140,
    currentCycle: '8m in 25m Pomodoro',
    hostName: 'Turing Dojo',
    badgeColor: '#A855F7',
  },
];

export default function StudyRoomsScreen() {
  const router = useRouter();
  const [rooms] = useState<StudyRoom[]>(INITIAL_ROOMS);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'exam' | 'craft'>('all');
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);

  const filteredRooms = rooms.filter((r) => {
    if (selectedFilter === 'all') return true;
    return r.category === selectedFilter;
  });

  const handleJoinRoom = async (room: StudyRoom) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJoinedRoomId(room.id);
    Alert.alert(
      `Joined ${room.title}!`,
      `You are now synced with ${room.activeParticipants} fellow Ninjas. Launching synchronized focus sprint.`,
      [
        {
          text: 'Enter Focus Chamber',
          onPress: () => router.push('/focus/pomodoro' as any),
        },
      ]
    );
  };

  const handleCreateRoom = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Create Private Study Room',
      'Generate an invite link for your peer group or college guild.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Link',
          onPress: () =>
            Alert.alert('Room Created!', 'Invite Link: neuroninja://room/join?id=ninja_study_992'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>REGAIN PARITY</Text>
          <Text style={styles.title}>Study Lounges</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateRoom}>
          <MaterialCommunityIcons name="plus" size={18} color="#070A11" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero Notice */}
        <View style={styles.heroCard}>
          <MaterialCommunityIcons name="account-group" size={28} color="#00E699" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Multiplayer Focus Accountability</Text>
            <Text style={styles.heroSub}>
              Study alongside competitive aspirants and craftsmen. Breaking focus is publicly logged on room boards.
            </Text>
          </View>
        </View>

        {/* Category Filters */}
        <View style={styles.filterRow}>
          {[
            { id: 'all' as const, label: 'All Lounges' },
            { id: 'exam' as const, label: 'Exams (JEE/NEET/UPSC)' },
            { id: 'craft' as const, label: 'Craft & Code' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, selectedFilter === f.id && styles.filterChipActive]}
              onPress={() => setSelectedFilter(f.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === f.id && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Room Cards List */}
        <View style={styles.roomsList}>
          {filteredRooms.map((room) => {
            const isJoined = joinedRoomId === room.id;
            return (
              <View key={room.id} style={styles.roomCard}>
                <View style={styles.roomTop}>
                  <View style={[styles.roomIndicator, { backgroundColor: room.badgeColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomTitle}>{room.title}</Text>
                    <Text style={styles.hostText}>Hosted by {room.hostName}</Text>
                  </View>
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>{room.activeParticipants} Live</Text>
                  </View>
                </View>

                <View style={styles.cycleBox}>
                  <MaterialCommunityIcons name="timer-sand" size={16} color="#94A3B8" />
                  <Text style={styles.cycleText}>{room.currentCycle}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.joinBtn, isJoined && styles.joinBtnActive]}
                  onPress={() => handleJoinRoom(room)}
                >
                  <MaterialCommunityIcons
                    name={isJoined ? 'check' : 'login'}
                    size={16}
                    color={isJoined ? '#00E699' : '#070A11'}
                  />
                  <Text style={[styles.joinBtnText, isJoined && styles.joinBtnTextActive]}>
                    {isJoined ? 'Synced to Lounge' : 'Join Synchronous Sprint'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00E699',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  createBtnText: {
    color: '#070A11',
    fontWeight: 'bold',
    fontSize: 12,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  heroSub: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  filterChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#00E699',
    fontWeight: 'bold',
  },
  roomsList: {
    gap: 14,
  },
  roomCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  roomIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  hostText: {
    fontSize: 11,
    color: NinjaPalette.textMuted,
    marginTop: 1,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  cycleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  cycleText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 10,
  },
  joinBtnActive: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  joinBtnText: {
    color: '#070A11',
    fontWeight: 'bold',
    fontSize: 12,
  },
  joinBtnTextActive: {
    color: '#00E699',
  },
});

