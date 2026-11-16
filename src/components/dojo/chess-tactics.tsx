import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Square, Chess } from 'chess.js';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ChessBoard } from './chess-board';
import {
  ChessPuzzle,
  getRandomPuzzle,
} from '../../services/chess/chess-service';

interface ChessTacticsProps {
  difficulty?: 'easy' | 'medium' | 'hard';
  targetSolved?: number;
  onCompleted?: (score: number) => void;
  standalone?: boolean;
}

export function ChessTactics({
  difficulty = 'easy',
  targetSolved = 3,
  onCompleted,
  standalone = false,
}: ChessTacticsProps) {
  const [puzzle, setPuzzle] = useState<ChessPuzzle>(() => getRandomPuzzle(difficulty));
  const [chess] = useState(() => new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [inCheckSquare, setInCheckSquare] = useState<Square | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'hint' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [shakeAnim] = useState(() => new Animated.Value(0));

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  // Load new puzzle
  const loadPuzzle = (newDifficulty = difficulty) => {
    const nextPuzzle = getRandomPuzzle(newDifficulty);
    setPuzzle(nextPuzzle);
    chess.load(nextPuzzle.fen);
    setFen(nextPuzzle.fen);
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setInCheckSquare(null);
    setFeedback(null);
    setIsProcessing(false);
  };

  const resetCurrentPuzzle = () => {
    chess.load(puzzle.fen);
    setFen(puzzle.fen);
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setInCheckSquare(null);
    setFeedback({ text: 'Puzzle reset. Try another tactic!', type: 'hint' });
  };

  const handleShowHint = () => {
    const firstMove = puzzle.solution[0];
    setFeedback({
      text: `Hint: Target is piece delivery (${firstMove})`,
      type: 'hint',
    });
  };

  const handleSquarePress = async (square: Square) => {
    if (isProcessing) return;

    // If square is one of legal moves from selectedSquare -> Execute move!
    if (selectedSquare && legalMoves.includes(square)) {
      try {
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q',
        });

        if (move) {
          const newFen = chess.fen();
          setFen(newFen);
          setLastMove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setLegalMoves([]);

          // Check if King in check
          if (chess.inCheck()) {
            setInCheckSquare(square);
          } else {
            setInCheckSquare(null);
          }

          // Evaluate move against solution
          const isCorrect =
            puzzle.solution.includes(move.san) ||
            (chess.isCheckmate() && puzzle.objective.includes('Mate'));

          if (isCorrect) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const nextSolved = solvedCount + 1;
            const nextStreak = streak + 1;
            setSolvedCount(nextSolved);
            setStreak(nextStreak);
            setFeedback({
              text: `Brilliant! ${move.san} - Tactical checkmate delivered!`,
              type: 'success',
            });
            setIsProcessing(true);

            setTimeout(() => {
              if (nextSolved >= targetSolved && onCompleted) {
                onCompleted(nextSolved * 50 + nextStreak * 25);
              } else {
                loadPuzzle();
              }
            }, 1400);
          } else {
            // Blunder / Wrong tactic
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            triggerShake();
            setStreak(0);
            setFeedback({
              text: `Incorrect tactic (${move.san}). King escaped!`,
              type: 'error',
            });
            setIsProcessing(true);

            setTimeout(() => {
              resetCurrentPuzzle();
              setIsProcessing(false);
            }, 1200);
          }
          return;
        }
      } catch {
        // Illegal move
      }
    }

    // Otherwise, select piece if it belongs to active turn
    const piece = chess.get(square);
    if (piece && piece.color === puzzle.turn) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true }).map((m) => m.to as Square);
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tactical Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeBox}>
          <MaterialCommunityIcons name="chess-knight" size={16} color="#00E699" />
          <Text style={styles.badgeText}>
            PUZZLE {solvedCount + 1} / {targetSolved}
          </Text>
        </View>

        {streak > 1 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color="#F59E0B" />
            <Text style={styles.streakText}>{streak}x Streak</Text>
          </View>
        )}

        <View style={styles.themeBadge}>
          <Text style={styles.themeText}>{puzzle.theme}</Text>
        </View>
      </View>

      {/* Objective Card */}
      <View style={styles.objectiveCard}>
        <Text style={styles.objectiveText}>{puzzle.objective}</Text>
      </View>

      {/* Interactive Board with Shake Animation */}
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <ChessBoard
          fen={fen}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={lastMove}
          inCheckSquare={inCheckSquare}
          isFlipped={puzzle.turn === 'b'}
          onSquarePress={handleSquarePress}
          disabled={isProcessing}
        />
      </Animated.View>

      {/* Feedback Banner */}
      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            feedback.type === 'success' && styles.feedbackSuccess,
            feedback.type === 'error' && styles.feedbackError,
            feedback.type === 'hint' && styles.feedbackHint,
          ]}
        >
          <MaterialCommunityIcons
            name={
              feedback.type === 'success'
                ? 'check-circle'
                : feedback.type === 'error'
                ? 'alert-circle'
                : 'lightbulb-on'
            }
            size={18}
            color={
              feedback.type === 'success'
                ? '#00E699'
                : feedback.type === 'error'
                ? '#EF4444'
                : '#F59E0B'
            }
          />
          <Text style={styles.feedbackText}>{feedback.text}</Text>
        </View>
      )}

      {/* Tactical Toolbar */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.toolBtn} onPress={handleShowHint}>
          <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
          <Text style={styles.toolBtnText}>Hint</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={resetCurrentPuzzle}>
          <Ionicons name="refresh" size={16} color="#94A3B8" />
          <Text style={styles.toolBtnText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={() => loadPuzzle()}>
          <Ionicons name="play-skip-forward" size={16} color="#38BDF8" />
          <Text style={styles.toolBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F1D2B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  badgeText: {
    color: '#00E699',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  themeBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  themeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  objectiveCard: {
    backgroundColor: '#0E1726',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    width: '100%',
    alignItems: 'center',
  },
  objectiveText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    width: '100%',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  feedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  feedbackHint: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  feedbackText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  toolBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
});
