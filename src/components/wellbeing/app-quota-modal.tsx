import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppQuotaPolicy, AppCurfewSchedule } from '../../services/storage';
import { formatHoursMinutes, CATEGORY_COLORS } from '../../services/wellbeing/quota-service';
import { NinjaPalette } from '../../constants/theme';
import { AppIcon } from '../ui/app-icon';

interface AppQuotaModalProps {
  visible: boolean;
  appName: string;
  packageName: string;
  currentPolicy?: AppQuotaPolicy;
  onClose: () => void;
  onSave: (policy: AppQuotaPolicy) => void;
}

const PRESET_LIMITS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1h 30m', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: 'None', minutes: 0 },
];

const PRESET_SESSIONS = [
  { label: '5m', minutes: 5 },
  { label: '10m', minutes: 10 },
  { label: '15m', minutes: 15 },
  { label: '20m', minutes: 20 },
  { label: '30m', minutes: 30 },
  { label: 'Off', minutes: 0 },
];

const PRESET_LAUNCHES = [
  { label: '5', count: 5 },
  { label: '10', count: 10 },
  { label: '15', count: 15 },
  { label: '25', count: 25 },
  { label: 'Unlimited', count: 0 },
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AppQuotaModal({
  visible,
  appName,
  packageName,
  currentPolicy,
  onClose,
  onSave,
}: AppQuotaModalProps) {
  // Convert minutes into hours + minutes
  const initialTotalMinutes = currentPolicy?.dailyLimitMinutes ?? 30;
  const [hours, setHours] = useState(Math.floor(initialTotalMinutes / 60));
  const [minutes, setMinutes] = useState(initialTotalMinutes % 60);

  const [sessionLimit, setSessionLimit] = useState(currentPolicy?.sessionLimitMinutes ?? 10);
  const [launchLimit, setLaunchLimit] = useState(currentPolicy?.dailyLaunchLimit ?? 15);
  const [category, setCategory] = useState<AppQuotaPolicy['category']>(currentPolicy?.category ?? 'social');
  const [lockType, setLockType] = useState<AppQuotaPolicy['lockType']>(currentPolicy?.lockType ?? 'mindful_gate');

  // Custom App Security state
  const [hasCustomSecurity, setHasCustomSecurity] = useState(currentPolicy?.hasCustomSecurity ?? false);
  const [securityMode, setSecurityMode] = useState<'pin' | 'pattern'>(
    currentPolicy?.customPattern && currentPolicy.customPattern.length > 0 ? 'pattern' : 'pin'
  );
  const [customPin, setCustomPin] = useState(currentPolicy?.customPin ?? '8821');
  const [customPattern, setCustomPattern] = useState<number[]>(
    currentPolicy?.customPattern ?? [0, 1, 2, 4, 6]
  );

  // Curfew state
  const [curfewEnabled, setCurfewEnabled] = useState(currentPolicy?.curfewSchedule?.enabled ?? false);
  const [startHour, setStartHour] = useState(currentPolicy?.curfewSchedule?.startHour ?? 22); // 10 PM
  const [endHour, setEndHour] = useState(currentPolicy?.curfewSchedule?.endHour ?? 7); // 7 AM
  const [activeDays, setActiveDays] = useState<number[]>(
    currentPolicy?.curfewSchedule?.activeDays ?? [0, 1, 2, 3, 4, 5, 6]
  );

  const totalCalculatedMinutes = hours * 60 + minutes;

  const handlePresetSelect = (mins: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHours(Math.floor(mins / 60));
    setMinutes(mins % 60);
  };

  const handleAdjustHours = (delta: number) => {
    Haptics.selectionAsync();
    setHours((prev) => Math.max(0, Math.min(12, prev + delta)));
  };

  const handleAdjustMinutes = (delta: number) => {
    Haptics.selectionAsync();
    setMinutes((prev) => {
      let next = prev + delta;
      if (next >= 60) next = 0;
      if (next < 0) next = 55;
      return next;
    });
  };

  const toggleDay = (dayIndex: number) => {
    Haptics.selectionAsync();
    setActiveDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const curfew: AppCurfewSchedule = {
      enabled: curfewEnabled,
      startHour,
      startMinute: 0,
      endHour,
      endMinute: 0,
      activeDays,
    };

    const policy: AppQuotaPolicy = {
      dailyLimitMinutes: totalCalculatedMinutes,
      sessionLimitMinutes: sessionLimit,
      dailyLaunchLimit: launchLimit,
      category,
      escalatingDelayEnabled: true,
      curfewSchedule: curfew,
      lockType,
      hasCustomSecurity,
      customPin: hasCustomSecurity && securityMode === 'pin' ? customPin : undefined,
      customPattern: hasCustomSecurity && securityMode === 'pattern' ? customPattern : undefined,
    };

    onSave(policy);
    onClose();
  };

  const catInfo = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
              <AppIcon packageName={packageName} appName={appName} size={44} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{appName}</Text>
                  <View style={[styles.catBadge, { backgroundColor: catInfo.color + '22' }]}>
                    <Text style={[styles.catBadgeText, { color: catInfo.color }]}>{catInfo.label}</Text>
                  </View>
                </View>
                <Text style={styles.pkgText} numberOfLines={1}>
                  {packageName}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Section 1: Daily Usage Allowance */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="timer-sand" size={20} color={NinjaPalette.emerald} />
                <Text style={styles.sectionTitle}>Daily Time Quota</Text>
              </View>
              <Text style={styles.sectionSub}>
                Set total allowed hours and minutes per day before lock engages.
              </Text>

              {/* Big Readout */}
              <View style={styles.timeDisplayBox}>
                <Text style={styles.timeBigValue}>
                  {totalCalculatedMinutes === 0 ? 'No Limit' : formatHoursMinutes(totalCalculatedMinutes)}
                </Text>
                <Text style={styles.timeSubtext}>
                  {totalCalculatedMinutes === 0
                    ? 'App is unconstrained'
                    : `${totalCalculatedMinutes} minutes allowed daily`}
                </Text>
              </View>

              {/* Hours & Minutes Steppers */}
              <View style={styles.steppersRow}>
                {/* Hours Box */}
                <View style={styles.stepperBox}>
                  <Text style={styles.stepperUnitLabel}>HOURS</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleAdjustHours(-1)}
                      disabled={hours <= 0}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color={hours <= 0 ? '#475569' : '#FFF'} />
                    </TouchableOpacity>
                    <Text style={styles.stepperDigit}>{hours}h</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleAdjustHours(1)}
                      disabled={hours >= 12}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color={hours >= 12 ? '#475569' : '#FFF'} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Minutes Box */}
                <View style={styles.stepperBox}>
                  <Text style={styles.stepperUnitLabel}>MINUTES</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleAdjustMinutes(-5)}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.stepperDigit}>{minutes}m</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => handleAdjustMinutes(5)}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Quick Presets */}
              <Text style={styles.presetLabel}>QUICK PRESETS</Text>
              <View style={styles.presetsGrid}>
                {PRESET_LIMITS.map((item) => {
                  const isSelected = totalCalculatedMinutes === item.minutes;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => handlePresetSelect(item.minutes)}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Session Limit (Continuous Binge Cap) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="pause-circle-outline" size={20} color="#06B6D4" />
                <Text style={styles.sectionTitle}>Continuous Session Cap</Text>
              </View>
              <Text style={styles.sectionSub}>
                Forces a mandatory mindful pause after uninterrupted consecutive usage.
              </Text>

              <View style={styles.presetsGrid}>
                {PRESET_SESSIONS.map((item) => {
                  const isSelected = sessionLimit === item.minutes;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSessionLimit(item.minutes);
                      }}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 3: Daily Launch Limit */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="door-open" size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Daily Open Count Limit</Text>
              </View>
              <Text style={styles.sectionSub}>
                Curb autopilot opening habits by capping total app launches per day.
              </Text>

              <View style={styles.presetsGrid}>
                {PRESET_LAUNCHES.map((item) => {
                  const isSelected = launchLimit === item.count;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setLaunchLimit(item.count);
                      }}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 4: Bedtime Curfew Schedule */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="weather-night" size={20} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Bedtime & Focus Curfew</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, curfewEnabled && styles.toggleBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCurfewEnabled(!curfewEnabled);
                  }}
                >
                  <Text style={[styles.toggleBtnText, curfewEnabled && styles.toggleBtnTextActive]}>
                    {curfewEnabled ? 'ENABLED' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSub}>
                Completely locks app during specified sleep or deep work hours.
              </Text>

              {curfewEnabled && (
                <View style={styles.curfewConfigBox}>
                  {/* Hours Row */}
                  <View style={styles.curfewHoursRow}>
                    <View style={styles.curfewTimePill}>
                      <Text style={styles.curfewTimeLabel}>LOCK AT</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity
                          style={styles.stepBtnSmall}
                          onPress={() => setStartHour((prev) => (prev - 1 + 24) % 24)}
                        >
                          <MaterialCommunityIcons name="minus" size={16} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.curfewTimeValue}>
                          {startHour % 12 === 0 ? 12 : startHour % 12}:00 {startHour >= 12 ? 'PM' : 'AM'}
                        </Text>
                        <TouchableOpacity
                          style={styles.stepBtnSmall}
                          onPress={() => setStartHour((prev) => (prev + 1) % 24)}
                        >
                          <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <MaterialCommunityIcons name="arrow-right-thin" size={24} color="#64748B" />

                    <View style={styles.curfewTimePill}>
                      <Text style={styles.curfewTimeLabel}>UNLOCK AT</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity
                          style={styles.stepBtnSmall}
                          onPress={() => setEndHour((prev) => (prev - 1 + 24) % 24)}
                        >
                          <MaterialCommunityIcons name="minus" size={16} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.curfewTimeValue}>
                          {endHour % 12 === 0 ? 12 : endHour % 12}:00 {endHour >= 12 ? 'PM' : 'AM'}
                        </Text>
                        <TouchableOpacity
                          style={styles.stepBtnSmall}
                          onPress={() => setEndHour((prev) => (prev + 1) % 24)}
                        >
                          <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Days Selector */}
                  <Text style={styles.daysHeading}>ACTIVE DAYS</Text>
                  <View style={styles.daysRow}>
                    {DAYS_SHORT.map((day, idx) => {
                      const isActive = activeDays.includes(idx);
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.dayChip, isActive && styles.dayChipActive]}
                          onPress={() => toggleDay(idx)}
                        >
                          <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Section 5: Enforcement Mode */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="shield-lock" size={20} color="#EC4899" />
                <Text style={styles.sectionTitle}>Lock Strictness</Text>
              </View>
              <Text style={styles.sectionSub}>
                How NeuroNinja handles breach attempts once quota is exhausted.
              </Text>

              <View style={styles.lockModesRow}>
                <TouchableOpacity
                  style={[styles.lockModeCard, lockType === 'mindful_gate' && styles.lockModeCardActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setLockType('mindful_gate');
                  }}
                >
                  <MaterialCommunityIcons
                    name="brain"
                    size={24}
                    color={lockType === 'mindful_gate' ? NinjaPalette.emerald : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.lockModeTitle,
                      lockType === 'mindful_gate' && { color: NinjaPalette.emerald },
                    ]}
                  >
                    Dojo Gate
                  </Text>
                  <Text style={styles.lockModeDesc}>Solve Matiks or Chess to earn 5m bonus</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.lockModeCard, lockType === 'strict' && styles.lockModeCardActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setLockType('strict');
                  }}
                >
                  <MaterialCommunityIcons
                    name="lock"
                    size={24}
                    color={lockType === 'strict' ? '#EF4444' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.lockModeTitle,
                      lockType === 'strict' && { color: '#EF4444' },
                    ]}
                  >
                    Hard Shield
                  </Text>
                  <Text style={styles.lockModeDesc}>Master PIN or strictly locked until midnight</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 6: Independent App Security (Custom PIN / Pattern) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="shield-key" size={20} color="#10B981" />
                <Text style={styles.sectionTitle}>App-Specific Password</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, hasCustomSecurity && styles.toggleBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setHasCustomSecurity(!hasCustomSecurity);
                  }}
                >
                  <Text style={[styles.toggleBtnText, hasCustomSecurity && styles.toggleBtnTextActive]}>
                    {hasCustomSecurity ? 'CUSTOM' : 'DEFAULT'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSub}>
                Assign a unique PIN or Pattern for {appName} only, separate from your phone password and master lock.
              </Text>

              {hasCustomSecurity && (
                <View style={styles.curfewConfigBox}>
                  {/* Mode Selector: PIN vs Pattern */}
                  <View style={styles.lockModesRow}>
                    <TouchableOpacity
                      style={[styles.lockModeCard, securityMode === 'pin' && styles.lockModeCardActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSecurityMode('pin');
                      }}
                    >
                      <MaterialCommunityIcons
                        name="dialpad"
                        size={22}
                        color={securityMode === 'pin' ? NinjaPalette.emerald : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.lockModeTitle,
                          securityMode === 'pin' && { color: NinjaPalette.emerald },
                        ]}
                      >
                        App PIN
                      </Text>
                      <Text style={styles.lockModeDesc}>Unique 4-digit numeric code</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.lockModeCard, securityMode === 'pattern' && styles.lockModeCardActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSecurityMode('pattern');
                      }}
                    >
                      <MaterialCommunityIcons
                        name="gesture-tap"
                        size={22}
                        color={securityMode === 'pattern' ? '#06B6D4' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.lockModeTitle,
                          securityMode === 'pattern' && { color: '#06B6D4' },
                        ]}
                      >
                        App Pattern
                      </Text>
                      <Text style={styles.lockModeDesc}>Unique 3x3 pattern sequence</Text>
                    </TouchableOpacity>
                  </View>

                  {/* PIN Config */}
                  {securityMode === 'pin' && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.daysHeading}>APP-SPECIFIC PIN: {customPin}</Text>
                      <View style={styles.presetsGrid}>
                        {['8821', '1337', '9021', '4040', '7733'].map((sample) => (
                          <TouchableOpacity
                            key={sample}
                            style={[styles.presetChip, customPin === sample && styles.presetChipActive]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setCustomPin(sample);
                            }}
                          >
                            <Text style={[styles.presetChipText, customPin === sample && styles.presetChipTextActive]}>
                              {sample}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Pattern Config */}
                  {securityMode === 'pattern' && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.daysHeading}>
                        PATTERN SEQUENCE: {customPattern.join(' ➔ ')}
                      </Text>
                      <View style={styles.presetsGrid}>
                        {[
                          { name: 'Z-Slash', seq: [0, 1, 2, 4, 6, 7, 8] },
                          { name: 'L-Lock', seq: [0, 3, 6, 7, 8] },
                          { name: 'Diagonal', seq: [0, 4, 8] },
                          { name: 'Square', seq: [0, 1, 4, 3, 0] },
                        ].map((pat) => {
                          const isSel = customPattern.join(',') === pat.seq.join(',');
                          return (
                            <TouchableOpacity
                              key={pat.name}
                              style={[styles.presetChip, isSel && styles.presetChipActive]}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setCustomPattern(pat.seq);
                              }}
                            >
                              <Text style={[styles.presetChipText, isSel && styles.presetChipTextActive]}>
                                {pat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Section 7: Category Tag */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="shape-outline" size={20} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Category Tag</Text>
              </View>
              <Text style={styles.sectionSub}>
                Classify this application for aggregated category intelligence.
              </Text>

              <View style={styles.presetsGrid}>
                {(['social', 'video', 'messaging', 'browser', 'gaming', 'productivity', 'utility'] as const).map((cat) => {
                  const isSelected = category === cat;
                  const cInfo = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.presetChip,
                        isSelected && { borderColor: cInfo.color, backgroundColor: cInfo.color + '22' },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCategory(cat);
                      }}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && { color: cInfo.color, fontWeight: '800' },
                        ]}
                      >
                        {cInfo.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <MaterialCommunityIcons name="check-bold" size={20} color="#070A11" />
              <Text style={styles.saveBtnText}>Save Quota Rules</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pkgText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sectionSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 17,
  },
  timeDisplayBox: {
    backgroundColor: '#070A11',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  timeBigValue: {
    color: NinjaPalette.emerald,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timeSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  steppersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stepperBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepperUnitLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDigit: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  presetLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipActive: {
    backgroundColor: NinjaPalette.emerald + '22',
    borderColor: NinjaPalette.emerald,
  },
  presetChipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: NinjaPalette.emerald,
    fontWeight: '800',
  },
  toggleBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  toggleBtnText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  curfewConfigBox: {
    marginTop: 8,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  curfewHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  curfewTimePill: {
    alignItems: 'center',
    flex: 1,
  },
  curfewTimeLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 6,
  },
  curfewTimeValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  daysHeading: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayChipActive: {
    backgroundColor: '#8B5CF622',
    borderColor: '#8B5CF6',
  },
  dayChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: '#8B5CF6',
    fontWeight: '900',
  },
  lockModesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  lockModeCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  lockModeCardActive: {
    borderColor: NinjaPalette.emerald,
    backgroundColor: NinjaPalette.emerald + '11',
  },
  lockModeTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 2,
  },
  lockModeDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#070A11',
    fontSize: 15,
    fontWeight: '800',
  },
});
