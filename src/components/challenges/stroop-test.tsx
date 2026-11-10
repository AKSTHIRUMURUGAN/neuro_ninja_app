import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface StroopTestProps {
  onCompleted: (score: number) => void;
  roundsCount?: number;
}

interface StroopTrial {
  word: string;
  inkColor: string; // The correct answer!
  displayColor: string; // Hex color for style
}

const COLOR_MAP: Record<string, string> = {
  RED: '#EF4444',
  BLUE: '#3B82F6',
  GREEN: '#10B981',
  YELLOW: '#F59E0B',
};

function generateTrial(): StroopTrial {
  const names = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
  const word = names[Math.floor(Math.random() * names.length)];
  let ink = names[Math.floor(Math.random() * names.length)];
  // Make it conflict most of the time
  while (ink === word && Math.random() > 0.3) {
    ink = names[Math.floor(Math.random() * names.length)];
  }
  return {
    word,
    inkColor: ink,
    displayColor: COLOR_MAP[ink],
  };
}

export function StroopTest({ onCompleted, roundsCount = 5 }: StroopTestProps) {
  const [round, setRound] = useState(0);
  const [trial, setTrial] = useState<StroopTrial>(() => generateTrial());
  const [correctScore, setCorrectScore] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleChoice = async (colorName: string) => {
    const isCorrect = colorName === trial.inkColor;
    if (isCorrect) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCorrectScore((prev) => prev + 1);
      setFeedbackMsg('Sharp reflex! +1');
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedbackMsg(`Tricked! The ink was ${trial.inkColor}`);
    }

    const nextRound = round + 1;
    if (nextRound >= roundsCount) {
      const finalScore = isCorrect ? correctScore + 1 : correctScore;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCompleted(finalScore);
    } else {
      setRound(nextRound);
      setTrial(generateTrial());
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="eye-outline" size={16} color="#60A5FA" />
        <Text style={styles.badgeText}>
          Round {round + 1} of {roundsCount}
        </Text>
      </View>

      <Text style={styles.prompt}>TAP THE INK COLOR, NOT THE WORD</Text>

      {/* Stimulus Word */}
      <View style={styles.wordBox}>
        <Text style={[styles.stroopWord, { color: trial.displayColor }]}>
          {trial.word}
        </Text>
      </View>

      <Text style={styles.feedback}>{feedbackMsg}</Text>

      {/* 4 Color Buttons */}
      <View style={styles.buttonGrid}>
        {['RED', 'BLUE', 'GREEN', 'YELLOW'].map((colorName) => (
          <TouchableOpacity
            key={colorName}
            style={[styles.choiceBtn, { borderColor: COLOR_MAP[colorName] }]}
            onPress={() => void handleChoice(colorName)}
            activeOpacity={0.7}
          >
            <View style={[styles.colorDot, { backgroundColor: COLOR_MAP[colorName] }]} />
            <Text style={styles.choiceText}>{colorName}</Text>
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
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#60A5FA',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '700',
  },
  prompt: {
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 1.5,
    fontWeight: '800',
    marginBottom: 20,
  },
  wordBox: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stroopWord: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
  },
  feedback: {
    fontSize: 12,
    color: '#00E699',
    fontWeight: '600',
    height: 20,
    marginBottom: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    justifyContent: 'space-between',
    gap: 14,
  },
  choiceBtn: {
    width: 130,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
});

