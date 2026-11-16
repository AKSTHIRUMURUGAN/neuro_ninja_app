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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { parentalControlService } from '../../../services/guardian/parental-control-service';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import type {
  ParentalConfig,
  AppQuota,
  ParentalAuditLog,
} from '../../../services/guardian/parental-types';

export default function ParentalControlsScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [config, setConfig] = useState<ParentalConfig | null>(null);
  const [quotas, setQuotas] = useState<AppQuota[]>([]);
  const [auditLogs, setAuditLogs] = useState<ParentalAuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Change PIN modal
  const [showChangePin, setShowChangePin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // Add App Quota modal
  const [showAddQuota, setShowAddQuota] = useState(false);
  const [newPkg, setNewPkg] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [newLimitMinutes, setNewLimitMinutes] = useState('30');

  const loadData = useCallback(async () => {
    try {
      const [cfg, qList, logs] = await Promise.all([
        parentalControlService.getConfig(),
        parentalControlService.getAppQuotas(),
        parentalControlService.getAuditLogs(15),
      ]);
      setConfig(cfg);
      setQuotas(qList);
      setAuditLogs(logs);
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
      await parentalControlService.logAuditEvent('parent_override', undefined, 'Master parent authenticated');
    } else {
      setPinError(true);
      setPinInput('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await parentalControlService.logAuditEvent('settings_tamper_attempt', undefined, 'Incorrect PIN attempt');
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
      title: val ? 'Bedtime Curfew Enabled' : 'Bedtime Curfew Disabled',
      message: val
        ? `Apps locked from ${config.curfewStartTime} to ${config.curfewEndTime}.`
        : 'Curfew restriction turned off.',
      type: val ? 'success' : 'info',
      icon: val ? 'shield-moon' : 'shield-off',
    });
  };

  const handleToggleStrict = async (val: boolean) => {
    if (!config) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await parentalControlService.updateCurfew(
      config.curfewEnabled,
      config.curfewStartTime,
      config.curfewEndTime,
      val
    );
    await loadData();
  };

  const handleAdjustCurfewTime = async (type: 'start' | 'end', deltaMinutes: number) => {
    if (!config) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const parseMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10) || 0);
      return h * 60 + m;
    };

    const formatTimeStr = (totalMins: number) => {
      const normalized = (totalMins + 1440) % 1440;
      const h = Math.floor(normalized / 60);
      const m = normalized % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    let start = config.curfewStartTime;
    let end = config.curfewEndTime;

    if (type === 'start') {
      start = formatTimeStr(parseMinutes(start) + deltaMinutes);
    } else {
      end = formatTimeStr(parseMinutes(end) + deltaMinutes);
    }

    await parentalControlService.updateCurfew(config.curfewEnabled, start, end, config.strictCurfewActive);
    await loadData();
  };

  const handleChangePinSubmit = async () => {
    if (newPin.length !== 4) {
      showToast({
        title: 'Invalid PIN',
        message: 'Parent PIN must be exactly 4 digits.',
        type: 'warning',
        icon: 'alert',
      });
      return;
    }

    const validCurrent = await parentalControlService.verifyParentPin(oldPin);
    if (!validCurrent) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast({
        title: 'Incorrect Current PIN',
        message: 'The current PIN you entered is wrong.',
        type: 'error',
        icon: 'lock-alert',
      });
      return;
    }

    await parentalControlService.updateParentPin(newPin);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowChangePin(false);
    setOldPin('');
    setNewPin('');
    showToast({
      title: 'Parent PIN Updated',
      message: 'Your new 4-digit Master PIN is now active.',
      type: 'success',
      icon: 'lock-check',
    });
    await loadData();
  };

  const handleSaveQuota = async () => {
    if (!newAppName.trim()) return;
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
      message: `Quota removed for ${name}.`,
      type: 'info',
      icon: 'trash-can',
    });
  };

  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.badge}>MASTER PARENT SECURITY</Text>
            <Text style={styles.title}>Parental Controls</Text>
          </View>
        </View>

        <View style={styles.authContainer}>
          <View style={styles.lockIconBox}>
            <MaterialCommunityIcons name="shield-account" size={48} color="#00E699" />
          </View>
          <Text style={styles.authTitle}>Enter Parent PIN</Text>
          <Text style={styles.authSub}>
            Parental controls enforce hard bedtime curfews and app quotas. Enter your 4-digit master PIN to proceed. (Default: 0000)
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

          <TouchableOpacity style={styles.unlockBtn} onPress={handleVerifyPin}>
            <MaterialCommunityIcons name="lock-open" size={20} color="#070A11" />
            <Text style={styles.unlockBtnText}>Unlock Controls</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>NATIVE ENFORCEMENT</Text>
          <Text style={styles.title}>Parental Controls</Text>
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
            During bedtime curfew, blocked apps are strictly locked at the native Android OS level. No temporary bypasses allowed except with the Master Parent PIN.
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

          {/* Strict Lock Switch */}
          <View style={styles.strictRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.strictTitle}>Strict Hard Lock</Text>
              <Text style={styles.strictSub}>Blocks even if daytime unlock pass was active</Text>
            </View>
            <Switch
              value={config?.strictCurfewActive ?? true}
              onValueChange={handleToggleStrict}
              thumbColor={config?.strictCurfewActive ? '#00E699' : '#64748B'}
              trackColor={{ false: '#334155', true: '#0F291E' }}
            />
          </View>
        </View>

        {/* App Quotas Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Daily App Quotas ({quotas.length})</Text>
            <Text style={styles.sectionSub}>OS Enforced Time Limits</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddQuota(true)}>
            <MaterialCommunityIcons name="plus" size={16} color="#070A11" />
            <Text style={styles.addBtnText}>Add Quota</Text>
          </TouchableOpacity>
        </View>

        {quotas.map((q) => (
          <View key={q.packageName} style={styles.quotaCard}>
            <MaterialCommunityIcons name="application-outline" size={24} color="#00E699" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.quotaApp}>{q.appName}</Text>
              <Text style={styles.quotaMins}>{q.dailyLimitMinutes} Minutes Daily Limit</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteQuotaBtn}
              onPress={() => handleDeleteQuota(q.packageName, q.appName)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Audit Log Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View>
            <Text style={styles.sectionTitle}>Security & Tamper Audit Log</Text>
            <Text style={styles.sectionSub}>Recent Events & PIN Attempts</Text>
          </View>
        </View>

        {auditLogs.map((log) => (
          <View key={log.id} style={styles.auditCard}>
            <MaterialCommunityIcons
              name={log.eventType.includes('tamper') ? 'shield-alert' : 'shield-check'}
              size={18}
              color={log.eventType.includes('tamper') ? '#EF4444' : '#00E699'}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.auditEvent}>{log.eventType.replace(/_/g, ' ').toUpperCase()}</Text>
              <Text style={styles.auditDetails}>{log.details}</Text>
              <Text style={styles.auditTime}>{new Date(log.createdAt).toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal visible={showChangePin} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Master Parent PIN</Text>
            <Text style={styles.modalSub}>Enter your current 4-digit PIN followed by your new PIN.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Current 4-digit PIN"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={oldPin}
              onChangeText={setOldPin}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="New 4-digit PIN"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowChangePin(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleChangePinSubmit}>
                <Text style={styles.modalConfirmText}>Save New PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Quota Modal */}
      <Modal visible={showAddQuota} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set App Quota</Text>
            <Text style={styles.modalSub}>Configure a daily time limit for any distracting application.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="App Name (e.g. YouTube, Instagram)"
              placeholderTextColor="#64748B"
              value={newAppName}
              onChangeText={setNewAppName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Daily Limit (Minutes, e.g. 45)"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={newLimitMinutes}
              onChangeText={setNewLimitMinutes}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddQuota(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSaveQuota}>
                <Text style={styles.modalConfirmText}>Save Quota</Text>
              </TouchableOpacity>
            </View>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  pinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pinBtnText: {
    color: '#00E699',
    fontWeight: '800',
    fontSize: 11,
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  lockIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  authSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  pinInput: {
    width: 160,
    height: 52,
    backgroundColor: '#0F1829',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 10,
    marginTop: 24,
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
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    width: '100%',
  },
  unlockBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  timeVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00E699',
    marginVertical: 4,
  },
  timeBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  timeAdjustBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeAdjustText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  strictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  strictTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  strictSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00E699',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 11,
  },
  quotaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  quotaApp: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  quotaMins: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  deleteQuotaBtn: {
    padding: 6,
  },
  auditCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0F1829',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  auditEvent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  auditDetails: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  auditTime: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#070A11',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 13,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  modalConfirmBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 12,
  },
});
