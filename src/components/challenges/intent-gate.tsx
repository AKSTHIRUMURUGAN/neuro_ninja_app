import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { NinjaPalette } from '../../constants/theme';

interface Props {
  strictMode?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const REASONS = [
  'Need to reply to an urgent message',
  'Looking up specific work information',
  'Opening from habit / boredom',
  'Scheduled leisure break',
];

export function IntentGate({ strictMode = false, onSuccess, onCancel }: Props) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customIntent, setCustomIntent] = useState('');
  const [countdown, setCountdown] = useState(strictMode ? 8 : 4);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const canProceed =
    countdown === 0 && (selectedReason !== null || customIntent.trim().length > 3);

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>INTENTION GATE</Text>
      <Text style={styles.title}>Mindful Check-in</Text>
      <Text style={styles.subtitle}>
        State your true purpose before entering this app.
      </Text>

      <View style={styles.reasonsList}>
        {REASONS.map((reason, idx) => {
          const isSelected = selectedReason === reason;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.reasonItem, isSelected && styles.reasonItemSelected]}
              onPress={() => setSelectedReason(reason)}
            >
              <View
                style={[
                  styles.radioCircle,
                  isSelected && styles.radioCircleSelected,
                ]}
              />
              <Text
                style={[
                  styles.reasonText,
                  isSelected && styles.reasonTextSelected,
                ]}
              >
                {reason}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Or type specific goal (e.g. check DM from Alex)"
        placeholderTextColor={NinjaPalette.textMuted}
        value={customIntent}
        onChangeText={(text) => {
          setCustomIntent(text);
          if (text) setSelectedReason(null);
        }}
      />

      <TouchableOpacity
        disabled={!canProceed}
        style={[styles.primaryButton, !canProceed && styles.primaryButtonDisabled]}
        onPress={onSuccess}
      >
        <Text style={styles.primaryButtonText}>
          {countdown > 0 ? `Reflecting (${countdown}s)...` : 'Confirm Intention & Unlock'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Close & Return to Focus</Text>
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
    color: NinjaPalette.amber,
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
    marginBottom: 24,
  },
  reasonsList: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  reasonItemSelected: {
    borderColor: NinjaPalette.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: NinjaPalette.textMuted,
  },
  radioCircleSelected: {
    borderColor: NinjaPalette.emerald,
    backgroundColor: NinjaPalette.emerald,
  },
  reasonText: {
    fontSize: 14,
    color: NinjaPalette.textSecondary,
    flex: 1,
  },
  reasonTextSelected: {
    color: NinjaPalette.textPrimary,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: NinjaPalette.textPrimary,
    fontSize: 14,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButtonText: {
    color: '#070A11',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: NinjaPalette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

