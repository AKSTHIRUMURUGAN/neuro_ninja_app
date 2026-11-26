import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import { unifiedGamificationEngine } from '../../../services/gamification/unified-gamification-engine';
import { villainEngine } from '../../../services/villains/villain-engine';
import type {
  NinjaFriend,
  ClanRaidContribution,
} from '../../../services/gamification/gamification-types';
import type { WeeklyVillain } from '../../../services/villains/villain-types';

export default function FriendsClanScreen() {
  const router = useRouter();
  const { handleSmartBack } = useNinjaBack({ fallbackRoute: '/lifeos/profile' });
  const { showToast } = useNinjaAlert();

  const [friends, setFriends] = useState<NinjaFriend[]>([]);
  const [contributions, setContributions] = useState<ClanRaidContribution[]>([]);
  const [weeklyTitan, setWeeklyTitan] = useState<WeeklyVillain | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [friendTagInput, setFriendTagInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'clan' | 'raid' | 'buddies'>('clan');

  const loadData = useCallback(async () => {
    try {
      const [f, c, w] = await Promise.all([
        unifiedGamificationEngine.getFriends(),
        unifiedGamificationEngine.getClanRaidContributions(),
        villainEngine.getActiveWeeklyVillain(),
      ]);
      setFriends(f);
      setContributions(c);
      setWeeklyTitan(w);
    } catch (e) {
      console.warn('[FriendsClanScreen] load error:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSendSmokeBomb = async (friend: NinjaFriend) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await unifiedGamificationEngine.sendBuddySmokeBomb(friend.friendId);
    showToast({
      title: 'Smoke Bomb Thrown! 💨',
      message: `Sent a stealth smoke bomb rescue alert to ${friend.displayName}.`,
      type: 'success',
      icon: 'fire',
    });
    await loadData();
  };

  const handleAddFriend = () => {
    if (!friendTagInput.trim()) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({
      title: 'Clan Invite Dispatched! ✉️',
      message: `Clan alliance request sent to ${friendTagInput.trim().toUpperCase()}`,
      type: 'success',
      icon: 'account-plus',
    });
    setFriendTagInput('');
  };

  const titanHpPercent =
    weeklyTitan && weeklyTitan.maxHp > 0
      ? Math.max(0, Math.min(100, Math.round((weeklyTitan.currentHp / weeklyTitan.maxHp) * 100)))
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>DOJO ALLIANCE</Text>
          <Text style={styles.title}>Shadow Clan & Raids</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/lifeos/profile' as any)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="shield-account" size={20} color="#00E699" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'clan' && styles.tabBtnActive]}
          onPress={() => setActiveTab('clan')}
        >
          <Text style={[styles.tabText, activeTab === 'clan' && styles.tabTextActive]}>Clan Members</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'raid' && styles.tabBtnActive]}
          onPress={() => setActiveTab('raid')}
        >
          <Text style={[styles.tabText, activeTab === 'raid' && styles.tabTextActive]}>Co-Op Raid Titan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'buddies' && styles.tabBtnActive]}
          onPress={() => setActiveTab('buddies')}
        >
          <Text style={[styles.tabText, activeTab === 'buddies' && styles.tabTextActive]}>Add Shinobi</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {/* Weekly Titan Raid Banner */}
        {weeklyTitan && (
          <View style={styles.raidHeroCard}>
            <View style={styles.raidHeader}>
              <View style={styles.raidIconBox}>
                <MaterialCommunityIcons name="skull" size={32} color="#EF4444" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.raidBadge}>WEEKLY CO-OP RAID TITAN</Text>
                <Text style={styles.raidTitle}>{weeklyTitan.name}</Text>
                <Text style={styles.raidSub}>Phase {weeklyTitan.phase} • Bounty: 2,500 Coins</Text>
              </View>
            </View>

            {/* Titan HP Bar */}
            <View style={styles.titanHpContainer}>
              <View style={styles.titanLabelRow}>
                <Text style={styles.titanLabel}>SHARED CLAN RAID HEALTH</Text>
                <Text style={styles.titanHpVal}>
                  {weeklyTitan.currentHp} / {weeklyTitan.maxHp} HP ({titanHpPercent}%)
                </Text>
              </View>
              <View style={styles.titanHpBg}>
                <View style={[styles.titanHpFill, { width: `${titanHpPercent}%` }]} />
              </View>
            </View>

            <Text style={styles.raidDesc}>
              Every habit, task, and study block completed by your clan members deals slashing damage to Akuma!
            </Text>
          </View>
        )}

        {/* Tab 1: Clan Members */}
        {activeTab === 'clan' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shadow Dojo Clan ({friends.length})</Text>
              <Text style={styles.sectionSubtitle}>Companions sharing raid progress & mutual accountability</Text>
            </View>

            {friends.map((f) => (
              <View key={f.friendId} style={styles.friendCard}>
                <View style={styles.friendAvatar}>
                  <MaterialCommunityIcons name="ninja" size={26} color="#00E699" />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.friendName}>{f.displayName}</Text>
                    <Text style={styles.friendTag}>{f.ninjaTag}</Text>
                  </View>
                  <Text style={styles.friendWeapon}>
                    {f.beltRank} • {f.equippedWeaponName}
                  </Text>
                  <Text style={styles.friendStats}>
                    🔥 {f.streakDays}d streak • ⏱️ {Math.round(f.totalFocusMinutes / 60)}h focus • 🏯 Tier {f.castleLevel}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.smokeBtn}
                  onPress={() => handleSendSmokeBomb(f)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="fire" size={16} color="#F59E0B" />
                  <Text style={styles.smokeBtnText}>RESCUE</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Tab 2: Co-Op Raid Live Ticker */}
        {activeTab === 'raid' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Clan Combat Ticker</Text>
              <Text style={styles.sectionSubtitle}>Recent joint attacks on the weekly colossus</Text>
            </View>

            {contributions.length === 0 ? (
              <View style={styles.emptyTicker}>
                <Text style={styles.emptyTickerText}>No attacks recorded yet this week. Complete a task to strike!</Text>
              </View>
            ) : (
              contributions.map((c) => (
                <View key={c.id} style={styles.contribCard}>
                  <MaterialCommunityIcons name="sword" size={18} color="#EF4444" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.contribTitle}>
                      <Text style={{ fontWeight: '800', color: '#00E699' }}>{c.displayName}</Text> dealt {c.damageDealt} damage!
                    </Text>
                    <Text style={styles.contribSub}>{c.actionSummary}</Text>
                  </View>
                  <Text style={styles.contribTime}>Just now</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 3: Add Shinobi */}
        {activeTab === 'buddies' && (
          <View style={styles.addFriendCard}>
            <MaterialCommunityIcons name="account-plus" size={40} color="#00E699" />
            <Text style={styles.addTitle}>Recruit Shinobi Ally</Text>
            <Text style={styles.addSub}>
              Enter a friend's Ninja Tag (e.g. #NINJA-4821) to join forces in Clan Raids.
            </Text>

            <TextInput
              style={styles.tagInput}
              placeholder="#NINJA-XXXX"
              placeholderTextColor="#64748B"
              value={friendTagInput}
              onChangeText={setFriendTagInput}
              autoCapitalize="characters"
            />

            <TouchableOpacity style={styles.sendInviteBtn} onPress={handleAddFriend} activeOpacity={0.8}>
              <Text style={styles.sendInviteText}>SEND ALLIANCE REQUEST</Text>
            </TouchableOpacity>
          </View>
        )}
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#00E699',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  raidHeroCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    padding: 18,
    marginBottom: 20,
  },
  raidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  raidIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  raidBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1.5,
  },
  raidTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  raidSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  titanHpContainer: {
    marginTop: 14,
  },
  titanLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titanLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  titanHpVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  titanHpBg: {
    height: 7,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  titanHpFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  raidDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
    marginTop: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 10,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  friendTag: {
    fontSize: 11,
    color: '#00E699',
    fontWeight: '700',
  },
  friendWeapon: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  friendStats: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  smokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smokeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  contribCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    marginBottom: 8,
  },
  contribTitle: {
    fontSize: 13,
    color: '#F8FAFC',
  },
  contribSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  contribTime: {
    fontSize: 11,
    color: '#475569',
  },
  emptyTicker: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTickerText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  addFriendCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    alignItems: 'center',
  },
  addTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 10,
  },
  addSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
  },
  tagInput: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#00E699',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
  },
  sendInviteBtn: {
    width: '100%',
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendInviteText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#070A11',
    letterSpacing: 1,
  },
});

