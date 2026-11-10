import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CamouflageDecoyProps {
  appName: string;
  onBypassSecret: () => void;
  onExit: () => void;
}

export function CamouflageDecoy({
  appName,
  onBypassSecret,
  onExit,
}: CamouflageDecoyProps) {
  const [tapCount, setTapCount] = useState(0);

  const handleSecretHold = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onBypassSecret();
  };

  const handleReportTap = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 3) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onBypassSecret();
    }
  };

  const handleClose = () => {
    onExit();
    BackHandler.exitApp();
  };

  return (
    <View style={styles.overlay}>
      {/* Fake Android System Error Dialog */}
      <View style={styles.dialog}>
        <View style={styles.dialogHeader}>
          <TouchableOpacity onLongPress={handleSecretHold} delayLongPress={800} activeOpacity={0.8}>
            <View style={styles.alertIcon}>
              <Ionicons name="warning-outline" size={26} color="#DC2626" />
            </View>
          </TouchableOpacity>
          <Text style={styles.dialogTitle}>{appName} keeps stopping</Text>
        </View>

        <Text style={styles.dialogBody}>
          {appName} closed because this app has a bug. Try updating this app after developer provides a fix for this error.
        </Text>

        <View style={styles.buttonStack}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={18} color="#94A3B8" />
            <Text style={styles.actionBtnText}>Close app</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleReportTap} activeOpacity={0.7}>
            <Ionicons name="bug-outline" size={18} color="#94A3B8" />
            <Text style={styles.actionBtnText}>Send feedback</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.decoyHint}>
        (NeuroNinja Camouflage Mode Active)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  dialogHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  dialogBody: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonStack: {
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  decoyHint: {
    marginTop: 24,
    fontSize: 11,
    color: '#475569',
    letterSpacing: 0.5,
  },
});

