import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface ScramblePinProps {
  correctPin?: string;
  onSuccess: () => void;
  onFailure?: (attempts: number) => void;
  onCancel?: () => void;
  onPinRecorded?: (pin: string) => void;
  isSetupMode?: boolean;
  title?: string;
  subtitle?: string;
  allowBiometrics?: boolean;
  autoPromptBiometrics?: boolean;
  isScramble?: boolean;
}

function generateScrambledKeypad(): string[] {
  const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

const STANDARD_KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function ScramblePin({
  correctPin = '1234',
  onSuccess,
  onFailure,
  onCancel,
  onPinRecorded,
  isSetupMode = false,
  title = 'Master Shield PIN',
  subtitle = 'Enter 4-digit PIN to authenticate',
  allowBiometrics = true,
  autoPromptBiometrics = false,
  isScramble = false,
}: ScramblePinProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [keypad, setKeypad] = useState<string[]>(() =>
    isScramble ? generateScrambledKeypad() : STANDARD_KEYPAD
  );
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
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

  const handleBiometricAuth = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with Fingerprint',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });
      if (res.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      }
    } catch {
      // User canceled or fallback
    }
  }, [onSuccess]);

  useEffect(() => {
    let isMounted = true;
    if (allowBiometrics && !isSetupMode) {
      void LocalAuthentication.hasHardwareAsync().then((compatible) => {
        if (!compatible || !isMounted) return;
        void LocalAuthentication.isEnrolledAsync().then((enrolled) => {
          if (isMounted) {
            setBiometricAvailable(enrolled);
            if (enrolled && autoPromptBiometrics) {
              // Auto-prompt biometrics shortly after screen settles
              setTimeout(() => {
                if (isMounted) void handleBiometricAuth();
              }, 300);
            }
          }
        });
      });
    }
    return () => {
      isMounted = false;
    };
  }, [allowBiometrics, autoPromptBiometrics, handleBiometricAuth, isSetupMode]);

  const handleKeyPress = async (val: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrorMsg('');
    if (digits.length < 4) {
      const next = [...digits, val];
      setDigits(next);

      if (next.length === 4) {
        const entered = next.join('');

        if (isSetupMode && onPinRecorded) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onPinRecorded(entered);
          setDigits([]);
          return;
        }

        if (entered === correctPin) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess();
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          const newFail = failedAttempts + 1;
          setFailedAttempts(newFail);
          setErrorMsg(
            newFail >= 3
              ? `Intruder Alert: ${newFail} failed attempts recorded`
              : 'Invalid PIN. Try again.'
          );
          triggerShake();
          onFailure?.(newFail);
          setDigits([]);
          if (isScramble) {
            setKeypad(generateScrambledKeypad());
          }
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
          <Ionicons name="keypad" size={28} color="#00E699" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* PIN Dots Row */}
      <Animated.View
        style={[
          styles.dotsRow,
          { transform: [{ translateX: shakeAnim }] },
        ]}
      >
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
      </Animated.View>

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : (
        <View style={{ height: 18 }} />
      )}

      {/* Numeric Keypad Grid */}
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
        {biometricAvailable && !isSetupMode ? (
          <TouchableOpacity
            style={[styles.keyButton, styles.biometricKeyButton]}
            onPress={() => void handleBiometricAuth()}
            activeOpacity={0.7}
          >
            <Ionicons name="finger-print" size={26} color="#00E699" />
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

        <TouchableOpacity
          style={styles.keyButton}
          onPress={() => void handleDelete()}
          activeOpacity={0.7}
        >
          <Ionicons name="backspace-outline" size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={16} color="#94A3B8" />
          <Text style={styles.cancelText}>Back to Options</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldIconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#071610',
    borderWidth: 1.5,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
    transform: [{ scale: 1.15 }],
  },
  dotError: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  keypadGrid: {
    width: 270,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 4,
  },
  keyButton: {
    width: 76,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricKeyButton: {
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderColor: 'rgba(0, 230, 153, 0.4)',
  },
  keyButtonPlaceholder: {
    width: 76,
    height: 60,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});
