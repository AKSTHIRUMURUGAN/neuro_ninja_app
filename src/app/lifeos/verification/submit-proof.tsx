import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { verificationEngine } from '../../../services/verification/verification-engine';
import { useNinjaAlert } from '../../../context/ninja-alert-context';

export default function SubmitProofScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();
  const [permission, requestPermission] = useCameraPermissions();

  const [title, setTitle] = useState('');
  const [entityType, setEntityType] = useState<'habit' | 'task'>('habit');
  const [notes, setNotes] = useState('');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await cameraRef.current.takePictureAsync({ quality: 0.35 });
      if (res?.uri) {
        setCapturedUri(res.uri);
      }
    } catch (e) {
      console.warn('[SubmitProof] Camera error:', e);
    }
  };

  const handleRetake = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedUri(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast({
        title: 'Title Required',
        message: 'Please provide a title or habit name for your proof.',
        type: 'warning',
        icon: 'alert-circle',
      });
      return;
    }
    if (!capturedUri) {
      showToast({
        title: 'Photo Required',
        message: 'Please take a photo proof before submitting.',
        type: 'warning',
        icon: 'camera-alert',
      });
      return;
    }

    setIsSubmitting(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await verificationEngine.submitProof({
        entityType,
        entityId: 'habit_' + Date.now(),
        entityTitle: title.trim(),
        verifierId: 'guardian_parent',
        photoUri: capturedUri,
        notes: notes.trim(),
      });

      showToast({
        title: '📸 Proof Submitted!',
        message: 'Your photo proof is in the Verifier Inbox for inspection and coin reward.',
        type: 'success',
        icon: 'check-decagram',
      });
      router.back();
    } catch (e) {
      console.warn('[SubmitProof] Submit error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>ACCOUNTABILITY ENGINE</Text>
          <Text style={styles.title}>Submit Photo Proof</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Entity Selector */}
        <Text style={styles.fieldLabel}>PROOF CATEGORY</Text>
        <View style={styles.catRow}>
          {(['habit', 'task'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, entityType === cat && styles.catBtnActive]}
              onPress={() => setEntityType(cat)}
            >
              <Text style={[styles.catBtnText, entityType === cat && styles.catBtnTextActive]}>
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title Input */}
        <Text style={styles.fieldLabel}>HABIT / ACTIVITY NAME</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 5km Morning Run, 30m Book Reading"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
        />

        {/* Camera / Photo Section */}
        <Text style={styles.fieldLabel}>CAMERA PROOF SNAPSHOT</Text>
        <View style={styles.cameraBox}>
          {capturedUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: capturedUri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <Ionicons name="refresh" size={16} color="#F8FAFC" />
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : permission?.granted ? (
            <View style={styles.cameraViewContainer}>
              <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
              <TouchableOpacity style={styles.snapBtn} onPress={handleCapture}>
                <View style={styles.snapInner} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.permBox}>
              <MaterialCommunityIcons name="camera" size={36} color="#00E699" />
              <Text style={styles.permText}>Camera Access Required</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Grant Camera Permission</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Notes Input */}
        <Text style={styles.fieldLabel}>ADDITIONAL CONTEXT (OPTIONAL)</Text>
        <TextInput
          style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
          placeholder="Add details for your parent / accountability buddy..."
          placeholderTextColor="#64748B"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <MaterialCommunityIcons name="send-check" size={20} color="#070A11" />
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Uploading Proof...' : 'Submit Proof to Verifier (+100 Coins)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catBtn: {
    flex: 1,
    backgroundColor: '#0F1829',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  catBtnActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  catBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  catBtnTextActive: {
    color: '#00E699',
  },
  textInput: {
    backgroundColor: '#0F1829',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cameraBox: {
    width: '100%',
    height: 280,
    backgroundColor: '#0F1829',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cameraViewContainer: {
    flex: 1,
    position: 'relative',
  },
  cameraView: {
    flex: 1,
  },
  snapBtn: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  snapInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00E699',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retakeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  permBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 10,
  },
  permBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  permBtnText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
});
