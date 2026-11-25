import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  BackHandler,
  Platform,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';

import { useNinja } from '../context/ninja-context';
import { NinjaPalette } from '../constants/theme';
import { AppIcon } from '../components/ui/app-icon';
import { TypingMission } from '../components/alarms/typing-mission';
import { BreathworkGate } from '../components/challenges/breathwork-gate';
import { MathChallenge } from '../components/challenges/math-challenge';
import { IntentGate } from '../components/challenges/intent-gate';
import { ScramblePin } from '../components/scramble-pin';
import { PatternLock } from '../components/pattern-lock';
import { CamouflageDecoy } from '../components/camouflage-decoy';
import { SmartReplacement } from '../components/smart-replacement';
import { ReelsShortsGuard } from '../components/reels-shorts-guard';
import { villainEngine } from '../services/villains/villain-engine';
import { QRMission } from '../components/alarms/qr-mission';
import { ChessTactics } from '../components/dojo/chess-tactics';
import { MatiksSprint } from '../components/dojo/matiks-sprint';
import { SchulteGrid } from '../components/dojo/schulte-grid';
import { logIntruderAttempt } from '../services/intruder-audit';
import { getTodayKey } from '../services/storage';
import { launchApplication } from '../services/launcher/launcher-service';
import { blockerEngine } from '../services/blocker/blocker-engine';

export type UnlockTab = 'pattern' | 'pin' | 'biometric' | 'gate' | 'reels' | 'replace' | 'qr';

export default function BlockedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    app?: string;
    package?: string;
    reason?: 'opened' | 'expired' | 'quota' | 'curfew' | 'session_limit';
  }>();

  const appName = params.app ? decodeURIComponent(params.app) : 'This App';
  const pkgName = params.package || 'unknown.app';
  const reason = params.reason ?? 'opened';

  const { settings, grantUnlock } = useNinja();
  const policy = settings.appQuotaPolicies[pkgName];
  const hasAppSpecificSecurity = !!(policy?.hasCustomSecurity && (policy.customPin || policy.customPattern));
  const effectivePin = (policy?.hasCustomSecurity && policy.customPin) ? policy.customPin : (settings.masterPin || '1234');
  const effectivePattern = (policy?.hasCustomSecurity && policy.customPattern && policy.customPattern.length >= 3)
    ? policy.customPattern
    : (settings.masterPattern && settings.masterPattern.length >= 4 ? settings.masterPattern : [0, 1, 2, 5, 8]);

  const todayKey = getTodayKey();
  const todayIntercepts = settings.dailyStats[todayKey]?.intercepts ?? 0;
  const escalationTier: 1 | 2 | 3 = todayIntercepts >= 8 ? 3 : todayIntercepts >= 4 ? 2 : 1;
  const [unlockedSuccess, setUnlockedSuccess] = useState(false);
  const [isDecoyBypassed, setIsDecoyBypassed] = useState(!settings.decoyEnabled);

  const isShortsFeed =
    appName.toLowerCase().includes('instagram') ||
    appName.toLowerCase().includes('youtube') ||
    appName.toLowerCase().includes('tiktok') ||
    appName.toLowerCase().includes('snapchat') ||
    pkgName.toLowerCase().includes('instagram') ||
    pkgName.toLowerCase().includes('tiktok');

  const isDoomApp =
    policy?.protectionMode === 'doom_barrier' ||
    (!policy?.protectionMode && (
      isShortsFeed ||
      appName.toLowerCase().includes('reddit') ||
      appName.toLowerCase().includes('twitter') ||
      appName.toLowerCase().includes('facebook') ||
      pkgName.toLowerCase().includes('reddit') ||
      pkgName.toLowerCase().includes('twitter')
    ));

  const isVaultApp = policy?.protectionMode === 'locker_vault';

  // Cooldown delay for Doom apps
  const initialWaitSeconds = isDoomApp ? (policy?.doomWaitSeconds ?? 15) : 0;
  const [doomWaitRemaining, setDoomWaitRemaining] = useState<number>(initialWaitSeconds);

  useEffect(() => {
    if (doomWaitRemaining <= 0) return;
    const interval = setInterval(() => {
      setDoomWaitRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [doomWaitRemaining]);

  // Dedicated passcode state
  const [passcodeAttempt, setPasscodeAttempt] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Determine initial unlock view based on user settings and app-specific security
  const determineInitialTab = (): UnlockTab => {
    if (policy?.hasCustomSecurity) {
      if (policy.customPattern && policy.customPattern.length >= 3) return 'pattern';
      if (policy.customPin) return 'pin';
    }
    if (settings.lockType === 'pattern') return 'pattern';
    if (settings.lockType === 'pin' || settings.lockType === 'scramble_pin') return 'pin';
    if (settings.lockType === 'biometric') return 'biometric';
    if (settings.lockType === 'gate') {
      return isShortsFeed ? 'reels' : 'gate';
    }
    // Default fallback
    return 'pattern';
  };

  const [activeUnlockTab, setActiveUnlockTab] = useState<UnlockTab>(determineInitialTab);

  // Biometric animation pulse
  const [bioPulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bioPulse, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(bioPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bioPulse]);

  const handleChallengeSuccess = useCallback(
    async (minutes?: number) => {
      const mins = minutes ?? settings.unlockDurationMinutes ?? 10;
      await grantUnlock(mins, pkgName);
      setUnlockedSuccess(true);
    },
    [grantUnlock, pkgName, settings.unlockDurationMinutes]
  );

  const handlePinFailure = useCallback(
    (attempts: number) => {
      logIntruderAttempt(pkgName, appName, attempts, activeUnlockTab === 'pattern' ? 'pattern' : 'pin');
    },
    [pkgName, appName, activeUnlockTab]
  );

  const handleExit = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/focus/ghost-launcher' as any);
    }
  }, [router]);

  const handleEnterApp = useCallback(async () => {
    const mins = settings.unlockDurationMinutes ?? 10;
    await grantUnlock(mins, pkgName);

    // Villain counterattack when breaching a sealed app!
    void villainEngine.takeCounterDamage(30, appName).catch(() => {});

    // Ensure on-demand accessibility is active if entering YouTube / Instagram
    const shortVideoPackages = [
      'com.instagram.android',
      'com.google.android.youtube',
      'com.zhiliaoapp.musically',
      'com.snapchat.android',
    ];
    if (pkgName && shortVideoPackages.some((p) => pkgName.includes(p))) {
      blockerEngine.setAccessibilityServiceEnabled(true);
    }

    if (Platform.OS === 'android' && pkgName && pkgName !== 'unknown.app') {
      launchApplication(pkgName);
      router.replace('/focus/ghost-launcher' as any);
    } else {
      handleExit();
    }
  }, [grantUnlock, settings.unlockDurationMinutes, pkgName, appName, handleExit, router]);

  // Biometric authentication trigger
  const triggerBiometrics = useCallback(async () => {
    // If it's a doom app and biometrics bypass is blocked, abort!
    if (isDoomApp && !policy?.allowBiometricBypass) {
      return false;
    }
    // If it's a vault app and biometrics are disabled, abort!
    if (isVaultApp && policy?.allowBiometrics === false) {
      return false;
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return false;

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: `Unlock ${appName}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
      });

      if (res.success) {
        await handleChallengeSuccess();
        return true;
      }
    } catch {
      // Prompt cancelled or failed
    }
    return false;
  }, [appName, handleChallengeSuccess, isDoomApp, isVaultApp, policy]);

  // Auto-prompt biometrics on initial mount if enabled as default or biometric tab
  const hasAutoPromptedBio = useRef(false);
  useEffect(() => {
    if (
      isDecoyBypassed &&
      !unlockedSuccess &&
      !hasAutoPromptedBio.current &&
      (settings.lockType === 'biometric' || settings.biometricsEnabled)
    ) {
      hasAutoPromptedBio.current = true;
      const timer = setTimeout(() => {
        void triggerBiometrics();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isDecoyBypassed, unlockedSuccess, settings.biometricsEnabled, settings.lockType, triggerBiometrics]);

  // Hardware Back press safety
  useEffect(() => {
    const onBackPress = () => {
      handleExit();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleExit]);

  // Camouflage fake crash if enabled
  if (!isDecoyBypassed) {
    return (
      <CamouflageDecoy
        appName={appName}
        onBypassSecret={() => setIsDecoyBypassed(true)}
        onExit={handleExit}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header App Info */}
        <View style={styles.header}>
          <AppIcon
            packageName={pkgName}
            appName={appName}
            size={64}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.appName}>{appName}</Text>

          <View style={styles.headerBadgeRow}>
            {isDoomApp ? (
              <View style={styles.doomHeaderBadge}>
                <MaterialCommunityIcons name="fire" size={13} color="#EF4444" />
                <Text style={styles.doomHeaderBadgeText}>DOOM BARRIER ACTIVE</Text>
              </View>
            ) : isVaultApp ? (
              <View style={styles.vaultHeaderBadge}>
                <MaterialCommunityIcons name="shield-lock" size={13} color="#00E699" />
                <Text style={styles.vaultHeaderBadgeText}>PRIVACY VAULT</Text>
              </View>
            ) : (
              <View style={styles.focusHeaderBadge}>
                <MaterialCommunityIcons name="shield-outline" size={13} color="#38BDF8" />
                <Text style={styles.focusHeaderBadgeText}>FOCUS SHIELD</Text>
              </View>
            )}
          </View>

          <Text style={styles.interceptNotice}>
            {isDoomApp
              ? 'Subconscious dopamine urge intercepted. Complete the mindful friction gate to earn access.'
              : isVaultApp
              ? `Confidential app protected. Verify security credentials to unlock ${appName}.`
              : reason === 'quota'
              ? 'Daily quota exhausted. Complete a Dojo Gate to earn a 5m bonus.'
              : reason === 'curfew'
              ? 'Bedtime curfew active. Scheduled rest period is in effect.'
              : reason === 'session_limit'
              ? 'Continuous session cap reached. Take a 5-minute mindful breathing break.'
              : reason === 'expired'
              ? 'Focus pass expired. Authenticate or solve friction gate to continue.'
              : 'App sealed under shield discipline. Verify identity to unlock.'}
          </Text>

          {/* Interactive Multi-Method Switcher Bar: ONLY FOR GENERIC UNCLASSIFIED APPS */}
          {!unlockedSuccess && !isDoomApp && !isVaultApp && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modeTabs}
            >
              <TouchableOpacity
                style={[styles.modeTab, activeUnlockTab === 'pattern' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('pattern')}
              >
                <MaterialCommunityIcons
                  name="gesture-tap"
                  size={15}
                  color={activeUnlockTab === 'pattern' ? NinjaPalette.emerald : '#64748B'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    activeUnlockTab === 'pattern' && styles.modeTabTextActive,
                  ]}
                >
                  Pattern
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, activeUnlockTab === 'pin' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('pin')}
              >
                <Ionicons
                  name="keypad-outline"
                  size={15}
                  color={activeUnlockTab === 'pin' ? NinjaPalette.emerald : '#64748B'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    activeUnlockTab === 'pin' && styles.modeTabTextActive,
                  ]}
                >
                  PIN
                </Text>
              </TouchableOpacity>

              {settings.biometricsEnabled && (
                <TouchableOpacity
                  style={[styles.modeTab, activeUnlockTab === 'biometric' && styles.modeTabActive]}
                  onPress={() => {
                    setActiveUnlockTab('biometric');
                    void triggerBiometrics();
                  }}
                >
                  <Ionicons
                    name="finger-print"
                    size={15}
                    color={activeUnlockTab === 'biometric' ? '#34D399' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      activeUnlockTab === 'biometric' && { color: '#34D399', fontWeight: 'bold' },
                    ]}
                  >
                    Fingerprint
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modeTab, activeUnlockTab === 'gate' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('gate')}
              >
                <Ionicons
                  name="leaf-outline"
                  size={15}
                  color={activeUnlockTab === 'gate' ? NinjaPalette.emerald : '#64748B'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    activeUnlockTab === 'gate' && styles.modeTabTextActive,
                  ]}
                >
                  Mindful Gate
                </Text>
              </TouchableOpacity>

              {isShortsFeed && (
                <TouchableOpacity
                  style={[styles.modeTab, activeUnlockTab === 'reels' && styles.modeTabActive]}
                  onPress={() => setActiveUnlockTab('reels')}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={15}
                    color={activeUnlockTab === 'reels' ? '#EF4444' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      activeUnlockTab === 'reels' && { color: '#EF4444', fontWeight: 'bold' },
                    ]}
                  >
                    Shorts Guard
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modeTab, activeUnlockTab === 'replace' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('replace')}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={15}
                  color={activeUnlockTab === 'replace' ? NinjaPalette.emerald : '#64748B'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    activeUnlockTab === 'replace' && styles.modeTabTextActive,
                  ]}
                >
                  Alternative
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, activeUnlockTab === 'qr' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('qr')}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={15}
                  color={activeUnlockTab === 'qr' ? NinjaPalette.emerald : '#64748B'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    activeUnlockTab === 'qr' && styles.modeTabTextActive,
                  ]}
                >
                  Room QR
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Content Body */}
        {unlockedSuccess ? (
          <View style={styles.successCard}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={64}
              color={NinjaPalette.emerald}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.successTitle}>Focus Pass Granted</Text>
            <Text style={styles.successSubtitle}>
              You have {settings.unlockDurationMinutes} minutes of mindful screen time
              budget. It pauses whenever you exit {appName}.
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => void handleEnterApp()}
              >
                <Text style={styles.actionBtnText}>Enter {appName}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.challengeWrapper}>
            {isDoomApp ? (
              /* DOOM APP BARRIER: NO LAZY PIN/BIOMETRIC SHORTCUTS */
              <View style={styles.doomCardWrapper}>
                {doomWaitRemaining > 0 ? (
                  <View style={styles.cooldownBox}>
                    <View style={styles.cooldownRing}>
                      <Text style={styles.cooldownNumber}>{doomWaitRemaining}s</Text>
                      <Text style={styles.cooldownSub}>Take a breath</Text>
                    </View>
                    <Text style={styles.cooldownHeading}>Urge Pause Cooldown</Text>
                    <Text style={styles.cooldownDesc}>
                      Take {initialWaitSeconds} seconds to reflect: Are you opening {appName} for a conscious reason, or subconscious boredom?
                    </Text>
                    <TouchableOpacity style={styles.leaveAppBtnPrimary} onPress={handleExit}>
                      <Ionicons name="arrow-back" size={18} color="#070A11" />
                      <Text style={styles.leaveAppBtnPrimaryText}>Leave {appName} (Preserve Streak)</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.frictionTaskBox}>
                    {policy?.doomFrictionType === 'oath_type' ? (
                      <TypingMission
                        phrase={
                          policy.doomOathText ||
                          'I am consciously breaking my focus session for short-term dopamine.'
                        }
                        onCompleted={() => void handleChallengeSuccess()}
                      />
                    ) : policy?.doomFrictionType === 'math_sprint' ? (
                      <MatiksSprint
                        durationSeconds={30}
                        onCompleted={() => void handleChallengeSuccess()}
                      />
                    ) : policy?.doomFrictionType === 'schulte_grid' ? (
                      <SchulteGrid
                        gridSize={4}
                        onCompleted={() => void handleChallengeSuccess()}
                      />
                    ) : policy?.doomFrictionType === 'custom_pass' ? (
                      <View style={styles.passcodeAuthBox}>
                        <MaterialCommunityIcons
                          name="lock-question"
                          size={44}
                          color="#EF4444"
                          style={{ marginBottom: 10 }}
                        />
                        <Text style={styles.passcodeAuthTitle}>Strict Passcode Required</Text>
                        <Text style={styles.passcodeAuthDesc}>
                          Enter the unique secret passphrase designated for {appName}. Master PIN cannot bypass this.
                        </Text>
                        <TextInput
                          style={styles.passcodeAuthInput}
                          placeholder="ENTER PASSPHRASE..."
                          placeholderTextColor="#64748B"
                          value={passcodeAttempt}
                          onChangeText={(txt) => {
                            setPasscodeAttempt(txt);
                            setPasscodeError('');
                          }}
                          autoCapitalize="characters"
                        />
                        {passcodeError ? (
                          <Text style={styles.passcodeErrorText}>{passcodeError}</Text>
                        ) : null}
                        <TouchableOpacity
                          style={styles.verifyPasscodeBtn}
                          onPress={() => {
                            if (
                              passcodeAttempt.trim().toUpperCase() ===
                              (policy?.customPasscode || '').trim().toUpperCase()
                            ) {
                              void Haptics.notificationAsync(
                                Haptics.NotificationFeedbackType.Success
                              );
                              void handleChallengeSuccess();
                            } else {
                              void Haptics.notificationAsync(
                                Haptics.NotificationFeedbackType.Error
                              );
                              setPasscodeError('Incorrect passphrase. Master PIN not accepted.');
                            }
                          }}
                        >
                          <Text style={styles.verifyPasscodeBtnText}>Verify Passphrase</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <BreathworkGate
                        strictMode={settings.strictMode}
                        escalationTier={escalationTier}
                        onSuccess={() => void handleChallengeSuccess()}
                        onCancel={handleExit}
                      />
                    )}

                    <TouchableOpacity style={styles.leaveAppBtnSecondary} onPress={handleExit}>
                      <Ionicons name="arrow-back" size={16} color="#94A3B8" />
                      <Text style={styles.leaveAppBtnSecondaryText}>
                        Leave App & Return to Focus
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : isVaultApp ? (
              /* PRIVACY VAULT MODE: FOCUSED ON INTRUDER SECURITY */
              <View style={styles.vaultCardWrapper}>
                {policy?.customPin ? (
                  <ScramblePin
                    correctPin={policy.customPin}
                    isScramble={settings.scramblePinKeypad ?? false}
                    allowBiometrics={policy.allowBiometrics ?? settings.biometricsEnabled}
                    title={`${appName} Vault PIN`}
                    subtitle={`Enter unique security PIN for ${appName}`}
                    onSuccess={() => void handleChallengeSuccess()}
                    onFailure={handlePinFailure}
                    onCancel={handleExit}
                  />
                ) : policy?.customPattern && policy.customPattern.length >= 3 ? (
                  <PatternLock
                    correctPattern={policy.customPattern}
                    patternVisible={settings.patternVisible ?? true}
                    patternHaptics={settings.patternHaptics ?? true}
                    title={`${appName} Vault Pattern`}
                    subtitle={`Draw unique pattern for ${appName}`}
                    onSuccess={() => void handleChallengeSuccess()}
                    onFailure={(attempts) => handlePinFailure(attempts)}
                    onCancel={handleExit}
                  />
                ) : settings.lockType === 'pattern' ? (
                  <PatternLock
                    correctPattern={effectivePattern}
                    patternVisible={settings.patternVisible ?? true}
                    patternHaptics={settings.patternHaptics ?? true}
                    title={`${appName} Protected`}
                    subtitle="Draw pattern to unlock"
                    onSuccess={() => void handleChallengeSuccess()}
                    onFailure={(attempts) => handlePinFailure(attempts)}
                    onCancel={handleExit}
                  />
                ) : (
                  <ScramblePin
                    correctPin={effectivePin}
                    isScramble={settings.scramblePinKeypad ?? false}
                    allowBiometrics={policy?.allowBiometrics ?? settings.biometricsEnabled}
                    title={`${appName} Protected`}
                    subtitle="Enter PIN to unlock"
                    onSuccess={() => void handleChallengeSuccess()}
                    onFailure={handlePinFailure}
                    onCancel={handleExit}
                  />
                )}

                {policy?.allowBiometrics !== false && settings.biometricsEnabled && (
                  <TouchableOpacity
                    style={styles.vaultBioScanBtn}
                    onPress={() => void triggerBiometrics()}
                  >
                    <Ionicons name="finger-print" size={20} color="#00E699" />
                    <Text style={styles.vaultBioScanBtnText}>Authenticate with Fingerprint</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              /* GENERIC UNCLASSIFIED APP: STANDARD TABS */
              <>
            {/* Pattern Lock Screen */}
            {activeUnlockTab === 'pattern' && (
              <PatternLock
                correctPattern={effectivePattern}
                patternVisible={settings.patternVisible ?? true}
                patternHaptics={settings.patternHaptics ?? true}
                title={hasAppSpecificSecurity ? `${appName} Custom Pattern` : 'Draw Unlock Pattern'}
                subtitle={
                  hasAppSpecificSecurity
                    ? `Draw unique pattern for ${appName}`
                    : `Connect the dots to unlock ${appName}`
                }
                onSuccess={() => void handleChallengeSuccess()}
                onFailure={(attempts) => handlePinFailure(attempts)}
                onCancel={handleExit}
              />
            )}

            {/* Scramble / Standard PIN Lock Screen */}
            {activeUnlockTab === 'pin' && (
              <ScramblePin
                correctPin={effectivePin}
                isScramble={settings.scramblePinKeypad ?? false}
                allowBiometrics={settings.biometricsEnabled}
                title={hasAppSpecificSecurity ? `${appName} Custom PIN` : 'Master Shield PIN'}
                subtitle={
                  hasAppSpecificSecurity
                    ? `Enter unique PIN for ${appName}`
                    : settings.scramblePinKeypad
                    ? 'Scramble keypad active — randomized numbers'
                    : 'Enter 4-digit code to unlock'
                }
                onSuccess={() => void handleChallengeSuccess()}
                onFailure={handlePinFailure}
                onCancel={handleExit}
              />
            )}

            {/* Dedicated Biometric Lock Screen */}
            {activeUnlockTab === 'biometric' && (
              <View style={styles.bioCard}>
                <Animated.View
                  style={[
                    styles.bioSensorCircle,
                    { transform: [{ scale: bioPulse }] },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.bioTouchBtn}
                    onPress={() => void triggerBiometrics()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="finger-print" size={72} color={NinjaPalette.emerald} />
                  </TouchableOpacity>
                </Animated.View>

                <Text style={styles.bioTitle}>Touch Fingerprint Sensor</Text>
                <Text style={styles.bioSub}>
                  Place your finger on your device sensor to authenticate for {appName}
                </Text>

                <TouchableOpacity
                  style={styles.bioScanBtn}
                  onPress={() => void triggerBiometrics()}
                >
                  <MaterialCommunityIcons name="cellphone-wireless" size={20} color="#070A11" />
                  <Text style={styles.bioScanBtnText}>Scan Fingerprint</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bioFallbackLink}
                  onPress={() => setActiveUnlockTab('pattern')}
                >
                  <Text style={styles.bioFallbackText}>Or Draw Pattern</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Reels / Shorts Guard */}
            {activeUnlockTab === 'reels' && (
              <ReelsShortsGuard
                appName={appName}
                onGrantPass={(mins) => void handleChallengeSuccess(mins)}
                onExit={handleExit}
              />
            )}

            {/* Smart Replacement */}
            {activeUnlockTab === 'replace' && (
              <SmartReplacement
                appName={appName}
                onGrantPass={(mins) => void handleChallengeSuccess(mins)}
                onExit={handleExit}
              />
            )}

            {/* Physical Room QR */}
            {activeUnlockTab === 'qr' && (
              <QRMission
                onCompleted={() => void handleChallengeSuccess()}
              />
            )}

            {/* Mindful Friction Gates */}
            {activeUnlockTab === 'gate' && (
              <>
                {settings.activeChallenge === 'breathwork' && (
                  <BreathworkGate
                    strictMode={settings.strictMode}
                    escalationTier={escalationTier}
                    onSuccess={() => void handleChallengeSuccess()}
                    onCancel={handleExit}
                  />
                )}
                {settings.activeChallenge === 'math' && (
                  <MathChallenge
                    strictMode={settings.strictMode}
                    onSuccess={() => void handleChallengeSuccess()}
                    onCancel={handleExit}
                  />
                )}
                {settings.activeChallenge === 'intent' && (
                  <IntentGate
                    strictMode={settings.strictMode}
                    onSuccess={() => void handleChallengeSuccess()}
                    onCancel={handleExit}
                  />
                )}
                {settings.activeChallenge === 'chess' && (
                  <ChessTactics
                    difficulty="easy"
                    targetSolved={1}
                    onCompleted={() => void handleChallengeSuccess()}
                  />
                )}
                {settings.activeChallenge === 'matiks' && (
                  <MatiksSprint
                    durationSeconds={30}
                    onCompleted={() => void handleChallengeSuccess()}
                  />
                )}
                {settings.activeChallenge === 'schulte' && (
                  <SchulteGrid
                    gridSize={4}
                    onCompleted={() => void handleChallengeSuccess()}
                  />
                )}
              </>
            )}
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 4,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  doomHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  doomHeaderBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  vaultHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.35)',
  },
  vaultHeaderBadgeText: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  focusHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  focusHeaderBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  interceptNotice: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    maxWidth: 310,
    marginBottom: 10,
    lineHeight: 16,
  },
  modeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 6,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modeTabActive: {
    backgroundColor: '#1E293B',
    borderColor: NinjaPalette.emerald,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: NinjaPalette.emerald,
    fontWeight: '700',
  },
  challengeWrapper: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  successCard: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  actions: {
    width: '100%',
  },
  actionBtnPrimary: {
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#070A11',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Dedicated Biometric Card
  bioCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  bioSensorCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  bioTouchBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 6,
  },
  bioSub: {
    fontSize: 13,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: 24,
  },
  bioScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginBottom: 16,
  },
  bioScanBtnText: {
    color: '#070A11',
    fontSize: 15,
    fontWeight: 'bold',
  },
  bioFallbackLink: {
    paddingVertical: 8,
  },
  bioFallbackText: {
    color: NinjaPalette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  doomCardWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cooldownBox: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  cooldownRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 16,
  },
  cooldownNumber: {
    color: '#EF4444',
    fontSize: 28,
    fontWeight: 'bold',
  },
  cooldownSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  cooldownHeading: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cooldownDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  leaveAppBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
  },
  leaveAppBtnPrimaryText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: 'bold',
  },
  frictionTaskBox: {
    width: '100%',
    alignItems: 'center',
  },
  leaveAppBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
  },
  leaveAppBtnSecondaryText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  passcodeAuthBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#0F172A',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  passcodeAuthTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  passcodeAuthDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  passcodeAuthInput: {
    width: '100%',
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },
  passcodeErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  verifyPasscodeBtn: {
    width: '100%',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyPasscodeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  vaultCardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  vaultBioScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
  },
  vaultBioScanBtnText: {
    color: '#00E699',
    fontSize: 13,
    fontWeight: '700',
  },
});
