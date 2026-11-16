import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  loadActiveMissionProgress,
  saveActiveMissionProgress,
} from '../../services/alarms/alarm-engine';

interface MemoryMissionProps {
  alarmId?: string;
  sequenceLength?: number;
  mode?: 'sequence' | 'numbers';
  onCompleted: () => void;
}

function seededRand(seedInput: string): () => number {
  let seed = 0;
  for (let i = 0; i < seedInput.length; i++) {
    seed = (seed * 31 + seedInput.charCodeAt(i)) >>> 0;
  }
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createSequence(length: number, seedKey: string): number[] {
  const rng = seededRand(seedKey);
  const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const chosen: number[] = [];
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(rng() * pool.length);
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return chosen;
}

function createNumberOrderGrid(seedKey: string): number[] {
  const rng = seededRand(seedKey);
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

export function MemoryMission({
  alarmId,
  sequenceLength = 4,
  mode = 'sequence',
  onCompleted,
}: MemoryMissionProps) {
  const length = Math.max(3, Math.min(7, sequenceLength));
  const [roundsDone, setRoundsDone] = useState(0);
  const [sequence, setSequence] = useState<number[]>(() =>
    createSequence(length, `${alarmId ?? 'preview'}_r0`)
  );
  const [phase, setPhase] = useState<'memorize' | 'recall'>(mode === 'numbers' ? 'recall' : 'memorize');
  const [highlightPos, setHighlightPos] = useState<number>(0);
  const [entered, setEntered] = useState<number[]>([]);
  const [numberGrid, setNumberGrid] = useState<number[]>(() =>
    createNumberOrderGrid(`${alarmId ?? 'preview'}_num_0`)
  );
  const [nextNumberExpected, setNextNumberExpected] = useState(1);
  const [feedback, setFeedback] = useState(
    mode === 'numbers'
      ? 'Tap numbers 1 through 9 in ascending order!'
      : 'Watch the sequence carefully...'
  );
  const totalRounds = 2;

  const playSequence = useCallback((seq: number[]) => {
    setPhase('memorize');
    setEntered([]);
    setHighlightPos(0);
    setFeedback('Memorize the glowing pattern order...');
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < seq.length) {
        setHighlightPos(step);
      } else {
        clearInterval(interval);
        setHighlightPos(-1);
        setPhase('recall');
        setFeedback('Now tap the tiles in exact order!');
      }
    }, 650);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mode === 'numbers') return;
    let cleanup: (() => void) | undefined;
    let mounted = true;
    void (async () => {
      if (alarmId) {
        const saved = await loadActiveMissionProgress(alarmId, 'memory');
        if (mounted && saved && Array.isArray(saved.sequence)) {
          setSequence(saved.sequence as number[]);
          setRoundsDone(Number(saved.roundsDone) || 0);
          cleanup = playSequence(saved.sequence as number[]);
          return;
        }
      }
      if (mounted) cleanup = playSequence(sequence);
    })();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [alarmId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNumberTap = async (num: number) => {
    if (num === nextNumberExpected) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (num === 9) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const nextRound = roundsDone + 1;
        if (nextRound >= totalRounds) {
          onCompleted();
        } else {
          setRoundsDone(nextRound);
          setNextNumberExpected(1);
          setNumberGrid(createNumberOrderGrid(`${alarmId ?? 'preview'}_num_${nextRound}`));
          setFeedback('Round 2! Tap 1 through 9 again.');
        }
      } else {
        setNextNumberExpected(num + 1);
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedback(`Wrong! Next expected number is ${nextNumberExpected}.`);
    }
  };

  const handleCellTap = async (cellIdx: number) => {
    if (mode === 'numbers') {
      await handleNumberTap(numberGrid[cellIdx]);
      return;
    }
    if (phase !== 'recall') return;
    const expected = sequence[entered.length];
    if (cellIdx === expected) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextEntered = [...entered, cellIdx];
      setEntered(nextEntered);
      if (nextEntered.length === sequence.length) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const nextRound = roundsDone + 1;
        if (nextRound >= totalRounds) {
          onCompleted();
        } else {
          const nextSeq = createSequence(length, `${alarmId ?? 'preview'}_r${nextRound}`);
          setRoundsDone(nextRound);
          setSequence(nextSeq);
          if (alarmId) {
            void saveActiveMissionProgress(alarmId, 'memory', {
              sequence: nextSeq,
              roundsDone: nextRound,
            });
          }
          playSequence(nextSeq);
        }
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedback('Wrong tile! Watch again...');
      setTimeout(() => playSequence(sequence), 600);
    }
  };

  const activeCell =
    mode === 'sequence' && phase === 'memorize' && highlightPos >= 0
      ? sequence[highlightPos]
      : -1;

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="grid-outline" size={16} color="#818CF8" />
        <Text style={styles.badgeText}>
          {mode === 'numbers' ? 'Number Order' : 'Memory Sequence'} · Round {roundsDone + 1}/{totalRounds}
        </Text>
      </View>

      <Text style={styles.feedbackText}>{feedback}</Text>

      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
          if (mode === 'numbers') {
            const val = numberGrid[idx];
            const cleared = val < nextNumberExpected;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.cell, cleared && styles.cellPicked]}
                onPress={() => void handleCellTap(idx)}
                disabled={cleared}
              >
                <Text style={[styles.cellText, !cleared && { color: '#F8FAFC' }]}>{val}</Text>
              </TouchableOpacity>
            );
          }
          const isLit = idx === activeCell;
          const isPicked = entered.includes(idx);
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.cell,
                isLit && styles.cellLit,
                isPicked && styles.cellPicked,
              ]}
              onPress={() => void handleCellTap(idx)}
              disabled={phase === 'memorize' || isPicked}
            >
              <Text style={styles.cellText}>
                {isLit
                  ? highlightPos + 1
                  : isPicked
                    ? entered.indexOf(idx) + 1
                    : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'sequence' && (
        <TouchableOpacity style={styles.replayBtn} onPress={() => playSequence(sequence)}>
          <Ionicons name="refresh" size={16} color="#94A3B8" />
          <Text style={styles.replayText}>Replay Pattern</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 16, width: '100%' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#818CF8',
    marginBottom: 12,
  },
  badgeText: { fontSize: 12, color: '#818CF8', fontWeight: '700' },
  feedbackText: { fontSize: 14, color: '#E2E8F0', fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  grid: {
    width: 246,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  cell: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLit: { backgroundColor: '#818CF8', borderColor: '#C7D2FE' },
  cellPicked: { backgroundColor: '#00E699', borderColor: '#6EE7B7' },
  cellText: { fontSize: 22, fontWeight: '900', color: '#070A11' },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0F1829',
  },
  replayText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
});
