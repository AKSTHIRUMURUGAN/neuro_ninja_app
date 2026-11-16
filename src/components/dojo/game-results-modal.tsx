import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface GameResultsModalProps {
  visible: boolean;
  gameTitle: string;
  score: number;
  xpEarned: number;
  stats: { label: string; value: string | number }[];
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameResultsModal({
  visible,
  gameTitle,
  score,
  xpEarned,
  stats,
  onPlayAgain,
  onExit,
}: GameResultsModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Trophy Header */}
          <View style={styles.trophyWrapper}>
            <View style={styles.trophyGlow} />
            <Ionicons name="trophy" size={54} color="#F59E0B" />
          </View>

          <Text style={styles.gameTitle}>{gameTitle.toUpperCase()}</Text>
          <Text style={styles.headline}>Cognitive Mastery Unlocked</Text>

          {/* XP Banner */}
          <View style={styles.xpCard}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#00E699" />
            <Text style={styles.xpText}>+{xpEarned} Focus XP</Text>
          </View>

          {/* Stats Breakdown Grid */}
          <View style={styles.statsGrid}>
            {stats.map((s, idx) => (
              <View key={idx} style={styles.statItem}>
                <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
                <Text style={styles.statVal}>{s.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.quoteText}>
            Prefrontal cortex stimulated. Dopamine autopilot disrupted.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonCol}>
            <TouchableOpacity style={styles.playAgainBtn} onPress={onPlayAgain}>
              <Ionicons name="refresh" size={18} color="#070A11" />
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
              <Text style={styles.exitText}>Return to Dojo</Text>
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
    backgroundColor: 'rgba(7, 10, 17, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#00E699',
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  trophyWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 6,
  },
  trophyGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  gameTitle: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headline: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#00E699',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  xpText: {
    color: '#00E699',
    fontSize: 20,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statVal: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  quoteText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },
  buttonCol: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  playAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
  },
  playAgainText: {
    color: '#070A11',
    fontSize: 15,
    fontWeight: '900',
  },
  exitBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  exitText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});
