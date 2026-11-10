import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface PatternLockProps {
  correctPattern?: number[]; // e.g., [0, 1, 2, 5, 8]
  onSuccess: () => void;
  onFailure?: () => void;
  onCancel?: () => void;
}

export function PatternLock({
  correctPattern = [0, 1, 2, 5],
  onSuccess,
  onFailure,
  onCancel,
}: PatternLockProps) {
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [statusMsg, setStatusMsg] = useState('Connect at least 4 dots to unlock');
  const [isError, setIsError] = useState(false);

  const handleNodePress = async (index: number) => {
    if (selectedNodes.includes(index)) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsError(false);

    const next = [...selectedNodes, index];
    setSelectedNodes(next);

    if (next.length === correctPattern.length) {
      const isMatch = next.every((val, i) => val === correctPattern[i]);
      if (isMatch) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStatusMsg('Pattern accepted!');
        onSuccess();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsError(true);
        setStatusMsg('Wrong pattern. Try again.');
        onFailure?.();
        setTimeout(() => {
          setSelectedNodes([]);
          setIsError(false);
          setStatusMsg('Connect at least 4 dots to unlock');
        }, 1000);
      }
    }
  };

  const handleReset = () => {
    setSelectedNodes([]);
    setIsError(false);
    setStatusMsg('Connect at least 4 dots to unlock');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="finger-print-outline" size={28} color="#00E699" />
      </View>

      <Text style={styles.title}>Draw Unlock Pattern</Text>
      <Text style={[styles.status, isError && styles.statusError]}>{statusMsg}</Text>

      {/* 3x3 Dots Canvas */}
      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
          const isSelected = selectedNodes.includes(index);
          const order = selectedNodes.indexOf(index);
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.node,
                isSelected && (isError ? styles.nodeError : styles.nodeSelected),
              ]}
              onPress={() => void handleNodePress(index)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.innerDot,
                  isSelected && (isError ? styles.innerDotError : styles.innerDotSelected),
                ]}
              />
              {isSelected && (
                <Text style={styles.orderBadge}>{order + 1}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleReset}>
          <Text style={styles.actionBtnText}>Clear Pattern</Text>
        </TouchableOpacity>
        {onCancel && (
          <TouchableOpacity style={styles.actionBtn} onPress={onCancel}>
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F291E',
    borderWidth: 1,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 24,
  },
  statusError: {
    color: '#EF4444',
    fontWeight: '700',
  },
  grid: {
    width: 250,
    height: 250,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    marginBottom: 28,
  },
  node: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeSelected: {
    borderColor: '#00E699',
    backgroundColor: '#0F291E',
  },
  nodeError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  innerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#64748B',
  },
  innerDotSelected: {
    backgroundColor: '#00E699',
  },
  innerDotError: {
    backgroundColor: '#EF4444',
  },
  orderBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
});

