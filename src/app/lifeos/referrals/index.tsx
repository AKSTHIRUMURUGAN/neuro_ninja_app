import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { referralService } from '../../../services/referral/referral-service';
import type { ReferralProfile } from '../../../services/referral/referral-types';

export default function ReferralsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ReferralProfile | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await referralService.getReferralProfile();
      setProfile(data);
    } catch (e) {
      console.error('[ReferralsScreen] load error:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    referralService
      .getReferralProfile()
      .then(data => {
        if (isMounted) {
          setProfile(data);
        }
      })
      .catch(e => {
        console.error('[ReferralsScreen] load error:', e);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = async () => {
    if (!profile) return;
    await Clipboard.setStringAsync(profile.referralCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', `Referral code ${profile.referralCode} copied to clipboard.`);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await referralService.shareInvite();
  };

  const handleSimulateInvite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const mockNames = ['Arun K.', 'Priya M.', 'Vikram S.', 'Divya R.', 'Anand T.'];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
    const buddy = await referralService.recordInvite(randomName);

    // Automatically qualify to test coin payout
    await referralService.qualifyBuddy(buddy.id);
    Alert.alert(
      '🎉 Friend Recruited!',
      `${randomName} joined via your referral and completed their 1st habit! +100 Focus Coins awarded to your wallet.`
    );
    loadData();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <TouchableOpacity
          style={styles.simulateBtn}
          onPress={handleSimulateInvite}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={16} color="#070A11" style={{ marginRight: 4 }} />
          <Text style={styles.simulateText}>Test Invite</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Referral Code Hero Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeSubtitle}>YOUR EXCLUSIVE REFERRAL CODE</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{profile?.referralCode || 'NINJA-9921'}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={18} color="#00E699" />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codePerk}>
            Give friends 100 Focus Coins • Earn 100 Coins + 200 XP for every friend who joins
          </Text>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social" size={18} color="#070A11" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>Share Invitation Link</Text>
          </TouchableOpacity>
        </View>

        {/* Milestone Rewards Ladder */}
        <Text style={styles.sectionTitle}>RECRUITMENT LADDER</Text>
        <View style={styles.milestonesCard}>
          {profile?.milestones.map((m, idx) => (
            <View key={idx} style={[styles.milestoneRow, m.isUnlocked && styles.milestoneRowActive]}>
              <View
                style={[
                  styles.milestoneDot,
                  m.isUnlocked && { backgroundColor: '#00E699', borderColor: '#00E699' },
                ]}
              >
                <Ionicons
                  name={m.isUnlocked ? 'checkmark' : 'lock-closed'}
                  size={12}
                  color={m.isUnlocked ? '#070A11' : '#64748B'}
                />
              </View>

              <View style={styles.milestoneInfo}>
                <Text style={[styles.milestoneTitle, m.isUnlocked && { color: '#F8FAFC' }]}>
                  {m.friendsCount} Friend{m.friendsCount > 1 ? 's' : ''} ({m.rewardTitle})
                </Text>
                <Text style={styles.milestoneSub}>
                  {m.isUnlocked ? '✅ Milestone Reached' : `Invite ${m.friendsCount} friends to unlock`}
                </Text>
              </View>

              <View style={styles.milestoneRewardBadge}>
                <Text style={styles.milestoneRewardText}>+{m.coinsReward} 🪙</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Invited Buddies List */}
        <Text style={styles.sectionTitle}>
          YOUR RECRUITS ({profile?.totalInvited ?? 0})
        </Text>
        {profile?.buddies && profile.buddies.length > 0 ? (
          profile.buddies.map(buddy => (
            <View key={buddy.id} style={styles.buddyCard}>
              <View style={styles.buddyAvatar}>
                <Text style={styles.avatarText}>🥷</Text>
              </View>
              <View style={styles.buddyDetails}>
                <Text style={styles.buddyName}>{buddy.name}</Text>
                <Text style={styles.buddyDate}>Invited {buddy.invitedAt.split('T')[0]}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  buddy.status === 'qualified'
                    ? { backgroundColor: 'rgba(0, 230, 153, 0.15)' }
                    : { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    buddy.status === 'qualified' ? { color: '#00E699' } : { color: '#F59E0B' },
                  ]}
                >
                  {buddy.status === 'qualified' ? '+100 Coins' : 'Pending'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color="#334155" />
            <Text style={styles.emptyTitle}>No friends invited yet</Text>
            <Text style={styles.emptySub}>
              Share your link or tap Test Invite above to recruit your first ninja buddy!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  simulateText: {
    color: '#070A11',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  codeCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    marginBottom: 24,
  },
  codeSubtitle: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  codeText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyText: {
    color: '#00E699',
    fontSize: 13,
    fontWeight: '700',
  },
  codePerk: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#070A11',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  milestonesCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  milestoneRowActive: {
    opacity: 1,
  },
  milestoneDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#070A11',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  milestoneSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  milestoneRewardBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  milestoneRewardText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  buddyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  buddyAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#070A11',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarText: {
    fontSize: 20,
  },
  buddyDetails: {
    flex: 1,
  },
  buddyName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  buddyDate: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
