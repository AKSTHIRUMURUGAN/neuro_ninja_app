import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GameHUD } from './GameHUD';
import { GameResultsModal } from './GameResultsModal';
import { arenaEngine } from '../../services/games/arena-engine';

// 6x6 Default Region Puzzle
const REGIONS = [
  [0, 0, 1, 1, 1, 1],
  [0, 0, 0, 1, 2, 2],
  [3, 3, 0, 1, 2, 2],
  [3, 3, 4, 4, 4, 2],
  [3, 5, 5, 5, 4, 4],
  [5, 5, 5, 5, 5, 4],
];

const REGION_COLORS = [
  'rgba(59, 130, 246, 0.25)', // Blue
  'rgba(16, 185, 129, 0.25)', // Green
  'rgba(245, 158, 11, 0.25)', // Amber
  'rgba(139, 92, 246, 0.25)', // Purple
  'rgba(236, 72, 153, 0.25)', // Pink
  'rgba(6, 182, 212, 0.25)',  // Cyan
];

type CellState = 'empty' | 'queen' | 'cross';

interface QueensGameProps {
  onBack: () => void;
}

export function QueensGame({ onBack }: QueensGameProps) {
  const [board, setBoard] = useState<CellState[][]>(() =>
    Array(6).fill(null).map(() => Array(6).fill('empty'))
  );
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
    const score = won ? Math.max(100, Math.round((timeLeft / 120) * 1000)) : 50;
    const stars = won ? (timeLeft > 60 ? 3 : 2) : 1;

    Haptics.notificationAsync(
      won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );

    const res = await arenaEngine.recordScore('queens', score, stars, 'medium', duration);

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

  // Tap cell: empty -> cross (dot) -> queen -> empty
  const handleCellTap = (r: number, c: number) => {
    if (!isPlaying) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setBoard(prev => {
      const next = prev.map(row => [...row]);
      const cur = next[r][c];
      if (cur === 'empty') next[r][c] = 'cross';
      else if (cur === 'cross') next[r][c] = 'queen';
      else next[r][c] = 'empty';
      return next;
    });
  };

  // Check victory condition
  const checkVictory = useCallback(() => {
    const queens: { r: number; c: number; reg: number }[] = [];

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (board[r][c] === 'queen') {
          queens.push({ r, c, reg: REGIONS[r][c] });
        }
      }
    }

    if (queens.length !== 6) return false;

    // Check rows & cols uniqueness
    const rows = new Set(queens.map(q => q.r));
    const cols = new Set(queens.map(q => q.c));
    const regs = new Set(queens.map(q => q.reg));

    if (rows.size !== 6 || cols.size !== 6 || regs.size !== 6) return false;

    // Check diagonal adjacency
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const q1 = queens[i];
        const q2 = queens[j];
        if (Math.abs(q1.r - q2.r) <= 1 && Math.abs(q1.c - q2.c) <= 1) {
          return false;
        }
      }
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
    setBoard(Array(6).fill(null).map(() => Array(6).fill('empty')));
    setTimeLeft(120);
    setIsPlaying(true);
    setShowResults(false);
  };

  const queenCount = board.reduce((acc, row) => acc + row.filter(c => c === 'queen').length, 0);

  return (
    <View style={styles.container}>
      <GameHUD
        title="QUEENS 👑"
        score={queenCount * 150}
        timeLeft={timeLeft}
        combo={queenCount}
        onRestart={restart}
        onPause={() => Alert.alert('Paused', 'Tap OK to resume', [{ text: 'Resume' }])}
      />

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsText}>
          Place exactly <Text style={{ color: '#00E699', fontWeight: '800' }}>6 Queens</Text> (1 per
          row, col & color zone). Queens cannot touch diagonally.
        </Text>
      </View>

      {/* 6x6 Puzzle Grid */}
      <View style={styles.boardCard}>
        <View style={styles.grid}>
          {board.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((cell, c) => {
                const reg = REGIONS[r][c];
                const bg = REGION_COLORS[reg];

                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cell, { backgroundColor: bg }]}
                    onPress={() => handleCellTap(r, c)}
                    activeOpacity={0.7}
                  >
                    {cell === 'queen' && <Text style={styles.queenIcon}>👑</Text>}
                    {cell === 'cross' && <Text style={styles.crossIcon}>•</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          👑 Queens placed: <Text style={{ color: '#F59E0B', fontWeight: '800' }}>{queenCount}/6</Text>
        </Text>
        <Text style={styles.footerHint}>Tap once for dot • Twice for Queen</Text>
      </View>

      <GameResultsModal
        visible={showResults}
        title="Queens Logic 👑"
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
    borderRadius: 8,
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
  },
  queenIcon: {
    fontSize: 26,
  },
  crossIcon: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  footerRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  footerHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
});
