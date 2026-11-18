import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { referralService } from '../../../services/referral/referral-service';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import type { ReferralProfile, ReferralMilestone } from '../../../services/referral/referral-types';

export default function ReferralsScreen() {
  const { handleSmartBack } = useNinjaBack({
    fallbackRoute: '/focus/ghost-launcher',
  });
  const { showToast } = useNinjaAlert();

  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Claim Code State
  const [inputCode, setInputCode] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // Add Buddy Modal State
  const [showAddBuddyModal, setShowAddBuddyModal] = useState<boolean>(false);
  const [buddyName, setBuddyName] = useState<string>('');
  const [buddyEmail, setBuddyEmail] = useState<string>('');
  const [isAddingBuddy, setIsAddingBuddy] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const data = await referralService.getReferralProfile();
      setProfile(data);
    } catch (e) {
      console.error('[ReferralsScreen] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleCopy = async () => {
    if (!profile) return;
    await Clipboard.setStringAsync(profile.referralCode);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({
      title: 'Code Copied!',
      message: `Referral code ${profile.referralCode} copied to clipboard.`,
      type: 'success',
      icon: 'clipboard-check',
    });
  };

  const handleShare = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await referralService.shareInvite();
  };

  const handleClaimCode = async () => {
    if (!inputCode.trim()) {
      showToast({
        title: 'Enter Code',
        message: 'Please type your friend’s referral code.',
        type: 'warning',
        icon: 'alert-circle',
      });
      return;
    }

    setIsClaiming(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const res = await referralService.claimReferralCode(inputCode);
      if (res.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          title: '🎉 Welcome Bonus Claimed!',
          message: res.message,
          type: 'success',
          icon: 'gift',
        });
        setInputCode('');
        await loadData();
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Unable to Claim Code', res.message);
      }
    } catch (e) {
      console.warn('[ReferralsScreen] Claim error:', e);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimMilestone = async (m: ReferralMilestone) => {
    if (!m.isUnlocked || m.isClaimed) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const success = await referralService.claimMilestone(m.milestoneId);
    if (success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        title: '🏆 Milestone Claimed!',
        message: `Claimed ${m.coinsReward} Coins and ${m.xpReward} XP!`,
        type: 'success',
        icon: 'trophy',
      });
      await loadData();
    }
  };

  const handleAddBuddy = async () => {
    if (!buddyName.trim()) {
      Alert.alert('Required Field', 'Please provide your friend’s name.');
      return;
    }

    setIsAddingBuddy(true);
    try {
      await referralService.addBuddy(buddyName, buddyEmail);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        title: 'Ninja Recruited!',
        message: `${buddyName.trim()} has been added to your accountability squad.`,
        type: 'success',
        icon: 'account-plus',
      });
      setBuddyName('');
      setBuddyEmail('');
      setShowAddBuddyModal(false);
      await loadData();
    } catch (e) {
      console.warn('[ReferralsScreen] Add buddy error:', e);
    } finally {
      setIsAddingBuddy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Universal Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Grow Squad</Text>
        <TouchableOpacity
          style={styles.addBuddyHeaderBtn}
          onPress={() => setShowAddBuddyModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={16} color="#00E699" style={{ marginRight: 4 }} />
          <Text style={styles.addBuddyHeaderText}>Add Recruit</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#00E699" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Referral Code Hero Card */}
          <View style={styles.codeCard}>
            <Text style={styles.codeSubtitle}>YOUR EXCLUSIVE NINJA INVITE CODE</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{profile?.referralCode || 'NINJA-9921'}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
                <Ionicons name="copy-outline" size={18} color="#00E699" />
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.codePerk}>
              Give friends 150 Focus Coins + 1 Free Soundscape • Earn 150 Coins + 300 XP when they join!
            </Text>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social" size={18} color="#070A11" style={{ marginRight: 8 }} />
              <Text style={styles.shareBtnText}>Share Invitation Link</Text>
            </TouchableOpacity>
          </View>

          {/* Claim Friend's Code Section */}
          <View style={styles.claimCard}>
            <View style={styles.claimHeader}>
              <MaterialCommunityIcons name="ticket-percent" size={20} color="#38BDF8" />
              <Text style={styles.claimTitle}>HAVE A FRIEND’S INVITE CODE?</Text>
            </View>

            {profile?.hasClaimedInvite ? (
              <View style={styles.claimedSuccessBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#00E699" />
                <Text style={styles.claimedSuccessText}>
                  Claimed with code {profile.claimedCode} (+150 Coins Awarded)
                </Text>
              </View>
            ) : (
              <View style={styles.claimInputRow}>
                <TextInput
                  style={styles.claimInput}
                  placeholder="e.g. NINJA-8472"
                  placeholderTextColor="#64748B"
                  value={inputCode}
                  onChangeText={setInputCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.claimActionBtn, isClaiming && { opacity: 0.6 }]}
                  onPress={handleClaimCode}
                  disabled={isClaiming}
                  activeOpacity={0.8}
                >
                  {isClaiming ? (
                    <ActivityIndicator size="small" color="#070A11" />
                  ) : (
                    <Text style={styles.claimActionText}>Claim 150 Coins</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Milestone Rewards Ladder */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>RECRUITMENT LADDER</Text>
            <Text style={styles.sectionBadge}>
              {profile?.totalQualified ?? 0} Qualified Recruits
            </Text>
          </View>

          <View style={styles.milestonesCard}>
            {profile?.milestones.map((m) => (
              <View
                key={m.milestoneId}
                style={[styles.milestoneRow, m.isUnlocked && styles.milestoneRowActive]}
              >
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
                    {m.isClaimed
                      ? 'Claimed & credited to Focus Wallet'
                      : m.isUnlocked
                      ? 'Unlocked! Ready to claim'
                      : `Invite ${m.friendsCount} friends to unlock`}
                  </Text>
                </View>

                {m.isClaimed ? (
                  <View style={styles.claimedPill}>
                    <Ionicons name="checkmark" size={14} color="#00E699" />
                    <Text style={styles.claimedPillText}>Claimed</Text>
                  </View>
                ) : m.isUnlocked ? (
                  <TouchableOpacity
                    style={styles.claimMilestoneBtn}
                    onPress={() => handleClaimMilestone(m)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.claimMilestoneBtnText}>Claim</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.milestoneRewardBadge}>
                    <Text style={styles.milestoneRewardText}>+{m.coinsReward} 🪙</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Recruits List */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              YOUR NINJA SQUAD ({profile?.totalInvited ?? 0})
            </Text>
            <TouchableOpacity onPress={() => setShowAddBuddyModal(true)}>
              <Text style={styles.quickAddText}>+ Add Friend</Text>
            </TouchableOpacity>
          </View>

          {profile?.buddies && profile.buddies.length > 0 ? (
            profile.buddies.map((buddy) => (
              <View key={buddy.id} style={styles.buddyCard}>
                <View style={styles.buddyAvatar}>
                  <Text style={styles.avatarText}>🥷</Text>
                </View>
                <View style={styles.buddyDetails}>
                  <Text style={styles.buddyName}>{buddy.name}</Text>
                  {buddy.email && <Text style={styles.buddyEmail}>{buddy.email}</Text>}
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
                    {buddy.status === 'qualified' ? '+150 Coins' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={40} color="#334155" />
              <Text style={styles.emptyTitle}>No squad members yet</Text>
              <Text style={styles.emptySub}>
                Share your invitation link with friends or tap Add Recruit to build your accountability squad!
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Buddy Modal */}
      <Modal
        visible={showAddBuddyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddBuddyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Ninja Recruit</Text>
              <TouchableOpacity onPress={() => setShowAddBuddyModal(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Friend&apos;s Full Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. John Doe"
              placeholderTextColor="#64748B"
              value={buddyName}
              onChangeText={setBuddyName}
            />

            <Text style={styles.modalLabel}>Email / Handle (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. john@example.com"
              placeholderTextColor="#64748B"
              value={buddyEmail}
              onChangeText={setBuddyEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, isAddingBuddy && { opacity: 0.6 }]}
              onPress={handleAddBuddy}
              disabled={isAddingBuddy}
              activeOpacity={0.8}
            >
              {isAddingBuddy ? (
                <ActivityIndicator size="small" color="#070A11" />
              ) : (
                <Text style={styles.modalSubmitText}>Save to Squad</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    paddingTop: 12,
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
  addBuddyHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addBuddyHeaderText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 20,
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
  claimCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: 24,
  },
  claimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  claimTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  claimInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  claimInput: {
    flex: 1,
    backgroundColor: '#070A11',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  claimActionBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimActionText: {
    color: '#070A11',
    fontSize: 13,
    fontWeight: '800',
  },
  claimedSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  claimedSuccessText: {
    color: '#00E699',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionBadge: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
  quickAddText: {
    color: '#00E699',
    fontSize: 13,
    fontWeight: '700',
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
    paddingVertical: 12,
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
    backgroundColor: '#1E293B',
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: '700',
  },
  milestoneSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  milestoneRewardBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  milestoneRewardText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  claimMilestoneBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimMilestoneBtnText: {
    color: '#070A11',
    fontSize: 12,
    fontWeight: '800',
  },
  claimedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  claimedPillText: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '700',
  },
  buddyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
  },
  buddyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
  },
  buddyDetails: {
    flex: 1,
  },
  buddyName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  buddyEmail: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 1,
  },
  buddyDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 12,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  modalLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalSubmitBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSubmitText: {
    color: '#070A11',
    fontSize: 15,
    fontWeight: '800',
  },
});
