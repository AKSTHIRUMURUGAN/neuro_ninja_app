import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface QRMissionProps {
  onCompleted: () => void;
}

export function QRMission({ onCompleted }: QRMissionProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleSimulateScan = async () => {
    setIsScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(async () => {
      setIsScanning(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('QR Code Verified!', 'Bathroom Sentinel Station scanned. Alarm successfully silenced!');
      onCompleted();
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="qr-code-outline" size={16} color="#00E699" />
        <Text style={styles.badgeText}>QR Station Mission</Text>
      </View>

      <Text style={styles.title}>Scan Wakeup Station</Text>
      <Text style={styles.subtitle}>
        Get out of bed and scan your designated QR code (placed in bathroom or kitchen) to silence.
      </Text>

      {/* QR Scanner Viewfinder Simulation */}
      <View style={styles.viewfinder}>
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
        <Ionicons
          name={isScanning ? 'barcode-outline' : 'qr-code-outline'}
          size={84}
          color={isScanning ? '#00E699' : '#64748B'}
        />
        <Text style={styles.scanningText}>
          {isScanning ? 'Verifying QR Code...' : 'Aim at Room Station'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.scanBtn, isScanning && styles.scanBtnActive]}
        onPress={() => void handleSimulateScan()}
        disabled={isScanning}
        activeOpacity={0.8}
      >
        <Ionicons name="scan-outline" size={20} color="#070A11" />
        <Text style={styles.scanBtnText}>
          {isScanning ? 'Processing...' : 'Scan Station QR Code'}
        </Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
    maxWidth: 280,
  },
  viewfinder: {
    width: 240,
    height: 240,
    borderRadius: 24,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  cornerTL: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00E699',
  },
  cornerTR: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00E699',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00E699',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00E699',
  },
  scanningText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 12,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 18,
    width: '100%',
    maxWidth: 240,
  },
  scanBtnActive: {
    backgroundColor: '#F59E0B',
  },
  scanBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#070A11',
  },
});

