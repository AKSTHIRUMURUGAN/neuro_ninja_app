import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HabitItemV3, VerifierType } from '../../services/habits/habit-types';
import { DAY_NAMES } from '../../services/habits/streak-calculator';

interface HabitEditViewProps {
  habit: HabitItemV3;
  onSave: (updates: Partial<HabitItemV3>) => Promise<void>;
  onDelete: () => void;
}

export default function HabitEditView({ habit, onSave, onDelete }: HabitEditViewProps) {
  const [title, setTitle] = useState(habit.title);
  const [description, setDescription] = useState(habit.description || '');
  const [frequency, setFrequency] = useState<'daily' | 'specific_days'>(
    habit.schedule?.recurrenceType === 'specific_days' ? 'specific_days' : 'daily'
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    habit.schedule?.specificDays || [1, 2, 3, 4, 5, 6]
  );
  const [restDays, setRestDays] = useState<number[]>(habit.restDays || [0]);
  const [xpReward, setXpReward] = useState(String(habit.xpReward || 25));
  const [coinReward, setCoinReward] = useState(String(habit.coinReward || 5));
  const [verifierType, setVerifierType] = useState<VerifierType>(habit.verifierType || 'self');
  const [verifierEmail, setVerifierEmail] = useState(habit.verifierEmail || '');
  const [saving, setSaving] = useState(false);

  const toggleDay = (dayIndex: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const toggleRestDay = (dayIndex: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Habit title cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        restDays,
        xpReward: Math.max(1, parseInt(xpReward, 10) || 25),
        coinReward: Math.max(1, parseInt(coinReward, 10) || 5),
        verifierType,
        verifierEmail: verifierEmail.trim() || null,
        schedule: {
          recurrenceType: frequency === 'specific_days' ? 'specific_days' : 'daily',
          specificDays: frequency === 'specific_days' ? selectedDays : [0, 1, 2, 3, 4, 5, 6],
          timeOfDay: habit.schedule?.timeOfDay || 'anytime',
          targetType: 'boolean',
          targetValue: 1,
        },
      });
      Alert.alert('Habit Updated', 'Habit configuration saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save habit changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Basic Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>HABIT DETAILS</Text>

        <Text style={styles.inputLabel}>Title</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. 45m Deep Work Sprint"
          placeholderTextColor="#64748B"
        />

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Description / Motivation</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Why does this habit matter to you?"
          placeholderTextColor="#64748B"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Recurrence & Schedule */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>RECURRENCE SCHEDULE</Text>

        <View style={styles.freqToggleRow}>
          <TouchableOpacity
            style={[styles.freqBtn, frequency === 'daily' && styles.freqBtnActive]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFrequency('daily');
            }}
          >
            <Text style={[styles.freqBtnText, frequency === 'daily' && styles.freqBtnTextActive]}>
              Daily
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.freqBtn, frequency === 'specific_days' && styles.freqBtnActive]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFrequency('specific_days');
            }}
          >
            <Text
              style={[
                styles.freqBtnText,
                frequency === 'specific_days' && styles.freqBtnTextActive,
              ]}
            >
              Specific Days
            </Text>
          </TouchableOpacity>
        </View>

        {frequency === 'specific_days' && (
          <View style={styles.daysPickerContainer}>
            <Text style={styles.subLabel}>Active Habit Days:</Text>
            <View style={styles.daysRow}>
              {DAY_NAMES.map((name, idx) => {
                const isSelected = selectedDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={'spec_' + name}
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                    onPress={() => toggleDay(idx)}
                  >
                    <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                      {name[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Rest Days (Protected Off-Days) */}
        <View style={styles.restDaysContainer}>
          <Text style={styles.subLabel}>Non-Penalized Rest Days (Streak Protected):</Text>
          <View style={styles.daysRow}>
            {DAY_NAMES.map((name, idx) => {
              const isRest = restDays.includes(idx);
              return (
                <TouchableOpacity
                  key={'rest_' + name}
                  style={[styles.dayChip, isRest && styles.restChipActive]}
                  onPress={() => toggleRestDay(idx)}
                >
                  <Text style={[styles.dayChipText, isRest && styles.restChipTextActive]}>
                    {name[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Rewards & Accountability */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>REWARDS & ACCOUNTABILITY</Text>

        <View style={styles.rewardsRow}>
          <View style={styles.rewardCol}>
            <Text style={styles.inputLabel}>XP Reward</Text>
            <TextInput
              style={styles.textInput}
              value={xpReward}
              onChangeText={setXpReward}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.rewardCol}>
            <Text style={styles.inputLabel}>Focus Coins</Text>
            <TextInput
              style={styles.textInput}
              value={coinReward}
              onChangeText={setCoinReward}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Accountability Verifier</Text>
        <View style={styles.verifierOptions}>
          {(['self', 'parent', 'friend', 'mentor'] as VerifierType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.verifierOptionBtn,
                verifierType === type && styles.verifierOptionBtnActive,
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setVerifierType(type);
              }}
            >
              <Text
                style={[
                  styles.verifierOptionText,
                  verifierType === type && styles.verifierOptionTextActive,
                ]}
              >
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {verifierType !== 'self' && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.inputLabel}>Verifier Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={verifierEmail}
              onChangeText={setVerifierEmail}
              placeholder="verifier@example.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark-circle-outline" size={20} color="#070A11" />
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Configuration'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
        <Text style={styles.deleteBtnText}>Delete Habit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F8FAFC',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  freqToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  freqBtnActive: {
    backgroundColor: '#00E699',
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  freqBtnTextActive: {
    color: '#070A11',
  },
  daysPickerContainer: {
    marginBottom: 14,
  },
  restDaysContainer: {
    marginTop: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  dayChipTextActive: {
    color: '#070A11',
  },
  restChipActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  restChipTextActive: {
    color: '#070A11',
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardCol: {
    flex: 1,
  },
  verifierOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  verifierOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  verifierOptionBtnActive: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  verifierOptionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  verifierOptionTextActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#070A11',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
