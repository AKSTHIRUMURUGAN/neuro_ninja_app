import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomCategory, FinanceTransaction } from '../../services/finance/finance-types';
import { parseReceiptOcrText } from '../../services/finance/parsers/receipt-ocr-parser';
import { receiptOcrBridge } from '../../services/finance/native-finance-bridge';

export interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  currencySymbol: string;
  onSaveTransaction: (tx: Partial<FinanceTransaction>) => Promise<void>;
}

export function ReceiptScannerModal({
  visible,
  onClose,
  categories,
  currencySymbol,
  onSaveTransaction,
}: ReceiptScannerModalProps) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [amountOverride, setAmountOverride] = useState('');
  const [merchantOverride, setMerchantOverride] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const parsed = useMemo(
    () => parseReceiptOcrText(rawOcrText, capturedUri || undefined),
    [rawOcrText, capturedUri]
  );

  const handleCapture = async () => {
    if (!cameraRef.current || isScanning) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOcrError(null);
    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) {
        setOcrError('Could not capture photo.');
        return;
      }
      setCapturedUri(photo.uri);
      const ocr = await receiptOcrBridge.recognizeText(photo.uri);
      setRawOcrText(ocr.text || '');
      const result = parseReceiptOcrText(ocr.text || '', photo.uri);
      if (result) {
        setAmountOverride(String(result.amount));
        setMerchantOverride(result.merchantNormalized || result.merchantRaw || '');
        setSelectedCategory(result.suggestedCategory || 'Shopping');
      } else {
        setOcrError('Photo captured, but no total was auto-detected. Enter amount below.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'OCR scan failed';
      setOcrError(msg);
    } finally {
      setIsScanning(false);
    }
  };

  const handleResetScan = () => {
    setCapturedUri(null);
    setRawOcrText('');
    setAmountOverride('');
    setMerchantOverride('');
    setOcrError(null);
  };

  const handleSave = async () => {
    const finalAmount = Number(amountOverride) || parsed?.amount || 0;
    if (finalAmount <= 0) return;

    setIsSaving(true);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onSaveTransaction({
        amount: finalAmount,
        type: 'expense',
        category: selectedCategory || parsed?.suggestedCategory || 'Shopping',
        date: parsed?.date || new Date().toISOString().split('T')[0],
        paymentMethod: parsed?.paymentMethod || 'debit_card',
        description:
          parsed?.description ||
          `Bill: ${merchantOverride || parsed?.merchantNormalized || 'Receipt'}`,
        source: 'ocr',
        merchantName: merchantOverride || parsed?.merchantNormalized,
        receiptUrl: capturedUri || undefined,
        confidence: parsed?.confidence ?? 0.8,
        isVerified: true,
      });
      handleResetScan();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const finalAmount = Number(amountOverride) || parsed?.amount || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="receipt-text-check" size={22} color="#00E699" />
              <Text style={styles.title}>Scan Bill / Receipt (On-Device OCR)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {!capturedUri ? (
              permission?.granted ? (
                <View style={styles.cameraContainer}>
                  <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                  <TouchableOpacity
                    style={styles.shutterBtn}
                    onPress={handleCapture}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <ActivityIndicator color="#070A11" />
                    ) : (
                      <>
                        <Ionicons name="camera" size={20} color="#070A11" />
                        <Text style={styles.shutterText}>Snap & Extract Bill</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.permissionBox}>
                  <MaterialCommunityIcons name="camera-off" size={32} color="#94A3B8" />
                  <Text style={styles.permText}>
                    Camera access is needed to scan paper bills & GST invoices on-device.
                  </Text>
                  <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                    <Text style={styles.permBtnText}>Grant Camera Permission</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={styles.previewImageBox}>
                <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity style={styles.retakeBtn} onPress={handleResetScan}>
                  <Ionicons name="refresh" size={16} color="#F8FAFC" />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            )}

            {ocrError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                <Text style={styles.errorText}>{ocrError}</Text>
              </View>
            ) : null}

            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>MERCHANT / STORE</Text>
              <TextInput
                style={styles.textInput}
                value={merchantOverride || parsed?.merchantNormalized || ''}
                onChangeText={setMerchantOverride}
                placeholder="e.g. Reliance Fresh / Apollo Pharmacy"
                placeholderTextColor="#64748B"
              />

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>TOTAL AMOUNT ({currencySymbol})</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={amountOverride || (parsed?.amount ? String(parsed.amount) : '')}
                onChangeText={setAmountOverride}
                placeholder="0.00"
                placeholderTextColor="#64748B"
              />

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                {categories.map((cat) => {
                  const active = (selectedCategory || parsed?.suggestedCategory) === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, active && styles.catChipActive]}
                      onPress={() => setSelectedCategory(cat.name)}
                    >
                      <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                        {cat.iconValue} {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {rawOcrText ? (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>EXTRACTED TEXT</Text>
                  <Text style={styles.rawText} numberOfLines={5}>
                    {rawOcrText}
                  </Text>
                </>
              ) : null}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, (finalAmount <= 0 || isSaving) && styles.saveBtnDisabled]}
            disabled={finalAmount <= 0 || isSaving}
            onPress={handleSave}
          >
            <MaterialCommunityIcons name="check-circle" size={18} color="#070A11" />
            <Text style={styles.saveBtnText}>
              {isSaving
                ? 'Saving Receipt...'
                : finalAmount > 0
                  ? `Save Bill (${currencySymbol}${finalAmount.toLocaleString()})`
                  : 'Scan or Enter Bill Total'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B1220',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#131F35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 14,
  },
  cameraContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#070A11',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  camera: {
    height: 220,
    width: '100%',
  },
  shutterBtn: {
    backgroundColor: '#00E699',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shutterText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 14,
  },
  permissionBox: {
    backgroundColor: '#111C30',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  permText: {
    color: '#CBD5E1',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 10,
  },
  permBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  permBtnText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 13,
  },
  previewImageBox: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 170,
    backgroundColor: '#070A11',
  },
  retakeBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(7, 10, 17, 0.85)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  retakeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#FCD34D',
    fontSize: 12,
    flex: 1,
  },
  formCard: {
    backgroundColor: '#111C30',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#070A11',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  amountInput: {
    backgroundColor: '#070A11',
    color: '#00E699',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 20,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  catRow: {
    marginTop: 4,
  },
  catChip: {
    backgroundColor: '#070A11',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catChipActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  catChipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#070A11',
  },
  rawText: {
    color: '#94A3B8',
    fontSize: 11,
    backgroundColor: '#070A11',
    borderRadius: 8,
    padding: 8,
  },
  saveBtn: {
    marginTop: 10,
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: '#070A11',
    fontSize: 15,
    fontWeight: '800',
  },
});
