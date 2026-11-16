import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface StroopClashProps {
  totalRounds?: number;
  onCompleted?: (result: { score: number; avgReactionMs: number; accuracy: number }) => void;
}

const COLORS: { name: string; hex: string }[] = [
  { name: 'RED', hex: '#EF4444' },
  { name: 'BLUE', hex: '#3B82F6' },
  { name: 'GREEN', hex: '#10B981' },
  { name: 'YELLOW', hex: '#F59E0B' },
];

interface StroopTrial {
  word: string;
  inkName: string;
  inkHex: string;
  rule: 'ink' | 'word'; // Inverted task condition!
  correctAnswer: string;
}

function generateStroopTrial(): StroopTrial {
  const wordObj = COLORS[Math.floor(Math.random() * COLORS.length)];
  let inkObj = COLORS[Math.floor(Math.random() * COLORS.length)];

  // Make it conflict 80% of the time
  if (Math.random() < 0.8 && inkObj.name === wordObj.name) {
    inkObj = COLORS.find((c) => c.name !== wordObj.name) || inkObj;
  }

  // 70% ink matching, 30% inverted word matching
  const rule: 'ink' | 'word' = Math.random() < 0.3 ? 'word' : 'ink';
  const correctAnswer = rule === 'ink' ? inkObj.name : wordObj.name;

  return {
    word: wordObj.name,
    inkName: inkObj.name,
    inkHex: inkObj.hex,
    rule,
    correctAnswer,
  };
}

export function StroopClash({ totalRounds = 8, onCompleted }: StroopClashProps) {
  const [round, setRound] = useState(0);
  const [trial, setTrial] = useState<StroopTrial>(() => generateStroopTrial());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [trialElapsedMs, setTrialElapsedMs] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  // Reaction timer that increments every 50ms without impure Date.now()
  useEffect(() => {
    const interval = setInterval(() => {
      setTrialElapsedMs((m) => m + 50);
    }, 50);
    return () => clearInterval(interval);
  }, [trial]);

  const handleChoice = async (selectedColorName: string) => {
    const reactionMs = Math.max(100, trialElapsedMs);
    setReactionTimes((prev) => [...prev, reactionMs]);

    const isCorrect = selectedColorName === trial.correctAnswer;
    const nextRound = round + 1;

    if (isCorrect) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const mult = streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
      setScore((s) => s + 100 * mult);
      setStreak((st) => st + 1);
      setCorrectCount((c) => c + 1);
      setFeedback({ text: `+${100 * mult} XP (${reactionMs}ms)`, correct: true });
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStreak(0);
      setFeedback({ text: `MISMATCH! Answer was ${trial.correctAnswer}`, correct: false });
    }

    setTimeout(() => {
      setFeedback(null);
      if (nextRound >= totalRounds) {
        const totalMs = reactionTimes.reduce((a, b) => a + b, reactionMs);
        const avgReactionMs = Math.round(totalMs / totalRounds);
        const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
        const accuracy = Math.round((finalCorrect / totalRounds) * 100);

        if (onCompleted) {
          onCompleted({
            score: isCorrect ? score + 100 : score,
            avgReactionMs,
            accuracy,
          });
        }
      } else {
        setRound(nextRound);
        setTrialElapsedMs(0);
        setTrial(generateStroopTrial());
      }
    }, 350);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeBox}>
          <MaterialCommunityIcons name="lightning-bolt" size={16} color="#00E699" />
          <Text style={styles.badgeText}>
            STROOP REFLEX {round + 1}/{totalRounds}
          </Text>
        </View>

        {streak > 1 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color="#F59E0B" />
            <Text style={styles.streakText}>{streak}x Streak</Text>
          </View>
        )}

        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>{score} XP</Text>
        </View>
      </View>

      {/* Dynamic Rule Banner */}
      <View
        style={[
          styles.ruleCard,
          trial.rule === 'word' ? styles.ruleWord : styles.ruleInk,
        ]}
      >
        <Text style={styles.rulePrompt}>
          {trial.rule === 'ink'
            ? '⚡ TAP INK COLOR (IGNORE THE WORD)'
            : '🧠 INVERTED: TAP THE MEANING OF THE WORD'}
        </Text>
      </View>

      {/* Stimulus Word Card */}
      <View style={styles.wordCard}>
        <Text style={[styles.wordText, { color: trial.inkHex }]}>
          {trial.word}
        </Text>
      </View>

      {/* Feedback Banner */}
      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            feedback.correct ? styles.fbSuccess : styles.fbError,
          ]}
        >
          <Text style={styles.fbText}>{feedback.text}</Text>
        </View>
      )}

      {/* 4 Color Buttons */}
      <View style={styles.buttonsGrid}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c.name}
            activeOpacity={0.8}
            style={[styles.colorBtn, { borderColor: c.hex }]}
            onPress={() => void handleChoice(c.name)}
          >
            <View style={[styles.colorDot, { backgroundColor: c.hex }]} />
            <Text style={styles.colorBtnText}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  scoreBox: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  scoreText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  ruleCard: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  ruleInk: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  ruleWord: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rulePrompt: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wordCard: {
    backgroundColor: '#0B132B',
    width: '100%',
    paddingVertical: 36,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  wordText: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 4,
  },
  feedbackBanner: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  fbSuccess: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  fbError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  fbText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  colorBtn: {
    width: '48%',
    backgroundColor: '#1E293B',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorBtnText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
});
