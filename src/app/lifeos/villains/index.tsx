import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { villainEngine } from '../../../services/villains/villain-engine';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import type {
  DailyVillain,
  WeeklyVillain,
  CombatLog,
  PlayerRpgProfile,
} from '../../../services/villains/villain-types';

export default function VillainsScreen() {
  const { handleSmartBack } = useNinjaBack({
    fallbackRoute: '/focus/ghost-launcher',
  });
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'profile' | 'logs'>('daily');
  const [daily, setDaily] = useState<DailyVillain | null>(null);
  const [weekly, setWeekly] = useState<WeeklyVillain | null>(null);
  const [player, setPlayer] = useState<PlayerRpgProfile | null>(null);
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadVillainData = useCallback(async () => {
    try {
      const [d, w, p, l] = await Promise.all([
        villainEngine.getActiveDailyVillain(),
        villainEngine.getActiveWeeklyVillain(),
        villainEngine.getPlayerRpgProfile(),
        villainEngine.getCombatLogs(30),
      ]);
      setDaily(d);
      setWeekly(w);
      setPlayer(p);
      setLogs(l);
    } catch (e) {
      console.warn('[VillainsScreen] Load error:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadVillainData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadVillainData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVillainData();
    setRefreshing(false);
  };

  const dailyHpPercent =
    daily && daily.maxHp > 0
      ? Math.max(0, Math.min(100, Math.round((daily.currentHp / daily.maxHp) * 100)))
      : 0;

  const weeklyHpPercent =
    weekly && weekly.maxHp > 0
      ? Math.max(0, Math.min(100, Math.round((weekly.currentHp / weekly.maxHp) * 100)))
      : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>GAMIFIED FOCUS ARENA</Text>
          <Text style={styles.title}>Villains & Raid Titans</Text>
        </View>
        <TouchableOpacity
          style={styles.walletBtn}
          onPress={() => router.push('/lifeos/wallet' as any)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="wallet" size={18} color="#00E699" />
        </TouchableOpacity>
      </View>

      {/* Player RPG HUD Card */}
      {player && (
        <View style={styles.hudCard}>
          <View style={styles.hudTopRow}>
            <View style={styles.weaponBadge}>
              <MaterialCommunityIcons
                name={(player.equippedWeapon.icon as any) || 'sword'}
                size={16}
                color="#00E699"
              />
              <Text style={styles.weaponText}>
                {player.equippedWeapon.name} ({player.equippedWeapon.multiplier}x DMG)
              </Text>
            </View>
            <View style={styles.shardBadge}>
              <MaterialCommunityIcons name="rhombus-split" size={14} color="#38BDF8" />
              <Text style={styles.shardText}>{player.soulShards} Soul Shards</Text>
            </View>
          </View>

          {/* Shield HP */}
          <View style={styles.shieldRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.shieldTitle}>FOCUS SHIELD DURABILITY</Text>
              <Text style={styles.shieldNumbers}>
                {player.shieldHp} / {player.maxShieldHp} HP
              </Text>
            </View>
            <View style={styles.shieldTrack}>
              <View
                style={[
                  styles.shieldFill,
                  {
                    width: `${Math.max(0, player.shieldHp)}%`,
                    backgroundColor: player.shieldHp > 40 ? '#00E699' : '#EF4444',
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'daily' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('daily');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>
            Daily Villain
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'weekly' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('weekly');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
            Raid Titan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('profile');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            Hall of Slayers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'logs' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('logs');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>
            Logs
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {/* Daily Villain View */}
        {activeTab === 'daily' && daily && (
          <View>
            {/* Enrage Warning Banner */}
            {daily.isEnraged && (
              <View style={styles.enrageBanner}>
                <MaterialCommunityIcons name="fire-alert" size={20} color="#EF4444" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.enrageTitle}>🔥 ENRAGE MODE ACTIVE (AFTER 8 PM)</Text>
                  <Text style={styles.enrageSub}>
                    Villain attacks with 2x fury! Defeat before midnight to claim DOUBLED bounties!
                  </Text>
                </View>
              </View>
            )}

            {/* Boss Card */}
            <View style={[styles.bossCard, { borderColor: daily.themeColor }]}>
              <View
                style={[
                  styles.bossAvatarCircle,
                  { backgroundColor: `${daily.themeColor}20`, borderColor: daily.themeColor },
                ]}
              >
                <MaterialCommunityIcons
                  name={(daily.avatarSymbol as any) || 'skull'}
                  size={46}
                  color={daily.themeColor}
                />
              </View>

              <View style={[styles.elementTag, { backgroundColor: `${daily.themeColor}25` }]}>
                <Text style={[styles.elementText, { color: daily.themeColor }]}>
                  {daily.element.toUpperCase()} ARCH-DEMON
                </Text>
              </View>

              <Text style={styles.bossName}>{daily.name}</Text>
              <Text style={styles.bossTitle}>{daily.title}</Text>
              <Text style={styles.bossDesc}>{daily.description}</Text>

              <View
                style={[
                  styles.statusPill,
                  daily.status === 'defeated'
                    ? { backgroundColor: 'rgba(0, 230, 153, 0.15)' }
                    : { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    daily.status === 'defeated' ? { color: '#00E699' } : { color: '#EF4444' },
                  ]}
                >
                  {daily.status === 'defeated' ? '⚔️ DEFEATED TODAY' : '🔥 ACTIVE TARGET'}
                </Text>
              </View>

              {/* HP Bar */}
              <View style={styles.hpSection}>
                <View style={styles.hpLabelRow}>
                  <Text style={styles.hpTitle}>VILLAIN HEALTH</Text>
                  <Text style={styles.hpNumbers}>
                    {daily.currentHp} / {daily.maxHp} HP ({dailyHpPercent}%)
                  </Text>
                </View>
                <View style={styles.hpTrack}>
                  <View
                    style={[
                      styles.hpFill,
                      {
                        width: `${dailyHpPercent}%`,
                        backgroundColor:
                          dailyHpPercent > 50 ? '#EF4444' : dailyHpPercent > 20 ? '#F59E0B' : '#00E699',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Defeat Bounty */}
              <View style={styles.bountyBox}>
                <Text style={styles.bountyHeading}>DEFEAT BOUNTY</Text>
                <View style={styles.bountyRow}>
                  <View style={styles.bountyItem}>
                    <MaterialCommunityIcons name="circle-multiple" size={16} color="#00E699" />
                    <Text style={styles.bountyVal}>+{daily.coinsBounty} Coins</Text>
                  </View>
                  <View style={styles.bountyItem}>
                    <MaterialCommunityIcons name="star-four-points" size={16} color="#818CF8" />
                    <Text style={styles.bountyVal}>+{daily.xpBounty} XP</Text>
                  </View>
                  <View style={styles.bountyItem}>
                    <MaterialCommunityIcons name="rhombus-split" size={16} color="#38BDF8" />
                    <Text style={styles.bountyVal}>+1 Soul Shard</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Real Focus Combat Actions Card (Zero Mocks) */}
            <View style={styles.actionCard}>
              <Text style={styles.actionCardTitle}>ENGAGE IN COMBAT VIA REAL FOCUS</Text>
              <Text style={styles.actionCardSub}>
                Every real productive action in NeuroNinja deals massive damage to the villain:
              </Text>

              <TouchableOpacity
                style={styles.focusActionBtn}
                onPress={() => router.push('/focus/pomodoro' as any)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="timer-sand" size={20} color="#00E699" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.focusActionTitle}>Launch Pomodoro Session</Text>
                  <Text style={styles.focusActionSub}>25m Deep Work deals 250 DMG with equipped weapon</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.focusActionBtn}
                onPress={() => router.push('/(tabs)/lifeos' as any)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color="#38BDF8" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.focusActionTitle}>Complete Today&apos;s Habits</Text>
                  <Text style={styles.focusActionSub}>Each checked habit deals 50 Holy Strike DMG</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.focusActionBtn}
                onPress={() => router.push('/dojo-games' as any)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="sword-cross" size={20} color="#F59E0B" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.focusActionTitle}>Ninja Brain Arcade</Text>
                  <Text style={styles.focusActionSub}>Sharp cognitive reflexes deal 60 Critical DMG</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Weekly Titan Raid View */}
        {activeTab === 'weekly' && weekly && (
          <View>
            <View style={[styles.bossCard, { borderColor: '#818CF8' }]}>
              <View style={[styles.bossAvatarCircle, { backgroundColor: 'rgba(129, 140, 248, 0.1)', borderColor: '#818CF8' }]}>
                <FontAwesome5 name="dragon" size={44} color="#818CF8" />
              </View>

              <View style={[styles.elementTag, { backgroundColor: 'rgba(129, 140, 248, 0.2)' }]}>
                <Text style={[styles.elementText, { color: '#818CF8' }]}>WEEKLY WORLD RAID TITAN</Text>
              </View>

              <Text style={styles.bossName}>{weekly.name}</Text>
              <Text style={styles.bossTitle}>{weekly.title}</Text>
              <Text style={styles.bossDesc}>{weekly.description}</Text>

              {/* Phase Indicator */}
              <View style={styles.phaseContainer}>
                <Text style={styles.phaseHeading}>TITAN BATTLE PHASE: {weekly.phase} / 3</Text>
                <View style={styles.phaseDots}>
                  <View style={[styles.phaseDot, weekly.phase >= 1 && styles.phaseDotActive]} />
                  <View style={[styles.phaseDot, weekly.phase >= 2 && styles.phaseDotActive]} />
                  <View style={[styles.phaseDot, weekly.phase >= 3 && styles.phaseDotActive]} />
                </View>
              </View>

              {/* HP Bar */}
              <View style={styles.hpSection}>
                <View style={styles.hpLabelRow}>
                  <Text style={styles.hpTitle}>WORLD TITAN RAID HP</Text>
                  <Text style={styles.hpNumbers}>
                    {weekly.currentHp} / {weekly.maxHp} HP ({weeklyHpPercent}%)
                  </Text>
                </View>
                <View style={styles.hpTrack}>
                  <View
                    style={[
                      styles.hpFill,
                      {
                        width: `${weeklyHpPercent}%`,
                        backgroundColor: '#818CF8',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Bounty */}
              <View style={styles.bountyBox}>
                <Text style={styles.bountyHeading}>TITAN VANQUISH REWARDS</Text>
                <View style={styles.bountyRow}>
                  <View style={styles.bountyItem}>
                    <MaterialCommunityIcons name="circle-multiple" size={16} color="#00E699" />
                    <Text style={styles.bountyVal}>+{weekly.coinsBounty} Coins</Text>
                  </View>
                  <View style={styles.bountyItem}>
                    <MaterialCommunityIcons name="star-four-points" size={16} color="#818CF8" />
                    <Text style={styles.bountyVal}>+{weekly.xpBounty} XP</Text>
                  </View>
                  <View style={styles.bountyItem}>
                    <MaterialCommunityIcons name="trophy-award" size={16} color="#F59E0B" />
                    <Text style={styles.bountyVal}>{weekly.trophyTitle}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Hall of Slayers / Profile View */}
        {activeTab === 'profile' && player && (
          <View>
            <View style={styles.trophyHeroCard}>
              <MaterialCommunityIcons name="trophy" size={44} color="#F59E0B" />
              <Text style={styles.trophyHeroTitle}>Hall of Slayers</Text>
              <Text style={styles.trophyHeroSub}>Your permanent combat record against dopamine arch-demons</Text>

              <View style={styles.trophyStatsGrid}>
                <View style={styles.trophyStatBox}>
                  <Text style={styles.trophyStatNum}>{player.vanquishedDailyCount}</Text>
                  <Text style={styles.trophyStatLabel}>Daily Bosses Slayed</Text>
                </View>
                <View style={styles.trophyStatBox}>
                  <Text style={styles.trophyStatNum}>{player.vanquishedWeeklyCount}</Text>
                  <Text style={styles.trophyStatLabel}>World Titans Vanquished</Text>
                </View>
                <View style={styles.trophyStatBox}>
                  <Text style={styles.trophyStatNum}>{player.soulShards}</Text>
                  <Text style={styles.trophyStatLabel}>Soul Shards Kept</Text>
                </View>
              </View>
            </View>

            <View style={styles.armoryCard}>
              <Text style={styles.armoryTitle}>EQUIPPED WEAPONRY</Text>
              <View style={styles.weaponRow}>
                <View style={styles.weaponIconBox}>
                  <MaterialCommunityIcons
                    name={(player.equippedWeapon.icon as any) || 'sword'}
                    size={28}
                    color="#00E699"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weaponMainName}>{player.equippedWeapon.name}</Text>
                  <Text style={styles.weaponMainDesc}>
                    Focus damage multiplier: {player.equippedWeapon.multiplier}x damage per focus action.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Combat History Logs */}
        {activeTab === 'logs' && (
          <View>
            <View style={styles.inboxHeader}>
              <Text style={styles.inboxTitle}>Combat History ({logs.length})</Text>
            </View>
            {logs.length > 0 ? (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logIcon}>
                    <MaterialCommunityIcons
                      name={log.damageDealt > 0 ? 'sword' : 'shield-alert'}
                      size={18}
                      color={log.damageDealt > 0 ? '#00E699' : '#EF4444'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logText}>{log.logText}</Text>
                    <Text style={styles.logDate}>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="sword-cross" size={40} color="#334155" />
                <Text style={styles.emptyTitle}>No Combat Logs Yet</Text>
                <Text style={styles.emptySub}>Complete a Pomodoro session or habit to strike your first blow!</Text>
              </View>
            )}
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  walletBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudCard: {
    backgroundColor: '#0F1829',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  hudTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weaponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  weaponText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
  shardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shardText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  shieldRow: {
    marginTop: 4,
  },
  shieldTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  shieldNumbers: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  shieldTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  shieldFill: {
    height: '100%',
    borderRadius: 3,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
  },
  tabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#00E699',
    fontWeight: '800',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  enrageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  enrageTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  enrageSub: {
    color: '#FCA5A5',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  bossCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 20,
  },
  bossAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  elementTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  elementText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bossName: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
  },
  bossTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  bossDesc: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  hpSection: {
    width: '100%',
    marginTop: 18,
  },
  hpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hpTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hpNumbers: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  hpTrack: {
    height: 10,
    backgroundColor: '#1E293B',
    borderRadius: 5,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    borderRadius: 5,
  },
  bountyBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
  },
  bountyHeading: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  bountyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bountyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bountyVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  actionCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  actionCardTitle: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  actionCardSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  focusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  focusActionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  focusActionSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  phaseContainer: {
    marginTop: 14,
    alignItems: 'center',
  },
  phaseHeading: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  phaseDots: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
  },
  phaseDotActive: {
    backgroundColor: '#818CF8',
  },
  trophyHeroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 20,
  },
  trophyHeroTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
  },
  trophyHeroSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  trophyStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  trophyStatBox: {
    flex: 1,
    backgroundColor: '#070A11',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  trophyStatNum: {
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: '900',
  },
  trophyStatLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  armoryCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  armoryTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
  },
  weaponIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  weaponMainName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  weaponMainDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  inboxHeader: {
    marginBottom: 12,
  },
  inboxTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  logDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
