import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NinjaPalette } from '../constants/theme';
import { dareService } from '../services/wallet/dare-service';
import { openRazorpayDeposit } from '../services/wallet/razorpay-checkout';
import type { RealMoneyDare } from '../services/wallet/wallet-types';
import { getTodayReelsCount } from 'expo-app-blocker';

const MICRO_STAKES = [1, 2, 5, 10, 25, 50, 100, 250];
const REEL_PRESETS = [3, 5, 10, 15, 20];

export default function RealMoneyDareSection() {
  const [loading, setLoading] = useState(true);
  const [activeDare, setActiveDare] = useState<RealMoneyDare | null>(null);
  const [selectedStake, setSelectedStake] = useState<number>(10);
  const [selectedLimit, setSelectedLimit] = useState<number>(10);
  const [customStakeText, setCustomStakeText] = useState<string>('');
  const [customLimitText, setCustomLimitText] = useState<string>('');
  const [autoRenew, setAutoRenew] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<{ balance: number; escrowBalance: number }>({
    balance: 500,
    escrowBalance: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayReels, setTodayReels] = useState(0);

  const loadDareData = useCallback(async () => {
    try {
      setLoading(true);
      try {
        const liveReels = getTodayReelsCount();
        setTodayReels(liveReels);
      } catch {}

      const autoRenewSetting = await dareService.isAutoRenewEnabled();
      setAutoRenew(autoRenewSetting);

      const res = await dareService.fetchCloudDare();
      if (res.activeDare) {
        setActiveDare(res.activeDare);
      } else {
        const localDare = await dareService.getActiveDare();
        setActiveDare(localDare);
      }

      if (res.wallet) {
        setWalletBalance({
          balance: Math.round(res.wallet.balance / 100),
          escrowBalance: Math.round(res.wallet.escrowBalance / 100),
        });
      }
    } catch (e) {
      console.warn('[DareSection] Error loading dare:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDareData();
    }, 0);
    const interval = setInterval(() => {
      try {
        const live = getTodayReelsCount();
        setTodayReels(live);
        if (activeDare && activeDare.status === 'ACTIVE') {
          dareService.checkDareStatus(live).then((status) => {
            if (status.isBreached && activeDare.status !== 'BREACHED_FORFEIT') {
              loadDareData();
            }
          });
        }
      } catch {}
    }, 4000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [loadDareData, activeDare]);

  const handleDeposit = async (customAmount?: number) => {
    const amountToDeposit = customAmount || 10;
    setIsSubmitting(true);
    try {
      const res = await openRazorpayDeposit(amountToDeposit);
      if (res.success) {
        Alert.alert(
          'Deposit Success! 💰',
          `₹${amountToDeposit} added to your NeuroNinja Escrow Wallet via Razorpay!`
        );
        await loadDareData();
      } else if (!res.cancelled) {
        Alert.alert('Deposit Failed', res.error || 'Payment could not be completed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoRenewToggle = async (val: boolean) => {
    setAutoRenew(val);
    await dareService.setAutoRenewEnabled(val);
  };

  const effectiveStake = customStakeText.trim() ? Math.max(1, parseInt(customStakeText, 10) || 1) : selectedStake;
  const effectiveLimit = customLimitText.trim() ? Math.max(1, parseInt(customLimitText, 10) || 1) : selectedLimit;

  const handleCreateDare = async () => {
    setIsSubmitting(true);
    try {
      const res = await dareService.createDare({
        stakeRupees: effectiveStake,
        targetLimit: effectiveLimit,
        title: `Terminator Dare: Max ${effectiveLimit} Reels`,
      });

      if (res.success && res.dare) {
        Alert.alert(
          '⚡ Dare Activated!',
          `₹${effectiveStake} is now locked in escrow. If you scroll > ${effectiveLimit} reels/shorts today, your stake is forfeited! Stay sharp.`
        );
        setActiveDare(res.dare);
        await loadDareData();
      } else if (res.requiresDeposit) {
        const needed = res.requiredRupees || effectiveStake;
        Alert.alert(
          'Insufficient Escrow Balance',
          `You need ₹${needed} to lock this Dare. Would you like to deposit now via Razorpay (UPI, GPay, PhonePe)?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: `Deposit ₹${needed}`,
              style: 'default',
              onPress: () => handleDeposit(needed),
            },
          ]
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to create Dare');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle1TapRenew = async () => {
    setIsSubmitting(true);
    try {
      const res = await dareService.renewDare(activeDare?.id, effectiveStake, effectiveLimit);
      if (res.success && res.dare) {
        Alert.alert('Streak Rollover! 🔥', `Renewed Dare active for tomorrow with ₹${res.dare.stakeRupees} locked in escrow.`);
        setActiveDare(res.dare);
        await loadDareData();
      } else {
        Alert.alert('Renewal Failed', res.error || 'Could not renew dare');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleVictory = async () => {
    if (!activeDare) return;
    Alert.alert(
      'Claim Dare Victory 🏆',
      `You kept your discipline and stayed under ${activeDare.targetLimit} reels! Ready to reclaim your ₹${activeDare.stakeRupees} stake + 100 bonus XP?`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Claim ₹' + activeDare.stakeRupees,
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const res = await dareService.settleDare('COMPLETE', todayReels, 'Completed successfully');
              Alert.alert('Victory Conquered!', res.message);
              setActiveDare(null);
              await loadDareData();
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleConcede = async () => {
    if (!activeDare) return;
    Alert.alert(
      '⚠️ Forfeit Dare',
      `Giving up will permanently forfeit your ₹${activeDare.stakeRupees} stake to the Anti-Charity & Habit Research Fund. Are you sure?`,
      [
        { text: 'Never Give Up', style: 'cancel' },
        {
          text: 'Concede & Forfeit',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const res = await dareService.settleDare('BREACH', todayReels, 'User conceded dare');
              Alert.alert('Dare Forfeited', res.message);
              setActiveDare(null);
              await loadDareData();
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={NinjaPalette.emerald} />
        <Text style={styles.loadingText}>Syncing Real-Money Escrow...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── 1. Wallet Balance Header ────────────────────────────────────── */}
      <View style={styles.walletBar}>
        <View style={styles.walletLeft}>
          <Text style={styles.walletLabel}>ESCROW WALLET</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceRupees}>₹{walletBalance.balance}</Text>
            {walletBalance.escrowBalance > 0 && (
              <Text style={styles.escrowLocked}>
                (₹{walletBalance.escrowBalance} Locked)
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.depositBtn}
          onPress={() => handleDeposit(10)}
          disabled={isSubmitting}
        >
          <MaterialCommunityIcons name="lightning-bolt" size={16} color="#070A11" />
          <Text style={styles.depositBtnText}>+ Deposit</Text>
        </TouchableOpacity>
      </View>

      {/* ─── 2. Active Dare Card (If Running) ────────────────────────────── */}
      {activeDare && activeDare.status === 'ACTIVE' ? (
        <View style={styles.activeDareCard}>
          <View style={styles.activeBadgeRow}>
            <View style={styles.flameBadge}>
              <Text style={styles.flameIcon}>⚡</Text>
              <Text style={styles.activeDareBadgeText}>ACTIVE DARE IN PROGRESS</Text>
            </View>
            <Text style={styles.stakeAmountBadge}>₹{activeDare.stakeRupees} AT RISK</Text>
          </View>

          <Text style={styles.activeDareTitle}>{activeDare.title}</Text>

          {/* Progress Section */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Today&apos;s Short-Form Video</Text>
              <Text
                style={[
                  styles.progressCount,
                  todayReels > activeDare.targetLimit
                    ? { color: '#EF4444' }
                    : todayReels >= activeDare.targetLimit - 2
                    ? { color: '#F59E0B' }
                    : { color: NinjaPalette.emerald },
                ]}
              >
                {todayReels} / {activeDare.targetLimit} Reels
              </Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(
                      100,
                      (todayReels / Math.max(1, activeDare.targetLimit)) * 100
                    )}%`,
                    backgroundColor:
                      todayReels > activeDare.targetLimit
                        ? '#EF4444'
                        : todayReels >= activeDare.targetLimit - 2
                        ? '#F59E0B'
                        : NinjaPalette.emerald,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.hudSyncRow}>
            <MaterialCommunityIcons name="shield-check" size={16} color={NinjaPalette.emerald} />
            <Text style={styles.hudSyncText}>
              Live Floating HUD warns with ₹{activeDare.stakeRupees} stake on Instagram & YouTube
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.activeActionRow}>
            <TouchableOpacity
              style={styles.settleBtn}
              onPress={handleSettleVictory}
              disabled={isSubmitting}
            >
              <Text style={styles.settleBtnText}>Claim Victory 🏆</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.concedeBtn}
              onPress={handleConcede}
              disabled={isSubmitting}
            >
              <Text style={styles.concedeBtnText}>Forfeit</Text>
            </TouchableOpacity>
          </View>

          {/* 1-Tap Rollover Button */}
          <TouchableOpacity
            style={styles.rolloverBtn}
            onPress={handle1TapRenew}
            disabled={isSubmitting}
          >
            <MaterialCommunityIcons name="cached" size={16} color={NinjaPalette.emerald} />
            <Text style={styles.rolloverBtnText}>1-Tap Rollover / Renew for Tomorrow</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ─── 3. Dare Creator (When No Active Dare) ────────────────────────── */
        <View style={styles.creatorCard}>
          <View style={styles.creatorHeader}>
            <Text style={styles.dareTag}>PSYCHOLOGICAL COMMITMENT</Text>
            <Text style={styles.creatorTitle}>Are You Dare? ⚡</Text>
            <Text style={styles.creatorDesc}>
              Put real money on the line. If you stay under your daily limit, 100% of your stake is returned. If you doomscroll, you forfeit!
            </Text>
          </View>

          {/* Micro-Stake Selector */}
          <Text style={styles.selectorLabel}>1. SELECT REAL-MONEY STAKE (₹)</Text>
          <View style={styles.presetWrap}>
            {MICRO_STAKES.map((stake) => (
              <TouchableOpacity
                key={stake}
                style={[
                  styles.microPresetBtn,
                  selectedStake === stake && !customStakeText && styles.presetBtnSelected,
                ]}
                onPress={() => {
                  setSelectedStake(stake);
                  setCustomStakeText('');
                }}
              >
                <Text
                  style={[
                    styles.presetBtnText,
                    selectedStake === stake && !customStakeText && styles.presetBtnTextSelected,
                  ]}
                >
                  ₹{stake}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Stake Input */}
          <View style={styles.customInputRow}>
            <Text style={styles.customPrefix}>₹</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Or enter any custom amount (e.g. 3, 7, 75)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={customStakeText}
              onChangeText={(text) => setCustomStakeText(text.replace(/[^0-9]/g, ''))}
            />
          </View>

          {/* Target Limit Selector */}
          <Text style={[styles.selectorLabel, { marginTop: 18 }]}>
            2. MAX ALLOWED REELS TODAY
          </Text>
          <View style={styles.presetWrap}>
            {REEL_PRESETS.map((limit) => (
              <TouchableOpacity
                key={limit}
                style={[
                  styles.microPresetBtn,
                  selectedLimit === limit && !customLimitText && styles.presetBtnSelected,
                ]}
                onPress={() => {
                  setSelectedLimit(limit);
                  setCustomLimitText('');
                }}
              >
                <Text
                  style={[
                    styles.presetBtnText,
                    selectedLimit === limit && !customLimitText && styles.presetBtnTextSelected,
                  ]}
                >
                  {limit} Reels
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Reel Limit Input */}
          <View style={styles.customInputRow}>
            <MaterialCommunityIcons name="filmstrip" size={16} color="#64748B" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.customInput}
              placeholder="Or enter custom reel limit (e.g. 1, 2, 7)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={customLimitText}
              onChangeText={(text) => setCustomLimitText(text.replace(/[^0-9]/g, ''))}
            />
          </View>

          {/* Auto-Renew Switch */}
          <View style={styles.autoRenewRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoRenewTitle}>Daily Streak Auto-Renew</Text>
              <Text style={styles.autoRenewSub}>
                Automatically roll over your stake each midnight when successful.
              </Text>
            </View>
            <Switch
              value={autoRenew}
              onValueChange={handleAutoRenewToggle}
              thumbColor={autoRenew ? NinjaPalette.emerald : '#94A3B8'}
              trackColor={{ false: '#1E293B', true: 'rgba(0, 230, 153, 0.4)' }}
            />
          </View>

          {/* Dare Pledge Summary Box */}
          <View style={styles.summaryBox}>
            <MaterialCommunityIcons name="scale-balance" size={20} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>The Ninja Covenant</Text>
              <Text style={styles.summaryText}>
                I pledge ₹{effectiveStake} in escrow. If I watch more than {effectiveLimit} reels/shorts today on Instagram or YouTube, I forfeit ₹{effectiveStake}.
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.activateDareBtn}
            onPress={handleCreateDare}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#070A11" />
            ) : (
              <>
                <MaterialCommunityIcons name="lock" size={18} color="#070A11" />
                <Text style={styles.activateDareBtnText}>
                  Lock ₹{effectiveStake} & Take The Dare
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ─── 4. Legal & Trust Footer ─────────────────────────────────────── */}
      <View style={styles.legalFooter}>
        <MaterialCommunityIcons name="shield-check-outline" size={16} color="#64748B" />
        <Text style={styles.legalText}>
          Non-gambling unilateral commitment contract (Indian Contract Act, 1872). Micro-stakes from ₹1. Automated verification via hardware accessibility.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  centerContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: NinjaPalette.textSecondary,
    fontSize: 12,
  },
  walletBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  walletLeft: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  balanceRupees: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  escrowLocked: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '700',
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: NinjaPalette.emerald,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  depositBtnText: {
    color: '#070A11',
    fontWeight: '900',
    fontSize: 13,
  },
  activeDareCard: {
    backgroundColor: '#121D33',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    padding: 20,
    marginBottom: 16,
  },
  activeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  flameIcon: {
    fontSize: 12,
  },
  activeDareBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  stakeAmountBadge: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  activeDareTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  progressContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  hudSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  hudSyncText: {
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
  },
  activeActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  settleBtn: {
    flex: 2,
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtnText: {
    color: '#070A11',
    fontWeight: '900',
    fontSize: 14,
  },
  concedeBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concedeBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  rolloverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  rolloverBtnText: {
    color: NinjaPalette.emerald,
    fontWeight: '800',
    fontSize: 12,
  },
  creatorCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginBottom: 16,
  },
  creatorHeader: {
    marginBottom: 18,
  },
  dareTag: {
    fontSize: 10,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  creatorTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  creatorDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  microPresetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  presetBtnSelected: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: NinjaPalette.emerald,
  },
  presetBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  presetBtnTextSelected: {
    color: NinjaPalette.emerald,
    fontWeight: '900',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  customPrefix: {
    color: NinjaPalette.emerald,
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  autoRenewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  autoRenewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  autoRenewSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    marginBottom: 18,
  },
  summaryTitle: {
    color: '#F59E0B',
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 2,
  },
  summaryText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  activateDareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 16,
    borderRadius: 14,
  },
  activateDareBtnText: {
    color: '#070A11',
    fontWeight: '900',
    fontSize: 15,
  },
  legalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  legalText: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
