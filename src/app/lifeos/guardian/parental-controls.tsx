import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { parentalControlService } from '../../../services/guardian/parental-control-service';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import type {
  ParentalConfig,
  AppQuota,
  ParentalAuditLog,
} from '../../../services/guardian/parental-types';

export default function ParentalControlsScreen() {
  const { handleSmartBack } = useNinjaBack({
    fallbackRoute: '/focus/ghost-launcher',
  });
  const { showToast } = useNinjaAlert();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [config, setConfig] = useState<ParentalConfig | null>(null);
  const [quotas, setQuotas] = useState<AppQuota[]>([]);
  const [auditLogs, setAuditLogs] = useState<ParentalAuditLog[]>([]);
  const [dailyEmergencyCode, setDailyEmergencyCode] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Change PIN modal
  const [showChangePin, setShowChangePin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // Emergency Pass Modal for Child/Dependent
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyInputCode, setEmergencyInputCode] = useState('');
  const [isRedeemingEmergency, setIsRedeemingEmergency] = useState(false);

  // Add App Quota modal
  const [showAddQuota, setShowAddQuota] = useState(false);
  const [newPkg, setNewPkg] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [newLimitMinutes, setNewLimitMinutes] = useState('30');

  const loadData = useCallback(async () => {
    try {
      const [cfg, qList, logs, emCode] = await Promise.all([
        parentalControlService.getConfig(),
        parentalControlService.getAppQuotas(),
        parentalControlService.getAuditLogs(20),
        parentalControlService.getEmergencyOverrideCode(),
      ]);
      setConfig(cfg);
      setQuotas(qList);
      setAuditLogs(logs);
      setDailyEmergencyCode(emCode);
    } catch (e) {
      console.warn('[ParentalControls] Load error:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleVerifyPin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const valid = await parentalControlService.verifyParentPin(pinInput);
    if (valid) {
      setIsUnlocked(true);
      setPinError(false);
      setPinInput('');
      await parentalControlService.logAuditEvent('parent_override', undefined, 'Master parent authenticated with PIN');
    } else {
      setPinError(true);
      setPinInput('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await parentalControlService.logAuditEvent('settings_tamper_attempt', undefined, 'Incorrect Master PIN attempt');
    }
  };

  const handleBiometricUnlock = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await parentalControlService.authenticateWithBiometrics();
    if (success) {
      setIsUnlocked(true);
      setPinError(false);
      showToast({
        title: 'Guardian Unlocked',
        message: 'Authenticated via Biometrics.',
        type: 'success',
        icon: 'fingerprint',
      });
    } else {
      Alert.alert('Biometric Unavailable', 'Please use your 4-digit Master PIN.');
    }
  };

  const handleToggleBiometrics = async (val: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await parentalControlService.updateBiometrics(val);
    await loadData();
    showToast({
      title: val ? 'Biometrics Enabled' : 'Biometrics Disabled',
      message: val ? 'You can now unlock guardian controls with your fingerprint/face.' : 'PIN authentication required.',
      type: 'info',
      icon: 'fingerprint',
    });
  };

  const handleRedeemEmergencyCode = async () => {
    if (!emergencyInputCode.trim()) {
      Alert.alert('Required', 'Please enter the 4-digit code provided by your guardian.');
      return;
    }

    setIsRedeemingEmergency(true);
    try {
      const res = await parentalControlService.redeemEmergencyPass(emergencyInputCode);
      if (res.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          title: '🚨 Emergency Pass Active',
          message: res.message,
          type: 'success',
          icon: 'shield-check',
        });
        setShowEmergencyModal(false);
        setEmergencyInputCode('');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Invalid Emergency Code', res.message);
      }
    } catch (e) {
      console.warn('[ParentalControls] Emergency redeem error:', e);
    } finally {
      setIsRedeemingEmergency(false);
    }
  };

  const handleToggleCurfew = async (val: boolean) => {
    if (!config) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await parentalControlService.updateCurfew(
      val,
      config.curfewStartTime,
      config.curfewEndTime,
      config.strictCurfewActive
    );
    await loadData();
    showToast({
      title: val ? 'Bedtime Curfew Armed' : 'Curfew Disarmed',
      message: val ? `Distractions sealed between ${config.curfewStartTime} and ${config.curfewEndTime}.` : 'Curfew lifted.',
      type: val ? 'shield' : 'warning',
      icon: val ? 'bed-clock' : 'clock-outline',
    });
  };

  const handleAdjustCurfewTime = async (type: 'start' | 'end', deltaMinutes: number) => {
    if (!config) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const formatMins = (m: number) => {
      const norm = ((m % 1440) + 1440) % 1440;
      const h = Math.floor(norm / 60);
      const min = norm % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    let start = config.curfewStartTime;
    let end = config.curfewEndTime;

    if (type === 'start') {
      start = formatMins(parseMins(start) + deltaMinutes);
    } else {
      end = formatMins(parseMins(end) + deltaMinutes);
    }

    await parentalControlService.updateCurfew(config.curfewEnabled, start, end, config.strictCurfewActive);
    await loadData();
  };

  const handleChangePinSubmit = async () => {
    if (newPin.length !== 4) {
      Alert.alert('Invalid PIN', 'Master Parent PIN must be exactly 4 digits.');
      return;
    }

    const validCurrent = await parentalControlService.verifyParentPin(oldPin);
    if (!validCurrent) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Incorrect Current PIN', 'The current master PIN you entered is wrong.');
      return;
    }

    await parentalControlService.updateParentPin(newPin);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowChangePin(false);
    setOldPin('');
    setNewPin('');
    showToast({
      title: 'Master PIN Updated',
      message: 'Your new 4-digit guardian PIN is now active.',
      type: 'success',
      icon: 'lock-check',
    });
    await loadData();
  };

  const handleSaveQuota = async () => {
    if (!newAppName.trim()) {
      Alert.alert('Required', 'Please enter an app name.');
      return;
    }
    const mins = parseInt(newLimitMinutes, 10) || 30;
    const pkg = newPkg.trim() || `com.${newAppName.toLowerCase().replace(/\s+/g, '')}.app`;

    await parentalControlService.saveAppQuota(pkg, newAppName.trim(), mins);
    setShowAddQuota(false);
    setNewPkg('');
    setNewAppName('');
    setNewLimitMinutes('30');
    await loadData();
    showToast({
      title: 'App Quota Saved',
      message: `${newAppName.trim()} restricted to ${mins} minutes daily.`,
      type: 'success',
      icon: 'timer-sand',
    });
  };

  const handleDeleteQuota = async (pkg: string, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await parentalControlService.deleteAppQuota(pkg);
    await loadData();
    showToast({
      title: 'Quota Removed',
      message: `Daily quota removed for ${name}.`,
      type: 'info',
      icon: 'trash-can',
    });
  };

  // Locked Authentication View
  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack}>
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.badge}>GUARDIAN SECURITY</Text>
            <Text style={styles.title}>Parental Controls</Text>
          </View>
        </View>

        <View style={styles.authContainer}>
          <View style={styles.lockIconBox}>
            <MaterialCommunityIcons name="shield-account" size={48} color="#00E699" />
          </View>
          <Text style={styles.authTitle}>Enter Master PIN</Text>
          <Text style={styles.authSub}>
            Parental controls enforce hard bedtime curfews and app quotas. Enter your 4-digit master PIN. (Default: 0000)
          </Text>

          <TextInput
            style={[styles.pinInput, pinError && styles.pinInputError]}
            placeholder="••••"
            placeholderTextColor="#64748B"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={pinInput}
            onChangeText={setPinInput}
          />

          {pinError && <Text style={styles.errorText}>Incorrect PIN. Please try again.</Text>}

          <TouchableOpacity style={styles.unlockBtn} onPress={handleVerifyPin} activeOpacity={0.8}>
            <MaterialCommunityIcons name="lock-open" size={20} color="#070A11" />
            <Text style={styles.unlockBtnText}>Unlock Controls</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricUnlock} activeOpacity={0.8}>
            <MaterialCommunityIcons name="fingerprint" size={22} color="#00E699" />
            <Text style={styles.biometricBtnText}>Unlock with Biometrics / FaceID</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyCodeBtn}
            onPress={() => setShowEmergencyModal(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="shield-key" size={18} color="#F59E0B" />
            <Text style={styles.emergencyCodeBtnText}>Enter 4-Digit Emergency Pass Code</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Pass Modal */}
        <Modal
          visible={showEmergencyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEmergencyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Emergency Focus Pass</Text>
                <TouchableOpacity onPress={() => setShowEmergencyModal(false)}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSub}>
                Ask your parent or guardian for today’s 4-digit Emergency Override Key to unlock 15 minutes of focus pass.
              </Text>

              <TextInput
                style={styles.emergencyInput}
                placeholder="4-digit code"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                maxLength={4}
                value={emergencyInputCode}
                onChangeText={setEmergencyInputCode}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isRedeemingEmergency && { opacity: 0.6 }]}
                onPress={handleRedeemEmergencyCode}
                disabled={isRedeemingEmergency}
                activeOpacity={0.8}
              >
                {isRedeemingEmergency ? (
                  <ActivityIndicator size="small" color="#070A11" />
                ) : (
                  <Text style={styles.modalSubmitText}>Redeem 15m Pass</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Unlocked Guardian Dashboard
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>NATIVE ENFORCEMENT</Text>
          <Text style={styles.title}>Guardian Controls</Text>
        </View>
        <TouchableOpacity style={styles.pinBtn} onPress={() => setShowChangePin(true)}>
          <MaterialCommunityIcons name="key-change" size={18} color="#00E699" />
          <Text style={styles.pinBtnText}>PIN</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {/* Daily Emergency Override Card for Parents */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyCardHeader}>
            <MaterialCommunityIcons name="key-wireless" size={24} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.emergencyBadge}>DAILY EMERGENCY OVERRIDE KEY</Text>
              <Text style={styles.emergencyCodeDisplay}>{dailyEmergencyCode || '8492'}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyCodeBtn}
              onPress={async () => {
                await Clipboard.setStringAsync(dailyEmergencyCode);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast({
                  title: 'Copied Emergency Key',
                  message: `Code ${dailyEmergencyCode} copied. Valid today only.`,
                  type: 'info',
                  icon: 'key',
                });
              }}
            >
              <Ionicons name="copy-outline" size={18} color="#F59E0B" />
              <Text style={styles.copyCodeText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.emergencyDesc}>
            Give this code verbally to your dependent if they need a 15-minute emergency extension without revealing your master PIN.
          </Text>
        </View>

        {/* Biometrics Toggle Card */}
        <View style={[styles.card, { marginBottom: 16 }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="fingerprint" size={24} color="#00E699" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardTitle}>Biometric Authentication</Text>
              <Text style={styles.cardDescSimple}>Allow FaceID / Fingerprint to access Guardian settings</Text>
            </View>
            <Switch
              value={config?.biometricsEnabled ?? true}
              onValueChange={handleToggleBiometrics}
              thumbColor={config?.biometricsEnabled ? '#00E699' : '#64748B'}
              trackColor={{ false: '#334155', true: '#0F261E' }}
            />
          </View>
        </View>

        {/* Curfew Hero Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="bed-clock" size={26} color="#818CF8" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardBadge}>BEDTIME CURFEW SCHEDULE</Text>
              <Text style={styles.cardTitle}>
                {config?.curfewEnabled ? 'Active Curfew Lock' : 'Curfew Disabled'}
              </Text>
            </View>
            <Switch
              value={config?.curfewEnabled ?? false}
              onValueChange={handleToggleCurfew}
              thumbColor={config?.curfewEnabled ? '#818CF8' : '#64748B'}
              trackColor={{ false: '#334155', true: '#1E1B4B' }}
            />
          </View>

          <Text style={styles.cardDesc}>
            During bedtime curfew, blocked apps are strictly locked at the native Android OS level with zero bypass allowed except via Master PIN.
          </Text>

          {/* Curfew Times */}
          <View style={styles.timeGrid}>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>BEDTIME (START)</Text>
              <Text style={styles.timeVal}>{config?.curfewStartTime ?? '21:30'}</Text>
              <View style={styles.timeBtnRow}>
                <TouchableOpacity
                  style={styles.timeAdjustBtn}
                  onPress={() => handleAdjustCurfewTime('start', -30)}
                >
                  <Text style={styles.timeAdjustText}>-30m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeAdjustBtn}
                  onPress={() => handleAdjustCurfewTime('start', +30)}
                >
                  <Text style={styles.timeAdjustText}>+30m</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>WAKEUP (END)</Text>
              <Text style={styles.timeVal}>{config?.curfewEndTime ?? '06:30'}</Text>
              <View style={styles.timeBtnRow}>
                <TouchableOpacity
                  style={styles.timeAdjustBtn}
                  onPress={() => handleAdjustCurfewTime('end', -30)}
                >
                  <Text style={styles.timeAdjustText}>-30m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeAdjustBtn}
                  onPress={() => handleAdjustCurfewTime('end', +30)}
                >
                  <Text style={styles.timeAdjustText}>+30m</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* App Quotas Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>APP USAGE QUOTAS ({quotas.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddQuota(true)}>
            <Ionicons name="add" size={16} color="#00E699" />
            <Text style={styles.addBtnText}>Add Quota</Text>
          </TouchableOpacity>
        </View>

        {quotas.length > 0 ? (
          quotas.map((q) => (
            <View key={q.packageName} style={styles.quotaCard}>
              <View style={styles.quotaIconBox}>
                <MaterialCommunityIcons name="cellphone-lock" size={22} color="#00E699" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quotaAppName}>{q.appName}</Text>
                <Text style={styles.quotaLimit}>{q.dailyLimitMinutes} mins / day</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteQuotaBtn}
                onPress={() => handleDeleteQuota(q.packageName, q.appName)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="timer-sand-empty" size={36} color="#334155" />
            <Text style={styles.emptyTitle}>No App Quotas Set</Text>
            <Text style={styles.emptySub}>Add individual daily screen time limits for apps like Instagram or YouTube.</Text>
          </View>
        )}

        {/* Audit Logs Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>SECURITY AUDIT LOGS</Text>
        <View style={styles.logsCard}>
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logIconBox}>
                  <MaterialCommunityIcons
                    name={
                      log.eventType === 'settings_tamper_attempt'
                        ? 'alert-octagon'
                        : log.eventType === 'biometric_unlock'
                        ? 'fingerprint'
                        : log.eventType === 'emergency_pass_granted'
                        ? 'shield-key'
                        : 'shield-check'
                    }
                    size={16}
                    color={
                      log.eventType === 'settings_tamper_attempt'
                        ? '#EF4444'
                        : log.eventType === 'emergency_pass_granted'
                        ? '#F59E0B'
                        : '#00E699'
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logDetails}>{log.details}</Text>
                  <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noLogsText}>No security events recorded today.</Text>
          )}
        </View>
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal visible={showChangePin} transparent animationType="slide" onRequestClose={() => setShowChangePin(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Master Parent PIN</Text>
              <TouchableOpacity onPress={() => setShowChangePin(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Current 4-Digit PIN</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={oldPin}
              onChangeText={setOldPin}
              placeholder="••••"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.modalLabel}>New 4-Digit PIN</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
              placeholder="••••"
              placeholderTextColor="#64748B"
            />

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleChangePinSubmit}>
              <Text style={styles.modalSubmitText}>Save New PIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add App Quota Modal */}
      <Modal visible={showAddQuota} transparent animationType="slide" onRequestClose={() => setShowAddQuota(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add App Usage Limit</Text>
              <TouchableOpacity onPress={() => setShowAddQuota(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>App Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newAppName}
              onChangeText={setNewAppName}
              placeholder="e.g. Instagram, TikTok"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.modalLabel}>Package Name (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={newPkg}
              onChangeText={setNewPkg}
              placeholder="e.g. com.instagram.android"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>Daily Limit (Minutes)</Text>
            <View style={styles.presetRow}>
              {['15', '30', '45', '60', '90'].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[styles.presetBtn, newLimitMinutes === mins && styles.presetBtnActive]}
                  onPress={() => setNewLimitMinutes(mins)}
                >
                  <Text style={[styles.presetBtnText, newLimitMinutes === mins && styles.presetBtnTextActive]}>
                    {mins}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveQuota}>
              <Text style={styles.modalSubmitText}>Save Quota</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  pinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pinBtnText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '800',
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  authTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  authSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  pinInput: {
    width: 180,
    backgroundColor: '#0F1829',
    borderRadius: 16,
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 12,
    color: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  pinInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    width: '100%',
  },
  unlockBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#070A11',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    width: '100%',
  },
  biometricBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00E699',
  },
  emergencyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  emergencyCodeBtnText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  emergencyInput: {
    backgroundColor: '#070A11',
    borderRadius: 14,
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 8,
    color: '#F59E0B',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    marginVertical: 16,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  emergencyCard: {
    backgroundColor: '#1E170A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  emergencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyBadge: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emergencyCodeDisplay: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 2,
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyCodeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  emergencyDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  cardDescSimple: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 10,
    lineHeight: 18,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  timeBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  timeVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    marginVertical: 4,
  },
  timeBtnRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  timeAdjustBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeAdjustText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
  quotaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  quotaIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quotaAppName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  quotaLimit: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  deleteQuotaBtn: {
    padding: 8,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F1829',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  logsCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  logIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logDetails: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  logTime: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  noLogsText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#070A11',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetBtnActive: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
  },
  presetBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  presetBtnTextActive: {
    color: '#00E699',
    fontWeight: '800',
  },
  modalSubmitBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSubmitText: {
    color: '#070A11',
    fontSize: 15,
    fontWeight: '800',
  },
});
