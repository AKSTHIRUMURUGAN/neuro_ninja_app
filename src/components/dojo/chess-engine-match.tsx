import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Square, Chess } from 'chess.js';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ChessBoard } from './chess-board';
import { getBestAIMove } from '../../services/chess/minimax-ai';

interface ChessEngineMatchProps {
  onGameOver?: (winner: 'player' | 'ai' | 'draw') => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';

export function ChessEngineMatch({ onGameOver }: ChessEngineMatchProps) {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [inCheckSquare, setInCheckSquare] = useState<Square | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState(0);

  const resetGame = () => {
    chess.reset();
    setFen(chess.fen());
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setInCheckSquare(null);
    setIsAiThinking(false);
    setGameResult(null);
    setMoveCount(0);
  };

  const handleSquarePress = async (square: Square) => {
    if (isAiThinking || gameResult) return;

    // Player move execution
    if (selectedSquare && legalMoves.includes(square)) {
      try {
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q',
        });

        if (move) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const newFen = chess.fen();
          setFen(newFen);
          setLastMove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setLegalMoves([]);
          setMoveCount((c) => c + 1);

          if (chess.inCheck()) {
            setInCheckSquare(square);
          } else {
            setInCheckSquare(null);
          }

          if (chess.isGameOver()) {
            handleGameOver();
            return;
          }

          // Trigger AI turn after brief delay
          setIsAiThinking(true);
          setTimeout(() => {
            makeAiMove();
          }, 350);
          return;
        }
      } catch {
        // Illegal move
      }
    }

    // Select piece (player is White)
    const piece = chess.get(square);
    if (piece && piece.color === 'w') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true }).map((m) => m.to as Square);
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const makeAiMove = () => {
    try {
      const bestMove = getBestAIMove(chess, difficulty);
      if (bestMove) {
        chess.move(bestMove);
        setFen(chess.fen());
        setLastMove({ from: bestMove.from, to: bestMove.to });

        if (chess.inCheck()) {
          setInCheckSquare(bestMove.to);
        } else {
          setInCheckSquare(null);
        }

        if (chess.isGameOver()) {
          handleGameOver();
        }
      }
    } catch {
      // AI fallback
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleGameOver = () => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'b' ? 'player' : 'ai';
      setGameResult(winner === 'player' ? 'VICTORY! Checkmate!' : 'DEFEAT! Ninja Checkmate.');
      if (onGameOver) onGameOver(winner);
      void Haptics.notificationAsync(
        winner === 'player'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    } else if (chess.isDraw()) {
      setGameResult('STALEMATE / DRAW');
      if (onGameOver) onGameOver('draw');
    }
  };

  return (
    <View style={styles.container}>
      {/* AI Rival Status Bar */}
      <View style={styles.rivalBar}>
        <View style={styles.rivalInfo}>
          <View style={styles.rivalAvatar}>
            <MaterialCommunityIcons name="ninja" size={20} color="#00E699" />
          </View>
          <View>
            <Text style={styles.rivalName}>
              Shadow Ninja AI{' '}
              <Text style={styles.eloText}>
                ({difficulty === 'easy' ? '800' : difficulty === 'medium' ? '1200' : '1600'} ELO)
              </Text>
            </Text>
            <Text style={styles.rivalStatus}>
              {isAiThinking ? 'Calculating moves...' : 'Waiting for move'}
            </Text>
          </View>
        </View>

        {isAiThinking && <ActivityIndicator color="#00E699" size="small" />}
      </View>

      {/* Difficulty Selector */}
      <View style={styles.diffRow}>
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.diffBtn, difficulty === d && styles.diffBtnActive]}
            onPress={() => {
              setDifficulty(d);
              resetGame();
            }}
          >
            <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>
              {d === 'easy' ? 'Novice' : d === 'medium' ? 'Shadow' : 'Sensei'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chessboard */}
      <ChessBoard
        fen={fen}
        selectedSquare={selectedSquare}
        legalMoves={legalMoves}
        lastMove={lastMove}
        inCheckSquare={inCheckSquare}
        onSquarePress={handleSquarePress}
        disabled={isAiThinking || !!gameResult}
      />

      {/* Game Over Banner */}
      {gameResult && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultTitle}>{gameResult}</Text>
          <TouchableOpacity style={styles.rematchBtn} onPress={resetGame}>
            <Text style={styles.rematchText}>Play Rematch</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Game Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlBtn} onPress={resetGame}>
          <Ionicons name="refresh" size={16} color="#94A3B8" />
          <Text style={styles.controlText}>Reset</Text>
        </TouchableOpacity>

        <View style={styles.moveCountBadge}>
          <Text style={styles.moveCountText}>Move {Math.floor(moveCount / 2) + 1}</Text>
        </View>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => {
            chess.undo(); // Undo AI
            chess.undo(); // Undo player
            setFen(chess.fen());
            setSelectedSquare(null);
            setLegalMoves([]);
          }}
        >
          <Ionicons name="arrow-undo" size={16} color="#94A3B8" />
          <Text style={styles.controlText}>Undo</Text>
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
  rivalBar: {
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
  rivalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rivalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rivalName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  eloText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  rivalStatus: {
    color: '#64748B',
    fontSize: 11,
  },
  diffRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 3,
    gap: 4,
  },
  diffBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  diffBtnActive: {
    backgroundColor: '#00E699',
  },
  diffText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  diffTextActive: {
    color: '#070A11',
    fontWeight: '900',
  },
  resultBanner: {
    backgroundColor: '#0C1C2B',
    borderWidth: 2,
    borderColor: '#00E699',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  resultTitle: {
    color: '#00E699',
    fontSize: 18,
    fontWeight: '900',
  },
  rematchBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rematchText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 13,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  controlText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  moveCountBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  moveCountText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
});
