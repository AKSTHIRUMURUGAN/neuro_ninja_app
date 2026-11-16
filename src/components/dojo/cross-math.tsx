import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface CrossMathProps {
  onCompleted?: (score: number) => void;
}

interface CrossMathPuzzle {
  id: string;
  // Equations:
  // Row 1: A op1 B = r1
  // Row 2: C op2 D = r2
  // Col 1: A op3 C = c1
  // Col 2: B op4 D = c2
  op1: '+' | '-' | '×';
  op2: '+' | '-' | '×';
  op3: '+' | '-' | '×';
  op4: '+' | '-' | '×';
  r1: number;
  r2: number;
  c1: number;
  c2: number;
  solution: [number, number, number, number]; // [A, B, C, D]
  numbers: number[]; // Shuffled tile tray
}

const CROSSMATH_PUZZLES: CrossMathPuzzle[] = [
  {
    id: 'cm_1',
    op1: '+',
    op2: '×',
    op3: '+',
    op4: '-',
    r1: 15, // 9 + 6 = 15
    r2: 12, // 4 × 3 = 12
    c1: 13, // 9 + 4 = 13
    c2: 3,  // 6 - 3 = 3
    solution: [9, 6, 4, 3],
    numbers: [6, 9, 3, 4],
  },
  {
    id: 'cm_2',
    op1: '×',
    op2: '+',
    op3: '+',
    op4: '×',
    r1: 24, // 8 × 3 = 24
    r2: 9,  // 5 + 4 = 9
    c1: 13, // 8 + 5 = 13
    c2: 12, // 3 × 4 = 12
    solution: [8, 3, 5, 4],
    numbers: [4, 8, 5, 3],
  },
  {
    id: 'cm_3',
    op1: '-',
    op2: '+',
    op3: '×',
    op4: '+',
    r1: 4,  // 9 - 5 = 4
    r2: 10, // 2 + 8 = 10
    c1: 18, // 9 × 2 = 18
    c2: 13, // 5 + 8 = 13
    solution: [9, 5, 2, 8],
    numbers: [5, 2, 8, 9],
  },
  {
    id: 'cm_4',
    op1: '+',
    op2: '×',
    op3: '-',
    op4: '+',
    r1: 11, // 7 + 4 = 11
    r2: 18, // 3 × 6 = 18
    c1: 4,  // 7 - 3 = 4
    c2: 10, // 4 + 6 = 10
    solution: [7, 4, 3, 6],
    numbers: [3, 7, 6, 4],
  },
];

export function CrossMath({ onCompleted }: CrossMathProps) {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const currentPuzzle = CROSSMATH_PUZZLES[puzzleIndex % CROSSMATH_PUZZLES.length];

  // Grid cells: 0=A, 1=B, 2=C, 3=D
  const [grid, setGrid] = useState<(number | null)[]>([null, null, null, null]);
  const [selectedTrayNum, setSelectedTrayNum] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solvedStreak, setSolvedStreak] = useState(0);

  const resetGrid = () => {
    setGrid([null, null, null, null]);
    setSelectedTrayNum(null);
    setFeedback(null);
  };

  const handleNextPuzzle = () => {
    setPuzzleIndex((p) => p + 1);
    resetGrid();
  };

  const handleTrayPress = async (num: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // If number is already placed in grid, cannot select it again
    if (grid.includes(num)) return;
    setSelectedTrayNum(selectedTrayNum === num ? null : num);
  };

  const handleCellPress = async (cellIndex: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // If cell already has a number and no tray number selected -> return number to tray
    if (grid[cellIndex] !== null && selectedTrayNum === null) {
      const nextGrid = [...grid];
      nextGrid[cellIndex] = null;
      setGrid(nextGrid);
      setFeedback(null);
      return;
    }

    // Place selected number into cell
    if (selectedTrayNum !== null) {
      const nextGrid = [...grid];
      nextGrid[cellIndex] = selectedTrayNum;
      setGrid(nextGrid);
      setSelectedTrayNum(null);
      setFeedback(null);

      // If all 4 cells are filled -> evaluate equations!
      if (!nextGrid.includes(null)) {
        checkSolution(nextGrid as number[]);
      }
    }
  };

  const checkSolution = async (cells: number[]) => {
    const [A, B, C, D] = cells;
    const { op1, op2, op3, op4, r1, r2, c1, c2 } = currentPuzzle;

    const calc = (x: number, op: '+' | '-' | '×', y: number) => {
      if (op === '+') return x + y;
      if (op === '-') return x - y;
      return x * y;
    };

    const row1Ok = calc(A, op1, B) === r1;
    const row2Ok = calc(C, op2, D) === r2;
    const col1Ok = calc(A, op3, C) === c1;
    const col2Ok = calc(B, op4, D) === c2;

    if (row1Ok && row2Ok && col1Ok && col2Ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const nextStreak = solvedStreak + 1;
      setSolvedStreak(nextStreak);
      setFeedback('PERFECT! All intersecting equations balanced!');

      setTimeout(() => {
        if (onCompleted) {
          onCompleted(nextStreak * 150);
        }
        handleNextPuzzle();
      }, 1400);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedback('Equations unbalanced! Tap a placed tile to remove and retry.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeBox}>
          <MaterialCommunityIcons name="grid" size={16} color="#00E699" />
          <Text style={styles.badgeText}>CROSSMATH DOJO #{puzzleIndex + 1}</Text>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={resetGrid}>
          <Ionicons name="refresh" size={16} color="#94A3B8" />
          <Text style={styles.resetText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instruction}>
        Tap a number below, then tap a target cell to balance all 4 equations!
      </Text>

      {/* 2x2 Equation Matrix Grid */}
      <View style={styles.gridContainer}>
        {/* Row 1 */}
        <View style={styles.matrixRow}>
          <TouchableOpacity
            style={[styles.cell, grid[0] !== null && styles.cellFilled]}
            onPress={() => void handleCellPress(0)}
          >
            <Text style={styles.cellText}>{grid[0] ?? '?'}</Text>
          </TouchableOpacity>

          <Text style={styles.opText}>{currentPuzzle.op1}</Text>

          <TouchableOpacity
            style={[styles.cell, grid[1] !== null && styles.cellFilled]}
            onPress={() => void handleCellPress(1)}
          >
            <Text style={styles.cellText}>{grid[1] ?? '?'}</Text>
          </TouchableOpacity>

          <Text style={styles.equalText}>=</Text>

          <View style={styles.targetBadge}>
            <Text style={styles.targetText}>{currentPuzzle.r1}</Text>
          </View>
        </View>

        {/* Vertical Operators Row */}
        <View style={styles.verticalOpRow}>
          <Text style={styles.vertOpText}>{currentPuzzle.op3}</Text>
          <View style={{ width: 48 }} />
          <Text style={styles.vertOpText}>{currentPuzzle.op4}</Text>
        </View>

        {/* Row 2 */}
        <View style={styles.matrixRow}>
          <TouchableOpacity
            style={[styles.cell, grid[2] !== null && styles.cellFilled]}
            onPress={() => void handleCellPress(2)}
          >
            <Text style={styles.cellText}>{grid[2] ?? '?'}</Text>
          </TouchableOpacity>

          <Text style={styles.opText}>{currentPuzzle.op2}</Text>

          <TouchableOpacity
            style={[styles.cell, grid[3] !== null && styles.cellFilled]}
            onPress={() => void handleCellPress(3)}
          >
            <Text style={styles.cellText}>{grid[3] ?? '?'}</Text>
          </TouchableOpacity>

          <Text style={styles.equalText}>=</Text>

          <View style={styles.targetBadge}>
            <Text style={styles.targetText}>{currentPuzzle.r2}</Text>
          </View>
        </View>

        {/* Bottom Equal & Column Targets */}
        <View style={styles.verticalOpRow}>
          <Text style={styles.vertEqualText}>=</Text>
          <View style={{ width: 48 }} />
          <Text style={styles.vertEqualText}>=</Text>
        </View>

        <View style={styles.matrixRow}>
          <View style={styles.targetBadge}>
            <Text style={styles.targetText}>{currentPuzzle.c1}</Text>
          </View>
          <View style={{ width: 40 }} />
          <View style={styles.targetBadge}>
            <Text style={styles.targetText}>{currentPuzzle.c2}</Text>
          </View>
        </View>
      </View>

      {/* Feedback Message */}
      {feedback && (
        <View
          style={[
            styles.feedbackBox,
            feedback.startsWith('PERFECT') ? styles.fbSuccess : styles.fbError,
          ]}
        >
          <Text style={styles.fbText}>{feedback}</Text>
        </View>
      )}

      {/* Tile Tray */}
      <View style={styles.trayContainer}>
        <Text style={styles.trayLabel}>AVAILABLE NUMBER TILES</Text>
        <View style={styles.trayTiles}>
          {currentPuzzle.numbers.map((num) => {
            const isUsed = grid.includes(num);
            const isSelected = selectedTrayNum === num;
            return (
              <TouchableOpacity
                key={num}
                disabled={isUsed}
                style={[
                  styles.trayTile,
                  isSelected && styles.trayTileSelected,
                  isUsed && styles.trayTileUsed,
                ]}
                onPress={() => void handleTrayPress(num)}
              >
                <Text
                  style={[
                    styles.trayTileText,
                    isSelected && { color: '#070A11' },
                    isUsed && { color: '#475569' },
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resetText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  instruction: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  gridContainer: {
    backgroundColor: '#0B132B',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    gap: 10,
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cell: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    backgroundColor: '#0F2C3F',
    borderColor: '#00E699',
  },
  cellText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
  },
  opText: {
    color: '#00E699',
    fontSize: 20,
    fontWeight: '900',
    width: 20,
    textAlign: 'center',
  },
  equalText: {
    color: '#64748B',
    fontSize: 20,
    fontWeight: '900',
    width: 20,
    textAlign: 'center',
  },
  targetBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetText: {
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: '900',
  },
  verticalOpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    paddingVertical: 2,
  },
  vertOpText: {
    color: '#00E699',
    fontSize: 18,
    fontWeight: '900',
    width: 20,
    textAlign: 'center',
  },
  vertEqualText: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '900',
    width: 20,
    textAlign: 'center',
  },
  feedbackBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    width: '100%',
  },
  fbSuccess: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  fbError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  fbText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  trayContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  trayLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  trayTiles: {
    flexDirection: 'row',
    gap: 12,
  },
  trayTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayTileSelected: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  trayTileUsed: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    opacity: 0.4,
  },
  trayTileText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
  },
});
