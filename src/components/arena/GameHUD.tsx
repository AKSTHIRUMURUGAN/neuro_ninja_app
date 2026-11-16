import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GameHUDProps {
  score: number;
  timeLeft: number;
  combo?: number;
  onPause?: () => void;
  onRestart?: () => void;
  title: string;
}

export function GameHUD({
  score,
  timeLeft,
  combo = 1,
  onPause,
  onRestart,
  title,
}: GameHUDProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const isLowTime = timeLeft <= 15;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleBadge}>
          <Text style={styles.titleText}>{title}</Text>
        </View>

        <View style={styles.controlsRow}>
          {onRestart && (
            <TouchableOpacity style={styles.iconBtn} onPress={onRestart} activeOpacity={0.7}>
              <Ionicons name="refresh" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
          {onPause && (
            <TouchableOpacity style={styles.iconBtn} onPress={onPause} activeOpacity={0.7}>
              <Ionicons name="pause" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        {/* Timer Card */}
        <View style={[styles.statBox, isLowTime && styles.statBoxDanger]}>
          <Ionicons
            name="timer-outline"
            size={18}
            color={isLowTime ? '#EF4444' : '#38BDF8'}
            style={styles.statIcon}
          />
          <View>
            <Text style={styles.statLabel}>TIME</Text>
            <Text style={[styles.statValue, isLowTime && styles.statValueDanger]}>
              {timeFormatted}
            </Text>
          </View>
        </View>

        {/* Score Card */}
        <View style={styles.statBox}>
          <Ionicons name="trophy-outline" size={18} color="#F59E0B" style={styles.statIcon} />
          <View>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{score}</Text>
          </View>
        </View>

        {/* Combo Multiplier */}
        <View style={styles.statBox}>
          <Ionicons name="flash-outline" size={18} color="#00E699" style={styles.statIcon} />
          <View>
            <Text style={styles.statLabel}>COMBO</Text>
            <Text style={[styles.statValue, { color: '#00E699' }]}>{combo}x</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleBadge: {
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  titleText: {
    color: '#00E699',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#070A11',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBoxDanger: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  statIcon: {
    marginRight: 8,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  statValueDanger: {
    color: '#EF4444',
  },
});
