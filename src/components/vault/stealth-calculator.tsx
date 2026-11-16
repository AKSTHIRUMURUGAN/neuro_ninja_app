import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface StealthCalculatorProps {
  secretPin?: string;
  onUnlockVault: () => void;
  onExit?: () => void;
}

const { width } = Dimensions.get('window');
const BUTTON_SIZE = Math.floor((width - 48 - 36) / 4);

export function StealthCalculator({
  secretPin = '1234',
  onUnlockVault,
  onExit,
}: StealthCalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState('');

  const handleButtonPress = (btn: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (btn === 'C') {
      setDisplay('0');
      setEquation('');
      return;
    }

    if (btn === '=') {
      // Secret Vault Check!
      if (display === secretPin || equation === secretPin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlockVault();
        return;
      }

      // Real calculator evaluation fallback
      try {
        const sanitized = (equation + display)
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/−/g, '-');
        // Simple safe numeric calculation
        const result = Function(`'use strict'; return (${sanitized})`)();
        const strRes = String(Math.round(result * 10000) / 10000);
        setHistory(equation + display + ' =');
        setDisplay(strRes);
        setEquation('');
      } catch {
        setDisplay('Error');
        setEquation('');
      }
      return;
    }

    if (['+', '−', '×', '÷'].includes(btn)) {
      setEquation(display + ' ' + btn + ' ');
      setDisplay('0');
      return;
    }

    if (btn === '+/-') {
      if (display !== '0') {
        setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
      }
      return;
    }

    if (btn === '%') {
      const num = parseFloat(display) / 100;
      setDisplay(String(num));
      return;
    }

    if (btn === '.') {
      if (!display.includes('.')) {
        setDisplay(display + '.');
      }
      return;
    }

    // Number digit entered
    if (display === '0') {
      setDisplay(btn);
    } else {
      if (display.length < 12) {
        setDisplay(display + btn);
      }
    }
  };

  const rows = [
    ['C', '+/-', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header / Subtle Camouflage Title */}
        <View style={styles.topBar}>
          <View style={styles.topInfo}>
            <MaterialCommunityIcons name="calculator" size={18} color="#64748B" />
            <Text style={styles.topTitle}>Calculator Pro</Text>
          </View>
          {onExit && (
            <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
              <MaterialCommunityIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Display Screen */}
        <View style={styles.displayArea}>
          {history !== '' && <Text style={styles.historyText}>{history}</Text>}
          {equation !== '' && <Text style={styles.equationText}>{equation}</Text>}
          <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
            {display}
          </Text>
        </View>

        {/* Calculator Keypad */}
        <View style={styles.keypad}>
          {rows.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((btn) => {
                const isOp = ['÷', '×', '−', '+', '='].includes(btn);
                const isAction = ['C', '+/-', '%'].includes(btn);
                const isZero = btn === '0';

                return (
                  <TouchableOpacity
                    key={btn}
                    style={[
                      styles.btn,
                      isAction && styles.btnAction,
                      isOp && styles.btnOp,
                      isZero && styles.btnZero,
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isAction && styles.btnActionText,
                        isOp && styles.btnOpText,
                      ]}
                    >
                      {btn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topTitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  exitBtn: {
    padding: 6,
  },
  displayArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  historyText: {
    color: '#64748B',
    fontSize: 18,
    marginBottom: 4,
  },
  equationText: {
    color: '#94A3B8',
    fontSize: 24,
    marginBottom: 6,
  },
  displayText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  keypad: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnZero: {
    width: BUTTON_SIZE * 2 + 12,
    alignItems: 'flex-start',
    paddingLeft: BUTTON_SIZE / 2.5,
  },
  btnAction: {
    backgroundColor: '#3E3E3E',
  },
  btnOp: {
    backgroundColor: '#F59E0B',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
  },
  btnActionText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  btnOpText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
});
