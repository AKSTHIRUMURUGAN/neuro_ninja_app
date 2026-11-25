import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useNinja } from '../context/ninja-context';
import { NinjaPalette } from '../constants/theme';
import { blockerEngine } from '../services/blocker/blocker-engine';
import { ProminentDisclosureModal } from '../components/ProminentDisclosureModal';

export default function OnboardingScreen() {
  const router = useRouter();
  const { permissions, refreshPermissions, completeOnboarding } = useNinja();
  const [checking, setChecking] = useState(false);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);

  // Auto-refresh permissions when returning from system settings
  useEffect(() => {
    refreshPermissions();

    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const updated = await refreshPermissions();
        if (updated.allGranted) {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
      }
    });

    return () => sub.remove();
  }, [refreshPermissions]);

  const isIOS = Platform.OS === 'ios';
  const androidDetails = permissions?.details?.platform === 'android' ? permissions.details : null;

  const overlayGranted = androidDetails?.overlay ?? false;
  const usageStatsGranted = androidDetails?.usageStats ?? false;
  const accessibilityGranted = androidDetails?.accessibility ?? false;
  const notificationListenerGranted = androidDetails?.notificationListener ?? false;
  const batteryOptimizationGranted = androidDetails?.batteryOptimization ?? false;
  const iosGranted = permissions?.allGranted ?? false;

  // Calculate granted progress
  const grantedCount = isIOS
    ? (iosGranted ? 1 : 0)
    : [
        overlayGranted,
        usageStatsGranted,
        accessibilityGranted,
        notificationListenerGranted,
        batteryOptimizationGranted,
      ].filter(Boolean).length;

  const totalPermissions = isIOS ? 1 : 5;

  // Essential permissions required to proceed (Overlay + Usage + Accessibility)
  const canContinue = isIOS
    ? iosGranted
    : (overlayGranted && usageStatsGranted && accessibilityGranted);

  const handleRequestIOS = async () => {
    setChecking(true);
    await blockerEngine.requestPermissions();
    await refreshPermissions();
    setChecking(false);
  };

  const handleAccessibilityClick = () => {
    if (accessibilityGranted) return;
    // Mandatory Google Play Prominent Disclosure Dialog
    setShowDisclosureModal(true);
  };

  const handleDisclosureAgree = () => {
    setShowDisclosureModal(false);
    blockerEngine.openAccessibilitySettings();
  };

  const handleDisclosureDecline = () => {
    setShowDisclosureModal(false);
  };

  const handleFinish = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await completeOnboarding();
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 60, height: 60, borderRadius: 30 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>NeuroNinja</Text>
          <Text style={styles.tagline}>Train your brain. Slay distractions.</Text>

          {/* Progress Tracker */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(grantedCount / totalPermissions) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {grantedCount} of {totalPermissions} Authorized
            </Text>
          </View>
        </View>

        {/* Permission Cards Container */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>REQUIRED ACCESS</Text>
          <Text style={styles.cardDescription}>
            To protect your focus sessions and track short video doomscrolling, NeuroNinja requires the following permissions. All data remains 100% private and on-device.
          </Text>

          {isIOS ? (
            <View style={styles.permissionItem}>
              <View style={styles.permIconCircle}>
                <MaterialCommunityIcons
                  name={iosGranted ? 'check-circle' : 'shield-account'}
                  size={24}
                  color={iosGranted ? NinjaPalette.emerald : NinjaPalette.amber}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permTitle}>Screen Time API</Text>
                <Text style={styles.permSub}>
                  Apple&apos;s privacy-safe framework to shield apps without reading personal data.
                </Text>
              </View>
              {!iosGranted && (
                <TouchableOpacity
                  style={styles.grantButton}
                  onPress={handleRequestIOS}
                  disabled={checking}
                >
                  <Text style={styles.grantButtonText}>Authorize</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {/* Permission 1: Reels Guardian (Accessibility API) */}
              <View style={[styles.permissionItem, accessibilityGranted && styles.permissionItemGranted]}>
                <View style={[styles.permIconCircle, accessibilityGranted && styles.permIconCircleGranted]}>
                  <MaterialCommunityIcons
                    name={accessibilityGranted ? 'check-circle' : 'movie-play-outline'}
                    size={24}
                    color={accessibilityGranted ? NinjaPalette.emerald : '#60A5FA'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.permTitle}>Reels &amp; Shorts Guardian</Text>
                    <View style={styles.essentialBadge}>
                      <Text style={styles.essentialBadgeText}>CORE</Text>
                    </View>
                  </View>
                  <Text style={styles.permSub}>
                    Detects Instagram Reels &amp; YouTube Shorts to track scroll counts and enforce mindful breaks.
                  </Text>
                </View>
                {!accessibilityGranted ? (
                  <TouchableOpacity
                    style={styles.grantButton}
                    onPress={handleAccessibilityClick}
                  >
                    <Text style={styles.grantButtonText}>Enable</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.grantedBadge}>
                    <Text style={styles.grantedBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              {/* Permission 2: Display Over Other Apps */}
              <View style={[styles.permissionItem, overlayGranted && styles.permissionItemGranted]}>
                <View style={[styles.permIconCircle, overlayGranted && styles.permIconCircleGranted]}>
                  <MaterialCommunityIcons
                    name={overlayGranted ? 'check-circle' : 'picture-in-picture-bottom-right'}
                    size={24}
                    color={overlayGranted ? NinjaPalette.emerald : '#F59E0B'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.permTitle}>Display Over Other Apps</Text>
                    <View style={styles.essentialBadge}>
                      <Text style={styles.essentialBadgeText}>CORE</Text>
                    </View>
                  </View>
                  <Text style={styles.permSub}>
                    Required to show the Floating Guardian HUD and the full-screen Dojo shield when an app is sealed.
                  </Text>
                </View>
                {!overlayGranted ? (
                  <TouchableOpacity
                    style={styles.grantButton}
                    onPress={() => blockerEngine.openOverlaySettings()}
                  >
                    <Text style={styles.grantButtonText}>Enable</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.grantedBadge}>
                    <Text style={styles.grantedBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              {/* Permission 3: Usage Access */}
              <View style={[styles.permissionItem, usageStatsGranted && styles.permissionItemGranted]}>
                <View style={[styles.permIconCircle, usageStatsGranted && styles.permIconCircleGranted]}>
                  <MaterialCommunityIcons
                    name={usageStatsGranted ? 'check-circle' : 'chart-timeline-variant'}
                    size={24}
                    color={usageStatsGranted ? NinjaPalette.emerald : '#A78BFA'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.permTitle}>Usage Access</Text>
                    <View style={styles.essentialBadge}>
                      <Text style={styles.essentialBadgeText}>CORE</Text>
                    </View>
                  </View>
                  <Text style={styles.permSub}>
                    Measures real device screen time and detects when distracting applications are launched.
                  </Text>
                </View>
                {!usageStatsGranted ? (
                  <TouchableOpacity
                    style={styles.grantButton}
                    onPress={() => blockerEngine.openUsageStatsSettings()}
                  >
                    <Text style={styles.grantButtonText}>Enable</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.grantedBadge}>
                    <Text style={styles.grantedBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              {/* Permission 4: Notification Listener */}
              <View style={[styles.permissionItem, notificationListenerGranted && styles.permissionItemGranted]}>
                <View style={[styles.permIconCircle, notificationListenerGranted && styles.permIconCircleGranted]}>
                  <MaterialCommunityIcons
                    name={notificationListenerGranted ? 'check-circle' : 'bell-badge-outline'}
                    size={24}
                    color={notificationListenerGranted ? NinjaPalette.emerald : '#EC4899'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.permTitle}>Notification Guard</Text>
                  <Text style={styles.permSub}>
                    Silences dopamine pings from sealed apps while letting VIP emergency calls through.
                  </Text>
                </View>
                {!notificationListenerGranted ? (
                  <TouchableOpacity
                    style={[styles.grantButton, { borderColor: '#EC4899' }]}
                    onPress={() => blockerEngine.openNotificationListenerSettings()}
                  >
                    <Text style={[styles.grantButtonText, { color: '#EC4899' }]}>Enable</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.grantedBadge}>
                    <Text style={styles.grantedBadgeText}>Active</Text>
                  </View>
                )}
              </View>

              {/* Permission 5: Battery Optimization Exemption */}
              <View style={[styles.permissionItem, batteryOptimizationGranted && styles.permissionItemGranted]}>
                <View style={[styles.permIconCircle, batteryOptimizationGranted && styles.permIconCircleGranted]}>
                  <MaterialCommunityIcons
                    name={batteryOptimizationGranted ? 'check-circle' : 'battery-charging'}
                    size={24}
                    color={batteryOptimizationGranted ? NinjaPalette.emerald : '#38BDF8'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.permTitle}>Background Protection</Text>
                  <Text style={styles.permSub}>
                    Prevents your phone&apos;s battery cleaner from abruptly stopping the focus shield.
                  </Text>
                </View>
                {!batteryOptimizationGranted ? (
                  <TouchableOpacity
                    style={[styles.grantButton, { borderColor: '#38BDF8' }]}
                    onPress={() => blockerEngine.requestIgnoreBatteryOptimization()}
                  >
                    <Text style={[styles.grantButtonText, { color: '#38BDF8' }]}>Allow</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.grantedBadge}>
                    <Text style={styles.grantedBadgeText}>Active</Text>
                  </View>
                )}
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => refreshPermissions()}
          >
            <MaterialCommunityIcons name="refresh" size={16} color={NinjaPalette.textSecondary} />
            <Text style={styles.refreshButtonText}>Refresh permission status</Text>
          </TouchableOpacity>
        </View>

        {/* Enter Dojo Button */}
        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          disabled={!canContinue}
          onPress={handleFinish}
        >
          <Text style={styles.continueButtonText}>
            {canContinue ? 'Enter the Dojo ⚔️' : 'Enable Core Permissions to Proceed'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Google Play Prominent Disclosure Modal */}
      <ProminentDisclosureModal
        visible={showDisclosureModal}
        onAgree={handleDisclosureAgree}
        onDecline={handleDisclosureDecline}
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
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1.5,
    borderColor: NinjaPalette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  progressBarBg: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: NinjaPalette.emerald,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: NinjaPalette.emerald,
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 24,
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 12.5,
    color: NinjaPalette.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  permissionItemGranted: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  permIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permIconCircleGranted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  permTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
    marginBottom: 2,
  },
  permSub: {
    fontSize: 11.5,
    color: NinjaPalette.textMuted,
    lineHeight: 16,
  },
  essentialBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  essentialBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  grantButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: NinjaPalette.emerald,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  grantButtonText: {
    color: NinjaPalette.emerald,
    fontSize: 12,
    fontWeight: '800',
  },
  grantedBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  grantedBadgeText: {
    color: NinjaPalette.emerald,
    fontSize: 11,
    fontWeight: '700',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: NinjaPalette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  continueButton: {
    width: '100%',
    backgroundColor: NinjaPalette.emerald,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: NinjaPalette.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 16,
  },
});
