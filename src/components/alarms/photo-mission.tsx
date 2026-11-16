import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface PhotoMissionProps {
  mode?: 'setup' | 'verify';
  referenceUri?: string;
  locationLabel?: string;
  onCompleted: () => void;
  onPhotoRegistered?: (uri: string, label: string) => void;
  onFallbackRequested?: () => void;
}

/**
 * Location Photo Mission (FR-187): Captures an on-device reference or wake-up frame with no
 * facial/biometric recognition. Verifies non-blank capture before allowing confirmation.
 */
export function PhotoMission({
  mode = 'verify',
  referenceUri,
  locationLabel = 'Sink / Study Desk',
  onCompleted,
  onPhotoRegistered,
  onFallbackRequested,
}: PhotoMissionProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [consentGiven, setConsentGiven] = useState(mode === 'verify');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState(
    mode === 'setup'
      ? `Take a reference photo of your wake-up spot (${locationLabel}).`
      : `Stand at "${locationLabel}" and capture a matching scene.`
  );
  const cameraRef = useRef<CameraView | null>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.25,
        base64: true,
      });
      if (!photo?.uri) throw new Error('No photo returned');
      if ((photo.base64?.length ?? 0) < 1200) {
        setStatusMsg('Image looks completely dark or covered. Turn on a light and retry.');
        setCapturing(false);
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (mode === 'setup') {
        onPhotoRegistered?.(photo.uri, locationLabel);
        onCompleted();
      } else {
        setCapturedUri(photo.uri);
        setStatusMsg('Compare your frame with the reference spot below.');
      }
    } catch {
      setStatusMsg('Camera capture failed. Try better lighting or switch to fallback.');
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) return null;

  if (!consentGiven && mode === 'setup') {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="shield-checkmark-outline" size={44} color="#06B6D4" />
        <Text style={styles.title}>Local Photo Mission Privacy</Text>
        <Text style={styles.subtitle}>
          Reference photos are stored strictly on-device (never uploaded) and never run face or biometric identification.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setConsentGiven(true)}>
          <Text style={styles.primaryBtnText}>I Understand & Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="camera-outline" size={44} color="#94A3B8" />
        <Text style={styles.title}>Camera Permission Needed</Text>
        <Text style={styles.subtitle}>Allow camera access to capture your room station.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Allow Camera</Text>
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
        <Ionicons name="camera-outline" size={16} color="#06B6D4" />
        <Text style={styles.badgeText}>Location Photo Mission</Text>
      </View>

      <Text style={styles.subtitle}>{statusMsg}</Text>

      <View style={styles.previewRow}>
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.cameraFrame} />
        ) : (
          <View style={styles.cameraFrame}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          </View>
        )}
        {referenceUri ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Image source={{ uri: referenceUri }} style={styles.refThumb} />
            <Text style={{ color: '#94A3B8', fontSize: 10 }}>Reference</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {capturedUri ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#1E293B' }]}
              onPress={() => setCapturedUri(null)}
            >
              <Text style={[styles.primaryBtnText, { color: '#F8FAFC' }]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={onCompleted}>
              <Text style={styles.primaryBtnText}>Confirm Match & Silence</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            disabled={capturing}
            onPress={() => void handleCapture()}
          >
            <Text style={styles.primaryBtnText}>
              {capturing ? 'Capturing...' : mode === 'setup' ? 'Save Reference Spot' : 'Snap Wake Spot'}
            </Text>
          </TouchableOpacity>
        )}

        {onFallbackRequested && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onFallbackRequested}>
            <Text style={styles.secondaryBtnText}>Switch to Math Fallback</Text>
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
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#06B6D4',
    marginBottom: 10,
  },
  badgeText: { fontSize: 12, color: '#06B6D4', fontWeight: '700' },
  title: { fontSize: 19, fontWeight: '800', color: '#F8FAFC' },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 290,
    marginBottom: 14,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cameraFrame: {
    width: 190,
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#06B6D4',
  },
  refThumb: {
    width: 72,
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actions: { alignItems: 'center', gap: 10 },
  primaryBtn: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#070A11', fontWeight: '900', fontSize: 13 },
  secondaryBtn: { paddingVertical: 6 },
  secondaryBtnText: { color: '#F59E0B', fontWeight: '700', fontSize: 12 },
});
