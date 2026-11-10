import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NinjaPalette } from '../../constants/theme';

interface Props {
  strictMode?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Question {
  text: string;
  options: number[];
  answer: number;
}

function generateQuestions(count: number): Question[] {
  const list: Question[] = [];
  for (let i = 0; i < count; i++) {
    const isMult = Math.random() > 0.5;
    let text = '';
    let answer = 0;

    if (isMult) {
      const a = Math.floor(Math.random() * 8) + 3; // 3-10
      const b = Math.floor(Math.random() * 9) + 4; // 4-12
      text = `${a} × ${b}`;
      answer = a * b;
    } else {
      const a = Math.floor(Math.random() * 45) + 15;
      const b = Math.floor(Math.random() * 35) + 12;
      text = `${a} + ${b}`;
      answer = a + b;
    }

    const wrong1 = answer + (Math.random() > 0.5 ? 2 : -2);
    const wrong2 = answer + (Math.random() > 0.5 ? 5 : -5);
    const wrong3 = answer + 10;
    const options = [answer, wrong1, wrong2, wrong3].sort(() => Math.random() - 0.5);

    list.push({ text, options, answer });
  }
  return list;
}

export function MathChallenge({ strictMode = false, onSuccess, onCancel }: Props) {
  const targetCount = strictMode ? 4 : 2;
  const [questions] = useState<Question[]>(() => generateQuestions(targetCount));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorStreak, setErrorStreak] = useState(0);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (num: number) => {
    if (num === currentQ.answer) {
      if (currentIndex + 1 >= targetCount) {
        onSuccess();
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } else {
      setErrorStreak((prev) => prev + 1);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>PREFRONTAL WAKEUP</Text>
      <Text style={styles.title}>Reflex Challenge</Text>
      <Text style={styles.subtitle}>
        Engage executive brain control ({currentIndex + 1} of {targetCount})
      </Text>

      <View style={styles.mathCard}>
        <Text style={styles.questionText}>{currentQ.text} = ?</Text>
      </View>

      {errorStreak > 0 && (
        <Text style={styles.errorText}>Incorrect — refocus your attention!</Text>
      )}

      <View style={styles.optionsGrid}>
        {currentQ.options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.optionButton}
            onPress={() => handleSelectOption(option)}
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Return to Focus</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: '100%',
  },
  badge: {
    color: NinjaPalette.cyan,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  mathCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 32,
    paddingHorizontal: 40,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  questionText: {
    fontSize: 38,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
    letterSpacing: 1,
  },
  errorText: {
    color: NinjaPalette.danger,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 28,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    width: '46%',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    color: NinjaPalette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

