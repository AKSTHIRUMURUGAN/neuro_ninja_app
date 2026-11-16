import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GameHUD } from './GameHUD';
import { GameResultsModal } from './GameResultsModal';
import { arenaEngine } from '../../services/games/arena-engine';

// Checkmate-in-1 Puzzle 1
// White Queen on d1 moves to h5# (Scholar's mate style / tactical fork)
const INITIAL_PIECES: Record<string, string> = {
  'e1': '♔', 'd1': '♕', 'f1': '♗', 'c4': '♗',
  'e8': '♚', 'e5': '♟', 'f7': '♟', 'd6': '♟',
};

interface ChessTacticsGameProps {
  onBack: () => void;
}

export function ChessTacticsGame({ onBack }: ChessTacticsGameProps) {
  const [pieces, setPieces] = useState<Record<string, string>>(INITIAL_PIECES);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState({
    score: 0,
    stars: 1,
    coins: 0,
    xp: 0,
    duration: 0,
  });

  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const handleGameOver = useCallback(async (won: boolean) => {
    setIsPlaying(false);
    const duration = 90 - timeLeft;
    const score = won ? 1000 : 200;
    const stars = won ? (timeLeft > 45 ? 3 : 2) : 1;

    const res = await arenaEngine.recordScore('chess-tactics', score, stars, 'medium', duration);

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

  const handleSquarePress = (sq: string) => {
    if (!isPlaying) return;

    if (!selectedSquare) {
      if (pieces[sq] === '♕') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedSquare(sq);
      }
      return;
    }

    // Attempt move
    if (selectedSquare === 'd1' && (sq === 'f7' || sq === 'h5')) {
      // Correct tactical checkmate move!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPieces(prev => {
        const next = { ...prev };
        delete next['d1'];
        next[sq] = '♕';
        return next;
      });
      setSelectedSquare(null);
      handleGameOver(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSelectedSquare(null);
    }
  };

  const restart = () => {
    setPieces(INITIAL_PIECES);
    setSelectedSquare(null);
    setTimeLeft(90);
    setIsPlaying(true);
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      <GameHUD
        title="CHESS TACTICS ♟️"
        score={850}
        timeLeft={timeLeft}
        combo={1}
        onRestart={restart}
      />

      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsText}>
          White to move! Find the <Text style={{ color: '#00E699', fontWeight: '800' }}>Winning Checkmate</Text> in 1 move.
        </Text>
      </View>

      {/* 8x8 Chessboard */}
      <View style={styles.boardCard}>
        <View style={styles.board}>
          {RANKS.map((rank, rIdx) => (
            <View key={rank} style={styles.rankRow}>
              {FILES.map((file, fIdx) => {
                const sq = `${file}${rank}`;
                const isLight = (rIdx + fIdx) % 2 === 0;
                const isSelected = selectedSquare === sq;
                const piece = pieces[sq];

                return (
                  <TouchableOpacity
                    key={sq}
                    style={[
                      styles.square,
                      isLight ? styles.lightSq : styles.darkSq,
                      isSelected && styles.selectedSq,
                    ]}
                    onPress={() => handleSquarePress(sq)}
                    activeOpacity={0.7}
                  >
                    {piece && <Text style={styles.pieceText}>{piece}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerHint}>
          {selectedSquare
            ? 'Queen selected! Tap the checkmating destination square.'
            : 'Tap the White Queen (♕) to begin your move.'}
        </Text>
      </View>

      <GameResultsModal
        visible={showResults}
        title="Chess Tactics ♟️"
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
    fontSize: 14,
    lineHeight: 20,
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
  board: {
    width: 320,
    height: 320,
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 8,
    overflow: 'hidden',
  },
  rankRow: {
    flex: 1,
    flexDirection: 'row',
  },
  square: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightSq: {
    backgroundColor: '#334155',
  },
  darkSq: {
    backgroundColor: '#0F172A',
  },
  selectedSq: {
    backgroundColor: 'rgba(0, 230, 153, 0.5)',
  },
  pieceText: {
    fontSize: 26,
    color: '#F8FAFC',
  },
  footerRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerHint: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
