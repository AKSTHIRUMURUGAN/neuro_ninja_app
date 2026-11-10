import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface MathMissionProps {
  difficulty?: 'easy' | 'medium' | 'hard';
  onCompleted: () => void;
}

interface MathProblem {
  question: string;
  answer: number;
}

function generateProblem(difficulty: 'easy' | 'medium' | 'hard'): MathProblem {
  let a = 12;
  let b = 7;
  let c = 5;
  if (difficulty === 'easy') {
    a = Math.floor(Math.random() * 20) + 5;
    b = Math.floor(Math.random() * 15) + 3;
    return { question: `${a} + ${b}`, answer: a + b };
  } else if (difficulty === 'medium') {
    a = Math.floor(Math.random() * 12) + 4;
    b = Math.floor(Math.random() * 9) + 3;
    c = Math.floor(Math.random() * 20) + 10;
    return { question: `(${a} × ${b}) + ${c}`, answer: a * b + c };
  } else {
    a = Math.floor(Math.random() * 25) + 10;
    b = Math.floor(Math.random() * 15) + 5;
    c = Math.floor(Math.random() * 30) + 10;
    return { question: `(${a} × ${b}) - ${c}`, answer: a * b - c };
  }
}

export function MathMission({ difficulty = 'medium', onCompleted }: MathMissionProps) {
  const [problemIndex, setProblemIndex] = useState(0);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(() => generateProblem(difficulty));
  const [inputVal, setInputVal] = useState('');
  const [errorText, setErrorText] = useState('');
  const totalProblems = 3;

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
        setProblemIndex(nextIndex);
        setCurrentProblem(generateProblem(difficulty));
        setInputVal('');
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
          Problem {problemIndex + 1} of {totalProblems}
        </Text>
      </View>

      <Text style={styles.questionText}>{currentProblem.question} = ?</Text>

      <View style={styles.inputBox}>
        <Text style={styles.inputText}>{inputVal || '—'}</Text>
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : <View style={{ height: 20 }} />}

      {/* Keypad */}
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
  container: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
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
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    color: '#00E699',
    fontWeight: '700',
  },
  questionText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputBox: {
    width: 200,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  inputText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00E699',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 260,
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    width: 72,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySubmit: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  keyClear: {
    backgroundColor: '#334155',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  keyTextSubmit: {
    color: '#070A11',
    fontWeight: '900',
  },
  keyTextClear: {
    color: '#94A3B8',
  },
});

