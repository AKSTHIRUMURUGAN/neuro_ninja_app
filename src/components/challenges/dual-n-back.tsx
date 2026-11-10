import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface DualNBackProps {
  n?: number; // 1-Back or 2-Back
  totalSteps?: number;
  onCompleted: (matchesFound: number) => void;
}

export function DualNBackGame({ n = 1, totalSteps = 8, onCompleted }: DualNBackProps) {
  const [history, setHistory] = useState<number[]>([]);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(0);
  const [matchReported, setMatchReported] = useState(false);

  useEffect(() => {
    if (step >= totalSteps) {
      onCompleted(score);
      return;
    }

    const startTimer = setTimeout(() => {
      const nextCell =
        Math.random() < 0.35 && history.length >= n
          ? history[history.length - n]
          : Math.floor(Math.random() * 9);
      setActiveCell(nextCell);
      setHistory((prev) => [...prev, nextCell]);
      setMatchReported(false);

      const clearTimer = setTimeout(() => {
        setActiveCell(null);
        setTimeout(() => {
          setStep((s) => s + 1);
        }, 500);
      }, 1000);

      return () => clearTimeout(clearTimer);
    }, 100);

    return () => clearTimeout(startTimer);
  }, [step, totalSteps, n, onCompleted, score, history]);

  const handleMatchPress = async () => {
    if (matchReported || history.length <= n) return;
    setMatchReported(true);

    const current = history[history.length - 1];
    const target = history[history.length - 1 - n];

    if (current === target) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore((s) => s + 1);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="hardware-chip-outline" size={16} color="#00E699" />
        <Text style={styles.badgeText}>
          {n}-Back Memory · Step {step + 1}/{totalSteps}
        </Text>
      </View>

      <Text style={styles.prompt}>
        Tap MATCH if square matches position {n} step{n > 1 ? 's' : ''} ago!
      </Text>

      {/* 3x3 Memory Grid */}
      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
          const isLit = activeCell === index;
          return (
            <View
              key={index}
              style={[styles.cell, isLit && styles.cellLit]}
            >
              {isLit && <View style={styles.litCore} />}
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.matchBtn, matchReported && styles.matchBtnDisabled]}
        onPress={() => void handleMatchPress()}
        disabled={matchReported}
        activeOpacity={0.8}
      >
        <Ionicons name="flash" size={20} color="#070A11" />
        <Text style={styles.matchText}>
          {matchReported ? 'Recorded' : 'POSITION MATCH!'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F291E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00E699',
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 12,
    color: '#00E699',
    fontWeight: '700',
  },
  prompt: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 260,
  },
  grid: {
    width: 240,
    height: 240,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 28,
  },
  cell: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLit: {
    backgroundColor: '#0F291E',
    borderColor: '#00E699',
  },
  litCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00E699',
  },
  matchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    width: '100%',
    maxWidth: 240,
  },
  matchBtnDisabled: {
    backgroundColor: '#334155',
  },
  matchText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#070A11',
  },
});
