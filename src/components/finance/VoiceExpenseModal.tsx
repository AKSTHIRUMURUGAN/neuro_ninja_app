import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  CustomCategory,
  FamilyMember,
  FinanceTransaction,
} from '../../services/finance/finance-types';
import { parseVoiceExpense } from '../../services/finance/parsers/voice-expense-parser';
import { voiceBridge } from '../../services/finance/native-finance-bridge';

export interface VoiceExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  members: FamilyMember[];
  currencySymbol: string;
  onSaveTransaction: (tx: Partial<FinanceTransaction>) => Promise<void>;
}

const SAMPLE_PROMPTS = [
  'Spent 450 on lunch at Swiggy via GPay',
  'Paid 1200 for Uber ride yesterday',
  'Received 50000 salary from company',
];

export function VoiceExpenseModal({
  visible,
  onClose,
  categories,
  members,
  currencySymbol,
  onSaveTransaction,
}: VoiceExpenseModalProps) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  const [amountOverride, setAmountOverride] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const parsed = useMemo(() => parseVoiceExpense(transcript), [transcript]);

  const matchedCategory = useMemo(() => {
    if (selectedCategory) return selectedCategory;
    if (!parsed?.suggestedCategory) return 'Other';
    const found = categories.find(
      (c) => c.name.toLowerCase() === parsed.suggestedCategory.toLowerCase()
    );
    return found?.name || parsed.suggestedCategory;
  }, [selectedCategory, parsed, categories]);

  const matchedMemberId = useMemo(() => {
    if (selectedMemberId) return selectedMemberId;
    if (!parsed?.suggestedMember) return undefined;
    return members.find((mem) =>
      mem.name.toLowerCase().includes(parsed.suggestedMember.toLowerCase())
    )?.id;
  }, [selectedMemberId, parsed, members]);

  useEffect(() => {
    if (!visible) {
      void voiceBridge.cancelListening();
      return;
    }
    const emitter = voiceBridge.getEmitter();
    if (!emitter) return;
    const subPartial = emitter.addListener('NinjaVoicePartial', (e: { value?: string }) => {
      if (e?.value) setTranscript(e.value);
    });
    const subEnd = emitter.addListener('NinjaVoiceEnd', () => {
      setIsListening(false);
    });
    const subErr = emitter.addListener('NinjaVoiceError', (e: { value?: string }) => {
      setIsListening(false);
      if (e?.value) setVoiceError(e.value);
    });
    return () => {
      subPartial.remove();
      subEnd.remove();
      subErr.remove();
    };
  }, [visible]);

  const handleClose = () => {
    void voiceBridge.cancelListening();
    setIsListening(false);
    setVoiceError(null);
    onClose();
  };

  const handleMicPress = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVoiceError(null);
    if (isListening) {
      await voiceBridge.stopListening();
      setIsListening(false);
      return;
    }

    try {
      setIsListening(true);
      const result = await voiceBridge.startListening('en-IN');
      setIsListening(false);
      if (result) {
        setTranscript(result);
      }
    } catch (e: unknown) {
      setIsListening(false);
      const msg = e instanceof Error ? e.message : 'Voice input failed. You can type below.';
      setVoiceError(msg);
    }
  };

  const handleSave = async () => {
    const finalAmount = Number(amountOverride) || parsed?.amount || 0;
    if (finalAmount <= 0) return;

    setIsSaving(true);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onSaveTransaction({
        amount: finalAmount,
        type: parsed?.type || 'expense',
        category: matchedCategory,
        date: parsed?.date || new Date().toISOString().split('T')[0],
        paymentMethod: parsed?.paymentMethod || 'upi',
        description: parsed?.description || transcript.trim(),
        spentOn: matchedMemberId || parsed?.suggestedMember || 'personal',
        source: 'voice',
        merchantName: parsed?.merchantNormalized || parsed?.merchantRaw,
        confidence: parsed?.confidence ?? 0.9,
        isVerified: true,
      });
      setTranscript('');
      setAmountOverride('');
      setSelectedCategory('');
      setSelectedMemberId(undefined);
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const finalAmount = Number(amountOverride) || parsed?.amount || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="microphone" size={22} color="#38BDF8" />
              <Text style={styles.title}>Voice Expense Logger</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity
              style={[styles.micCard, isListening && styles.micCardActive]}
              onPress={handleMicPress}
              activeOpacity={0.85}
            >
              <View style={[styles.micCircle, isListening && styles.micCircleActive]}>
                <MaterialCommunityIcons
                  name={isListening ? 'waveform' : 'microphone'}
                  size={34}
                  color={isListening ? '#070A11' : '#38BDF8'}
                />
              </View>
              <Text style={styles.micHeadline}>
                {isListening ? 'Listening… Tap to stop' : 'Tap to Speak Expense'}
              </Text>
              <Text style={styles.micSub}>
                Say e.g. &quot;Spent 450 on lunch at Swiggy via GPay&quot;
              </Text>
            </TouchableOpacity>

            {voiceError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                <Text style={styles.errorText}>{voiceError}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>TRANSCRIPT (EDITABLE)</Text>
            <TextInput
              style={styles.transcriptInput}
              value={transcript}
              onChangeText={setTranscript}
              placeholder="Speak or type e.g. Paid 280 for coffee at Starbucks..."
              placeholderTextColor="#64748B"
              multiline
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sampleRow}>
              {SAMPLE_PROMPTS.map((sample) => (
                <TouchableOpacity
                  key={sample}
                  style={styles.sampleChip}
                  onPress={() => setTranscript(sample)}
                >
                  <Text style={styles.sampleChipText}>{sample}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {parsed || finalAmount > 0 ? (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTag}>AUTO-PARSED PREVIEW</Text>
                  <Text style={styles.confidenceText}>
                    {Math.round((parsed?.confidence ?? 0.8) * 100)}% MATCH
                  </Text>
                </View>

                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>AMOUNT ({currencySymbol})</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      value={amountOverride || (parsed?.amount ? String(parsed.amount) : '')}
                      onChangeText={setAmountOverride}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.fieldLabel}>MERCHANT / NOTE</Text>
                    <Text style={styles.previewValue} numberOfLines={1}>
                      {parsed?.merchantNormalized || parsed?.merchantRaw || 'Manual / Voice'}
                    </Text>
                    <Text style={styles.previewSub}>
                      {(parsed?.type || 'expense').toUpperCase()} · {parsed?.paymentMethod || 'upi'} ·{' '}
                      {parsed?.date || 'Today'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                  {categories.map((cat) => {
                    const active = matchedCategory === cat.name;
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
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, (finalAmount <= 0 || isSaving) && styles.saveBtnDisabled]}
            disabled={finalAmount <= 0 || isSaving}
            onPress={handleSave}
          >
            <MaterialCommunityIcons name="check-circle" size={18} color="#070A11" />
            <Text style={styles.saveBtnText}>
              {isSaving
                ? 'Saving...'
                : finalAmount > 0
                  ? `Log ${currencySymbol}${finalAmount.toLocaleString()}`
                  : 'Speak or Enter Amount'}
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
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B1220',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
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
    paddingBottom: 16,
  },
  micCard: {
    backgroundColor: '#111C30',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    marginBottom: 14,
  },
  micCardActive: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
  },
  micCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  micCircleActive: {
    backgroundColor: '#00E699',
  },
  micHeadline: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  micSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#FCD34D',
    fontSize: 12,
    flex: 1,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  transcriptInput: {
    backgroundColor: '#111C30',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 62,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sampleRow: {
    marginTop: 10,
    marginBottom: 14,
  },
  sampleChip: {
    backgroundColor: '#131F35',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sampleChipText: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  previewCard: {
    backgroundColor: '#111C30',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.28)',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewTag: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  confidenceText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  amountInput: {
    backgroundColor: '#070A11',
    color: '#00E699',
    fontSize: 20,
    fontWeight: '800',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  previewValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  previewSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
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
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  catChipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#070A11',
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
