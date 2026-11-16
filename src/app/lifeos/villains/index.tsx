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
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import type { DailyVillain, WeeklyVillain, CombatLog } from '../../../services/villains/villain-types';

export default function VillainsScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'logs'>('daily');
  const [daily, setDaily] = useState<DailyVillain | null>(null);
  const [weekly, setWeekly] = useState<WeeklyVillain | null>(null);
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isAttacking, setIsAttacking] = useState<boolean>(false);

  const loadVillainData = useCallback(async () => {
    try {
      const [d, w, l] = await Promise.all([
        villainEngine.getActiveDailyVillain(),
        villainEngine.getActiveWeeklyVillain(),
        villainEngine.getCombatLogs(25),
      ]);
      setDaily(d);
      setWeekly(w);
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

  const handleManualTestStrike = async () => {
    if (isAttacking) return;
    setIsAttacking(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const res = await villainEngine.dealDamage('pomodoro', 60, 'Focus Katana Strike');
      await loadVillainData();

      if (res.dailyDefeated) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          title: '⚔️ BOSS VANQUISHED!',
          message: `You dealt 60 damage and defeated ${daily?.name}! Bounty claimed: +${res.coinsEarned} Coins, +${res.xpEarned} XP`,
          type: 'success',
          icon: 'trophy',
        });
      } else {
        showToast({
          title: '⚔️ Direct Strike!',
          message: `Dealt -${res.damageDealt} HP to ${daily?.name}. Remaining: ${res.dailyRemainingHp} HP`,
          type: 'info',
          icon: 'sword',
        });
      }
    } catch (e) {
      console.warn('[VillainsScreen] Attack error:', e);
    } finally {
      setIsAttacking(false);
    }
  };

  const dailyHpPercent = daily && daily.maxHp > 0
    ? Math.max(0, Math.min(100, Math.round((daily.currentHp / daily.maxHp) * 100)))
    : 0;

  const weeklyHpPercent = weekly && weekly.maxHp > 0
    ? Math.max(0, Math.min(100, Math.round((weekly.currentHp / weekly.maxHp) * 100)))
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>GAMIFIED BOSS ARENA</Text>
          <Text style={styles.title}>Villains & Raid Titans</Text>
        </View>
        <TouchableOpacity style={styles.walletBtn} onPress={() => router.push('/lifeos/wallet' as any)}>
          <MaterialCommunityIcons name="wallet" size={18} color="#00E699" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'daily' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('daily');
          }}
        >
          <MaterialCommunityIcons
            name="skull-outline"
            size={18}
            color={activeTab === 'daily' ? '#EF4444' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'daily' && { color: '#EF4444', fontWeight: '800' }]}>
            Daily Boss
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'weekly' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('weekly');
          }}
        >
          <MaterialCommunityIcons
            name="crown"
            size={18}
            color={activeTab === 'weekly' ? '#818CF8' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'weekly' && { color: '#818CF8', fontWeight: '800' }]}>
            Weekly Raid
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'logs' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('logs');
          }}
        >
          <MaterialCommunityIcons
            name="history"
            size={18}
            color={activeTab === 'logs' ? '#00E699' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'logs' && { color: '#00E699', fontWeight: '800' }]}>
            Combat Feed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {activeTab === 'daily' && daily && (
          <View>
            {/* Daily Boss Card */}
            <View style={[styles.bossCard, { borderColor: daily.status === 'defeated' ? '#00E699' : daily.themeColor }]}>
              <View style={styles.bossAvatarCircle}>
                <MaterialCommunityIcons
                  name={(daily.avatarSymbol as any) || 'fire'}
                  size={48}
                  color={daily.status === 'defeated' ? '#00E699' : daily.themeColor}
                />
              </View>

              <View style={styles.elementTag}>
                <Text style={styles.elementText}>ELEMENT: {daily.element.toUpperCase()}</Text>
              </View>

              <Text style={styles.bossName}>{daily.name}</Text>
              <Text style={styles.bossTitle}>{daily.title}</Text>
              <Text style={styles.bossDesc}>{daily.description}</Text>

              {/* Status Badge */}
              <View style={[
                styles.statusBadge,
                { backgroundColor: daily.status === 'defeated' ? 'rgba(0, 230, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: daily.status === 'defeated' ? '#00E699' : '#EF4444' }
                ]}>
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
                        backgroundColor: dailyHpPercent > 50 ? '#EF4444' : dailyHpPercent > 20 ? '#F59E0B' : '#00E699',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Bounty Info */}
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
                </View>
              </View>

              {/* Attack Action */}
              {daily.status === 'active' && (
                <TouchableOpacity
                  style={[styles.strikeBtn, isAttacking && { opacity: 0.6 }]}
                  onPress={handleManualTestStrike}
                  disabled={isAttacking}
                >
                  <MaterialCommunityIcons name="sword-cross" size={20} color="#070A11" />
                  <Text style={styles.strikeBtnText}>
                    {isAttacking ? 'Striking...' : 'Execute Focus Strike (-60 HP)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* How to damage boss explainer */}
            <View style={styles.explainerCard}>
              <Text style={styles.explainerTitle}>HOW COMBAT WORKS</Text>
              <View style={styles.combatRuleRow}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#00E699" />
                <Text style={styles.combatRuleText}>Complete a Habit: -50 Boss HP</Text>
              </View>
              <View style={styles.combatRuleRow}>
                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color="#06B6D4" />
                <Text style={styles.combatRuleText}>Complete a LifeOS Task: -40 Boss HP</Text>
              </View>
              <View style={styles.combatRuleRow}>
                <MaterialCommunityIcons name="timer-sand" size={16} color="#818CF8" />
                <Text style={styles.combatRuleText}>Complete 25m Pomodoro: -80 Boss HP</Text>
              </View>
              <View style={styles.combatRuleRow}>
                <MaterialCommunityIcons name="alert-octagon" size={16} color="#EF4444" />
                <Text style={styles.combatRuleText}>Breach a Blocked App: Boss attacks User HP!</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'weekly' && weekly && (
          <View>
            {/* Weekly Titan Card */}
            <View style={[styles.bossCard, { borderColor: '#818CF8' }]}>
              <View style={[styles.bossAvatarCircle, { backgroundColor: 'rgba(129, 140, 248, 0.1)' }]}>
                <FontAwesome5 name="dragon" size={44} color="#818CF8" />
              </View>

              <View style={[styles.elementTag, { backgroundColor: 'rgba(129, 140, 248, 0.2)' }]}>
                <Text style={[styles.elementText, { color: '#818CF8' }]}>WEEKLY TITAN RAID</Text>
              </View>

              <Text style={styles.bossName}>{weekly.name}</Text>
              <Text style={styles.bossTitle}>{weekly.title}</Text>
              <Text style={styles.bossDesc}>{weekly.description}</Text>

              {/* Phase Indicator */}
              <View style={styles.phaseContainer}>
                <Text style={styles.phaseHeading}>BOSS PHASE: {weekly.phase} / 3</Text>
                <View style={styles.phaseDots}>
                  <View style={[styles.phaseDot, weekly.phase >= 1 && styles.phaseDotActive]} />
                  <View style={[styles.phaseDot, weekly.phase >= 2 && styles.phaseDotActive]} />
                  <View style={[styles.phaseDot, weekly.phase >= 3 && styles.phaseDotActive]} />
                </View>
              </View>

              {/* HP Bar */}
              <View style={styles.hpSection}>
                <View style={styles.hpLabelRow}>
                  <Text style={styles.hpTitle}>TITAN RAID HP</Text>
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

              {/* Titan Bounty */}
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

        {activeTab === 'logs' && (
          <View>
            <View style={styles.inboxHeader}>
              <Text style={styles.inboxTitle}>Combat History ({logs.length})</Text>
              <Text style={styles.inboxSub}>Real-Time Battle Feed</Text>
            </View>

            {logs.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="sword" size={36} color="#64748B" />
                <Text style={styles.emptyTitle}>No Combat Records Yet</Text>
                <Text style={styles.emptySub}>
                  Complete habits, tasks, or pomodoros to deal damage to the active villain.
                </Text>
              </View>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <MaterialCommunityIcons
                    name={log.damageDealt > 0 ? 'sword' : 'shield-alert'}
                    size={20}
                    color={log.damageDealt > 0 ? '#00E699' : '#EF4444'}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.logText}>{log.logText}</Text>
                    <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleTimeString()}</Text>
                  </View>
                  <Text style={[styles.logDmg, { color: log.damageDealt > 0 ? '#00E699' : '#EF4444' }]}>
                    {log.damageDealt > 0 ? `-${log.damageDealt} HP` : `+${log.counterDamage} DMG`}
                  </Text>
                </View>
              ))
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  walletBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  bossCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  bossAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  elementTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  elementText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bossName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  bossTitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  bossDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  hpNumbers: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  hpTrack: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    borderRadius: 6,
  },
  bountyBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bountyHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  strikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 18,
  },
  strikeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  explainerCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  explainerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  combatRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  combatRuleText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  phaseContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  phaseHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 0.5,
  },
  phaseDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  phaseDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  phaseDotActive: {
    backgroundColor: '#818CF8',
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  inboxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  inboxSub: {
    fontSize: 11,
    color: '#64748B',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  logTime: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  logDmg: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
