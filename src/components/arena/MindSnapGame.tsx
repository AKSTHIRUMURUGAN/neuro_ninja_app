import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GameHUD } from './GameHUD';
import { GameResultsModal } from './GameResultsModal';
import { arenaEngine } from '../../services/games/arena-engine';

const COLORS = [
  { name: 'RED', hex: '#EF4444' },
  { name: 'GREEN', hex: '#10B981' },
  { name: 'BLUE', hex: '#3B82F6' },
  { name: 'YELLOW', hex: '#F59E0B' },
  { name: 'PURPLE', hex: '#8B5CF6' },
];

interface MindSnapGameProps {
  onBack: () => void;
}

export function MindSnapGame({ onBack }: MindSnapGameProps) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState({
    score: 0,
    stars: 1,
    coins: 0,
    xp: 0,
    duration: 0,
  });

  // Current prompt
  const [word, setWord] = useState('RED');
  const [inkColor, setInkColor] = useState(COLORS[1]); // e.g. green ink
  const [options, setOptions] = useState<string[]>(['RED', 'GREEN', 'BLUE', 'YELLOW']);

  // Generate new round
  const nextRound = useCallback(() => {
    const wordItem = COLORS[Math.floor(Math.random() * COLORS.length)];
    const inkItem = COLORS[Math.floor(Math.random() * COLORS.length)];
    setWord(wordItem.name);
    setInkColor(inkItem);

    // Shuffle 4 options that include ink color's name
    const pool = COLORS.map(c => c.name).filter(n => n !== inkItem.name);
    const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, 3);
    shuffled.push(inkItem.name);
    setOptions(shuffled.sort(() => 0.5 - Math.random()));
  }, []);



  const handleGameOver = useCallback(async () => {
    setIsPlaying(false);
    const duration = 45 - timeLeft;
    const stars = score > 1200 ? 3 : score > 600 ? 2 : 1;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const res = await arenaEngine.recordScore('mindsnap', score, stars, 'medium', duration);

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

  const handleSelect = (selectedName: string) => {
    if (!isPlaying) return;

    if (selectedName === inkColor.name) {
      // Correct! User matched the INK color, not the text word
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setScore(s => s + 50 * combo);
      setCombo(c => Math.min(5, c + 1));
    } else {
      // Mistake
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCombo(1);
    }
    nextRound();
  };

  const restart = () => {
    setScore(0);
    setCombo(1);
    setTimeLeft(45);
    setIsPlaying(true);
    setShowResults(false);
    nextRound();
  };

  return (
    <View style={styles.container}>
      <GameHUD
        title="MINDSNAP STROOP ⚡"
        score={score}
        timeLeft={timeLeft}
        combo={combo}
        onRestart={restart}
      />

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsText}>
          Match the <Text style={{ color: '#00E699', fontWeight: '800' }}>INK COLOR</Text>, not the
          written word!
        </Text>
      </View>

      {/* Target Word Card */}
      <View style={styles.targetCard}>
        <Text style={[styles.targetWord, { color: inkColor.hex }]}>{word}</Text>
      </View>

      {/* 4 Option Buttons */}
      <View style={styles.optionsGrid}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={styles.optionBtn}
            onPress={() => handleSelect(opt)}
            activeOpacity={0.8}
          >
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <GameResultsModal
        visible={showResults}
        title="MindSnap Stroop ⚡"
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  targetWord: {
    fontSize: 44,
    fontWeight: '900',
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
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
