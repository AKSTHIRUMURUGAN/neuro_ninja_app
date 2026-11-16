import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  AppState,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../../constants/theme';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import { blockerEngine } from '../../services/blocker/blocker-engine';
import { launchApplication } from '../../services/launcher/launcher-service';
import { sanitizeDopamineAlert } from '../../services/notifications/notification-firewall';
import { AppIcon } from '../../components/ui/app-icon';
import type { SuppressedNotification, AndroidBlockableApp } from 'expo-app-blocker';

export default function NotificationIntelligenceScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();

  // Native Service State
  const [isListenerGranted, setIsListenerGranted] = useState<boolean>(true);
  const [filterEnabled, setFilterEnabled] = useState<boolean>(true);
  const [suppressAllNonVip, setSuppressAllNonVip] = useState<boolean>(true);
  const [dopamineObfuscation, setDopamineObfuscation] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<SuppressedNotification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedAppFilter, setSelectedAppFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // VIP Whitelist State
  const [vipPackages, setVipPackages] = useState<string[]>([]);
  const [showVipModal, setShowVipModal] = useState<boolean>(false);
  const [installedApps, setInstalledApps] = useState<AndroidBlockableApp[]>([]);
  const [vipSearchQuery, setVipSearchQuery] = useState<string>('');

  const fetchVaultData = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const [granted, items, isFiltering, isAllNonVip, vips] = await Promise.all([
        blockerEngine.isNotificationListenerGranted(),
        blockerEngine.getSuppressedNotifications(),
        Promise.resolve(blockerEngine.isNotificationFilterEnabled()),
        Promise.resolve(blockerEngine.isSuppressAllNonVip()),
        Promise.resolve(blockerEngine.getVipPackages()),
      ]);
      setIsListenerGranted(granted);
      setNotifications(items || []);
      setFilterEnabled(isFiltering);
      setSuppressAllNonVip(isAllNonVip);
      setVipPackages(vips || []);
    } catch (e) {
      console.warn('[NotificationVault] Failed to load native data:', e);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    const initializeVault = async () => {
      if (Platform.OS !== 'android') return;
      try {
        const [granted, items, isFiltering, isAllNonVip, vips] = await Promise.all([
          blockerEngine.isNotificationListenerGranted(),
          blockerEngine.getSuppressedNotifications(),
          Promise.resolve(blockerEngine.isNotificationFilterEnabled()),
          Promise.resolve(blockerEngine.isSuppressAllNonVip()),
          Promise.resolve(blockerEngine.getVipPackages()),
        ]);
        if (isSubscribed) {
          setIsListenerGranted(granted);
          setNotifications(items || []);
          setFilterEnabled(isFiltering);
          setSuppressAllNonVip(isAllNonVip);
          setVipPackages(vips || []);
        }
      } catch (e) {
        console.warn('[NotificationVault] Failed to load native data:', e);
      }
    };
    void initializeVault();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void initializeVault();
      }
    });

    return () => {
      isSubscribed = false;
      sub.remove();
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchVaultData();
    setIsRefreshing(false);
  };

  const handleOpenListenerSettings = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    blockerEngine.openNotificationListenerSettings();
  };

  const handleToggleFilter = (val: boolean) => {
    setFilterEnabled(val);
    blockerEngine.setNotificationFilterEnabled(val);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast({
      title: val ? 'Notification Shield Active' : 'Notification Shield Paused',
      message: val
        ? 'Notifications will be intercepted and held in this vault.'
        : 'Notifications will pass through to system shade.',
      type: val ? 'success' : 'info',
      icon: val ? 'shield-check' : 'shield-off',
    });
  };

  const handleToggleSuppressAllNonVip = (val: boolean) => {
    setSuppressAllNonVip(val);
    blockerEngine.setSuppressAllNonVip(val);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast({
      title: val ? 'Regain Mode Enabled' : 'Blocked Apps Only Mode',
      message: val
        ? 'All non-VIP notifications will be held silently in your vault.'
        : 'Only notifications from apps in your Armory blocklist will be held.',
      type: val ? 'success' : 'info',
      icon: val ? 'filter-variant-plus' : 'filter-variant',
    });
  };

  const handleQuickWhitelist = (pkg: string, appName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = [...vipPackages.filter((p) => p !== pkg), pkg];
    setVipPackages(updated);
    blockerEngine.setVipPackages(updated);
    showToast({
      title: `${appName} Whitelisted`,
      message: 'Future notifications from this app will bypass the shield with sound & banners.',
      type: 'success',
      icon: 'shield-star',
    });
  };

  const handleClearAll = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    blockerEngine.clearAllSuppressedNotifications();
    setNotifications([]);
    showToast({
      title: 'Vault Cleared',
      message: 'All held notifications have been permanently cleared.',
      type: 'info',
      icon: 'delete-sweep',
    });
  };

  const handleDismiss = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    blockerEngine.clearSuppressedNotification(id);
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const handleLaunchApp = (pkg: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    launchApplication(pkg);
  };

  const openVipManager = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowVipModal(true);
    if (installedApps.length === 0) {
      const apps = await blockerEngine.getInstalledApps(false);
      setInstalledApps(apps);
    }
  };

  const handleToggleVip = (pkg: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let updated: string[];
    if (vipPackages.includes(pkg)) {
      updated = vipPackages.filter((p) => p !== pkg);
    } else {
      updated = [...vipPackages, pkg];
    }
    setVipPackages(updated);
    blockerEngine.setVipPackages(updated);
  };

  // Distinct apps in notifications for tab filter
  const distinctApps = useMemo(() => {
    const map = new Map<string, string>();
    notifications.forEach((n) => {
      if (n.packageName && n.appName) {
        map.set(n.packageName, n.appName);
      }
    });
    return Array.from(map.entries()).map(([pkg, name]) => ({ pkg, name }));
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (selectedAppFilter !== 'ALL' && n.packageName !== selectedAppFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesBody = n.body?.toLowerCase().includes(q);
        const matchesApp = n.appName?.toLowerCase().includes(q);
        return matchesTitle || matchesBody || matchesApp;
      }
      return true;
    });
  }, [notifications, selectedAppFilter, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>REGAIN / DAYWISE PARITY</Text>
          <Text style={styles.title}>Notification Vault</Text>
        </View>
        <TouchableOpacity style={styles.vipBtn} onPress={openVipManager}>
          <MaterialCommunityIcons name="shield-star" size={18} color="#00E699" />
          <Text style={styles.vipBtnText}>VIP Apps</Text>
        </TouchableOpacity>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00E699" />
        }
      >
        {/* Permission Banner if not granted */}
        {!isListenerGranted && (
          <TouchableOpacity style={styles.permBanner} onPress={handleOpenListenerSettings}>
            <View style={styles.permIconBox}>
              <MaterialCommunityIcons name="bell-alert" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.permTitle}>Notification Access Required</Text>
              <Text style={styles.permSub}>
                Tap to grant permission so NeuroNinja can intercept, mute, and hold distracting alerts.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Master Control Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>SHIELD ENGINE CONFIGURATION</Text>

          <View style={styles.row}>
            <MaterialCommunityIcons name="bell-cancel" size={22} color="#00E699" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Notification Firewall Active</Text>
              <Text style={styles.rowSub}>
                Mutes chimes, removes banners, and holds alerts silently in this vault
              </Text>
            </View>
            <Switch
              value={filterEnabled}
              onValueChange={handleToggleFilter}
              thumbColor={filterEnabled ? '#00E699' : '#64748B'}
              trackColor={{ false: '#334155', true: '#0F291E' }}
            />
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="filter-variant-plus" size={22} color="#818CF8" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Regain Mode (Hold All Except VIP)</Text>
              <Text style={styles.rowSub}>
                Silences all apps. Only critical calls, alarms, and your VIP apps reach you
              </Text>
            </View>
            <Switch
              value={suppressAllNonVip}
              onValueChange={handleToggleSuppressAllNonVip}
              thumbColor={suppressAllNonVip ? '#818CF8' : '#64748B'}
              trackColor={{ false: '#334155', true: '#1E1B4B' }}
            />
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="shield-sun" size={22} color="#06B6D4" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Dopamine Text Obfuscation</Text>
              <Text style={styles.rowSub}>
                Strips clickbait hooks and sensational previews into calm badges
              </Text>
            </View>
            <Switch
              value={dopamineObfuscation}
              onValueChange={setDopamineObfuscation}
              thumbColor={dopamineObfuscation ? '#06B6D4' : '#64748B'}
              trackColor={{ false: '#334155', true: '#083344' }}
            />
          </View>
        </View>

        {/* Status Digest Card */}
        <View style={styles.digestCard}>
          <View style={styles.digestHeader}>
            <MaterialCommunityIcons name="shield-lock-outline" size={26} color="#00E699" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.digestBadge}>STATUS BAR CONSOLIDATION</Text>
              <Text style={styles.digestTitle}>
                {notifications.length === 0
                  ? 'All Calm • Shield Active'
                  : `${notifications.length} Alerts Held Across ${distinctApps.length} Apps`}
              </Text>
            </View>
          </View>
          <Text style={styles.digestBody}>
            {notifications.length === 0
              ? 'Zero notification chimes or buzzes have interrupted you today. Blocked apps are silenced in the background.'
              : 'Notifications are summarized into a single quiet NeuroNinja notification in your status bar instead of 20+ dopamine pings.'}
          </Text>
        </View>

        {/* Filter Pills */}
        {distinctApps.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillContainer}
          >
            <TouchableOpacity
              style={[
                styles.pill,
                selectedAppFilter === 'ALL' && styles.pillActive,
              ]}
              onPress={() => setSelectedAppFilter('ALL')}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedAppFilter === 'ALL' && styles.pillTextActive,
                ]}
              >
                All ({notifications.length})
              </Text>
            </TouchableOpacity>

            {distinctApps.map(({ pkg, name }) => {
              const count = notifications.filter((n) => n.packageName === pkg).length;
              const isActive = selectedAppFilter === pkg;
              return (
                <TouchableOpacity
                  key={pkg}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => setSelectedAppFilter(pkg)}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Search Bar if multiple notifications */}
        {notifications.length > 3 && (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search held notifications..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Notifications List */}
        <View style={styles.inboxSection}>
          <View style={styles.inboxHeader}>
            <Text style={styles.inboxTitle}>
              Held Notifications ({filteredNotifications.length})
            </Text>
            <Text style={styles.inboxSub}>Intercepted & Protected</Text>
          </View>

          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="bell-check-outline" size={36} color="#00E699" />
              <Text style={styles.emptyTitle}>Zero Distraction Noise</Text>
              <Text style={styles.emptySub}>
                {notifications.length === 0
                  ? 'No notifications currently held. When blocked apps fire alerts, they will appear here silently.'
                  : 'No notifications match your current filter.'}
              </Text>
            </View>
          ) : (
            filteredNotifications.map((n) => {
              const clean = dopamineObfuscation
                ? sanitizeDopamineAlert(n.title, n.body, n.appName)
                : { cleanTitle: n.title, cleanBody: n.body };

              return (
                <View key={n.id} style={styles.notifCard}>
                  <View style={styles.notifIconWrapper}>
                    <AppIcon packageName={n.packageName} appName={n.appName} size={36} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.notifTop}>
                      <Text style={styles.notifApp}>{n.appName}</Text>
                      <Text style={styles.notifTime}>{n.formattedTime}</Text>
                    </View>
                    <Text style={styles.notifTitle}>{clean.cleanTitle}</Text>
                    {clean.cleanBody ? (
                      <Text style={styles.notifBody} numberOfLines={3}>
                        {clean.cleanBody}
                      </Text>
                    ) : null}

                    {/* Quick Action Row (Regain / Daywise Parity) */}
                    <View style={styles.notifActions}>
                      <TouchableOpacity
                        style={styles.openAppBtn}
                        onPress={() => handleLaunchApp(n.packageName)}
                      >
                        <MaterialCommunityIcons name="launch" size={14} color="#00E699" />
                        <Text style={styles.openAppText}>Open App</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.whitelistBtn}
                        onPress={() => handleQuickWhitelist(n.packageName, n.appName)}
                      >
                        <MaterialCommunityIcons name="shield-star-outline" size={14} color="#818CF8" />
                        <Text style={styles.whitelistText}>Allow Alerts (VIP)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dismissPillBtn}
                        onPress={() => void handleDismiss(n.id)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF4444" />
                        <Text style={styles.dismissPillText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => void handleDismiss(n.id)}
                  >
                    <Ionicons name="close" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* VIP Whitelist Management Modal */}
      <Modal
        visible={showVipModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVipModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalBadge}>BYPASS RULES</Text>
                <Text style={styles.modalTitle}>VIP App Whitelist</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowVipModal(false)}
              >
                <Ionicons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              VIP apps bypass notification suppression completely. Their alerts, rings, and vibrations will never be held.
            </Text>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search installed apps..."
                placeholderTextColor="#64748B"
                value={vipSearchQuery}
                onChangeText={setVipSearchQuery}
              />
            </View>

            <ScrollView style={styles.vipList}>
              {installedApps
                .filter((app) =>
                  vipSearchQuery.trim()
                    ? app.name.toLowerCase().includes(vipSearchQuery.toLowerCase()) ||
                      app.packageName.toLowerCase().includes(vipSearchQuery.toLowerCase())
                    : true
                )
                .map((app) => {
                  const isVip = vipPackages.includes(app.packageName);
                  return (
                    <View key={app.packageName} style={styles.vipRow}>
                      <AppIcon packageName={app.packageName} appName={app.name} size={32} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.vipAppName}>{app.name}</Text>
                        <Text style={styles.vipAppPkg} numberOfLines={1}>
                          {app.packageName}
                        </Text>
                      </View>
                      <Switch
                        value={isVip}
                        onValueChange={() => handleToggleVip(app.packageName)}
                        thumbColor={isVip ? '#00E699' : '#64748B'}
                        trackColor={{ false: '#334155', true: '#0F291E' }}
                      />
                    </View>
                  );
                })}
            </ScrollView>
          </View>
        </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  badge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  vipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    marginRight: 8,
  },
  vipBtnText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
  clearBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  permIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  permSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: NinjaPalette.emerald,
    letterSpacing: 1.5,
    marginBottom: 10,
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
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    marginTop: 2,
  },
  digestCard: {
    backgroundColor: '#0B132B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    marginBottom: 16,
  },
  digestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  digestBadge: {
    color: '#00E699',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  digestTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  digestBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 10,
  },
  pillScroll: {
    marginBottom: 16,
  },
  pillContainer: {
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.2)',
    borderColor: '#00E699',
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#00E699',
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#F8FAFC',
    fontSize: 13,
  },
  inboxSection: {
    marginTop: 8,
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  inboxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  inboxSub: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'flex-start',
  },
  notifIconWrapper: {
    marginTop: 2,
  },
  notifTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifApp: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00E699',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notifTime: {
    fontSize: 10,
    color: '#64748B',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 3,
  },
  notifBody: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  notifActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  openAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
  },
  openAppText: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '700',
  },
  whitelistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.25)',
  },
  whitelistText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
  },
  dismissPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dismissPillText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  dismissBtn: {
    padding: 6,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#070A11',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBadge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#F8FAFC',
    fontSize: 13,
  },
  vipList: {
    flex: 1,
  },
  vipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  vipAppName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  vipAppPkg: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
