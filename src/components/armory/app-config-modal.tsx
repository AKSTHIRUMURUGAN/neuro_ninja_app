import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppIcon } from '../ui/app-icon';
import { PinSetupModal } from '../pin-setup-modal';
import { PatternSetupModal } from '../pattern-setup-modal';
import { NinjaPalette } from '../../constants/theme';
import type { AppQuotaPolicy } from '../../services/storage';

interface AppInfo {
  packageName: string;
  name: string;
  iconBase64?: string | null;
}

interface AppConfigModalProps {
  visible: boolean;
  app: AppInfo | null;
  isSealed: boolean;
  currentPolicy?: AppQuotaPolicy;
  onToggleSeal: (packageName: string) => void;
  onSavePolicy: (packageName: string, policy: Partial<AppQuotaPolicy>) => void;
  onClose: () => void;
}

const DEFAULT_OATH = 'I am consciously breaking my focus session for short-term dopamine.';

function AppConfigContent({
  app,
  isSealed,
  currentPolicy,
  onToggleSeal,
  onSavePolicy,
  onClose,
}: {
  app: AppInfo;
  isSealed: boolean;
  currentPolicy?: AppQuotaPolicy;
  onToggleSeal: (packageName: string) => void;
  onSavePolicy: (packageName: string, policy: Partial<AppQuotaPolicy>) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'locker_vault' | 'doom_barrier'>(() => {
    if (currentPolicy?.protectionMode) return currentPolicy.protectionMode;
    const isSocialOrFeed =
      app.name.toLowerCase().includes('instagram') ||
      app.name.toLowerCase().includes('youtube') ||
      app.name.toLowerCase().includes('tiktok') ||
      app.name.toLowerCase().includes('twitter') ||
      app.name.toLowerCase().includes('reddit') ||
      app.name.toLowerCase().includes('snapchat') ||
      app.packageName.includes('instagram') ||
      app.packageName.includes('youtube') ||
      app.packageName.includes('musically');
    return isSocialOrFeed ? 'doom_barrier' : 'locker_vault';
  });

  const [hasCustomSecurity, setHasCustomSecurity] = useState(
    () => !!currentPolicy?.hasCustomSecurity
  );
  const [customPin, setCustomPin] = useState<string | undefined>(
    () => currentPolicy?.customPin
  );
  const [customPattern, setCustomPattern] = useState<number[] | undefined>(
    () => currentPolicy?.customPattern
  );
  const [customPasscode, setCustomPasscode] = useState(
    () => currentPolicy?.customPasscode || ''
  );
  const [allowBiometrics, setAllowBiometrics] = useState(
    () => currentPolicy?.allowBiometrics ?? true
  );

  // Doom Barrier options
  const [doomFrictionType, setDoomFrictionType] = useState<
    'breath_gate' | 'wait_timer' | 'oath_type' | 'math_sprint' | 'schulte_grid' | 'custom_pass'
  >(() => currentPolicy?.doomFrictionType || 'breath_gate');

  const [doomWaitSeconds, setDoomWaitSeconds] = useState(
    () => currentPolicy?.doomWaitSeconds ?? 15
  );
  const [doomOathText, setDoomOathText] = useState(
    () => currentPolicy?.doomOathText || DEFAULT_OATH
  );
  const [allowBiometricBypass, setAllowBiometricBypass] = useState(
    () => currentPolicy?.allowBiometricBypass ?? false
  );
  const [allowMasterPinBypass, setAllowMasterPinBypass] = useState(
    () => currentPolicy?.allowMasterPinBypass ?? false
  );

  // Quotas
  const [sessionLimitMinutes, setSessionLimitMinutes] = useState(
    () => currentPolicy?.sessionLimitMinutes ?? 10
  );
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState(
    () => currentPolicy?.dailyLimitMinutes ?? 30
  );

  // Sub-modals for PIN & Pattern
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);

  const handleSave = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSavePolicy(app.packageName, {
      protectionMode: mode,
      hasCustomSecurity,
      customPin: customPin || undefined,
      customPattern: customPattern || undefined,
      customPasscode: customPasscode.trim() || undefined,
      allowBiometrics,
      doomFrictionType,
      doomWaitSeconds,
      doomOathText: doomOathText.trim() || DEFAULT_OATH,
      allowBiometricBypass,
      allowMasterPinBypass,
      sessionLimitMinutes,
      dailyLimitMinutes,
    });
    onClose();
  };

  const handleResetSecurity = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHasCustomSecurity(false);
    setCustomPin(undefined);
    setCustomPattern(undefined);
    setCustomPasscode('');
  };

  return (
    <View style={styles.modalContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.appHeaderLeft}>
          <AppIcon
            packageName={app.packageName}
            appName={app.name}
            iconBase64={app.iconBase64}
            size={48}
          />
          <View style={styles.appHeaderText}>
            <Text style={styles.appName} numberOfLines={1}>
              {app.name}
            </Text>
            <Text style={styles.appPackage} numberOfLines={1}>
              {app.packageName}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color={NinjaPalette.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* Seal / Shield Active Switch */}
        <View style={styles.sealToggleCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sealToggleTitle}>
              {isSealed ? 'Shield Sealed & Active' : 'Shield Dormant (Unsealed)'}
            </Text>
            <Text style={styles.sealToggleSubtitle}>
              {isSealed
                ? 'NeuroNinja monitors and enforces protection on this application.'
                : 'App opens freely without interception.'}
            </Text>
          </View>
          <Switch
            value={isSealed}
            onValueChange={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleSeal(app.packageName);
            }}
            thumbColor={isSealed ? NinjaPalette.emerald : '#94A3B8'}
            trackColor={{ false: '#1E293B', true: 'rgba(0, 230, 153, 0.4)' }}
          />
        </View>

        {/* Protection Mode Toggle */}
        <Text style={styles.sectionLabel}>DISCIPLINE CLASSIFICATION</Text>
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeCard, mode === 'doom_barrier' && styles.modeCardActiveDoom]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMode('doom_barrier');
            }}
          >
            <MaterialCommunityIcons
              name="fire"
              size={24}
              color={mode === 'doom_barrier' ? '#EF4444' : '#64748B'}
            />
            <Text
              style={[
                styles.modeCardTitle,
                mode === 'doom_barrier' && { color: '#EF4444', fontWeight: 'bold' },
              ]}
            >
              Doom Barrier
            </Text>
            <Text style={styles.modeCardDesc}>
              Addiction & feed breaker. Eliminates lazy PIN/biometric bypass.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'locker_vault' && styles.modeCardActiveVault]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMode('locker_vault');
            }}
          >
            <MaterialCommunityIcons
              name="shield-lock"
              size={24}
              color={mode === 'locker_vault' ? '#00E699' : '#64748B'}
            />
            <Text
              style={[
                styles.modeCardTitle,
                mode === 'locker_vault' && { color: '#00E699', fontWeight: 'bold' },
              ]}
            >
              Privacy Locker
            </Text>
            <Text style={styles.modeCardDesc}>
              Vault privacy for banking & confidential apps. Fast PIN/Pattern/Bio.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mode-Specific Settings */}
        {mode === 'locker_vault' ? (
          <View style={styles.cardSection}>
            <Text style={styles.subSectionLabel}>VAULT AUTHENTICATION METHOD</Text>

            {/* Per-App PIN */}
            <TouchableOpacity
              style={styles.securityRow}
              onPress={() => setShowPinModal(true)}
            >
              <View style={styles.securityRowLeft}>
                <Ionicons name="keypad" size={20} color="#00E699" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.securityRowTitle}>App-Specific 4-Digit PIN</Text>
                  <Text style={styles.securityRowDesc}>
                    {customPin
                      ? 'Specific PIN active (••••)'
                      : 'Not set (Uses Universal Master PIN)'}
                  </Text>
                </View>
              </View>
              <Text style={styles.actionLinkText}>{customPin ? 'Change' : 'Set PIN'}</Text>
            </TouchableOpacity>

            {/* Per-App Pattern */}
            <TouchableOpacity
              style={styles.securityRow}
              onPress={() => setShowPatternModal(true)}
            >
              <View style={styles.securityRowLeft}>
                <MaterialCommunityIcons name="gesture-tap" size={20} color="#38BDF8" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.securityRowTitle}>App-Specific Pattern Lock</Text>
                  <Text style={styles.securityRowDesc}>
                    {customPattern
                      ? `Custom Pattern active (${customPattern.length} nodes)`
                      : 'Not set (Uses Universal Master Pattern)'}
                  </Text>
                </View>
              </View>
              <Text style={styles.actionLinkText}>
                {customPattern ? 'Change' : 'Set Pattern'}
              </Text>
            </TouchableOpacity>

            {/* Per-App Passcode */}
            <View style={styles.passcodeBox}>
              <Text style={styles.passcodeLabel}>Custom Secret Passphrase (Optional):</Text>
              <TextInput
                style={styles.passcodeInput}
                placeholder="e.g. ALPHA_VAULT"
                placeholderTextColor="#64748B"
                value={customPasscode}
                onChangeText={setCustomPasscode}
                autoCapitalize="characters"
              />
            </View>

            {/* Allow Biometrics */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchRowTitle}>Allow Fingerprint / Biometric</Text>
                <Text style={styles.switchRowDesc}>
                  Fast authentication for personal trusted apps.
                </Text>
              </View>
              <Switch
                value={allowBiometrics}
                onValueChange={setAllowBiometrics}
                thumbColor={allowBiometrics ? NinjaPalette.emerald : '#94A3B8'}
                trackColor={{ false: '#1E293B', true: 'rgba(0, 230, 153, 0.4)' }}
              />
            </View>

            {hasCustomSecurity && (
              <TouchableOpacity
                style={styles.clearCustomBtn}
                onPress={handleResetSecurity}
              >
                <Text style={styles.clearCustomBtnText}>Revert to Master Password</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* DOOM BARRIER CONFIGURATION */
          <View style={styles.cardSection}>
            <Text style={styles.subSectionLabel}>MANDATORY FRICTION MECHANISM</Text>

            {/* Friction Strategy Selector */}
            <View style={styles.frictionGrid}>
              {[
                { id: 'breath_gate', label: '10s Zen Breath', icon: 'leaf-outline' },
                { id: 'wait_timer', label: 'Pause Delay', icon: 'timer-outline' },
                { id: 'oath_type', label: 'Mindful Oath', icon: 'create-outline' },
                { id: 'math_sprint', label: 'Math Sprint', icon: 'calculator-outline' },
                { id: 'schulte_grid', label: 'Schulte Grid', icon: 'grid-outline' },
                { id: 'custom_pass', label: 'Strict Passcode', icon: 'lock-closed-outline' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.frictionCard,
                    doomFrictionType === item.id && styles.frictionCardActive,
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDoomFrictionType(item.id as any);
                  }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={doomFrictionType === item.id ? '#EF4444' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.frictionCardText,
                      doomFrictionType === item.id && styles.frictionCardTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cooldown Timer */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Forced Urge Pause Cooldown:</Text>
              <View style={styles.cooldownRow}>
                {[10, 15, 30, 60].map((secs) => (
                  <TouchableOpacity
                    key={secs}
                    style={[
                      styles.cooldownBtn,
                      doomWaitSeconds === secs && styles.cooldownBtnActive,
                    ]}
                    onPress={() => setDoomWaitSeconds(secs)}
                  >
                    <Text
                      style={[
                        styles.cooldownBtnText,
                        doomWaitSeconds === secs && styles.cooldownBtnTextActive,
                      ]}
                    >
                      {secs}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Mindful Oath editor if oath_type chosen */}
            {doomFrictionType === 'oath_type' && (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Anti-Dopamine Oath to Type:</Text>
                <TextInput
                  style={styles.oathInput}
                  value={doomOathText}
                  onChangeText={setDoomOathText}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            {/* Dedicated Passcode if custom_pass chosen */}
            {doomFrictionType === 'custom_pass' && (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Dedicated Doom Passcode (Non-Muscle Memory):</Text>
                <TextInput
                  style={styles.passcodeInput}
                  placeholder="e.g. NO_REELS_TODAY"
                  placeholderTextColor="#64748B"
                  value={customPasscode}
                  onChangeText={setCustomPasscode}
                  autoCapitalize="characters"
                />
              </View>
            )}

            {/* Prevent lazy bypass toggles */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchRowTitle}>Block Universal Master PIN</Text>
                <Text style={styles.switchRowDesc}>
                  Prevents bypassing dopamine friction via your regular PIN.
                </Text>
              </View>
              <Switch
                value={!allowMasterPinBypass}
                onValueChange={(val) => setAllowMasterPinBypass(!val)}
                thumbColor={!allowMasterPinBypass ? '#EF4444' : '#94A3B8'}
                trackColor={{ false: '#1E293B', true: 'rgba(239, 68, 68, 0.4)' }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchRowTitle}>Block Quick Fingerprint</Text>
                <Text style={styles.switchRowDesc}>
                  Stops involuntary 0.5s biometric unlocks.
                </Text>
              </View>
              <Switch
                value={!allowBiometricBypass}
                onValueChange={(val) => setAllowBiometricBypass(!val)}
                thumbColor={!allowBiometricBypass ? '#EF4444' : '#94A3B8'}
                trackColor={{ false: '#1E293B', true: 'rgba(239, 68, 68, 0.4)' }}
              />
            </View>

            {/* Session & Daily Limits */}
            <View style={styles.limitsRow}>
              <View style={styles.limitCol}>
                <Text style={styles.limitLabel}>Session Cap</Text>
                <View style={styles.limitBtnRow}>
                  {[5, 10, 15].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.limitBtn,
                        sessionLimitMinutes === m && styles.limitBtnActive,
                      ]}
                      onPress={() => setSessionLimitMinutes(m)}
                    >
                      <Text
                        style={[
                          styles.limitBtnText,
                          sessionLimitMinutes === m && styles.limitBtnTextActive,
                        ]}
                      >
                        {m}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.limitCol}>
                <Text style={styles.limitLabel}>Daily Quota</Text>
                <View style={styles.limitBtnRow}>
                  {[15, 30, 45].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.limitBtn,
                        dailyLimitMinutes === m && styles.limitBtnActive,
                      ]}
                      onPress={() => setDailyLimitMinutes(m)}
                    >
                      <Text
                        style={[
                          styles.limitBtnText,
                          dailyLimitMinutes === m && styles.limitBtnTextActive,
                        ]}
                      >
                        {m}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-done" size={20} color="#070A11" />
          <Text style={styles.saveBtnText}>Save Discipline Configuration</Text>
        </TouchableOpacity>
      </View>

      {/* Sub-modals */}
      <PinSetupModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSave={(pin) => {
          setCustomPin(pin);
          setHasCustomSecurity(true);
        }}
      />

      <PatternSetupModal
        visible={showPatternModal}
        onClose={() => setShowPatternModal(false)}
        onSave={(pat) => {
          setCustomPattern(pat);
          setHasCustomSecurity(true);
        }}
      />
    </View>
  );
}

export function AppConfigModal({
  visible,
  app,
  isSealed,
  currentPolicy,
  onToggleSeal,
  onSavePolicy,
  onClose,
}: AppConfigModalProps) {
  if (!visible || !app) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <AppConfigContent
          key={app.packageName}
          app={app}
          isSealed={isSealed}
          currentPolicy={currentPolicy}
          onToggleSeal={onToggleSeal}
          onSavePolicy={onSavePolicy}
          onClose={onClose}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#070A11',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '92%',
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  appHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  appHeaderText: {
    marginLeft: 14,
    flex: 1,
  },
  appName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  appPackage: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sealToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  sealToggleTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  sealToggleSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  modeCardActiveDoom: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  modeCardActiveVault: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
  },
  modeCardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  modeCardDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  cardSection: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  subSectionLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  securityRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  securityRowTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  securityRowDesc: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  actionLinkText: {
    color: '#00E699',
    fontSize: 13,
    fontWeight: 'bold',
  },
  passcodeBox: {
    marginTop: 14,
    marginBottom: 10,
  },
  passcodeLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  passcodeInput: {
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    marginTop: 8,
  },
  switchRowTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  switchRowDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    paddingRight: 10,
  },
  clearCustomBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearCustomBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  frictionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  frictionCard: {
    width: '31%',
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frictionCardActive: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  frictionCardText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  frictionCardTextActive: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  cooldownRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cooldownBtn: {
    flex: 1,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cooldownBtnActive: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  cooldownBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cooldownBtnTextActive: {
    color: '#EF4444',
  },
  oathInput: {
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 12,
    lineHeight: 18,
  },
  limitsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  limitCol: {
    flex: 1,
  },
  limitLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  limitBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  limitBtn: {
    flex: 1,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  limitBtnActive: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  limitBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  limitBtnTextActive: {
    color: '#00E699',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#070A11',
  },
  saveBtn: {
    backgroundColor: '#00E699',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    color: '#070A11',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
