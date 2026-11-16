import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ZeroResistanceState } from '../../services/focus/deep-work-types';

interface Props {
  visible: boolean;
  presetName: string;
  durationMinutes: number;
  initialZeroResistance: ZeroResistanceState;
  onDismiss: () => void;
  onLaunch: (params: {
    intent: string;
    stakedCoins: number;
    zeroResistance: ZeroResistanceState;
  }) => void;
}

const QUICK_INTENTS = [
  'Deep Code Sprint',
  'Read & Annotate Chapter',
  'System Architecture Design',
  'Study & Flashcards',
  'Clear Priority Tasks',
];

const STAKE_OPTIONS = [0, 10, 25, 50];

export function IntentLaunchModal({
  visible,
  presetName,
  durationMinutes,
  initialZeroResistance,
  onDismiss,
  onLaunch,
}: Props) {
  const [intent, setIntent] = useState('');
  const [selectedStake, setSelectedStake] = useState(25);
  const [zrState, setZrState] = useState<ZeroResistanceState>(initialZeroResistance);

  const toggleCheck = async (key: keyof ZeroResistanceState) => {
    await Haptics.selectionAsync();
    setZrState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLaunch = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const finalIntent = intent.trim() || 'Conquer ' + presetName;
    onLaunch({
      intent: finalIntent,
      stakedCoins: selectedStake,
      zeroResistance: zrState,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.preTitle}>PRE-SPRINT CALIBRATION</Text>
              <Text style={styles.title}>{presetName} ({durationMinutes}m)</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Intent Gate */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                1. DEFINE YOUR SINGLE MEASURABLE VICTORY
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Finish database migration script"
                placeholderTextColor="#64748B"
                value={intent}
                onChangeText={setIntent}
                maxLength={60}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {QUICK_INTENTS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, intent === item && styles.chipActive]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setIntent(item);
                    }}
                  >
                    <Text style={[styles.chipText, intent === item && styles.chipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Zero Resistance Checklist */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>2. ZERO-RESISTANCE CHECKLIST</Text>
              <View style={styles.checklist}>
                <TouchableOpacity
                  style={[styles.checkRow, zrState.cleanDesk && styles.checkRowActive]}
                  onPress={() => void toggleCheck('cleanDesk')}
                >
                  <MaterialCommunityIcons
                    name={zrState.cleanDesk ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={20}
                    color={zrState.cleanDesk ? '#00E699' : '#64748B'}
                  />
                  <Text style={styles.checkText}>Clean workspace cleared of clutter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkRow, zrState.phoneDnd && styles.checkRowActive]}
                  onPress={() => void toggleCheck('phoneDnd')}
                >
                  <MaterialCommunityIcons
                    name={zrState.phoneDnd ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={20}
                    color={zrState.phoneDnd ? '#00E699' : '#64748B'}
                  />
                  <Text style={styles.checkText}>Phone on DND / Distracting apps sealed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkRow, zrState.singleVictory && styles.checkRowActive]}
                  onPress={() => void toggleCheck('singleVictory')}
                >
                  <MaterialCommunityIcons
                    name={zrState.singleVictory ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={20}
                    color={zrState.singleVictory ? '#00E699' : '#64748B'}
                  />
                  <Text style={styles.checkText}>Single defined victory milestone selected</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkRow, zrState.hydrated && styles.checkRowActive]}
                  onPress={() => void toggleCheck('hydrated')}
                >
                  <MaterialCommunityIcons
                    name={zrState.hydrated ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                    size={20}
                    color={zrState.hydrated ? '#00E699' : '#64748B'}
                  />
                  <Text style={styles.checkText}>Hydration ready & deep breath taken</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Coin Staking (Gamified Risk) */}
            <View style={styles.section}>
              <View style={styles.stakeHeader}>
                <Text style={styles.sectionLabel}>3. COIN STAKE (GAMIFIED LOSS RISK)</Text>
                <Text style={styles.stakeHint}>Finish: 2x Coins | Quit: Forfeited</Text>
              </View>
              <View style={styles.stakeRow}>
                {STAKE_OPTIONS.map((stake) => (
                  <TouchableOpacity
                    key={stake}
                    style={[styles.stakeBtn, selectedStake === stake && styles.stakeBtnActive]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedStake(stake);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="cash-multiple"
                      size={18}
                      color={selectedStake === stake ? '#F59E0B' : '#64748B'}
                    />
                    <Text style={[styles.stakeBtnText, selectedStake === stake && styles.stakeBtnTextActive]}>
                      {stake === 0 ? 'No Stake' : `${stake} Coins`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Pinned Launch Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.launchBtn} onPress={() => void handleLaunch()} activeOpacity={0.85}>
              <Ionicons name="flash" size={20} color="#070A11" />
              <Text style={styles.launchBtnText}>Arm Shield & Engage Focus</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  preTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  body: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  textInput: {
    backgroundColor: '#070A11',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  chip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#00E69922',
    borderColor: '#00E699',
  },
  chipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  checklist: {
    backgroundColor: '#070A11',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkRowActive: {
    opacity: 1,
  },
  checkText: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500',
    flex: 1,
  },
  stakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stakeHint: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '700',
  },
  stakeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#070A11',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stakeBtnActive: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B',
  },
  stakeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stakeBtnTextActive: {
    color: '#F59E0B',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F1829',
  },
  launchBtn: {
    backgroundColor: '#00E699',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
  },
  launchBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#070A11',
    letterSpacing: 0.5,
  },
});
