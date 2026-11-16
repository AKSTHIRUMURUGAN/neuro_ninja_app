import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GameHUD } from './GameHUD';
import { GameResultsModal } from './GameResultsModal';
import { arenaEngine } from '../../services/games/arena-engine';

type TangoCell = 'empty' | 'sun' | 'moon';

interface TangoGameProps {
  onBack: () => void;
}

export function TangoGame({ onBack }: TangoGameProps) {
  // 6x6 Tango Board initial clues
  const [board, setBoard] = useState<TangoCell[][]>(() => [
    ['sun', 'empty', 'empty', 'moon', 'empty', 'empty'],
    ['empty', 'moon', 'empty', 'empty', 'sun', 'empty'],
    ['empty', 'empty', 'sun', 'empty', 'empty', 'moon'],
    ['moon', 'empty', 'empty', 'sun', 'empty', 'empty'],
    ['empty', 'sun', 'empty', 'empty', 'moon', 'empty'],
    ['empty', 'empty', 'moon', 'empty', 'empty', 'sun'],
  ]);

  const [timeLeft, setTimeLeft] = useState(120);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState({
    score: 0,
    stars: 1,
    coins: 0,
    xp: 0,
    duration: 0,
  });

  const handleGameOver = useCallback(async (won: boolean) => {
    setIsPlaying(false);
    const duration = 120 - timeLeft;
    const score = won ? Math.max(120, Math.round((timeLeft / 120) * 1200)) : 60;
    const stars = won ? (timeLeft > 50 ? 3 : 2) : 1;

    Haptics.notificationAsync(
      won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );

    const res = await arenaEngine.recordScore('tango', score, stars, 'medium', duration);

    setResultsData({
      score,
      stars,
      coins: res.coinsEarned,
      xp: res.xpEarned,
      duration,
    });
    setShowResults(true);
  }, [timeLeft]);

  // Timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleGameOver(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, handleGameOver]);

  // Tap cycle: empty -> sun -> moon -> empty
  const handleCellTap = (r: number, c: number) => {
    if (!isPlaying) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setBoard(prev => {
      const next = prev.map(row => [...row]);
      const cur = next[r][c];
      if (cur === 'empty') next[r][c] = 'sun';
      else if (cur === 'sun') next[r][c] = 'moon';
      else next[r][c] = 'empty';
      return next;
    });
  };

  // Check victory: no 3 consecutive identical symbols in rows or columns and equal suns/moons (3 each)
  const checkVictory = useCallback(() => {
    for (let r = 0; r < 6; r++) {
      let suns = 0;
      let moons = 0;
      for (let c = 0; c < 6; c++) {
        const val = board[r][c];
        if (val === 'empty') return false;
        if (val === 'sun') suns++;
        if (val === 'moon') moons++;

        // No 3 in a row horizontal
        if (c >= 2 && val === board[r][c - 1] && val === board[r][c - 2]) {
          return false;
        }
      }
      if (suns !== 3 || moons !== 3) return false;
    }

    for (let c = 0; c < 6; c++) {
      let suns = 0;
      let moons = 0;
      for (let r = 0; r < 6; r++) {
        const val = board[r][c];
        if (val === 'sun') suns++;
        if (val === 'moon') moons++;

        // No 3 in a row vertical
        if (r >= 2 && val === board[r - 1][c] && val === board[r - 2][c]) {
          return false;
        }
      }
      if (suns !== 3 || moons !== 3) return false;
    }

    return true;
  }, [board]);

  useEffect(() => {
    if (checkVictory()) {
      const timer = setTimeout(() => {
        handleGameOver(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [board, checkVictory, handleGameOver]);

  const restart = () => {
    setBoard([
      ['sun', 'empty', 'empty', 'moon', 'empty', 'empty'],
      ['empty', 'moon', 'empty', 'empty', 'sun', 'empty'],
      ['empty', 'empty', 'sun', 'empty', 'empty', 'moon'],
      ['moon', 'empty', 'empty', 'sun', 'empty', 'empty'],
      ['empty', 'sun', 'empty', 'empty', 'moon', 'empty'],
      ['empty', 'empty', 'moon', 'empty', 'empty', 'sun'],
    ]);
    setTimeLeft(120);
    setIsPlaying(true);
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      <GameHUD
        title="TANGO ☀️🌙"
        score={800}
        timeLeft={timeLeft}
        combo={2}
        onRestart={restart}
        onPause={() => Alert.alert('Paused', 'Tap OK to resume', [{ text: 'Resume' }])}
      />

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsText}>
          Fill grid with <Text style={{ color: '#F59E0B', fontWeight: '800' }}>Suns ☀️</Text> and{' '}
          <Text style={{ color: '#818CF8', fontWeight: '800' }}>Moons 🌙</Text>. Each row/column has 3
          of each. Never place 3 in a row!
        </Text>
      </View>

      {/* 6x6 Tango Grid */}
      <View style={styles.boardCard}>
        <View style={styles.grid}>
          {board.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((cell, c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.cell}
                  onPress={() => handleCellTap(r, c)}
                  activeOpacity={0.7}
                >
                  {cell === 'sun' && <Text style={styles.symbol}>☀️</Text>}
                  {cell === 'moon' && <Text style={styles.symbol}>🌙</Text>}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerHint}>Tap once for Sun ☀️ • Twice for Moon 🌙</Text>
      </View>

      <GameResultsModal
        visible={showResults}
        title="Tango Logic ☀️🌙"
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  instructionsText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  boardCard: {
    backgroundColor: '#070A11',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  grid: {
    width: 312,
    height: 312,
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#1E293B',
    backgroundColor: '#0F1829',
  },
  symbol: {
    fontSize: 24,
  },
  footerRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerHint: {
    color: '#64748B',
    fontSize: 12,
  },
});
