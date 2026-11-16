import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GameResultsModalProps {
  visible: boolean;
  score: number;
  stars: number; // 1, 2, or 3
  coinsEarned: number;
  xpEarned: number;
  durationSeconds: number;
  onPlayAgain: () => void;
  onExit: () => void;
  title: string;
}

export function GameResultsModal({
  visible,
  score,
  stars,
  coinsEarned,
  xpEarned,
  durationSeconds,
  onPlayAgain,
  onExit,
  title,
}: GameResultsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header Trophy Banner */}
          <View style={styles.headerBadge}>
            <Ionicons name="trophy" size={32} color="#F59E0B" />
          </View>

          <Text style={styles.congratsTitle}>ROUND COMPLETE!</Text>
          <Text style={styles.gameSubtitle}>{title}</Text>

          {/* Star Rating Display */}
          <View style={styles.starsRow}>
            {[1, 2, 3].map(s => (
              <Ionicons
                key={s}
                name={s <= stars ? 'star' : 'star-outline'}
                size={34}
                color={s <= stars ? '#F59E0B' : '#334155'}
                style={styles.starIcon}
              />
            ))}
          </View>

          {/* Metric Highlights */}
          <View style={styles.metricGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>SCORE</Text>
              <Text style={[styles.metricVal, { color: '#F59E0B' }]}>{score}</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>TIME</Text>
              <Text style={styles.metricVal}>{durationSeconds}s</Text>
            </View>
          </View>

          {/* Rewards Banner */}
          <View style={styles.rewardsBox}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardIcon}>🪙</Text>
              <Text style={styles.rewardText}>+{coinsEarned} Focus Coins</Text>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardItem}>
              <Text style={styles.rewardIcon}>🥋</Text>
              <Text style={styles.rewardText}>+{xpEarned} Karma XP</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onExit} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Dojo Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={onPlayAgain} activeOpacity={0.8}>
              <Ionicons name="play" size={18} color="#070A11" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 17, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  headerBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  congratsTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gameSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  starIcon: {
    marginHorizontal: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  metricCell: {
    flex: 1,
    backgroundColor: '#070A11',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  rewardsBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    marginBottom: 24,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  rewardText: {
    color: '#00E699',
    fontSize: 13,
    fontWeight: '700',
  },
  rewardDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 230, 153, 0.2)',
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
  },
});
