import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface SchulteGridProps {
  gridSize?: 4 | 5; // 4x4 (16 cells) or 5x5 (25 cells)
  onCompleted?: (result: { timeSeconds: number; errors: number; score: number }) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

function shuffleNumbers(max: number): number[] {
  const arr = Array.from({ length: max }, (_, i) => i + 1);
  return arr.sort(() => Math.random() - 0.5);
}

export function SchulteGrid({ gridSize = 4, onCompleted }: SchulteGridProps) {
  const maxNumber = gridSize * gridSize;
  const [numbers, setNumbers] = useState<number[]>(() => shuffleNumbers(maxNumber));
  const [currentTarget, setCurrentTarget] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errors, setErrors] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Pure timer interval that increments every 100ms
  useEffect(() => {
    if (!isRunning || isDone) return;
    const interval = setInterval(() => {
      setElapsedSec((s) => parseFloat((s + 0.1).toFixed(1)));
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning, isDone]);

  const handleCellPress = async (num: number) => {
    if (isDone) return;

    if (!isRunning) {
      setIsRunning(true);
    }

    if (num === currentTarget) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = currentTarget + 1;
      if (next > maxNumber) {
        setIsDone(true);
        setIsRunning(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const totalTime = Math.max(1, elapsedSec);
        const score = Math.max(100, Math.round(10000 / (totalTime + errors * 2)));
        if (onCompleted) {
          onCompleted({
            timeSeconds: totalTime,
            errors,
            score,
          });
        }
      } else {
        setCurrentTarget(next);
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors((e) => e + 1);
    }
  };

  const handleRestart = () => {
    setNumbers(shuffleNumbers(maxNumber));
    setCurrentTarget(1);
    setIsRunning(false);
    setElapsedSec(0);
    setErrors(0);
    setIsDone(false);
  };

  const cellSize = Math.floor((Math.min(SCREEN_WIDTH - 48, 360) - (gridSize - 1) * 8) / gridSize);

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerRow}>
        <View style={styles.badgeBox}>
          <MaterialCommunityIcons name="target" size={16} color="#00E699" />
          <Text style={styles.badgeText}>
            SCHULTE FOCUS MATRIX ({gridSize}×{gridSize})
          </Text>
        </View>

        <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
          <Ionicons name="refresh" size={16} color="#94A3B8" />
          <Text style={styles.restartText}>Restart</Text>
        </TouchableOpacity>
      </View>

      {/* Target & Stopwatch Bar */}
      <View style={styles.statsBar}>
        <View style={styles.targetCard}>
          <Text style={styles.targetLabel}>FIND NEXT</Text>
          <Text style={styles.targetNumber}>{currentTarget}</Text>
        </View>

        <View style={styles.stopwatchCard}>
          <Text style={styles.stopwatchLabel}>STOPWATCH</Text>
          <Text style={styles.stopwatchVal}>{elapsedSec.toFixed(1)}s</Text>
        </View>

        <View style={styles.errorsCard}>
          <Text style={styles.errorsLabel}>MISTAKES</Text>
          <Text style={[styles.errorsVal, errors > 0 && { color: '#EF4444' }]}>{errors}</Text>
        </View>
      </View>

      {/* Grid of Numbers */}
      <View style={[styles.grid, { width: cellSize * gridSize + (gridSize - 1) * 8 }]}>
        {numbers.map((num) => {
          const isPassed = num < currentTarget;
          const isCurrent = num === currentTarget;
          return (
            <TouchableOpacity
              key={num}
              activeOpacity={0.7}
              style={[
                styles.cell,
                { width: cellSize, height: cellSize },
                isPassed && styles.cellPassed,
                isCurrent && styles.cellCurrent,
              ]}
              onPress={() => void handleCellPress(num)}
            >
              <Text
                style={[
                  styles.cellText,
                  { fontSize: gridSize === 5 ? 20 : 24 },
                  isPassed && styles.cellTextPassed,
                  isCurrent && styles.cellTextCurrent,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.hintText}>
        Fix your eyes in the center and use peripheral vision to locate numbers 1 to {maxNumber} in order!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F1D2B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00E699',
  },
  badgeText: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '800',
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  restartText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  targetCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: '#00E699',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  targetLabel: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  targetNumber: {
    color: '#00E699',
    fontSize: 26,
    fontWeight: '900',
  },
  stopwatchCard: {
    flex: 1,
    backgroundColor: '#0B132B',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  stopwatchLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stopwatchVal: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
  },
  errorsCard: {
    flex: 1,
    backgroundColor: '#0B132B',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  errorsLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  errorsVal: {
    color: '#94A3B8',
    fontSize: 22,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#070A11',
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  cell: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cellCurrent: {
    borderColor: '#00E699',
    backgroundColor: '#0C2B22',
  },
  cellPassed: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    opacity: 0.35,
  },
  cellText: {
    color: '#F8FAFC',
    fontWeight: '900',
  },
  cellTextCurrent: {
    color: '#00E699',
  },
  cellTextPassed: {
    color: '#475569',
  },
  hintText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});
