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
import { walletService } from '../../../services/wallet/wallet-service';
import type {
  WalletBalance,
  WalletTransaction,
  DailyBonusStatus,
} from '../../../services/wallet/wallet-types';

export default function WalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [bonusStatus, setBonusStatus] = useState<DailyBonusStatus | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'earn' | 'spend'>('all');

  const loadData = useCallback(async () => {
    try {
      const [bal, txs, bonus] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(30),
        walletService.getDailyBonusStatus(),
      ]);
      setBalance(bal);
      setTransactions(txs);
      setBonusStatus(bonus);
    } catch (e) {
      console.error('[WalletScreen] load error:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      walletService.getBalance(),
      walletService.getTransactions(30),
      walletService.getDailyBonusStatus(),
    ]).then(([bal, txs, bonus]) => {
      if (isMounted) {
        setBalance(bal);
        setTransactions(txs);
        setBonusStatus(bonus);
      }
    }).catch((e) => console.error('[WalletScreen] load error:', e));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClaimBonus = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const res = await walletService.claimDailyBonus();

    if (res.success) {
      Alert.alert(
        '🥋 Dojo Bonus Claimed!',
        `You claimed +${res.coinsClaimed} Focus Coins! Keep up your daily discipline streak.`
      );
      loadData();
    } else {
      Alert.alert('Bonus Cooldown', res.error || 'Please wait before claiming again.');
    }
  };

  const filteredTxs =
    filterType === 'all'
      ? transactions
      : transactions.filter(t => t.type === filterType);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Focus Wallet</Text>
        <TouchableOpacity
          style={styles.storeShortcut}
          onPress={() => router.push('/lifeos/store' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="cart-outline" size={20} color="#00E699" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cyberpunk Wallet Balance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>TOTAL FOCUS BALANCE</Text>
              <Text style={styles.cardBalance}>🪙 {balance?.coins ?? 0}</Text>
            </View>
            <View style={styles.rankPill}>
              <Text style={styles.rankText}>{balance?.ninjaRank ?? 'Ninja'}</Text>
            </View>
          </View>

          <View style={styles.cardStatsDivider} />

          <View style={styles.cardFooter}>
            <View style={styles.cardFooterCell}>
              <Text style={styles.footerLabel}>KARMA XP</Text>
              <Text style={styles.footerVal}>🥋 {balance?.karmaXp ?? 0}</Text>
            </View>
            <View style={styles.cardFooterCell}>
              <Text style={styles.footerLabel}>STREAK SHIELDS</Text>
              <Text style={styles.footerVal}>🛡️ {balance?.streakShields ?? 0}</Text>
            </View>
            <View style={styles.cardFooterCell}>
              <Text style={styles.footerLabel}>ESCROW PLEDGED</Text>
              <Text style={styles.footerVal}>🔒 {balance?.escrowCoins ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* Daily Bonus Claim Chest */}
        <View style={styles.bonusCard}>
          <View style={styles.bonusLeft}>
            <Text style={styles.bonusBadge}>
              DAY {bonusStatus?.consecutiveDays ?? 1} STREAK
            </Text>
            <Text style={styles.bonusTitle}>Daily Dojo Chest</Text>
            <Text style={styles.bonusSub}>
              +{bonusStatus?.nextRewardCoins ?? 25} Focus Coins & +{bonusStatus?.nextRewardXp ?? 50} XP
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.claimBtn, !bonusStatus?.canClaim && styles.claimBtnDisabled]}
            onPress={handleClaimBonus}
            activeOpacity={0.8}
            disabled={!bonusStatus?.canClaim}
          >
            <Text style={[styles.claimText, !bonusStatus?.canClaim && styles.claimTextDisabled]}>
              {bonusStatus?.canClaim ? 'Claim' : `${bonusStatus?.hoursUntilNextClaim ?? 0}h left`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Earn Guide Pill */}
        <View style={styles.earnGuideBox}>
          <Text style={styles.earnGuideTitle}>HOW TO EARN COINS:</Text>
          <Text style={styles.earnGuideLine}>• Complete Habits with Verifiers: +25 Coins</Text>
          <Text style={styles.earnGuideLine}>• Win Neuro Arena Brain Games: +10 to +30 Coins</Text>
          <Text style={styles.earnGuideLine}>• Complete OKR Goals: +100 to +300 Coins</Text>
          <Text style={styles.earnGuideLine}>• Invite Friends to Join: +100 Coins per friend</Text>
        </View>

        {/* Transactions Ledger */}
        <View style={styles.ledgerHeader}>
          <Text style={styles.sectionTitle}>TRANSACTION LEDGER</Text>
          <View style={styles.filterPills}>
            <TouchableOpacity
              style={[styles.txFilterPill, filterType === 'all' && styles.txFilterPillActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.txFilterText, filterType === 'all' && styles.txFilterTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.txFilterPill, filterType === 'earn' && styles.txFilterPillActive]}
              onPress={() => setFilterType('earn')}
            >
              <Text style={[styles.txFilterText, filterType === 'earn' && styles.txFilterTextActive]}>
                Earned
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.txFilterPill, filterType === 'spend' && styles.txFilterPillActive]}
              onPress={() => setFilterType('spend')}
            >
              <Text style={[styles.txFilterText, filterType === 'spend' && styles.txFilterTextActive]}>
                Spent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredTxs.length > 0 ? (
          filteredTxs.map(tx => {
            const isEarn = tx.amount > 0;
            return (
              <View key={tx.id} style={styles.txRow}>
                <View
                  style={[
                    styles.txIconBox,
                    isEarn
                      ? { backgroundColor: 'rgba(0, 230, 153, 0.12)' }
                      : { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                  ]}
                >
                  <Ionicons
                    name={isEarn ? 'arrow-down-outline' : 'arrow-up-outline'}
                    size={18}
                    color={isEarn ? '#00E699' : '#EF4444'}
                  />
                </View>

                <View style={styles.txDetails}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txDate}>{tx.createdAt.split('T')[0]}</Text>
                </View>

                <Text
                  style={[
                    styles.txAmount,
                    isEarn ? { color: '#00E699' } : { color: '#EF4444' },
                  ]}
                >
                  {isEarn ? `+${tx.amount}` : tx.amount}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color="#334155" />
            <Text style={styles.emptyTitle}>No transactions recorded</Text>
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
  },
  storeShortcut: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardBalance: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '900',
  },
  rankPill: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  rankText: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '800',
  },
  cardStatsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardFooterCell: {
    flex: 1,
  },
  footerLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  footerVal: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  bonusCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    marginBottom: 20,
  },
  bonusLeft: {
    flex: 1,
  },
  bonusBadge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  bonusTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  bonusSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  claimBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  claimBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  claimText: {
    color: '#070A11',
    fontSize: 13,
    fontWeight: '800',
  },
  claimTextDisabled: {
    color: '#64748B',
  },
  earnGuideBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  earnGuideTitle: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  earnGuideLine: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  txFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  txFilterPillActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  txFilterText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  txFilterTextActive: {
    color: '#00E699',
  },
  txRow: {
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 8,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txDesc: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  txDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCard: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
  },
});
