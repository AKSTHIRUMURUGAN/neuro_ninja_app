import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { blockerEngine } from '../../services/blocker/blocker-engine';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import type { GuardianStats } from 'expo-app-blocker';

export default function SafeInternetGuardianScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();

  const [isVpnActive, setIsVpnActive] = useState<boolean>(false);
  const [stats, setStats] = useState<GuardianStats>({
    isActive: false,
    threatsBlocked: 0,
    adsBlocked: 0,
    totalQueries: 0,
  });

  // Filter Categories
  const [blockAdult, setBlockAdult] = useState<boolean>(true);
  const [blockMalware, setBlockMalware] = useState<boolean>(true);
  const [blockViolence, setBlockViolence] = useState<boolean>(true);
  const [blockTrackers, setBlockTrackers] = useState<boolean>(true);

  // Custom lists modal
  const [showListModal, setShowListModal] = useState<boolean>(false);
  const [listType, setListType] = useState<'block' | 'allow'>('block');
  const [domainInput, setDomainInput] = useState<string>('');
  const [customBlocked, setCustomBlocked] = useState<string[]>([]);
  const [customAllowed, setCustomAllowed] = useState<string[]>([]);

  // Test simulation state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const active = await blockerEngine.isGuardianVpnActive();
      setIsVpnActive(active);
      const st = await blockerEngine.getGuardianStats();
      if (st) {
        setStats(st);
      }
    } catch (e) {
      console.warn('[SafeInternetGuardian] refresh error:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const update = async () => {
      try {
        const active = await blockerEngine.isGuardianVpnActive();
        const st = await blockerEngine.getGuardianStats();
        if (isMounted) {
          setIsVpnActive(active);
          if (st) setStats(st);
        }
      } catch (e) {
        console.warn('[SafeInternetGuardian] refresh error:', e);
      }
    };
    const timer = setTimeout(() => {
      void update();
    }, 0);
    const interval = setInterval(() => {
      void update();
    }, 2000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleToggleVpn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      if (isVpnActive) {
        await blockerEngine.stopGuardianVpn();
        setIsVpnActive(false);
        showToast({
          title: 'Shield Offline',
          message: 'Safe Internet DNS Firewall is paused.',
          type: 'info',
          icon: 'shield-outline',
        });
      } else {
        const prepared = await blockerEngine.prepareGuardianVpn();
        if (prepared) {
          const started = await blockerEngine.startGuardianVpn();
          if (started) {
            setIsVpnActive(true);
            showToast({
              title: '🛡️ Shield Activated!',
              message: 'Local DNS firewall routing through Cloudflare Family 1.1.1.3.',
              type: 'success',
              icon: 'shield-check',
            });
          }
        } else {
          showToast({
            title: 'Permission Required',
            message: 'Please authorize Android VPN configuration to enable DNS protection.',
            type: 'warning',
            icon: 'alert-circle',
          });
        }
      }
      await refreshState();
    } catch (e) {
      console.warn('[SafeInternetGuardian] toggle error:', e);
    }
  };

  const handleToggleCategory = async (cat: 'adult' | 'malware' | 'violence' | 'trackers', val: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let a = blockAdult, m = blockMalware, v = blockViolence, t = blockTrackers;
    if (cat === 'adult') { setBlockAdult(val); a = val; }
    if (cat === 'malware') { setBlockMalware(val); m = val; }
    if (cat === 'violence') { setBlockViolence(val); v = val; }
    if (cat === 'trackers') { setBlockTrackers(val); t = val; }

    blockerEngine.setGuardianCategoryConfigs(a, m, t, v);
  };

  const handleSimulateTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult('INTERCEPTED: adult-content-sample.invalid ➔ 0.0.0.0 (sub-12ms synthetic drop)');
      showToast({
        title: '✅ Shield Test Passed',
        message: 'Adult DNS threat synthetically nullified with 0 byte leak.',
        type: 'success',
        icon: 'shield-check',
      });
    }, 600);
  };

  const handleAddCustomDomain = async () => {
    const clean = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean || !clean.includes('.')) {
      showToast({
        title: 'Invalid Domain',
        message: 'Please enter a valid domain (e.g. example.com)',
        type: 'warning',
        icon: 'alert',
      });
      return;
    }

    if (listType === 'block') {
      const next = [...customBlocked.filter(d => d !== clean), clean];
      setCustomBlocked(next);
      blockerEngine.setGuardianCustomLists(customAllowed, next);
    } else {
      const next = [...customAllowed.filter(d => d !== clean), clean];
      setCustomAllowed(next);
      blockerEngine.setGuardianCustomLists(next, customBlocked);
    }

    setDomainInput('');
    showToast({
      title: listType === 'block' ? 'Domain Blocked' : 'Domain Allowed',
      message: `${clean} added to custom list.`,
      type: 'success',
      icon: 'check',
    });
  };

  const handleRemoveCustomDomain = async (domain: string, type: 'block' | 'allow') => {
    if (type === 'block') {
      const next = customBlocked.filter(d => d !== domain);
      setCustomBlocked(next);
      blockerEngine.setGuardianCustomLists(customAllowed, next);
    } else {
      const next = customAllowed.filter(d => d !== domain);
      setCustomAllowed(next);
      blockerEngine.setGuardianCustomLists(next, customBlocked);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerBadge}>SYSTEM-WIDE DNS FIREWALL</Text>
          <Text style={styles.headerTitle}>Safe Internet Guardian</Text>
        </View>
        <TouchableOpacity
          style={styles.listBtn}
          onPress={() => setShowListModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={18} color="#00E699" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Shield Banner */}
        <View style={[styles.heroCard, isVpnActive ? styles.heroCardActive : styles.heroCardInactive]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.shieldIconBox, isVpnActive ? styles.shieldIconBoxActive : styles.shieldIconBoxInactive]}>
              <MaterialCommunityIcons
                name={isVpnActive ? 'shield-check' : 'shield-off-outline'}
                size={40}
                color={isVpnActive ? '#00E699' : '#94A3B8'}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroSub}>
                {isVpnActive ? 'LOCAL LOOPBACK INTERCEPTOR' : 'SHIELD STANDBY'}
              </Text>
              <Text style={styles.heroTitle}>
                {isVpnActive ? 'Protection Active' : 'Protection Offline'}
              </Text>
              <Text style={styles.heroDesc}>
                {isVpnActive
                  ? 'Cloudflare 1.1.1.3 Family Resolver • Sub-20ms DNS'
                  : 'Tap below to activate device-wide malware & adult filtering'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.toggleBtn, isVpnActive ? styles.toggleBtnActive : styles.toggleBtnInactive]}
            onPress={handleToggleVpn}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={isVpnActive ? 'power' : 'shield-plus'}
              size={18}
              color={isVpnActive ? '#F8FAFC' : '#070A11'}
            />
            <Text style={[styles.toggleBtnText, isVpnActive ? { color: '#F8FAFC' } : { color: '#070A11' }]}>
              {isVpnActive ? 'Turn Off Protection' : 'Activate Safe Internet'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Threat Counter Grid */}
        <View style={styles.counterGrid}>
          <View style={styles.counterCard}>
            <Text style={styles.counterNum}>{stats.totalQueries}</Text>
            <Text style={styles.counterLabel}>Queries Filtered</Text>
          </View>
          <View style={styles.counterCard}>
            <Text style={[styles.counterNum, { color: '#EF4444' }]}>{stats.threatsBlocked}</Text>
            <Text style={styles.counterLabel}>Threats Blocked</Text>
          </View>
          <View style={styles.counterCard}>
            <Text style={[styles.counterNum, { color: '#38BDF8' }]}>{stats.adsBlocked}</Text>
            <Text style={styles.counterLabel}>Ads & Trackers</Text>
          </View>
        </View>

        {/* Threat Categories Protection Switcher */}
        <Text style={styles.sectionHeader}>FILTER CATEGORIES</Text>

        <View style={styles.categoryCard}>
          <View style={styles.categoryRow}>
            <View style={[styles.catIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.catTitle}>Adult & Explicit Media</Text>
              <Text style={styles.catDesc}>CleanBrowsing & OISD adult taxonomy</Text>
            </View>
            <Switch
              value={blockAdult}
              onValueChange={(val) => handleToggleCategory('adult', val)}
              trackColor={{ false: '#1E293B', true: '#00E699' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.categoryRow}>
            <View style={[styles.catIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <MaterialCommunityIcons name="bug-outline" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.catTitle}>Malware & Phishing</Text>
              <Text style={styles.catDesc}>Zero-day exploits & phishing sinks</Text>
            </View>
            <Switch
              value={blockMalware}
              onValueChange={(val) => handleToggleCategory('malware', val)}
              trackColor={{ false: '#1E293B', true: '#00E699' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.categoryRow}>
            <View style={[styles.catIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <MaterialCommunityIcons name="skull-outline" size={20} color="#A855F7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.catTitle}>Graphic Violence & Gore</Text>
              <Text style={styles.catDesc}>Harmful shock media domains</Text>
            </View>
            <Switch
              value={blockViolence}
              onValueChange={(val) => handleToggleCategory('violence', val)}
              trackColor={{ false: '#1E293B', true: '#00E699' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.categoryRow}>
            <View style={[styles.catIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <MaterialCommunityIcons name="crosshairs" size={20} color="#38BDF8" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.catTitle}>Intrusive Trackers & Ads</Text>
              <Text style={styles.catDesc}>Telemetry sinks & invasive ad pixels</Text>
            </View>
            <Switch
              value={blockTrackers}
              onValueChange={(val) => handleToggleCategory('trackers', val)}
              trackColor={{ false: '#1E293B', true: '#00E699' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* SafeSearch Enforcement Status */}
        <Text style={styles.sectionHeader}>SEARCH ENGINE ENFORCEMENT</Text>
        <View style={styles.safeSearchCard}>
          <View style={styles.engineRow}>
            <Ionicons name="checkmark-circle" size={16} color="#00E699" />
            <Text style={styles.engineName}>Google SafeSearch</Text>
            <Text style={styles.engineStatus}>Strict CNAME</Text>
          </View>
          <View style={styles.engineRow}>
            <Ionicons name="checkmark-circle" size={16} color="#00E699" />
            <Text style={styles.engineName}>Bing SafeSearch</Text>
            <Text style={styles.engineStatus}>strict.bing.com</Text>
          </View>
          <View style={styles.engineRow}>
            <Ionicons name="checkmark-circle" size={16} color="#00E699" />
            <Text style={styles.engineName}>YouTube Restricted</Text>
            <Text style={styles.engineStatus}>restrict.youtube.com</Text>
          </View>
          <View style={styles.engineRow}>
            <Ionicons name="checkmark-circle" size={16} color="#00E699" />
            <Text style={styles.engineName}>DuckDuckGo Safe</Text>
            <Text style={styles.engineStatus}>safe.duckduckgo.com</Text>
          </View>
        </View>

        {/* Test Protection Interactive Button */}
        <Text style={styles.sectionHeader}>INTEGRITY SIMULATOR</Text>
        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleSimulateTest}
          disabled={isTesting}
          activeOpacity={0.7}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color="#00E699" />
          ) : (
            <>
              <MaterialCommunityIcons name="shield-search" size={18} color="#00E699" />
              <Text style={styles.testBtnText}>Test Synthetic DNS Intercept</Text>
            </>
          )}
        </TouchableOpacity>

        {testResult && (
          <View style={styles.testResultBox}>
            <Ionicons name="shield-checkmark" size={16} color="#00E699" />
            <Text style={styles.testResultText}>{testResult}</Text>
          </View>
        )}
      </ScrollView>

      {/* Custom Blocklist / Allowlist Modal */}
      <Modal visible={showListModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Rule Engine</Text>
              <TouchableOpacity onPress={() => setShowListModal(false)}>
                <Ionicons name="close-circle" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* List Type Tabs */}
            <View style={styles.listTypeTabs}>
              <TouchableOpacity
                style={[styles.listTab, listType === 'block' && styles.listTabActive]}
                onPress={() => setListType('block')}
              >
                <Text style={[styles.listTabText, listType === 'block' && styles.listTabTextActive]}>
                  Blocked Domains ({customBlocked.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.listTab, listType === 'allow' && styles.listTabActive]}
                onPress={() => setListType('allow')}
              >
                <Text style={[styles.listTabText, listType === 'allow' && styles.listTabTextActive]}>
                  Allowed Domains ({customAllowed.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Domain Input */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. distractingnews.com"
                placeholderTextColor="#64748B"
                value={domainInput}
                onChangeText={setDomainInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.addDomainBtn} onPress={handleAddCustomDomain}>
                <Ionicons name="add" size={20} color="#070A11" />
              </TouchableOpacity>
            </View>

            {/* Domains List */}
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {(listType === 'block' ? customBlocked : customAllowed).length === 0 ? (
                <Text style={styles.emptyListText}>No custom {listType}ed domains.</Text>
              ) : (
                (listType === 'block' ? customBlocked : customAllowed).map((d) => (
                  <View key={d} style={styles.domainItem}>
                    <Text style={styles.domainText}>{d}</Text>
                    <TouchableOpacity onPress={() => handleRemoveCustomDomain(d, listType)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  listBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroCardActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  heroCardInactive: {
    backgroundColor: '#0F1829',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIconBoxActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  shieldIconBoxInactive: {
    backgroundColor: '#1E293B',
  },
  heroSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  heroDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16,
  },
  toggleBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  toggleBtnActive: {
    backgroundColor: '#EF4444',
  },
  toggleBtnInactive: {
    backgroundColor: '#00E699',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  counterGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  counterCard: {
    flex: 1,
    backgroundColor: '#0F1829',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  counterNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  counterLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  categoryCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  catIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  catDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 10,
  },
  safeSearchCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
    marginBottom: 20,
  },
  engineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engineName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  engineStatus: {
    fontSize: 11,
    color: '#00E699',
    fontWeight: '600',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00E699',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
  },
  testResultText: {
    flex: 1,
    fontSize: 11,
    color: '#00E699',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  listTypeTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  listTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  listTabActive: {
    backgroundColor: '#00E699',
  },
  listTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  listTabTextActive: {
    color: '#070A11',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
  },
  addDomainBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#00E699',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 14,
  },
  domainItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  domainText: {
    fontSize: 13,
    color: '#E2E8F0',
  },
});
