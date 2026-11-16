import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { hashMissionCode } from '../../services/alarms/alarm-engine';

interface QRMissionProps {
  mode?: 'setup' | 'verify';
  expectedHash?: string;
  expectedLabel?: string;
  onCompleted: () => void;
  onCodeRegistered?: (hash: string, rawLabel: string) => void;
  onFallbackRequested?: () => void;
}

export function QRMission({
  mode = 'verify',
  expectedHash,
  expectedLabel,
  onCompleted,
  onCodeRegistered,
  onFallbackRequested,
}: QRMissionProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    mode === 'setup'
      ? 'Scan any QR/barcode in your kitchen or bathroom to register it.'
      : expectedLabel
        ? `Scan your registered "${expectedLabel}" code to silence.`
        : 'Scan your registered QR or barcode to dismiss.'
  );

  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    const scannedHash = hashMissionCode(data);

    if (mode === 'setup') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const previewLabel = data.length > 24 ? `${data.slice(0, 24)}...` : data;
      onCodeRegistered?.(scannedHash, previewLabel);
      setStatusMessage(`Registered code (${scannedHash.slice(0, 6)}).`);
      onCompleted();
      return;
    }

    if (!expectedHash || scannedHash === expectedHash) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCompleted();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatusMessage('Wrong QR/barcode! Scan the registered code.');
      setTimeout(() => setScanned(false), 1200);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.subtitle}>Checking camera availability...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="camera-outline" size={48} color="#94A3B8" />
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          QR/Barcode missions scan a real household code to verify you got out of bed.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Enable Camera</Text>
        </TouchableOpacity>
        {onFallbackRequested && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onFallbackRequested}>
            <Text style={styles.secondaryBtnText}>Switch to Math Fallback</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="qr-code-outline" size={16} color="#00E699" />
        <Text style={styles.badgeText}>
          {mode === 'setup' ? 'Register QR / Barcode' : 'QR Wakeup Verification'}
        </Text>
      </View>

      <Text style={styles.subtitle}>{statusMessage}</Text>

      <View style={styles.cameraFrame}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_a'],
          }}
          onBarcodeScanned={scanned ? undefined : (res) => void handleBarcodeScanned(res)}
        />
        <View style={styles.reticle} />
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlPill} onPress={() => setTorch((t) => !t)}>
          <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={16} color="#F8FAFC" />
          <Text style={styles.controlText}>{torch ? 'Torch On' : 'Torch Off'}</Text>
        </TouchableOpacity>
        {onFallbackRequested && (
          <TouchableOpacity style={styles.controlPill} onPress={onFallbackRequested}>
            <Ionicons name="calculator-outline" size={16} color="#F59E0B" />
            <Text style={styles.controlText}>Use Math Fallback</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 14, width: '100%' },
  centerBox: { alignItems: 'center', padding: 24, gap: 12 },
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
    marginBottom: 10,
  },
  badgeText: { fontSize: 12, color: '#00E699', fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 290,
    marginBottom: 14,
  },
  cameraFrame: {
    width: 240,
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  reticle: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: 'rgba(0, 230, 153, 0.85)',
    borderRadius: 14,
  },
  controlsRow: { flexDirection: 'row', gap: 10 },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  controlText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#070A11', fontWeight: '800' },
  secondaryBtn: { paddingVertical: 8 },
  secondaryBtnText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
});
