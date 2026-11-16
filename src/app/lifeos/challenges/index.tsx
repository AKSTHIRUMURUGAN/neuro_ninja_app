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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { challengeEngine } from '../../../services/challenges/challenge-engine';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import type { Challenge, UserChallenge } from '../../../services/challenges/challenge-types';

export default function ChallengesScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();

  const [activeTab, setActiveTab] = useState<'active' | 'catalog'>('active');
  const [catalog, setCatalog] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [all, user] = await Promise.all([
        challengeEngine.getChallenges(),
        challengeEngine.getUserChallenges(),
      ]);
      setCatalog(all);
      setUserChallenges(user);
    } catch (e) {
      console.warn('[ChallengesScreen] Load error:', e);
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

  const handleJoin = async (challengeId: string, title: string) => {
    if (joiningId) return;
    setJoiningId(challengeId);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await challengeEngine.joinChallenge(challengeId);
      await loadData();
      setActiveTab('active');
      showToast({
        title: '⚔️ Quest Accepted!',
        message: `You joined "${title}". Progress will auto-track against your real habits and focus.`,
        type: 'success',
        icon: 'sword',
      });
    } catch {
      showToast({
        title: 'Notice',
        message: 'You are already actively enrolled in this challenge.',
        type: 'info',
        icon: 'information-outline',
      });
    } finally {
      setJoiningId(null);
    }
  };

  const handleClaim = async (userChallengeId: string, title: string, coins: number, xp: number) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const ok = await challengeEngine.claimChallengeReward(userChallengeId);
      if (ok) {
        await loadData();
        showToast({
          title: '🏆 BOUNTY CLAIMED!',
          message: `Earned +${coins} Focus Coins & +${xp} XP from "${title}"!`,
          type: 'success',
          icon: 'trophy',
        });
      }
    } catch (e) {
      console.warn('[ChallengesScreen] Claim error:', e);
    }
  };

  const activeQuests = userChallenges.filter((uc) => uc.status === 'in_progress');
  const completedQuests = userChallenges.filter((uc) => uc.status === 'completed');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>MULTI-DAY QUEST ENGINE</Text>
          <Text style={styles.title}>Dynamic Challenges</Text>
        </View>
        <TouchableOpacity style={styles.walletBtn} onPress={() => router.push('/lifeos/wallet' as any)}>
          <MaterialCommunityIcons name="wallet" size={18} color="#00E699" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'active' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('active');
          }}
        >
          <MaterialCommunityIcons
            name="sword-cross"
            size={18}
            color={activeTab === 'active' ? '#00E699' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active Quests ({activeQuests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'catalog' && styles.tabItemActive]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('catalog');
          }}
        >
          <MaterialCommunityIcons
            name="compass-outline"
            size={18}
            color={activeTab === 'catalog' ? '#818CF8' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'catalog' && { color: '#818CF8', fontWeight: '800' }]}>
            Quest Board ({catalog.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {activeTab === 'active' && (
          <View>
            {activeQuests.length === 0 && completedQuests.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="compass-off-outline" size={40} color="#64748B" />
                <Text style={styles.emptyTitle}>No Active Quests</Text>
                <Text style={styles.emptySub}>
                  Browse the Quest Board to embark on multi-day focus challenges with real coin rewards.
                </Text>
                <TouchableOpacity style={styles.browseBtn} onPress={() => setActiveTab('catalog')}>
                  <Text style={styles.browseBtnText}>Explore Quest Board</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {activeQuests.map((uc) => {
                  const percent = Math.min(
                    100,
                    Math.round((uc.currentProgress / (uc.challenge?.targetValue || 1)) * 100)
                  );
                  const isReadyToClaim = percent >= 100 && !uc.rewardClaimed;

                  return (
                    <View key={uc.id} style={styles.questCard}>
                      <View style={styles.questTop}>
                        <View style={styles.badgeBox}>
                          <MaterialCommunityIcons
                            name={(uc.challenge?.badgeIcon as any) || 'shield'}
                            size={24}
                            color="#00E699"
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.questTitle}>{uc.challenge?.title}</Text>
                          <Text style={styles.questDays}>{uc.challenge?.durationDays}-Day Challenge</Text>
                        </View>
                        <View style={styles.rewardPill}>
                          <MaterialCommunityIcons name="circle-multiple" size={12} color="#00E699" />
                          <Text style={styles.rewardPillText}>+{uc.challenge?.coinReward}</Text>
                        </View>
                      </View>

                      <Text style={styles.questDesc}>{uc.challenge?.description}</Text>

                      {/* Progress Bar */}
                      <View style={styles.progSection}>
                        <View style={styles.progLabelRow}>
                          <Text style={styles.progLabel}>QUEST PROGRESS</Text>
                          <Text style={styles.progVal}>
                            {uc.currentProgress} / {uc.challenge?.targetValue} ({percent}%)
                          </Text>
                        </View>
                        <View style={styles.progTrack}>
                          <View style={[styles.progFill, { width: `${percent}%` }]} />
                        </View>
                      </View>

                      {isReadyToClaim ? (
                        <TouchableOpacity
                          style={styles.claimBtn}
                          onPress={() =>
                            handleClaim(
                              uc.id,
                              uc.challenge?.title || '',
                              uc.challenge?.coinReward || 0,
                              uc.challenge?.xpReward || 0
                            )
                          }
                        >
                          <MaterialCommunityIcons name="trophy" size={18} color="#070A11" />
                          <Text style={styles.claimBtnText}>Claim Quest Bounty</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.autoTrackBadge}>
                          <MaterialCommunityIcons name="sync" size={14} color="#64748B" />
                          <Text style={styles.autoTrackText}>Auto-evaluated against real app activity</Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                {completedQuests.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={styles.sectionHeading}>COMPLETED QUESTS</Text>
                    {completedQuests.map((uc) => (
                      <View key={uc.id} style={[styles.questCard, { opacity: 0.75 }]}>
                        <View style={styles.questTop}>
                          <MaterialCommunityIcons name="check-decagram" size={24} color="#00E699" />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.questTitle}>{uc.challenge?.title}</Text>
                            <Text style={styles.questDays}>Completed • Bounty Claimed</Text>
                          </View>
                          <Text style={[styles.rewardPillText, { color: '#00E699' }]}>
                            +{uc.challenge?.coinReward} Coins
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {activeTab === 'catalog' && (
          <View>
            {catalog.map((c) => {
              const isJoined = userChallenges.some((uc) => uc.challengeId === c.id);

              return (
                <View key={c.id} style={styles.catalogCard}>
                  <View style={styles.questTop}>
                    <View style={[styles.badgeBox, { backgroundColor: 'rgba(129, 140, 248, 0.1)' }]}>
                      <MaterialCommunityIcons
                        name={(c.badgeIcon as any) || 'compass'}
                        size={24}
                        color="#818CF8"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.questTitle}>{c.title}</Text>
                      <Text style={styles.questDays}>
                        {c.durationDays} Days • Category: {c.category.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.rewardPill}>
                      <MaterialCommunityIcons name="circle-multiple" size={12} color="#00E699" />
                      <Text style={styles.rewardPillText}>+{c.coinReward} Coins</Text>
                    </View>
                  </View>

                  <Text style={styles.questDesc}>{c.description}</Text>

                  <View style={styles.catalogMetaRow}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="bullseye-arrow" size={14} color="#94A3B8" />
                      <Text style={styles.metaText}>Target: {c.targetValue} units</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="star-four-points" size={14} color="#818CF8" />
                      <Text style={styles.metaText}>+{c.xpReward} XP</Text>
                    </View>
                  </View>

                  {isJoined ? (
                    <View style={styles.enrolledBadge}>
                      <MaterialCommunityIcons name="check" size={16} color="#00E699" />
                      <Text style={styles.enrolledText}>Enrolled & Tracking</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.joinBtn}
                      onPress={() => handleJoin(c.id, c.title)}
                      disabled={joiningId === c.id}
                    >
                      <MaterialCommunityIcons name="sword" size={16} color="#070A11" />
                      <Text style={styles.joinBtnText}>
                        {joiningId === c.id ? 'Joining...' : 'Accept Quest'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
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
    color: '#00E699',
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
  tabTextActive: {
    color: '#00E699',
    fontWeight: '800',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  questCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  catalogCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  questTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  questDays: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00E699',
  },
  questDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 10,
    lineHeight: 18,
  },
  progSection: {
    marginTop: 14,
  },
  progLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  progVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  progTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: '#00E699',
    borderRadius: 4,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00E699',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#070A11',
  },
  autoTrackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  autoTrackText: {
    fontSize: 11,
    color: '#64748B',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  catalogMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#818CF8',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  joinBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#070A11',
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  enrolledText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E699',
  },
  emptyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  browseBtn: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  browseBtnText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '800',
  },
});
