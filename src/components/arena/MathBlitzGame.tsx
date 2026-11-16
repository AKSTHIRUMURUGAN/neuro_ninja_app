import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GameHUD } from './GameHUD';
import { GameResultsModal } from './GameResultsModal';
import { arenaEngine } from '../../services/games/arena-engine';

interface MathBlitzGameProps {
  onBack: () => void;
}

export function MathBlitzGame({ onBack }: MathBlitzGameProps) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState({
    score: 0,
    stars: 1,
    coins: 0,
    xp: 0,
    duration: 0,
  });

  const [question, setQuestion] = useState('8 x 7');
  const [correctAnswer, setCorrectAnswer] = useState(56);
  const [options, setOptions] = useState<number[]>([54, 56, 48, 62]);

  const generateQuestion = useCallback(() => {
    const ops = ['+', '-', 'x'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let n1 = Math.floor(Math.random() * 20) + 2;
    let n2 = Math.floor(Math.random() * 12) + 2;
    let ans = 0;

    if (op === '+') ans = n1 + n2;
    else if (op === '-') {
      if (n1 < n2) [n1, n2] = [n2, n1];
      ans = n1 - n2;
    } else {
      n1 = Math.floor(Math.random() * 12) + 2;
      n2 = Math.floor(Math.random() * 10) + 2;
      ans = n1 * n2;
    }

    setQuestion(`${n1} ${op} ${n2}`);
    setCorrectAnswer(ans);

    // 3 wrong answers
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const delta = (Math.floor(Math.random() * 9) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const fake = ans + delta;
      if (fake !== ans && fake >= 0) wrongs.add(fake);
    }

    const all = Array.from(wrongs);
    all.push(ans);
    setOptions(all.sort(() => 0.5 - Math.random()));
  }, []);



  const handleGameOver = useCallback(async () => {
    setIsPlaying(false);
    const duration = 60 - timeLeft;
    const stars = score > 1500 ? 3 : score > 700 ? 2 : 1;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const res = await arenaEngine.recordScore('math-blitz', score, stars, 'medium', duration);

    setResultsData({
      score,
      stars,
      coins: res.coinsEarned,
      xp: res.xpEarned,
      duration,
    });
    setShowResults(true);
  }, [score, timeLeft]);

  // Timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleGameOver();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, handleGameOver]);

  const handleAnswer = (choice: number) => {
    if (!isPlaying) return;

    if (choice === correctAnswer) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setScore(s => s + 40 * combo);
      setCombo(c => Math.min(6, c + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCombo(1);
    }
    generateQuestion();
  };

  const restart = () => {
    setScore(0);
    setCombo(1);
    setTimeLeft(60);
    setIsPlaying(true);
    setShowResults(false);
    generateQuestion();
  };

  return (
    <View style={styles.container}>
      <GameHUD
        title="MATH BLITZ ➕"
        score={score}
        timeLeft={timeLeft}
        combo={combo}
        onRestart={restart}
      />

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsText}>
          Solve the mental equation as fast as possible to build your combo multiplier!
        </Text>
      </View>

      {/* Equation Display */}
      <View style={styles.targetCard}>
        <Text style={styles.equationText}>{question}</Text>
      </View>

      {/* 4 Multi-Choice Options */}
      <View style={styles.optionsGrid}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={styles.optionBtn}
            onPress={() => handleAnswer(opt)}
            activeOpacity={0.8}
          >
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <GameResultsModal
        visible={showResults}
        title="Math Blitz ➕"
        score={resultsData.score}
        stars={resultsData.stars}
        coinsEarned={resultsData.coins}
        xpEarned={resultsData.xp}
        durationSeconds={resultsData.duration}
        onPlayAgain={restart}
        onExit={onBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instructionsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  instructionsText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  targetCard: {
    backgroundColor: '#070A11',
    borderRadius: 24,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 24,
  },
  equationText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#8B5CF6',
    letterSpacing: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionBtn: {
    width: '48%',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionText: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
  },
});
