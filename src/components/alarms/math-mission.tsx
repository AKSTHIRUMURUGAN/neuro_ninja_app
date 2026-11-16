import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  loadActiveMissionProgress,
  saveActiveMissionProgress,
} from '../../services/alarms/alarm-engine';

interface MathMissionProps {
  alarmId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionCount?: number;
  onCompleted: () => void;
}

interface MathProblem {
  question: string;
  answer: number;
}

function generateProblem(difficulty: 'easy' | 'medium' | 'hard'): MathProblem {
  if (difficulty === 'easy') {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 15) + 3;
    return { question: `${a} + ${b}`, answer: a + b };
  }
  if (difficulty === 'medium') {
    const a = Math.floor(Math.random() * 12) + 4;
    const b = Math.floor(Math.random() * 9) + 3;
    const c = Math.floor(Math.random() * 20) + 10;
    return { question: `(${a} × ${b}) + ${c}`, answer: a * b + c };
  }
  const a = Math.floor(Math.random() * 22) + 12;
  const b = Math.floor(Math.random() * 12) + 5;
  const c = Math.floor(Math.random() * 30) + 10;
  return { question: `(${a} × ${b}) - ${c}`, answer: a * b - c };
}

export function MathMission({
  alarmId,
  difficulty = 'medium',
  questionCount = 3,
  onCompleted,
}: MathMissionProps) {
  const totalProblems = Math.max(1, Math.min(5, questionCount));
  const [problemIndex, setProblemIndex] = useState(0);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(() => generateProblem(difficulty));
  const [inputVal, setInputVal] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!alarmId) return;
    let mounted = true;
    void loadActiveMissionProgress(alarmId, 'math').then((saved) => {
      if (!mounted || !saved) return;
      if (typeof saved.problemIndex === 'number' && saved.currentProblem) {
        setProblemIndex(Math.min(totalProblems - 1, saved.problemIndex));
        setCurrentProblem(saved.currentProblem as MathProblem);
      }
    });
    return () => {
      mounted = false;
    };
  }, [alarmId, totalProblems]);

  const handleNumPress = async (num: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrorText('');
    setInputVal((prev) => (prev.length < 5 ? prev + num : prev));
  };

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputVal((prev) => prev.slice(0, -1));
  };

  const handleCheck = async () => {
    const val = parseInt(inputVal, 10);
    if (val === currentProblem.answer) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const nextIndex = problemIndex + 1;
      if (nextIndex >= totalProblems) {
        onCompleted();
      } else {
        const nextProblem = generateProblem(difficulty);
        setProblemIndex(nextIndex);
        setCurrentProblem(nextProblem);
        setInputVal('');
        if (alarmId) {
          void saveActiveMissionProgress(alarmId, 'math', {
            problemIndex: nextIndex,
            currentProblem: nextProblem,
          });
        }
      }
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorText('Incorrect! Try again.');
      setInputVal('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="calculator-outline" size={16} color="#00E699" />
        <Text style={styles.badgeText}>
          Problem {problemIndex + 1} of {totalProblems} · {difficulty.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.questionText}>{currentProblem.question} = ?</Text>

      <View style={styles.inputBox}>
        <Text style={styles.inputText}>{inputVal || '—'}</Text>
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : <View style={{ height: 20 }} />}

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.key,
              key === '✓' && styles.keySubmit,
              key === 'C' && styles.keyClear,
            ]}
            onPress={() => {
              if (key === 'C') void handleDelete();
              else if (key === '✓') void handleCheck();
              else void handleNumPress(key);
            }}
          >
            <Text
              style={[
                styles.keyText,
                key === '✓' && styles.keyTextSubmit,
                key === 'C' && styles.keyTextClear,
              ]}
            >
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 16, width: '100%' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F291E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00E699',
    marginBottom: 14,
  },
  badgeText: { fontSize: 12, color: '#00E699', fontWeight: '700' },
  questionText: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', marginBottom: 14 },
  inputBox: {
    width: 200,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  inputText: { fontSize: 26, fontWeight: '800', color: '#00E699' },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 256,
    justifyContent: 'space-between',
    gap: 10,
  },
  key: {
    width: 74,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySubmit: { backgroundColor: '#00E699', borderColor: '#00E699' },
  keyClear: { backgroundColor: '#334155' },
  keyText: { fontSize: 21, fontWeight: '700', color: '#F8FAFC' },
  keyTextSubmit: { color: '#070A11', fontWeight: '900' },
  keyTextClear: { color: '#94A3B8' },
});
