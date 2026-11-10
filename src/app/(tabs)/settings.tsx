import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Switch,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useNinja } from '../../context/ninja-context';
import { NinjaPalette } from '../../constants/theme';
import { blockerEngine } from '../../services/blocker/blocker-engine';
import { getIntruderLogs, clearIntruderLogs, type IntruderLogEntry } from '../../services/intruder-audit';
import { PrivacyVault } from '../../components/privacy-vault';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    settings,
    permissions,
    refreshPermissions,
    relockNow,
    setLockType,
    setBiometricsEnabled,
    setDecoyEnabled,
    setAutoLockDelay,
  } = useNinja();

  const [intruderLogs, setIntruderLogs] = useState<IntruderLogEntry[]>([]);
  const [showVault, setShowVault] = useState(false);

  useEffect(() => {
    void (async () => {
      const logs = await getIntruderLogs();
      setIntruderLogs(logs);
    })();
  }, []);

  const isIOS = Platform.OS === 'ios';
  const androidDetails = permissions?.details?.platform === 'android' ? permissions.details : null;

  const handleEmergencyRelock = async () => {
    await relockNow();
    Alert.alert('Shields Armed', 'All active temporary passes have been terminated.');
  };

  const handleClearIntruders = async () => {
    await clearIntruderLogs();
    setIntruderLogs([]);
    Alert.alert('Audit Cleared', 'Intruder log history has been wiped.');
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

          {/* Master Lock Type */}
          <View style={styles.row}>
            <Ionicons name="keypad-outline" size={20} color="#00E699" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Scramble PIN Authentication</Text>
              <Text style={styles.rowSub}>Randomized keypad numbers prevent smudge tracking</Text>
            </View>
            <Switch
              value={settings.lockType === 'scramble_pin'}
              onValueChange={(val) => setLockType(val ? 'scramble_pin' : 'gate')}
              thumbColor={settings.lockType === 'scramble_pin' ? '#00E699' : '#64748B'}
              trackColor={{ false: '#334155', true: '#0F291E' }}
            />
          </View>

          {/* Biometrics */}
          <View style={styles.row}>
            <Ionicons name="finger-print" size={20} color="#60A5FA" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Biometric Fast-Unlock</Text>
              <Text style={styles.rowSub}>Fingerprint / Face ID hardware unlock</Text>
            </View>
            <Switch
              value={settings.biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              thumbColor={settings.biometricsEnabled ? '#60A5FA' : '#64748B'}
              trackColor={{ false: '#334155', true: '#1E293B' }}
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

        {/* Modal for Privacy Vault */}
        <Modal visible={showVault} animationType="slide">
          <PrivacyVault onClose={() => setShowVault(false)} />
        </Modal>

        {/* Emergency & Reset Controls */}
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
            onPress={() => router.push('/onboarding' as any)}
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
});
