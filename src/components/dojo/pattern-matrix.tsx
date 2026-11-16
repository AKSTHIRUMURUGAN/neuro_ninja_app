import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface PatternMatrixProps {
  initialLength?: number;
  maxLevel?: number;
  onCompleted?: (score: number) => void;
}

function generateSequence(length: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    seq.push(Math.floor(Math.random() * 9));
  }
  return seq;
}

export function PatternMatrix({
  initialLength = 3,
  maxLevel = 5,
  onCompleted,
}: PatternMatrixProps) {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>(() => generateSequence(initialLength));
  const [userStep, setUserStep] = useState(0);
  const [activeLitCell, setActiveLitCell] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'showing' | 'input' | 'success' | 'failed'>('showing');
  const [strikes, setStrikes] = useState(0);

  const playSequence = (seq: number[]) => {
    setGameState('showing');
    seq.forEach((cellIdx, i) => {
      setTimeout(() => {
        setActiveLitCell(cellIdx);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        setTimeout(() => {
          setActiveLitCell(null);
          // If last element in sequence, switch to user input
          if (i === seq.length - 1) {
            setTimeout(() => {
              setGameState('input');
            }, 300);
          }
        }, 500);
      }, i * 750 + 600);
    });
  };

  const startNextLevel = (nextLvl: number) => {
    const nextSeq = generateSequence(initialLength + (nextLvl - 1));
    setLevel(nextLvl);
    setSequence(nextSeq);
    setUserStep(0);
    playSequence(nextSeq);
  };

  const handleCellPress = async (index: number) => {
    if (gameState !== 'input') return;

    setActiveLitCell(index);
    setTimeout(() => setActiveLitCell(null), 250);

    const targetCell = sequence[userStep];
    if (index === targetCell) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextStep = userStep + 1;

      if (nextStep >= sequence.length) {
        // Level cleared!
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setGameState('success');

        setTimeout(() => {
          if (level >= maxLevel) {
            if (onCompleted) onCompleted(level * 100);
          } else {
            startNextLevel(level + 1);
          }
        }, 1200);
      } else {
        setUserStep(nextStep);
      }
    } else {
      // Mistake!
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setGameState('failed');
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);

      setTimeout(() => {
        if (nextStrikes >= 3) {
          if (onCompleted) onCompleted(level * 50);
        } else {
          setUserStep(0);
          playSequence(sequence);
        }
      }, 1200);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeBox}>
          <MaterialCommunityIcons name="brain" size={16} color="#00E699" />
          <Text style={styles.badgeText}>
            SPATIAL MEMORY · LEVEL {level}/{maxLevel}
          </Text>
        </View>

        <View style={styles.strikesBox}>
          {[1, 2, 3].map((s) => (
            <Ionicons
              key={s}
              name={s <= strikes ? 'heart-dislike' : 'heart'}
              size={18}
              color={s <= strikes ? '#EF4444' : '#00E699'}
            />
          ))}
        </View>
      </View>

      {/* State Banner */}
      <View
        style={[
          styles.promptBanner,
          gameState === 'showing' && styles.promptShowing,
          gameState === 'input' && styles.promptInput,
          gameState === 'success' && styles.promptSuccess,
          gameState === 'failed' && styles.promptFailed,
        ]}
      >
        <Text style={styles.promptText}>
          {gameState === 'showing' && 'Watch sequence carefully...'}
          {gameState === 'input' && `Repeat pattern! (${userStep}/${sequence.length})`}
          {gameState === 'success' && 'Memory pattern cleared!'}
          {gameState === 'failed' && 'Sequence mismatch! Retrying...'}
        </Text>
      </View>

      {/* 3x3 Spatial Grid */}
      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
          const isLit = activeLitCell === idx;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              disabled={gameState !== 'input'}
              style={[styles.cell, isLit && styles.cellLit]}
              onPress={() => void handleCellPress(idx)}
            >
              {isLit && <View style={styles.litGlow} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.subtext}>
        Builds hippocampal spatial working memory capacity.
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
  strikesBox: {
    flexDirection: 'row',
    gap: 4,
  },
  promptBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  promptShowing: {
    backgroundColor: '#0B132B',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  promptInput: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  promptSuccess: {
    backgroundColor: 'rgba(0, 230, 153, 0.3)',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  promptFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  promptText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    width: 270,
    height: 270,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#070A11',
    padding: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  cell: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cellLit: {
    backgroundColor: '#00E699',
    borderColor: '#FFFFFF',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  litGlow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  subtext: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
});
