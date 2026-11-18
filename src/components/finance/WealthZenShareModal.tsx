import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NetWorthSummary, EMISafetyInfo } from '../../services/finance/finance-types';

export interface WealthZenShareModalProps {
  visible: boolean;
  onClose: () => void;
  netWorth: NetWorthSummary;
  emiSafety: EMISafetyInfo;
  currencySymbol: string;
}

export function WealthZenShareModal({
  visible,
  onClose,
  netWorth,
  emiSafety,
  currencySymbol,
}: WealthZenShareModalProps) {
  const handleShare = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `🥋 NeuroNinja Shinobi Wealth Status:\n• Net Worth: ${currencySymbol}${netWorth.netWorth.toLocaleString()}\n• Debt-to-Income: ${emiSafety.percentage}% (${emiSafety.status.toUpperCase()})\n• Liquid Runway: ${netWorth.emergencyFundRunwayMonths} months\n\nConquering financial distraction with Neuro Ninja.`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Wealth Card Visual */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.brandRow}>
                <MaterialCommunityIcons name="shield-sword" size={20} color="#00E699" />
                <Text style={styles.brandText}>NEURO NINJA WEALTH ZEN</Text>
              </View>
              <View style={styles.rankPill}>
                <Text style={styles.rankText}>SHINOBI INVESTOR</Text>
              </View>
            </View>

            <View style={styles.netWorthBlock}>
              <Text style={styles.nwLabel}>SOLVENT NET WORTH</Text>
              <Text style={[styles.nwValue, { color: netWorth.netWorth >= 0 ? '#00E699' : '#F43F5E' }]}>
                {currencySymbol}
                {netWorth.netWorth.toLocaleString()}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>LIQUID RUNWAY</Text>
                <Text style={styles.statVal}>{netWorth.emergencyFundRunwayMonths} mos</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>DTI RATIO</Text>
                <Text style={[styles.statVal, { color: emiSafety.status === 'safe' ? '#00E699' : '#F59E0B' }]}>
                  {emiSafety.percentage}%
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>DISCIPLINE</Text>
                <Text style={styles.statVal}>Level 4</Text>
              </View>
            </View>

            <View style={styles.quoteBlock}>
              <Text style={styles.quoteText}>
                &ldquo;True wealth is not abundance of possessions, but quietness of mind and control of impulses.&rdquo;
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <MaterialCommunityIcons name="share-variant" size={18} color="#070A11" />
              <Text style={styles.shareBtnText}>Share Snapshot</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#00E69950',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  rankPill: {
    backgroundColor: '#00E69920',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#00E69940',
  },
  rankText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
  },
  netWorthBlock: {
    alignItems: 'center',
    marginVertical: 24,
  },
  nwLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  nwValue: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#070A11',
    borderRadius: 14,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  quoteBlock: {
    marginTop: 18,
    paddingHorizontal: 8,
  },
  quoteText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  closeBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  shareBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#070A11',
  },
});
