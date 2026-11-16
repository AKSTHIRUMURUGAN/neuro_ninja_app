import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface TypingMissionProps {
  phrase?: string;
  onCompleted: () => void;
}

const DEFAULT_PHRASES = [
  'Discipline creates freedom',
  'I win the morning to win the day',
  'Focus beats distraction every time',
];

export function TypingMission({ phrase, onCompleted }: TypingMissionProps) {
  const [targetPhrase] = useState(
    () =>
      phrase && phrase.trim().length >= 6
        ? phrase.trim()
        : DEFAULT_PHRASES[Math.floor(Math.random() * DEFAULT_PHRASES.length)]
  );
  const [typed, setTyped] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = async (nextText: string) => {
    setTyped(nextText);
    setErrorMsg('');
    if (nextText.trim().toLowerCase() === targetPhrase.toLowerCase()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCompleted();
    }
  };

  const handleVerify = async () => {
    if (typed.trim().toLowerCase() === targetPhrase.toLowerCase()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCompleted();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg('Text does not match yet. Check spelling.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="create-outline" size={16} color="#06B6D4" />
        <Text style={styles.badgeText}>Typing Commitment Mission</Text>
      </View>

      <Text style={styles.instruction}>Type the phrase below exactly:</Text>

      <View style={styles.phraseBox}>
        <Text style={styles.phraseText}>
          {targetPhrase.split('').map((ch, idx) => {
            const matched =
              idx < typed.length &&
              typed[idx].toLowerCase() === ch.toLowerCase();
            const wrong = idx < typed.length && !matched;
            return (
              <Text
                key={idx}
                style={{
                  color: matched ? '#00E699' : wrong ? '#EF4444' : '#F8FAFC',
                }}
              >
                {ch}
              </Text>
            );
          })}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        value={typed}
        onChangeText={(txt) => void handleChange(txt)}
        placeholder="Type phrase here..."
        placeholderTextColor="#64748B"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity style={styles.submitBtn} onPress={() => void handleVerify()}>
        <Text style={styles.submitBtnText}>Confirm & Silence</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 16, width: '100%' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#06B6D4',
    marginBottom: 14,
  },
  badgeText: { fontSize: 12, color: '#06B6D4', fontWeight: '700' },
  instruction: { fontSize: 13, color: '#94A3B8', marginBottom: 12 },
  phraseBox: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  phraseText: { fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: 0.4 },
  input: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginBottom: 10 },
  submitBtn: {
    width: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#070A11', fontWeight: '900', fontSize: 15 },
});

