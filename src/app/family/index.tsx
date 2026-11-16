import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useNinjaAlert } from '../../context/ninja-alert-context';

export default function FamilySafetyScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();
  const [isParentMode, setIsParentMode] = useState(true);
  const [bedtimeCurfew, setBedtimeCurfew] = useState(true);
  const [safeSearch, setSafeSearch] = useState(true);
  const [appLimitsEnabled, setAppLimitsEnabled] = useState(true);
  const [pairingCode, setPairingCode] = useState('NINJA-8492-X');

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem('@family_supervision_prefs_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.bedtimeCurfew !== undefined) setBedtimeCurfew(parsed.bedtimeCurfew);
          if (parsed.safeSearch !== undefined) setSafeSearch(parsed.safeSearch);
          if (parsed.appLimitsEnabled !== undefined) setAppLimitsEnabled(parsed.appLimitsEnabled);
          if (parsed.pairingCode) setPairingCode(parsed.pairingCode);
        } else {
          const code = `NINJA-${Math.floor(1000 + Math.random() * 9000)}-${Platform.OS === 'android' ? 'A' : 'I'}`;
          setPairingCode(code);
          await AsyncStorage.setItem('@family_supervision_prefs_v1', JSON.stringify({ pairingCode: code }));
        }
      } catch (e) {
        console.warn('Failed to load family supervision prefs:', e);
      }
    })();
  }, []);

  const saveSupervisionPrefs = async (updates: Record<string, any>) => {
    try {
      const currentRaw = await AsyncStorage.getItem('@family_supervision_prefs_v1');
      const current = currentRaw ? JSON.parse(currentRaw) : {};
      const merged = { ...current, bedtimeCurfew, safeSearch, appLimitsEnabled, pairingCode, ...updates };
      await AsyncStorage.setItem('@family_supervision_prefs_v1', JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to persist family prefs:', e);
    }
  };

  const handleToggleCurfew = (val: boolean) => {
    setBedtimeCurfew(val);
    void saveSupervisionPrefs({ bedtimeCurfew: val });
  };

  const handleToggleLimits = (val: boolean) => {
    setAppLimitsEnabled(val);
    void saveSupervisionPrefs({ appLimitsEnabled: val });
  };

  const handleToggleSafeSearch = (val: boolean) => {
    setSafeSearch(val);
    void saveSupervisionPrefs({ safeSearch: val });
  };

  const handleGrantExtension = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast({
      title: 'Allowance Granted',
      message: 'Granted +15 minutes temporary focus pass to paired device.',
      type: 'success',
      icon: 'clock-check-outline',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.badge}>FAMILY SUPERVISION</Text>
          <Text style={styles.title}>Family Safety</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Role Mode Selector */}
        <View style={styles.roleTabs}>
          <TouchableOpacity
            style={[styles.roleTab, isParentMode && styles.roleTabActive]}
            onPress={() => setIsParentMode(true)}
          >
            <Ionicons name="shield-checkmark" size={16} color={isParentMode ? '#00E699' : '#64748B'} />
            <Text style={[styles.roleText, isParentMode && styles.roleTextActive]}>
              Parent Guardian
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, !isParentMode && styles.roleTabActive]}
            onPress={() => setIsParentMode(false)}
          >
            <Ionicons name="happy-outline" size={16} color={!isParentMode ? '#60A5FA' : '#64748B'} />
            <Text style={[styles.roleText, !isParentMode && styles.roleTextActive]}>
              Child Profile
            </Text>
          </TouchableOpacity>
        </View>

        {isParentMode ? (
          <>
            {/* Child Device Pairing Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>CHILD DEVICE PAIRING</Text>
              <View style={styles.pairingBox}>
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={56} color="#00E699" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pairingCodeLabel}>Encrypted Pairing Code</Text>
                  <Text style={styles.pairingCode}>{pairingCode}</Text>
                  <Text style={styles.pairingSub}>
                    Enter this code on your child&apos;s phone to establish supervision.
                  </Text>
                </View>
              </View>
            </View>

            {/* Curfew & Safety Policies */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>SUPERVISION CONTROLS</Text>

              <View style={styles.row}>
                <Ionicons name="moon-outline" size={20} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Bedtime Curfew (9 PM – 7 AM)</Text>
                  <Text style={styles.rowSub}>Auto-seals entertainment & social apps overnight</Text>
                </View>
                <Switch
                  value={bedtimeCurfew}
                  onValueChange={handleToggleCurfew}
                  thumbColor={bedtimeCurfew ? '#F59E0B' : '#64748B'}
                  trackColor={{ false: '#334155', true: '#292211' }}
                />
              </View>

              <View style={styles.row}>
                <Ionicons name="time-outline" size={20} color="#00E699" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Daily App Allowance (2 hrs)</Text>
                  <Text style={styles.rowSub}>Enforce strict daily usage limits across sealed apps</Text>
                </View>
                <Switch
                  value={appLimitsEnabled}
                  onValueChange={handleToggleLimits}
                  thumbColor={appLimitsEnabled ? '#00E699' : '#64748B'}
                  trackColor={{ false: '#334155', true: '#0F291E' }}
                />
              </View>

              <View style={styles.row}>
                <Ionicons name="search-outline" size={20} color="#60A5FA" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Enforce SafeSearch</Text>
                  <Text style={styles.rowSub}>Blocks adult content in Google and browsers</Text>
                </View>
                <Switch
                  value={safeSearch}
                  onValueChange={handleToggleSafeSearch}
                  thumbColor={safeSearch ? '#60A5FA' : '#64748B'}
                  trackColor={{ false: '#334155', true: '#1E293B' }}
                />
              </View>
            </View>

            {/* Pending Requests */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>PENDING ALLOWANCE REQUESTS</Text>
              <View style={styles.requestItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestTitle}>Alex&apos;s Phone · YouTube</Text>
                  <Text style={styles.requestSub}>Requested +15 minutes for School Project</Text>
                </View>
                <TouchableOpacity style={styles.grantBtn} onPress={handleGrantExtension}>
                  <Text style={styles.grantBtnText}>Grant +15m</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.childCard}>
            <Ionicons name="shield-checkmark" size={64} color="#00E699" />
            <Text style={styles.childTitle}>Supervised by Parent</Text>
            <Text style={styles.childSub}>
              Your device has 1h 15m screen time remaining today. Bedtime curfew starts at 9:00 PM.
            </Text>
            <TouchableOpacity style={styles.requestBtn} onPress={handleGrantExtension}>
              <Text style={styles.requestBtnText}>Request Screen Time Extension</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 16,
  },
  roleTabActive: {
    backgroundColor: '#0F172A',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  roleTextActive: {
    color: '#F8FAFC',
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  pairingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qrPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pairingCodeLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  pairingCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00E699',
    letterSpacing: 1,
    marginVertical: 4,
  },
  pairingSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  rowSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  requestSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  grantBtn: {
    backgroundColor: '#00E699',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  grantBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#070A11',
  },
  childCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 14,
  },
  childTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  childSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  requestBtn: {
    marginTop: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#00E699',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  requestBtnText: {
    color: '#00E699',
    fontWeight: '800',
    fontSize: 14,
  },
});

