import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScramblePin } from './scramble-pin';

interface PinSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (pin: string) => void;
}

export function PinSetupModal({
  visible,
  onClose,
  onSave,
}: PinSetupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleClose = () => {
    setStep(1);
    setFirstPin(null);
    setErrorMsg('');
    onClose();
  };

  const handleFirstRecorded = (pin: string) => {
    if (pin.length !== 4) return;
    setErrorMsg('');
    setFirstPin(pin);
    setStep(2);
  };

  const handleConfirmRecorded = (confirmPin: string) => {
    if (!firstPin) {
      setStep(1);
      return;
    }

    if (confirmPin === firstPin) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave(confirmPin);
      handleClose();
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg('PINs did not match. Enter again from step 1.');
      setTimeout(() => {
        setStep(1);
        setFirstPin(null);
        setErrorMsg('');
      }, 900);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>
              {step === 1 ? 'Step 1 of 2: Create PIN' : 'Step 2 of 2: Confirm PIN'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Stepper Progress Indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepBar, step >= 1 && styles.stepBarActive]} />
            <View style={[styles.stepBar, step >= 2 && styles.stepBarActive]} />
          </View>

          {errorMsg ? (
            <Text style={styles.errorBanner}>{errorMsg}</Text>
          ) : (
            <View style={{ height: 22 }} />
          )}

          {/* ScramblePin in Setup Mode */}
          <View style={styles.keypadWrapper}>
            {step === 1 ? (
              <ScramblePin
                isSetupMode={true}
                onSuccess={() => {}}
                onPinRecorded={handleFirstRecorded}
                title="Create 4-Digit PIN"
                subtitle="Choose a PIN you will easily remember."
                allowBiometrics={false}
              />
            ) : (
              <ScramblePin
                isSetupMode={true}
                onSuccess={() => {}}
                onPinRecorded={handleConfirmRecorded}
                title="Confirm Your PIN"
                subtitle="Re-enter the 4-digit PIN to confirm."
                allowBiometrics={false}
              />
            )}
          </View>

          {/* Bottom helper */}
          <View style={styles.footer}>
            {step === 2 && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setStep(1);
                  setFirstPin(null);
                  setErrorMsg('');
                }}
              >
                <Ionicons name="refresh-outline" size={16} color="#94A3B8" />
                <Text style={styles.retryBtnText}>Start Over</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
  },
  stepBarActive: {
    backgroundColor: '#00E699',
  },
  errorBanner: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  keypadWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  footer: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
  },
  retryBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});
