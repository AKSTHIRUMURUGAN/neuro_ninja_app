import React, { useState } from 'react';
import { View, Text, StyleSheet, BackHandler, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import { useNinja } from '../context/ninja-context';
import { NinjaPalette } from '../constants/theme';
import { BreathworkGate } from '../components/challenges/breathwork-gate';
import { MathChallenge } from '../components/challenges/math-challenge';
import { IntentGate } from '../components/challenges/intent-gate';
import { ScramblePin } from '../components/scramble-pin';
import { PatternLock } from '../components/pattern-lock';
import { CamouflageDecoy } from '../components/camouflage-decoy';
import { SmartReplacement } from '../components/smart-replacement';
import { ReelsShortsGuard } from '../components/reels-shorts-guard';
import { QRMission } from '../components/alarms/qr-mission';
import { logIntruderAttempt } from '../services/intruder-audit';
import { getTodayKey } from '../services/storage';

export default function BlockedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    app?: string;
    package?: string;
    reason?: 'opened' | 'expired';
  }>();

  const appName = params.app ? decodeURIComponent(params.app) : 'This App';
  const pkgName = params.package || 'unknown.app';
  const reason = params.reason ?? 'opened';

  const { settings, grantUnlock } = useNinja();
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

  const [activeUnlockTab, setActiveUnlockTab] = useState<'gate' | 'reels' | 'replace' | 'pin' | 'pattern' | 'qr'>(
    isShortsFeed
      ? 'reels'
      : settings.lockType === 'scramble_pin'
      ? 'pin'
      : 'gate'
  );

  const handleChallengeSuccess = async (minutes?: number) => {
    await grantUnlock(minutes ?? settings.unlockDurationMinutes ?? 10);
    setUnlockedSuccess(true);
  };

  const handlePinFailure = (attempts: number) => {
    logIntruderAttempt(pkgName, appName, attempts, 'pin');
  };

  const handleExit = () => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  // If decoy camouflage is enabled and user hasn't triggered secret bypass
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
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name={unlockedSuccess ? 'shield-check' : 'shield-lock'}
              size={36}
              color={unlockedSuccess ? NinjaPalette.emerald : NinjaPalette.amber}
            />
          </View>
          <Text style={styles.appName}>{appName}</Text>
          <Text style={styles.interceptNotice}>
            {reason === 'expired'
              ? 'Focus pass expired. Earn extra time or enter Master PIN.'
              : 'Shield intercept active. Complete mindful friction or authenticate.'}
          </Text>

          {/* Unlock Mode Selector (Mindful Gate vs Master PIN) */}
          {!unlockedSuccess && (
            <View style={styles.modeTabs}>
              {isShortsFeed && (
                <TouchableOpacity
                  style={[styles.modeTab, activeUnlockTab === 'reels' && styles.modeTabActive]}
                  onPress={() => setActiveUnlockTab('reels')}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={14}
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
                style={[styles.modeTab, activeUnlockTab === 'gate' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('gate')}
              >
                <Ionicons
                  name="leaf-outline"
                  size={14}
                  color={activeUnlockTab === 'gate' ? '#00E699' : '#64748B'}
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

              <TouchableOpacity
                style={[styles.modeTab, activeUnlockTab === 'replace' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('replace')}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={activeUnlockTab === 'replace' ? '#00E699' : '#64748B'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    activeUnlockTab === 'replace' && styles.modeTabTextActive,
                  ]}
                >
                  Replace
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, activeUnlockTab === 'pin' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('pin')}
              >
                <Ionicons
                  name="keypad-outline"
                  size={14}
                  color={activeUnlockTab === 'pin' ? '#00E699' : '#64748B'}
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

              <TouchableOpacity
                style={[styles.modeTab, activeUnlockTab === 'pattern' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('pattern')}
              >
                <Ionicons
                  name="finger-print-outline"
                  size={14}
                  color={activeUnlockTab === 'pattern' ? '#00E699' : '#64748B'}
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
                style={[styles.modeTab, activeUnlockTab === 'qr' && styles.modeTabActive]}
                onPress={() => setActiveUnlockTab('qr')}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={14}
                  color={activeUnlockTab === 'qr' ? '#00E699' : '#64748B'}
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
            </View>
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
                onPress={() => {
                  if (Platform.OS === 'android') {
                    BackHandler.exitApp();
                  } else {
                    router.replace('/(tabs)' as any);
                  }
                }}
              >
                <Text style={styles.actionBtnText}>Enter {appName}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.challengeWrapper}>
            {activeUnlockTab === 'reels' && (
              <ReelsShortsGuard
                appName={appName}
                onGrantPass={(mins) => void handleChallengeSuccess(mins)}
                onExit={handleExit}
              />
            )}
            {activeUnlockTab === 'replace' && (
              <SmartReplacement
                appName={appName}
                onGrantPass={(mins) => handleChallengeSuccess(mins)}
                onExit={handleExit}
              />
            )}
            {activeUnlockTab === 'pin' && (
              <ScramblePin
                correctPin={settings.masterPin || '1234'}
                onSuccess={handleChallengeSuccess}
                onFailure={handlePinFailure}
                onCancel={handleExit}
                allowBiometrics={settings.biometricsEnabled}
              />
            )}
            {activeUnlockTab === 'pattern' && (
              <PatternLock
                onSuccess={handleChallengeSuccess}
                onFailure={() => handlePinFailure(1)}
                onCancel={handleExit}
              />
            )}
            {activeUnlockTab === 'qr' && (
              <QRMission
                onCompleted={() => void handleChallengeSuccess()}
              />
            )}
            {activeUnlockTab === 'gate' && (
              <>
                {settings.activeChallenge === 'breathwork' && (
                  <BreathworkGate
                    strictMode={settings.strictMode}
                    escalationTier={escalationTier}
                    onSuccess={handleChallengeSuccess}
                    onCancel={handleExit}
                  />
                )}
                {settings.activeChallenge === 'math' && (
                  <MathChallenge
                    strictMode={settings.strictMode}
                    onSuccess={handleChallengeSuccess}
                    onCancel={handleExit}
                  />
                )}
                {settings.activeChallenge === 'intent' && (
                  <IntentGate
                    strictMode={settings.strictMode}
                    onSuccess={handleChallengeSuccess}
                    onCancel={handleExit}
                  />
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
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 14,
    width: '100%',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 4,
  },
  interceptNotice: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 12,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  modeTabActive: {
    backgroundColor: '#1E293B',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#00E699',
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
});
