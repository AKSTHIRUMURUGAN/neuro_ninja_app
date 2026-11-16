import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  MatiksProblem,
  generateMatiksProblem,
} from '../../services/dojo/matiks-generator';

interface MatiksSprintProps {
  durationSeconds?: number;
  onCompleted?: (result: {
    score: number;
    solved: number;
    accuracy: number;
    maxStreak: number;
  }) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function MatiksSprint({
  durationSeconds = 45,
  onCompleted,
}: MatiksSprintProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [problem, setProblem] = useState<MatiksProblem>(() => generateMatiksProblem(1));
  const [score, setScore] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [cardFeedback, setCardFeedback] = useState<'correct' | 'wrong' | null>(null);

  const [shakeAnim] = useState(() => new Animated.Value(0));

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  };

  const finishSprint = useCallback(() => {
    const accuracy =
      totalAttempts > 0 ? Math.round((solvedCount / totalAttempts) * 100) : 0;
    if (onCompleted) {
      onCompleted({
        score,
        solved: solvedCount,
        accuracy,
        maxStreak,
      });
    }
  }, [totalAttempts, solvedCount, onCompleted, score, maxStreak]);

  // Main game timer
  useEffect(() => {
    if (timeLeft <= 0) {
      finishSprint();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, finishSprint]);

  // Bot Rival pacing loop
  useEffect(() => {
    if (timeLeft <= 0) return;

    const botInterval = setInterval(() => {
      // Bot solves every 2.8 - 4 seconds with 85% accuracy
      if (Math.random() < 0.85) {
        setBotScore((b) => b + 1);
      }
    }, 3200);

    return () => clearInterval(botInterval);
  }, [timeLeft]);

  const multiplier = streak >= 8 ? 4 : streak >= 5 ? 3 : streak >= 3 ? 2 : 1;

  const handleSelectOption = async (option: string | number) => {
    if (timeLeft <= 0) return;

    setTotalAttempts((a) => a + 1);
    const isCorrect = option.toString() === problem.answer.toString();

    if (isCorrect) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const points = 100 * multiplier;
      setScore((s) => s + points);
      setSolvedCount((c) => c + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);

      setCardFeedback('correct');
      setTimeout(() => setCardFeedback(null), 250);

      // Next adaptive problem
      const level = Math.floor(nextStreak / 3) + 1;
      setProblem(generateMatiksProblem(level));
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      setStreak(0);
      setCardFeedback('wrong');
      setTimeout(() => setCardFeedback(null), 300);
    }
  };

  const timerRatio = Math.max(0, timeLeft / durationSeconds);
  const timerBarColor =
    timerRatio > 0.4 ? '#00E699' : timerRatio > 0.2 ? '#F59E0B' : '#EF4444';

  const playerLead = solvedCount - botScore;

  return (
    <View style={styles.container}>
      {/* Timer Bar */}
      <View style={styles.timerTrack}>
        <View
          style={[
            styles.timerProgress,
            { width: `${timerRatio * 100}%`, backgroundColor: timerBarColor },
          ]}
        />
      </View>

      {/* Duel Progress Bar: Player vs Shadow Bot */}
      <View style={styles.duelCard}>
        <View style={styles.duelFighter}>
          <Ionicons name="person" size={14} color="#00E699" />
          <Text style={styles.fighterName}>You ({solvedCount})</Text>
        </View>

        <View style={styles.leadBadge}>
          <Text
            style={[
              styles.leadText,
              playerLead > 0
                ? { color: '#00E699' }
                : playerLead < 0
                ? { color: '#EF4444' }
                : { color: '#94A3B8' },
            ]}
          >
            {playerLead > 0
              ? `+${playerLead} Lead!`
              : playerLead < 0
              ? `${playerLead} Behind`
              : 'Tied!'}
          </Text>
        </View>

        <View style={styles.duelFighter}>
          <Text style={styles.fighterName}>Sensei Bot ({botScore})</Text>
          <MaterialCommunityIcons name="robot-outline" size={14} color="#EF4444" />
        </View>
      </View>

      {/* Multiplier & Score Header */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>TIME</Text>
          <Text style={[styles.statVal, { color: timerBarColor }]}>{timeLeft}s</Text>
        </View>

        <View
          style={[
            styles.multiplierBox,
            multiplier > 1 && styles.multiplierActive,
            multiplier === 4 && styles.multiplierFire,
          ]}
        >
          <Ionicons
            name="flame"
            size={18}
            color={
              multiplier === 4 ? '#EF4444' : multiplier > 1 ? '#F59E0B' : '#64748B'
            }
          />
          <Text
            style={[
              styles.multiplierText,
              multiplier === 4
                ? { color: '#EF4444' }
                : multiplier > 1
                ? { color: '#F59E0B' }
                : { color: '#64748B' },
            ]}
          >
            {multiplier}x {multiplier === 4 ? 'FIRE!' : 'BOOST'}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={styles.statVal}>{score}</Text>
        </View>
      </View>

      {/* Arithmetic Problem Card */}
      <Animated.View
        style={[
          styles.problemCard,
          cardFeedback === 'correct' && styles.cardCorrect,
          cardFeedback === 'wrong' && styles.cardWrong,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <Text style={styles.problemPrompt}>Solve Speed Formula</Text>
        <Text style={styles.problemText}>{problem.display}</Text>
      </Animated.View>

      {/* 4 Multi-Choice Option Buttons */}
      <View style={styles.optionsGrid}>
        {problem.options.map((opt, idx) => (
          <TouchableOpacity
            key={`${opt}_${idx}`}
            style={styles.optionBtn}
            activeOpacity={0.75}
            onPress={() => void handleSelectOption(opt)}
          >
            <Text style={styles.optionText}>{opt}</Text>
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
  timerTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerProgress: {
    height: '100%',
    borderRadius: 3,
  },
  duelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1829',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    width: '100%',
  },
  duelFighter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fighterName: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  leadBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  leadText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statVal: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
  },
  multiplierBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  multiplierActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  multiplierFire: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  multiplierText: {
    fontSize: 13,
    fontWeight: '900',
  },
  problemCard: {
    backgroundColor: '#0B132B',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1E293B',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardCorrect: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
  },
  cardWrong: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  problemPrompt: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  problemText: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  optionBtn: {
    width: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: '#1E293B',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
  },
});
