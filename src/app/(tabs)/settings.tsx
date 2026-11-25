import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { useNinja } from '../../context/ninja-context';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import { NinjaPalette } from '../../constants/theme';
import { blockerEngine } from '../../services/blocker/blocker-engine';
import { getIntruderLogs, clearIntruderLogs, type IntruderLogEntry } from '../../services/intruder-audit';
import { PrivacyVault } from '../../components/privacy-vault';
import { PatternSetupModal } from '../../components/pattern-setup-modal';
import { PinSetupModal } from '../../components/pin-setup-modal';
import { StealthCalculator } from '../../components/vault/stealth-calculator';
import { ProminentDisclosureModal } from '../../components/ProminentDisclosureModal';
import { OemBackgroundGuideModal } from '../../components/OemBackgroundGuideModal';
import {
  loadVaultConfig,
  saveVaultConfig,
  DISGUISE_PROFILES,
  type DisguiseMode,
  type VaultConfig,
} from '../../services/vault/vault-service';
import type { LockType } from '../../services/storage';

export default function SettingsScreen() {
  const router = useRouter();
  const { showAlert, showToast } = useNinjaAlert();
  const {
    settings,
    permissions,
    refreshPermissions,
    relockNow,
    setLockType,
    setBiometricsEnabled,
    setDecoyEnabled,
    setAutoLockDelay,
    setMasterPin,
    setMasterPattern,
    setPatternVisible,
    setPatternHaptics,
    setScramblePinKeypad,
  } = useNinja();

  const [intruderLogs, setIntruderLogs] = useState<IntruderLogEntry[]>([]);
  const [showVault, setShowVault] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(null);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [showOemGuideModal, setShowOemGuideModal] = useState(false);
  const [floatingHudEnabled, setFloatingHudEnabled] = useState(true);
  const [accessibilityRunning, setAccessibilityRunning] = useState(false);
  const [hudAlertMins, setHudAlertMins] = useState(5);
  const [surgicalReelsBlockEnabled, setSurgicalReelsBlockEnabled] = useState(false);
  const [reelDailyBudget, setReelDailyBudget] = useState(30);
  const [todayReels, setTodayReels] = useState(0);
  const [brainStateScore, setBrainStateScore] = useState(100);

  const refreshReelsState = useCallback(() => {
    if (Platform.OS === 'android') {
      setAccessibilityRunning(blockerEngine.isAccessibilityServiceRunning());
      setFloatingHudEnabled(blockerEngine.isFloatingHudEnabled());
      setSurgicalReelsBlockEnabled(blockerEngine.isSurgicalReelsBlockEnabled());
      setReelDailyBudget(blockerEngine.getReelDailyBudget());
      setTodayReels(blockerEngine.getTodayReelsCount());
      setBrainStateScore(blockerEngine.getBrainStateScore());
    }
  }, [
    setAccessibilityRunning,
    setFloatingHudEnabled,
    setSurgicalReelsBlockEnabled,
    setReelDailyBudget,
    setTodayReels,
    setBrainStateScore,
  ]);

  useEffect(() => {
    void (async () => {
      const logs = await getIntruderLogs();
      setIntruderLogs(logs);
      const vc = await loadVaultConfig();
      setVaultConfig(vc);
      refreshReelsState();
    })();
  }, [refreshReelsState]);

  useFocusEffect(
    useCallback(() => {
      refreshReelsState();
    }, [refreshReelsState])
  );

  const handleToggleSurgicalReels = (val: boolean) => {
    setSurgicalReelsBlockEnabled(val);
    blockerEngine.setSurgicalReelsBlockEnabled(val);
    showToast({
      title: val ? 'Surgical Reels Blocker Armed' : 'Surgical Reels Blocker Off',
      message: val
        ? 'Instagram Reels & YouTube Shorts auto-back out. Chats & normal videos remain open!'
        : 'Reels and Shorts will not be blocked.',
      type: val ? 'shield' : 'info',
      icon: 'movie-off-outline',
    });
  };

  const handleSelectReelBudget = (budget: number) => {
    setReelDailyBudget(budget);
    blockerEngine.setReelDailyBudget(budget);
    showToast({
      title: 'Daily Reel Cap Updated',
      message: `Daily target set to ${budget} Reels before critical alert.`,
      type: 'info',
      icon: 'bullseye-arrow',
    });
  };

  const handleToggleFloatingHud = (val: boolean) => {
    setFloatingHudEnabled(val);
    blockerEngine.setFloatingHudEnabled(val);
    showToast({
      title: val ? 'Floating HUD Armed' : 'Floating HUD Lowered',
      message: val
        ? 'Live scroll capsule will float over Instagram and YouTube.'
        : 'Floating overlay disabled.',
      type: val ? 'shield' : 'warning',
      icon: 'television-guide',
    });
  };

  const handleSelectHudAlertMins = (mins: number) => {
    setHudAlertMins(mins);
    blockerEngine.setDoomscrollAlertThresholds(mins, mins * 4);
    showToast({
      title: 'Doomscroll Nudge Set',
      message: `Alert triggered after ${mins} minutes or ${mins * 4} continuous scrolls.`,
      type: 'info',
      icon: 'timer-sand',
    });
  };

  const handleSelectDisguise = async (mode: DisguiseMode) => {
    const updated = await saveVaultConfig({ disguiseMode: mode });
    setVaultConfig(updated);
    showToast({
      title: 'Disguise Active',
      message: `App camouflage updated to ${DISGUISE_PROFILES[mode].name}.`,
      type: 'success',
      icon: 'incognito',
    });
  };

  const isIOS = Platform.OS === 'ios';
  const androidDetails = permissions?.details?.platform === 'android' ? permissions.details : null;

  const handleEmergencyRelock = async () => {
    await relockNow();
    showToast({
      title: 'Shields Armed',
      message: 'All active temporary passes have been terminated.',
      type: 'shield',
      icon: 'shield-lock',
    });
  };

  const handleClearIntruders = async () => {
    await clearIntruderLogs();
    setIntruderLogs([]);
    showToast({
      title: 'Audit Cleared',
      message: 'Intruder log history has been wiped.',
      type: 'info',
      icon: 'delete-sweep',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: NinjaPalette.emerald }}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.badge}>SYSTEM CONFIG</Text>
              <Text style={styles.title}>Settings</Text>
            </View>
          </View>
        </View>

        {/* Permissions Diagnostics */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>PERMISSION STATUS</Text>

          {isIOS ? (
            <View style={styles.row}>
              <MaterialCommunityIcons
                name={permissions?.allGranted ? 'check-circle' : 'alert-circle'}
                size={22}
                color={permissions?.allGranted ? NinjaPalette.emerald : NinjaPalette.amber}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Apple Screen Time</Text>
                <Text style={styles.rowSub}>
                  {permissions?.allGranted ? 'Authorized' : 'Authorization Required'}
                </Text>
              </View>
              {!permissions?.allGranted && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={async () => {
                    await blockerEngine.requestPermissions();
                    await refreshPermissions();
                  }}
                >
                  <Text style={styles.actionBtnText}>Request</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {/* Permission 1: Reels & Shorts Guardian (Accessibility) */}
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name={androidDetails?.accessibility ? 'check-circle' : 'alert-circle'}
                  size={22}
                  color={androidDetails?.accessibility ? NinjaPalette.emerald : '#60A5FA'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Reels &amp; Shorts Guardian</Text>
                  <Text style={styles.rowSub}>
                    {androidDetails?.accessibility ? 'Active & Monitoring' : 'Accessibility Required'}
                  </Text>
                </View>
                {!androidDetails?.accessibility && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#60A5FA', backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}
                    onPress={() => setShowDisclosureModal(true)}
                  >
                    <Text style={[styles.actionBtnText, { color: '#60A5FA' }]}>Enable</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Permission 2: Display Over Other Apps */}
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name={androidDetails?.overlay ? 'check-circle' : 'alert-circle'}
                  size={22}
                  color={androidDetails?.overlay ? NinjaPalette.emerald : NinjaPalette.amber}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Display Over Other Apps</Text>
                  <Text style={styles.rowSub}>
                    {androidDetails?.overlay ? 'Granted' : 'Permission Missing'}
                  </Text>
                </View>
                {!androidDetails?.overlay && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => blockerEngine.openOverlaySettings()}
                  >
                    <Text style={styles.actionBtnText}>Grant</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Permission 3: Usage Access */}
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name={androidDetails?.usageStats ? 'check-circle' : 'alert-circle'}
                  size={22}
                  color={androidDetails?.usageStats ? NinjaPalette.emerald : NinjaPalette.amber}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Usage Access</Text>
                  <Text style={styles.rowSub}>
                    {androidDetails?.usageStats ? 'Granted' : 'Permission Missing'}
                  </Text>
                </View>
                {!androidDetails?.usageStats && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => blockerEngine.openUsageStatsSettings()}
                  >
                    <Text style={styles.actionBtnText}>Grant</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Permission 4: Notification Guard */}
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name={androidDetails?.notificationListener ? 'check-circle' : 'alert-circle'}
                  size={22}
                  color={androidDetails?.notificationListener ? NinjaPalette.emerald : '#EC4899'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Notification Guard</Text>
                  <Text style={styles.rowSub}>
                    {androidDetails?.notificationListener ? 'Shielding Active' : 'Listener Disabled'}
                  </Text>
                </View>
                {!androidDetails?.notificationListener && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#EC4899', backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}
                    onPress={() => blockerEngine.openNotificationListenerSettings()}
                  >
                    <Text style={[styles.actionBtnText, { color: '#EC4899' }]}>Enable</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Permission 5: Background Battery Exemption */}
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name={androidDetails?.batteryOptimization ? 'check-circle' : 'alert-circle'}
                  size={22}
                  color={androidDetails?.batteryOptimization ? NinjaPalette.emerald : '#38BDF8'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Background Protection</Text>
                  <Text style={styles.rowSub}>
                    {androidDetails?.batteryOptimization ? 'Unrestricted / Safe' : 'Optimized (May be killed)'}
                  </Text>
                </View>
                {!androidDetails?.batteryOptimization && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}
                    onPress={() => blockerEngine.requestIgnoreBatteryOptimization()}
                  >
                    <Text style={[styles.actionBtnText, { color: '#38BDF8' }]}>Allow</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* OEM Autostart Guide Button */}
              <TouchableOpacity
                style={styles.oemGuideBtn}
                onPress={() => setShowOemGuideModal(true)}
              >
                <MaterialCommunityIcons name="cellphone-cog" size={18} color="#60A5FA" />
                <Text style={styles.oemGuideBtnText}>
                  OEM Background Protection Guide ({blockerEngine.getDeviceManufacturer().toUpperCase()})
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.recheckBtn}
            onPress={() => refreshPermissions()}
          >
            <MaterialCommunityIcons name="refresh" size={16} color={NinjaPalette.textSecondary} />
            <Text style={styles.recheckBtnText}>Re-check Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* App Locker 2.0 & Camouflage Controls */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>APP LOCKER & CAMOUFLAGE VAULT</Text>

          {/* Master Lock Type Selector */}
          <Text style={styles.subHeading}>PRIMARY LOCK MECHANISM</Text>
          <View style={styles.lockTypeGrid}>
            {[
              { id: 'pattern' as LockType, label: 'Pattern', icon: 'gesture-tap', desc: 'Gesture trace' },
              { id: 'pin' as LockType, label: 'PIN Lock', icon: 'dialpad', desc: '4-digit code' },
              { id: 'biometric' as LockType, label: 'Fingerprint', icon: 'fingerprint', desc: 'Biometric' },
              { id: 'gate' as LockType, label: 'Mindful Gate', icon: 'leaf', desc: 'Friction challenge' },
            ].map((item) => {
              const isSelected =
                settings.lockType === item.id ||
                (item.id === 'pin' && settings.lockType === 'scramble_pin');
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.lockTypeCard, isSelected && styles.lockTypeCardActive]}
                  onPress={() => setLockType(item.id)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={24}
                    color={isSelected ? NinjaPalette.emerald : '#94A3B8'}
                  />
                  <Text style={[styles.lockTypeLabel, isSelected && styles.lockTypeLabelActive]}>
                    {item.label}
                  </Text>
                  <Text style={styles.lockTypeDesc}>{item.desc}</Text>
                  {isSelected && (
                    <View style={styles.lockTypeCheck}>
                      <MaterialCommunityIcons name="check" size={12} color="#070A11" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Pattern Lock Configuration Sub-section */}
          <View style={styles.configSubCard}>
            <View style={styles.configSubCardHeader}>
              <MaterialCommunityIcons name="dots-grid" size={20} color={NinjaPalette.emerald} />
              <View style={{ flex: 1 }}>
                <Text style={styles.configSubCardTitle}>Pattern Lock Settings</Text>
                <Text style={styles.configSubCardSub}>
                  {settings.masterPattern?.length
                    ? `Configured (${settings.masterPattern.length} nodes connected)`
                    : 'Default pattern active ([0, 1, 2, 5, 8])'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.configActionBtn}
                onPress={() => setShowPatternModal(true)}
              >
                <Text style={styles.configActionBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.subCardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subRowTitle}>Show Connecting Trace</Text>
                <Text style={styles.subRowSub}>Display glowing lines between pattern dots</Text>
              </View>
              <Switch
                value={settings.patternVisible ?? true}
                onValueChange={setPatternVisible}
                thumbColor={settings.patternVisible ? NinjaPalette.emerald : '#64748B'}
                trackColor={{ false: '#334155', true: '#0F291E' }}
              />
            </View>

            <View style={[styles.subCardRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subRowTitle}>Haptic Feedback on Dots</Text>
                <Text style={styles.subRowSub}>Vibrate whenever a pattern node is touched</Text>
              </View>
              <Switch
                value={settings.patternHaptics ?? true}
                onValueChange={setPatternHaptics}
                thumbColor={settings.patternHaptics ? NinjaPalette.emerald : '#64748B'}
                trackColor={{ false: '#334155', true: '#0F291E' }}
              />
            </View>
          </View>

          {/* PIN Lock Configuration Sub-section */}
          <View style={styles.configSubCard}>
            <View style={styles.configSubCardHeader}>
              <MaterialCommunityIcons name="numeric" size={20} color="#60A5FA" />
              <View style={{ flex: 1 }}>
                <Text style={styles.configSubCardTitle}>PIN Lock Settings</Text>
                <Text style={styles.configSubCardSub}>
                  Master PIN: {settings.masterPin ? '••••' : '1234 (Default)'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.configActionBtn, { borderColor: '#60A5FA', backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}
                onPress={() => setShowPinModal(true)}
              >
                <Text style={[styles.configActionBtnText, { color: '#60A5FA' }]}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.subCardRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subRowTitle}>Scramble Keypad Layout</Text>
                <Text style={styles.subRowSub}>
                  Randomizes digit positions to prevent screen smudge reading
                </Text>
              </View>
              <Switch
                value={settings.scramblePinKeypad ?? false}
                onValueChange={setScramblePinKeypad}
                thumbColor={settings.scramblePinKeypad ? '#60A5FA' : '#64748B'}
                trackColor={{ false: '#334155', true: '#1E293B' }}
              />
            </View>
          </View>

          {/* Biometrics */}
          <View style={styles.row}>
            <Ionicons name="finger-print" size={20} color="#34D399" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Biometric Fast-Unlock</Text>
              <Text style={styles.rowSub}>Auto-prompts fingerprint sensor immediately on lock</Text>
            </View>
            <Switch
              value={settings.biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              thumbColor={settings.biometricsEnabled ? '#34D399' : '#64748B'}
              trackColor={{ false: '#334155', true: '#064E3B' }}
            />
          </View>

          {/* Camouflage Fake Crash */}
          <View style={styles.row}>
            <Ionicons name="eye-off-outline" size={20} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Camouflage Fake Crash</Text>
              <Text style={styles.rowSub}>Disguises lock screen as fake Android app crash</Text>
            </View>
            <Switch
              value={settings.decoyEnabled}
              onValueChange={setDecoyEnabled}
              thumbColor={settings.decoyEnabled ? '#F59E0B' : '#64748B'}
              trackColor={{ false: '#334155', true: '#292211' }}
            />
          </View>

          {/* Auto-Lock Delay Selector (AppLock Parity) */}
          <View style={styles.delayConfigBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <MaterialCommunityIcons name="timer-sand" size={18} color="#00E699" />
              <Text style={styles.delayTitle}>Auto-Lock Delay</Text>
            </View>
            <Text style={styles.delaySub}>
              How quickly sealed applications re-lock after switching out.
            </Text>
            <View style={styles.delayTabs}>
              {[
                { label: 'Immediate', sec: 0 },
                { label: '1 Minute', sec: 60 },
                { label: '5 Minutes', sec: 300 },
              ].map((opt) => {
                const isSelected = (settings.autoLockDelaySeconds ?? 0) === opt.sec;
                return (
                  <TouchableOpacity
                    key={opt.sec}
                    style={[styles.delayTab, isSelected && styles.delayTabActive]}
                    onPress={() => setAutoLockDelay(opt.sec)}
                  >
                    <Text style={[styles.delayTabText, isSelected && styles.delayTabTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Intruder Audit Log Count */}
          <TouchableOpacity style={styles.actionRow} onPress={handleClearIntruders}>
            <MaterialCommunityIcons name="shield-alert-outline" size={22} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Intruder Security Audit</Text>
              <Text style={styles.actionRowSub}>
                {intruderLogs.length} failed unlock incidents logged (Tap to wipe)
              </Text>
            </View>
          </TouchableOpacity>

          {/* Privacy Vault */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setShowVault(true)}
          >
            <MaterialCommunityIcons name="safe" size={22} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Encrypted Privacy Vault</Text>
              <Text style={styles.actionRowSub}>Private notes and secret data protected in sandbox</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Modal for Pattern Setup */}
        <PatternSetupModal
          visible={showPatternModal}
          onClose={() => setShowPatternModal(false)}
          onSave={async (newPattern) => {
            await setMasterPattern(newPattern);
            setShowPatternModal(false);
            showToast({
              title: 'Pattern Saved',
              message: 'Your new master unlock pattern has been recorded.',
              type: 'success',
              icon: 'gesture-tap',
            });
          }}
        />

        {/* Modal for PIN Setup */}
        <PinSetupModal
          visible={showPinModal}
          onClose={() => setShowPinModal(false)}
          onSave={async (newPin) => {
            await setMasterPin(newPin);
            setShowPinModal(false);
            showToast({
              title: 'PIN Saved',
              message: 'Your new master unlock PIN has been saved.',
              type: 'success',
              icon: 'dialpad',
            });
          }}
        />

        {/* Modal for Privacy Vault */}
        <Modal visible={showVault} animationType="slide">
          <PrivacyVault onClose={() => setShowVault(false)} />
        </Modal>

        {/* Modal for Stealth Calculator Camouflage */}
        <Modal visible={showCalculatorModal} animationType="slide">
          <StealthCalculator
            secretPin={settings.masterPin || '1234'}
            onUnlockVault={() => {
              setShowCalculatorModal(false);
              showAlert({
                title: 'Vault Breached',
                message: 'Secret PIN accepted. Stealth Vault unlocked.',
                type: 'shield',
                icon: 'shield-key',
              });
            }}
            onExit={() => setShowCalculatorModal(false)}
          />
        </Modal>

        {/* Vault Disguise & Camouflage Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>VAULT CAMOUFLAGE & DISGUISE</Text>
          <Text style={styles.delaySub}>
            Disguise your protected apps and vault behind common stealth covers.
          </Text>

          <View style={styles.lockTypeGrid}>
            {(['none', 'calculator', 'game_vault', 'notes'] as DisguiseMode[]).map((mode) => {
              const profile = DISGUISE_PROFILES[mode];
              const isSelected = (vaultConfig?.disguiseMode ?? 'none') === mode;

              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.lockTypeCard, isSelected && styles.lockTypeCardActive]}
                  onPress={() => void handleSelectDisguise(mode)}
                >
                  <MaterialCommunityIcons
                    name={profile.icon as any}
                    size={24}
                    color={isSelected ? NinjaPalette.emerald : '#94A3B8'}
                  />
                  <Text style={[styles.lockTypeLabel, isSelected && styles.lockTypeLabelActive]}>
                    {profile.name}
                  </Text>
                  <Text style={styles.lockTypeDesc}>{profile.subtitle}</Text>
                  {isSelected && (
                    <View style={styles.lockTypeCheck}>
                      <MaterialCommunityIcons name="check" size={12} color="#070A11" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Test Stealth Calculator Button */}
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0, marginTop: 8 }]}
            onPress={() => setShowCalculatorModal(true)}
          >
            <MaterialCommunityIcons name="calculator-variant" size={22} color="#06B6D4" />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Test Stealth Calculator Keypad</Text>
              <Text style={styles.actionRowSub}>
                Type PIN ({settings.masterPin || '1234'}) and press &apos;=&apos; to unlock vault
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Floating Reels & Short-Video Guardian (Competitor Parity: Doomy, Brainrot, SaneScroll) */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="movie-outline" size={20} color="#00E699" />
              <Text style={styles.cardHeading}>REELS & SHORT-VIDEO GUARDIAN</Text>
            </View>
            <Switch
              value={floatingHudEnabled}
              onValueChange={handleToggleFloatingHud}
              thumbColor={floatingHudEnabled ? NinjaPalette.emerald : '#64748B'}
              trackColor={{ false: '#334155', true: '#0F291E' }}
            />
          </View>
          <Text style={styles.delaySub}>
            Floats a draggable edge-snapping pill with reactive Kage mascot, 2-second view threshold, Brain State meter, and mindful breath interruptions.
          </Text>

          {/* Live Reel Tracker Metrics Strip */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#070A11',
            borderRadius: 12,
            padding: 10,
            marginTop: 10,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.06)',
            justifyContent: 'space-around'
          }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="flame" size={15} color="#F59E0B" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#F59E0B' }}>{todayReels}</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Reels Today</Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="speedometer-outline" size={15} color="#38BDF8" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#38BDF8' }}>{brainStateScore}%</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Brain State</Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="flag-outline" size={15} color="#00E699" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#00E699' }}>{reelDailyBudget}</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Daily Target</Text>
            </View>
          </View>

          {/* Feature 1: Surgical Reels & Shorts Auto-Block (Sane Scrolling & StopScroll Parity) */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0B132B',
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
            borderWidth: 1,
            borderColor: 'rgba(56, 189, 248, 0.2)'
          }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="movie-off-outline" size={16} color="#38BDF8" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#F8FAFC' }}>
                  Surgically Block Reels & Shorts
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                Instantly exits Reels & Shorts into home feed. Instagram DMs, posts, and regular YouTube videos remain 100% accessible!
              </Text>
            </View>
            <Switch
              value={surgicalReelsBlockEnabled}
              onValueChange={handleToggleSurgicalReels}
              thumbColor={surgicalReelsBlockEnabled ? '#38BDF8' : '#64748B'}
              trackColor={{ false: '#334155', true: '#0C4A6E' }}
            />
          </View>

          {/* Feature 2: Daily Reel Cap Targets (ReelCounter Parity) */}
          <View style={[styles.delayConfigBox, { marginTop: 12 }]}>
            <Text style={styles.delayTitle}>Daily Reel Target Cap</Text>
            <Text style={styles.delaySub}>
              Sets daily boundary before critical dopamine shield fracture warning.
            </Text>
            <View style={styles.delayTabs}>
              {[
                { label: '15 Reels', count: 15 },
                { label: '30 Reels', count: 30 },
                { label: '45 Reels', count: 45 },
                { label: '60 Reels', count: 60 },
              ].map((opt) => {
                const isSelected = reelDailyBudget === opt.count;
                return (
                  <TouchableOpacity
                    key={opt.count}
                    style={[styles.delayTab, isSelected && styles.delayTabActive]}
                    onPress={() => handleSelectReelBudget(opt.count)}
                  >
                    <Text style={[styles.delayTabText, isSelected && styles.delayTabTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Feature 3: Periodic Break Nudge Alerts */}
          <View style={[styles.delayConfigBox, { marginTop: 12 }]}>
            <Text style={styles.delayTitle}>Periodic Break Nudges</Text>
            <Text style={styles.delaySub}>
              Tactile pulse & mindful reality check after continuous scrolling.
            </Text>
            <View style={styles.delayTabs}>
              {[
                { label: '3m (12 reels)', mins: 3 },
                { label: '5m (20 reels)', mins: 5 },
                { label: '10m (40 reels)', mins: 10 },
              ].map((opt) => {
                const isSelected = hudAlertMins === opt.mins;
                return (
                  <TouchableOpacity
                    key={opt.mins}
                    style={[styles.delayTab, isSelected && styles.delayTabActive]}
                    onPress={() => handleSelectHudAlertMins(opt.mins)}
                  >
                    <Text style={[styles.delayTabText, isSelected && styles.delayTabTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Accessibility Service Status & 2-Second Filter Intimation */}
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0, marginTop: 8 }]}
            onPress={() => blockerEngine.openAccessibilitySettings()}
          >
            <MaterialCommunityIcons
              name={accessibilityRunning ? 'check-decagram' : 'gesture-swipe-vertical'}
              size={22}
              color={accessibilityRunning ? NinjaPalette.emerald : '#38BDF8'}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>
                {accessibilityRunning
                  ? 'Precision Reel Guardian Active (2s Threshold)'
                  : 'Enable Exact Scroll Counter'}
              </Text>
              <Text style={styles.actionRowSub}>
                {accessibilityRunning
                  ? 'Filtering accidental flings with 2-second dwell threshold across Reels, Shorts & TikTok'
                  : 'Tap to grant Accessibility for exact reel count & surgical auto-blocking.'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Safe Internet Guardian & System-Wide DNS Protection */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>SAFE INTERNET & CONTENT FILTERING</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/guardian' as any)}
          >
            <MaterialCommunityIcons name="shield-check" size={22} color={NinjaPalette.emerald} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Safe Internet Guardian</Text>
              <Text style={styles.actionRowSub}>
                System-wide DNS firewall, CleanBrowsing adult filter & malware defense
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Emergency & Reset Controls */}
        {/* Cloud Sync & Production Connect */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>CLOUD SYNC & WEB CONNECT</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/settings/cloud-sync' as any)}
          >
            <MaterialCommunityIcons name="cloud-sync" size={22} color={NinjaPalette.emerald} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Cloud Sync & Server Connect</Text>
              <Text style={styles.actionRowSub}>
                Configure production REST API URL & manage web account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>DISCIPLINE ACTIONS</Text>

          <TouchableOpacity style={styles.actionRow} onPress={handleEmergencyRelock}>
            <MaterialCommunityIcons name="lock-reset" size={22} color={NinjaPalette.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Terminate All Temporary Passes</Text>
              <Text style={styles.actionRowSub}>Immediately re-blocks all sealed apps</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.replace('/onboarding' as any)}
          >
            <MaterialCommunityIcons name="compass" size={22} color={NinjaPalette.cyan} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionRowTitle}>Replay Onboarding</Text>
              <Text style={styles.actionRowSub}>Re-run setup & permission assistant</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About NeuroNinja */}
        <View style={styles.aboutBox}>
          <Text style={styles.aboutTitle}>NeuroNinja v1.0.0</Text>
          <Text style={styles.aboutText}>
            Cross-platform digital discipline engine powered by Expo SDK 58 & Screen Time / UsageStats APIs.
          </Text>
        </View>
      </ScrollView>

      {/* Google Play Prominent Disclosure Modal */}
      <ProminentDisclosureModal
        visible={showDisclosureModal}
        onAgree={() => {
          setShowDisclosureModal(false);
          blockerEngine.openAccessibilitySettings();
        }}
        onDecline={() => setShowDisclosureModal(false)}
      />

      {/* OEM Device Background Protection Guide Modal */}
      <OemBackgroundGuideModal
        visible={showOemGuideModal}
        onClose={() => setShowOemGuideModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  badge: {
    color: NinjaPalette.emerald,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginBottom: 20,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  subHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  lockTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  lockTypeCard: {
    width: '48.5%',
    backgroundColor: '#070D19',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    alignItems: 'flex-start',
    position: 'relative',
  },
  lockTypeCardActive: {
    borderColor: NinjaPalette.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  lockTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
    marginTop: 8,
  },
  lockTypeLabelActive: {
    color: NinjaPalette.emerald,
  },
  lockTypeDesc: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
  },
  lockTypeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: NinjaPalette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configSubCard: {
    backgroundColor: '#070D19',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 14,
  },
  configSubCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  configSubCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  configSubCardSub: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
  },
  configActionBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: NinjaPalette.emerald,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  configActionBtnText: {
    color: NinjaPalette.emerald,
    fontSize: 12,
    fontWeight: '700',
  },
  subCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  subRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: NinjaPalette.textPrimary,
  },
  subRowSub: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: NinjaPalette.emerald,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: NinjaPalette.emerald,
    fontSize: 12,
    fontWeight: 'bold',
  },
  recheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 6,
  },
  recheckBtnText: {
    color: NinjaPalette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  delayConfigBox: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  delayTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  delaySub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  delayTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  delayTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  delayTabActive: {
    backgroundColor: '#1E293B',
  },
  delayTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  delayTabTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  actionRowSub: {
    fontSize: 12,
    color: NinjaPalette.textMuted,
    marginTop: 2,
  },
  aboutBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  aboutTitle: {
    color: NinjaPalette.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aboutText: {
    color: NinjaPalette.textMuted,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 16,
  },
  oemGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  oemGuideBtnText: {
    color: '#60A5FA',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
