import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Square, PieceSymbol, Color } from 'chess.js';

interface ChessBoardProps {
  fen: string;
  selectedSquare: Square | null;
  legalMoves: Square[];
  lastMove?: { from: Square; to: Square } | null;
  inCheckSquare?: Square | null;
  isFlipped?: boolean; // True if player is Black
  onSquarePress: (square: Square) => void;
  disabled?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 32, 380);
const SQUARE_SIZE = Math.floor(BOARD_SIZE / 8);

type MCIIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const PIECE_ICON_MAP: Record<PieceSymbol, MCIIconName> = {
  p: 'chess-pawn',
  r: 'chess-rook',
  n: 'chess-knight',
  b: 'chess-bishop',
  q: 'chess-queen',
  k: 'chess-king',
};

export function ChessBoard({
  fen,
  selectedSquare,
  legalMoves,
  lastMove,
  inCheckSquare,
  isFlipped = false,
  onSquarePress,
  disabled = false,
}: ChessBoardProps) {
  // Parse FEN into 8x8 matrix
  const piecePlacement = fen.split(' ')[0];
  const rows = piecePlacement.split('/');
  const boardMatrix: ({ type: PieceSymbol; color: Color } | null)[][] = [];

  for (const rowStr of rows) {
    const row: ({ type: PieceSymbol; color: Color } | null)[] = [];
    for (const char of rowStr) {
      if (!isNaN(parseInt(char, 10))) {
        const emptyCount = parseInt(char, 10);
        for (let i = 0; i < emptyCount; i++) row.push(null);
      } else {
        const color: Color = char === char.toUpperCase() ? 'w' : 'b';
        const type = char.toLowerCase() as PieceSymbol;
        row.push({ type, color });
      }
    }
    boardMatrix.push(row);
  }

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayedRanks = isFlipped ? [...ranks].reverse() : ranks;
  const displayedFiles = isFlipped ? [...files].reverse() : files;

  return (
    <View style={styles.boardContainer}>
      <View style={[styles.boardGrid, { width: SQUARE_SIZE * 8, height: SQUARE_SIZE * 8 }]}>
        {displayedRanks.map((rank, rIdx) => {
          return (
            <View key={rank} style={styles.rankRow}>
              {displayedFiles.map((file, fIdx) => {
                const square = `${file}${rank}` as Square;
                const origRow = isFlipped ? 7 - rIdx : rIdx;
                const origCol = isFlipped ? 7 - fIdx : fIdx;
                const piece = boardMatrix[origRow]?.[origCol];

                const isLight = (rIdx + fIdx) % 2 === 0;
                const isSelected = selectedSquare === square;
                const isLegalTarget = legalMoves.includes(square);
                const isLastMove = lastMove?.from === square || lastMove?.to === square;
                const isInCheck = inCheckSquare === square;

                return (
                  <TouchableOpacity
                    key={square}
                    activeOpacity={0.8}
                    disabled={disabled}
                    style={[
                      styles.square,
                      { width: SQUARE_SIZE, height: SQUARE_SIZE },
                      isLight ? styles.lightSquare : styles.darkSquare,
                      isLastMove && styles.lastMoveSquare,
                      isSelected && styles.selectedSquare,
                      isInCheck && styles.inCheckSquare,
                    ]}
                    onPress={() => onSquarePress(square)}
                  >
                    {/* Rank / File coordinates indicators */}
                    {fIdx === 0 && (
                      <Text
                        style={[
                          styles.coordRank,
                          isLight ? styles.coordDark : styles.coordLight,
                        ]}
                      >
                        {rank}
                      </Text>
                    )}
                    {rIdx === 7 && (
                      <Text
                        style={[
                          styles.coordFile,
                          isLight ? styles.coordDark : styles.coordLight,
                        ]}
                      >
                        {file}
                      </Text>
                    )}

                    {/* Chess Piece */}
                    {piece && (
                      <View style={styles.pieceWrapper}>
                        <MaterialCommunityIcons
                          name={PIECE_ICON_MAP[piece.type]}
                          size={SQUARE_SIZE * 0.72}
                          color={piece.color === 'w' ? '#FFFFFF' : '#0B132B'}
                          style={[
                            piece.color === 'b' && styles.blackPieceOutline,
                            piece.color === 'w' && styles.whitePieceGlow,
                          ]}
                        />
                      </View>
                    )}

                    {/* Legal Target Move Dot */}
                    {isLegalTarget && (
                      <View style={styles.targetIndicatorContainer}>
                        {piece ? (
                          <View style={styles.captureTargetRing} />
                        ) : (
                          <View style={styles.moveTargetDot} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    backgroundColor: '#0A0F1D',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1E293B',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  boardGrid: {
    overflow: 'hidden',
    borderRadius: 10,
  },
  rankRow: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lightSquare: {
    backgroundColor: '#273549',
  },
  darkSquare: {
    backgroundColor: '#111B29',
  },
  lastMoveSquare: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  selectedSquare: {
    backgroundColor: 'rgba(0, 230, 153, 0.45)',
    borderWidth: 2,
    borderColor: '#00E699',
  },
  inCheckSquare: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
  },
  coordRank: {
    position: 'absolute',
    top: 2,
    left: 2,
    fontSize: 9,
    fontWeight: '700',
  },
  coordFile: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 9,
    fontWeight: '700',
  },
  coordLight: {
    color: '#94A3B8',
  },
  coordDark: {
    color: '#64748B',
  },
  pieceWrapper: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whitePieceGlow: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 4,
  },
  blackPieceOutline: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 4,
  },
  targetIndicatorContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  moveTargetDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00E699',
    opacity: 0.85,
  },
  captureTargetRing: {
    width: SQUARE_SIZE - 4,
    height: SQUARE_SIZE - 4,
    borderRadius: (SQUARE_SIZE - 4) / 2,
    borderWidth: 3,
    borderColor: '#EF4444',
    opacity: 0.8,
  },
});
