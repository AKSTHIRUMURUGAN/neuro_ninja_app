import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export interface PatternLockProps {
  correctPattern?: number[]; // e.g. [0, 1, 2, 5, 8]
  onSuccess: () => void;
  onFailure?: (attempts: number) => void;
  onCancel?: () => void;
  onPatternRecorded?: (pattern: number[]) => void; // for Setup / Confirmation flow
  isSetupMode?: boolean;
  title?: string;
  subtitle?: string;
  patternVisible?: boolean;
  patternHaptics?: boolean;
}

interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 288;
const PADDING = 48;
const SPACING = (GRID_SIZE - 2 * PADDING) / 2; // 96px between nodes
const HIT_RADIUS = 38;
const LINE_WIDTH = 5;

// Precompute center coordinates for nodes 0..8
const NODE_COORDINATES: Point[] = [
  { x: PADDING + 0 * SPACING, y: PADDING + 0 * SPACING }, // 0: Top-Left
  { x: PADDING + 1 * SPACING, y: PADDING + 0 * SPACING }, // 1: Top-Mid
  { x: PADDING + 2 * SPACING, y: PADDING + 0 * SPACING }, // 2: Top-Right
  { x: PADDING + 0 * SPACING, y: PADDING + 1 * SPACING }, // 3: Mid-Left
  { x: PADDING + 1 * SPACING, y: PADDING + 1 * SPACING }, // 4: Center
  { x: PADDING + 2 * SPACING, y: PADDING + 1 * SPACING }, // 5: Mid-Right
  { x: PADDING + 0 * SPACING, y: PADDING + 2 * SPACING }, // 6: Bot-Left
  { x: PADDING + 1 * SPACING, y: PADDING + 2 * SPACING }, // 7: Bot-Mid
  { x: PADDING + 2 * SPACING, y: PADDING + 2 * SPACING }, // 8: Bot-Right
];

export function PatternLock({
  correctPattern = [0, 1, 2, 5, 8],
  onSuccess,
  onFailure,
  onCancel,
  onPatternRecorded,
  isSetupMode = false,
  title = 'Draw Unlock Pattern',
  subtitle = 'Connect at least 4 dots to unlock',
  patternVisible = true,
  patternHaptics = true,
}: PatternLockProps) {
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [currentTouch, setCurrentTouch] = useState<Point | null>(null);
  const [statusMsg, setStatusMsg] = useState(subtitle);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const selectedRef = useRef<number[]>([]);
  const isErrorRef = useRef(false);

  useEffect(() => {
    selectedRef.current = selectedNodes;
  }, [selectedNodes]);

  useEffect(() => {
    isErrorRef.current = isError;
  }, [isError]);

  const [shakeAnim] = useState(() => new Animated.Value(0));

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const findClosestNode = (x: number, y: number): number | null => {
    for (let i = 0; i < NODE_COORDINATES.length; i++) {
      const coord = NODE_COORDINATES[i];
      const distSq = (x - coord.x) * (x - coord.x) + (y - coord.y) * (y - coord.y);
      if (distSq <= HIT_RADIUS * HIT_RADIUS) {
        return i;
      }
    }
    return null;
  };

  const addNodeIfValid = useCallback((nodeIdx: number) => {
    if (selectedRef.current.includes(nodeIdx)) return;
    if (patternHaptics) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const next = [...selectedRef.current, nodeIdx];
    selectedRef.current = next;
    setSelectedNodes(next);
  }, [patternHaptics]);

  const handleTouchMove = useCallback((localX: number, localY: number) => {
    if (isErrorRef.current) return;
    setCurrentTouch({ x: localX, y: localY });
    const node = findClosestNode(localX, localY);
    if (node !== null) {
      addNodeIfValid(node);
    }
  }, [addNodeIfValid]);

  const handleTouchEnd = useCallback(() => {
    setCurrentTouch(null);
    const pattern = selectedRef.current;
    if (pattern.length === 0) return;

    if (pattern.length < 4) {
      if (patternHaptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setIsError(true);
      setStatusMsg('Connect at least 4 dots');
      triggerShake();
      setTimeout(() => {
        setSelectedNodes([]);
        setIsError(false);
        setStatusMsg(subtitle);
      }, 700);
      return;
    }

    if (isSetupMode && onPatternRecorded) {
      if (patternHaptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setIsSuccess(true);
      onPatternRecorded(pattern);
      setTimeout(() => {
        setSelectedNodes([]);
        setIsSuccess(false);
      }, 400);
      return;
    }

    // Unlock Validation Mode
    const isMatch =
      pattern.length === correctPattern.length &&
      pattern.every((val, i) => val === correctPattern[i]);

    if (isMatch) {
      if (patternHaptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setIsSuccess(true);
      setStatusMsg('Pattern accepted!');
      onSuccess();
    } else {
      if (patternHaptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      const nextFail = failedCount + 1;
      setFailedCount(nextFail);
      setIsError(true);
      setStatusMsg(
        nextFail >= 3
          ? `Intruder Alert: ${nextFail} failed attempts recorded`
          : 'Wrong pattern. Try again.'
      );
      triggerShake();
      onFailure?.(nextFail);
      setTimeout(() => {
        setSelectedNodes([]);
        setIsError(false);
        setStatusMsg(subtitle);
      }, 800);
    }
  }, [
    correctPattern,
    failedCount,
    isSetupMode,
    onFailure,
    onPatternRecorded,
    onSuccess,
    patternHaptics,
    subtitle,
    triggerShake,
  ]);

  const lineColor = isError ? '#EF4444' : isSuccess ? '#00E699' : '#00E699';

  return (
    <View style={styles.container}>
      {/* Header Emblem */}
      <View
        style={[
          styles.iconCircle,
          isError && styles.iconCircleError,
          isSuccess && styles.iconCircleSuccess,
        ]}
      >
        <Ionicons
          name={isSuccess ? 'checkmark-circle' : isError ? 'alert-circle' : 'finger-print'}
          size={30}
          color={isError ? '#EF4444' : isSuccess ? '#00E699' : '#00E699'}
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.status, isError && styles.statusError, isSuccess && styles.statusSuccess]}>
        {statusMsg}
      </Text>

      {/* 3x3 Continuous Gesture Canvas */}
      <Animated.View
        style={[
          styles.gridContainer,
          { transform: [{ translateX: shakeAnim }] },
        ]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(evt) => {
          if (isError) return;
          setSelectedNodes([]);
          setIsSuccess(false);
          setIsError(false);
          setStatusMsg(subtitle);
          handleTouchMove(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        }}
        onResponderMove={(evt) => {
          handleTouchMove(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        }}
        onResponderRelease={() => {
          handleTouchEnd();
        }}
        onResponderTerminate={() => {
          handleTouchEnd();
        }}
      >
        {/* Render lines between connected nodes */}
        {patternVisible &&
          selectedNodes.map((nodeIdx, idx) => {
            if (idx === 0) return null;
            const prevIdx = selectedNodes[idx - 1];
            const p1 = NODE_COORDINATES[prevIdx];
            const p2 = NODE_COORDINATES[nodeIdx];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            return (
              <View
                key={`line-${prevIdx}-${nodeIdx}`}
                pointerEvents="none"
                style={[
                  styles.lineSegment,
                  {
                    left: midX - length / 2,
                    top: midY - LINE_WIDTH / 2,
                    width: length,
                    backgroundColor: lineColor,
                    transform: [{ rotate: `${angleDeg}deg` }],
                  },
                ]}
              />
            );
          })}

        {/* Render live rubber-band line to current touch point */}
        {patternVisible &&
          currentTouch &&
          selectedNodes.length > 0 &&
          !isError &&
          !isSuccess && (() => {
            const lastNode = NODE_COORDINATES[selectedNodes[selectedNodes.length - 1]];
            const dx = currentTouch.x - lastNode.x;
            const dy = currentTouch.y - lastNode.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length < 8) return null;
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
            const midX = (lastNode.x + currentTouch.x) / 2;
            const midY = (lastNode.y + currentTouch.y) / 2;

            return (
              <View
                pointerEvents="none"
                style={[
                  styles.lineSegment,
                  {
                    left: midX - length / 2,
                    top: midY - LINE_WIDTH / 2,
                    width: length,
                    backgroundColor: 'rgba(0, 230, 153, 0.55)',
                    transform: [{ rotate: `${angleDeg}deg` }],
                  },
                ]}
              />
            );
          })()}

        {/* 9 Grid Nodes */}
        {NODE_COORDINATES.map((coord, index) => {
          const isSelected = selectedNodes.includes(index);
          const order = selectedNodes.indexOf(index);

          return (
            <View
              key={`node-${index}`}
              pointerEvents="none"
              style={[
                styles.nodeWrapper,
                { left: coord.x - 24, top: coord.y - 24 },
              ]}
            >
              {/* Outer Glow Ring */}
              <View
                style={[
                  styles.outerRing,
                  isSelected &&
                    (isError
                      ? styles.outerRingError
                      : isSuccess
                      ? styles.outerRingSuccess
                      : styles.outerRingActive),
                ]}
              >
                {/* Inner Dot */}
                <View
                  style={[
                    styles.innerDot,
                    isSelected &&
                      (isError
                        ? styles.innerDotError
                        : isSuccess
                        ? styles.innerDotSuccess
                        : styles.innerDotActive),
                  ]}
                />
              </View>

              {/* Order Indicator (stealth if patternVisible is off) */}
              {isSelected && patternVisible && (
                <View style={[styles.orderBadge, isError && styles.orderBadgeError]}>
                  <Text style={styles.orderText}>{order + 1}</Text>
                </View>
              )}
            </View>
          );
        })}
      </Animated.View>

      {/* Action Footer */}
      <View style={styles.actions}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#94A3B8" />
            <Text style={styles.cancelBtnText}>Back to Options</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#071610',
    borderWidth: 1.5,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircleError: {
    backgroundColor: '#2A0C0C',
    borderColor: '#EF4444',
  },
  iconCircleSuccess: {
    backgroundColor: '#0F291E',
    borderColor: '#10B981',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  status: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
    textAlign: 'center',
    minHeight: 18,
  },
  statusError: {
    color: '#EF4444',
    fontWeight: '700',
  },
  statusSuccess: {
    color: '#00E699',
    fontWeight: '700',
  },
  gridContainer: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(51, 65, 85, 0.7)',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  lineSegment: {
    position: 'absolute',
    height: LINE_WIDTH,
    borderRadius: LINE_WIDTH / 2,
    zIndex: 1,
  },
  nodeWrapper: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  outerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(100, 116, 139, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  outerRingActive: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    transform: [{ scale: 1.08 }],
  },
  outerRingSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  outerRingError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    transform: [{ scale: 1.08 }],
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#64748B',
  },
  innerDotActive: {
    backgroundColor: '#00E699',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  innerDotSuccess: {
    backgroundColor: '#10B981',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  innerDotError: {
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  orderBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00E699',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeError: {
    backgroundColor: '#EF4444',
  },
  orderText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#070A11',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
