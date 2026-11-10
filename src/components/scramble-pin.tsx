import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface ScramblePinProps {
  correctPin?: string;
  onSuccess: () => void;
  onFailure?: (attempts: number) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  allowBiometrics?: boolean;
}

function generateScrambledKeypad(): string[] {
  const nums = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

export function ScramblePin({
  correctPin = '1234',
  onSuccess,
  onFailure,
  onCancel,
  title = 'Master Shield PIN',
  subtitle = 'Numbers are randomized to prevent smudge detection',
  allowBiometrics = true,
}: ScramblePinProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [keypad, setKeypad] = useState<string[]>(() => generateScrambledKeypad());
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (allowBiometrics) {
      void LocalAuthentication.hasHardwareAsync().then((compatible) => {
        if (!compatible || !isMounted) return;
        void LocalAuthentication.isEnrolledAsync().then((enrolled) => {
          if (isMounted) setBiometricAvailable(enrolled);
        });
      });
    }
    return () => {
      isMounted = false;
    };
  }, [allowBiometrics]);

  const handleBiometricAuth = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with NeuroNinja Biometrics',
        fallbackLabel: 'Use PIN',
      });
      if (res.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      }
    } catch {
      // Fallback to PIN
    }
  };

  const handleKeyPress = async (val: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrorMsg('');
    if (digits.length < 4) {
      const next = [...digits, val];
      setDigits(next);

      if (next.length === 4) {
        const entered = next.join('');
        if (entered === correctPin) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess();
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          const newFail = failedAttempts + 1;
          setFailedAttempts(newFail);
          setErrorMsg(newFail >= 3 ? `Intruder Alert: ${newFail} failed attempts recorded` : 'Invalid PIN. Keys rescrambled.');
          onFailure?.(newFail);
          setDigits([]);
          setKeypad(generateScrambledKeypad());
        }
      }
    }
  };

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (digits.length > 0) {
      setDigits(digits.slice(0, -1));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.shieldIconWrapper}>
          <Ionicons name="keypad-outline" size={32} color="#00E699" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              digits.length > idx && styles.dotFilled,
              errorMsg ? styles.dotError : null,
            ]}
          />
        ))}
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : <View style={{ height: 20 }} />}

      {/* Scrambled Dial Pad */}
      <View style={styles.keypadGrid}>
        {keypad.slice(0, 9).map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.keyButton}
            onPress={() => void handleKeyPress(key)}
            activeOpacity={0.7}
          >
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}

        {/* Bottom Row */}
        {biometricAvailable ? (
          <TouchableOpacity style={styles.keyButton} onPress={() => void handleBiometricAuth()} activeOpacity={0.7}>
            <Ionicons name="finger-print" size={28} color="#00E699" />
          </TouchableOpacity>
        ) : (
          <View style={styles.keyButtonPlaceholder} />
        )}

        {keypad[9] && (
          <TouchableOpacity
            style={styles.keyButton}
            onPress={() => void handleKeyPress(keypad[9])}
            activeOpacity={0.7}
          >
            <Text style={styles.keyText}>{keypad[9]}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.keyButton} onPress={() => void handleDelete()} activeOpacity={0.7}>
          <Ionicons name="backspace-outline" size={26} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Return to Safety</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 270,
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 10,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonPlaceholder: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cancelBtn: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
