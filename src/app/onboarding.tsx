import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useNinja } from '../context/ninja-context';
import { NinjaPalette } from '../constants/theme';
import { blockerEngine } from '../services/blocker/blocker-engine';

export default function OnboardingScreen() {
  const router = useRouter();
  const { permissions, refreshPermissions, completeOnboarding } = useNinja();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  const isIOS = Platform.OS === 'ios';

  const androidDetails = permissions?.details?.platform === 'android' ? permissions.details : null;
  const overlayGranted = androidDetails?.overlay ?? false;
  const usageStatsGranted = androidDetails?.usageStats ?? false;
  const iosGranted = permissions?.allGranted ?? false;

  const canContinue = isIOS ? iosGranted : (overlayGranted && usageStatsGranted);

  const handleRequestIOS = async () => {
    setChecking(true);
    await blockerEngine.requestPermissions();
    await refreshPermissions();
    setChecking(false);
  };

  const handleFinish = async () => {
    await completeOnboarding();
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 56, height: 56, borderRadius: 28 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>NeuroNinja</Text>
          <Text style={styles.tagline}>Train your brain. Slay distractions.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>REQUIRED ACCESS</Text>
          <Text style={styles.cardDescription}>
            To protect your focus sessions, NeuroNinja requires device permissions to intercept target apps and enforce mindful breaks.
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
                  Apple&apos;s official privacy-safe framework to shield apps without reading personal data.
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
              {/* Android Permission 1: Overlay */}
              <View style={styles.permissionItem}>
                <View style={styles.permIconCircle}>
                  <MaterialCommunityIcons
                    name={overlayGranted ? 'check-circle' : 'picture-in-picture-bottom-right'}
                    size={24}
                    color={overlayGranted ? NinjaPalette.emerald : NinjaPalette.amber}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.permTitle}>Display Over Other Apps</Text>
                  <Text style={styles.permSub}>
                    Required to flash the focus shield whenever a distracting app is launched.
                  </Text>
                </View>
                {!overlayGranted && (
                  <TouchableOpacity
                    style={styles.grantButton}
                    onPress={() => blockerEngine.openOverlaySettings()}
                  >
                    <Text style={styles.grantButtonText}>Enable</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Android Permission 2: Usage Stats */}
              <View style={styles.permissionItem}>
                <View style={styles.permIconCircle}>
                  <MaterialCommunityIcons
                    name={usageStatsGranted ? 'check-circle' : 'chart-timeline-variant'}
                    size={24}
                    color={usageStatsGranted ? NinjaPalette.emerald : NinjaPalette.amber}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.permTitle}>Usage Access</Text>
                  <Text style={styles.permSub}>
                    Allows background detection of when you navigate into sealed apps.
                  </Text>
                </View>
                {!usageStatsGranted && (
                  <TouchableOpacity
                    style={styles.grantButton}
                    onPress={() => blockerEngine.openUsageStatsSettings()}
                  >
                    <Text style={styles.grantButtonText}>Enable</Text>
                  </TouchableOpacity>
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

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          disabled={!canContinue}
          onPress={handleFinish}
        >
          <Text style={styles.continueButtonText}>Enter the Dojo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  scroll: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1.5,
    borderColor: NinjaPalette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: NinjaPalette.textPrimary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: NinjaPalette.textSecondary,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginBottom: 28,
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: NinjaPalette.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  permIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
    marginBottom: 2,
  },
  permSub: {
    fontSize: 12,
    color: NinjaPalette.textMuted,
    lineHeight: 16,
  },
  grantButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: NinjaPalette.emerald,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  grantButtonText: {
    color: NinjaPalette.emerald,
    fontSize: 12,
    fontWeight: 'bold',
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
    borderRadius: 14,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  continueButtonText: {
    color: '#070A11',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
