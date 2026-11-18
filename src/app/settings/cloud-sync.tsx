import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import { useNinjaBack } from '../../hooks/use-ninja-back';
import {
  syncEngine,
  type SyncStatus,
  DEFAULT_PRODUCTION_API_URL,
} from '../../services/sync/sync-engine';
import { SyncAuthModal } from '../../components/sync/SyncAuthModal';

export default function CloudSyncSettingsScreen() {
  const { showToast } = useNinjaAlert();
  const { handleSmartBack } = useNinjaBack({
    fallbackRoute: '/(tabs)/settings',
  });

  const [status, setStatus] = useState<SyncStatus>({
    state: 'idle',
    pendingCount: 0,
    lastSyncedAt: null,
    user: null,
    apiUrl: DEFAULT_PRODUCTION_API_URL,
  });

  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(DEFAULT_PRODUCTION_API_URL);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
      setUrlInput(newStatus.apiUrl);
    });
    return unsubscribe;
  }, []);

  const handleSaveApiUrl = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await syncEngine.setApiUrl(urlInput);
    setIsEditingUrl(false);
    showToast({
      title: 'Server URL Updated',
      message: `Sync endpoint configured to ${urlInput}`,
      type: 'success',
      icon: 'server-network',
    });
  };

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await syncEngine.syncNow();
    setIsSyncing(false);

    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        title: 'Sync Complete',
        message: `Synced with https://neuroninja.vercel.app (${result.syncedItems} local changes pushed).`,
        type: 'success',
        icon: 'cloud-check',
      });
    } else {
      showToast({
        title: 'Sync Deferred',
        message: result.error || 'Server offline. Local records remain safe.',
        type: 'info',
        icon: 'cloud-off-outline',
      });
    }
  };

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncEngine.logout();
    showToast({
      title: 'Disconnected',
      message: 'Account signed out. Local data preserved offline.',
      type: 'info',
      icon: 'logout',
    });
  };

  const handleOpenWeb = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await WebBrowser.openBrowserAsync('https://neuroninja.vercel.app');
    } catch {
      showToast({
        title: 'Open Web',
        message: 'Visit https://neuroninja.vercel.app in your browser',
        type: 'info',
        icon: 'open-in-new',
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>OFFLINE-FIRST CLOUD SYNC</Text>
          <Text style={styles.title}>Cloud Connect</Text>
        </View>
        <TouchableOpacity
          style={styles.syncTopBtn}
          onPress={handleTriggerSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#00E699" />
          ) : (
            <MaterialCommunityIcons name="cloud-sync" size={20} color="#00E699" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Hero Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status.state === 'syncing' || isSyncing
                      ? '#38BDF8'
                      : status.user
                      ? '#00E699'
                      : '#F59E0B',
                },
              ]}
            />
            <Text style={styles.statusLabel}>
              {status.state === 'syncing' || isSyncing
                ? 'SYNCHRONIZING WITH CLOUD...'
                : status.user
                ? `CONNECTED • ${status.user.email}`
                : 'OFFLINE MODE • LOCAL ONLY'}
            </Text>
          </View>

          <Text style={styles.statusTitle}>
            {status.user ? `Logged in as ${status.user.name}` : 'Not Connected to Cloud Account'}
          </Text>

          <Text style={styles.statusDesc}>
            {status.user
              ? 'Your Habits, LifeOS Tasks, and Finances save locally in 0ms and sync to your production web app whenever network is available.'
              : 'Your data is safely stored in local offline SQLite. Sign in with your NeuroNinja web account to sync seamlessly across mobile & desktop.'}
          </Text>

          {/* User Profile Strip if logged in */}
          {status.user && (
            <View style={styles.profileBadgeRow}>
              <View style={styles.profilePill}>
                <MaterialCommunityIcons name="shield-star" size={14} color="#38BDF8" />
                <Text style={styles.profilePillText}>Lvl {status.user.level || 1}</Text>
              </View>
              <View style={styles.profilePill}>
                <MaterialCommunityIcons name="star-shooting" size={14} color="#F59E0B" />
                <Text style={styles.profilePillText}>{status.user.xp || 0} XP</Text>
              </View>
              <View style={styles.profilePill}>
                <MaterialCommunityIcons name="gold" size={14} color="#FBBF24" />
                <Text style={styles.profilePillText}>{status.user.coins || 100} Coins</Text>
              </View>
              {status.user.provider && (
                <View style={[styles.profilePill, styles.providerPill]}>
                  <Text style={styles.providerPillText}>{status.user.provider.toUpperCase()}</Text>
                </View>
              )}
            </View>
          )}

          {/* Sync Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{status.pendingCount}</Text>
              <Text style={styles.statTag}>Pending Changes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {status.lastSyncedAt
                  ? new Date(status.lastSyncedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Never'}
              </Text>
              <Text style={styles.statTag}>Last Synced</Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            {status.user ? (
              <>
                <TouchableOpacity
                  style={[styles.syncBtn, isSyncing && { opacity: 0.7 }]}
                  onPress={handleTriggerSync}
                  disabled={isSyncing}
                >
                  <MaterialCommunityIcons name="cloud-sync-outline" size={18} color="#070A11" />
                  <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={() => setShowAuthModal(true)}
              >
                <MaterialCommunityIcons name="cloud-lock-outline" size={18} color="#070A11" />
                <Text style={styles.connectBtnText}>Connect Google or Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Web App Quick Link Card */}
        <View style={styles.card}>
          <View style={styles.webHeaderRow}>
            <MaterialCommunityIcons name="web" size={20} color="#38BDF8" />
            <Text style={styles.cardHeading}>PRODUCTION WEB APP</Text>
          </View>
          <Text style={styles.webDesc}>
            Access your full NeuroNinja suite on desktop, browser, or Chromebook with full cross-device synchronization:
          </Text>
          <TouchableOpacity style={styles.openWebBtn} onPress={handleOpenWeb}>
            <Text style={styles.openWebBtnText}>https://neuroninja.vercel.app</Text>
            <MaterialCommunityIcons name="open-in-new" size={16} color="#00E699" />
          </TouchableOpacity>
        </View>

        {/* Server Endpoint Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>REST API ENDPOINT</Text>

          {isEditingUrl ? (
            <View style={styles.urlEditBox}>
              <TextInput
                style={styles.urlInput}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://neuroninja.vercel.app"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.urlEditBtns}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setUrlInput(status.apiUrl);
                    setIsEditingUrl(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiUrl}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.urlDisplayRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.urlLabel}>Active Server</Text>
                <Text style={styles.urlValue} numberOfLines={1}>
                  {status.apiUrl}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editUrlBtn}
                onPress={() => setIsEditingUrl(true)}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#00E699" />
                <Text style={styles.editUrlText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Sync Guarantees */}
        <View style={styles.guaranteeCard}>
          <Text style={styles.guaranteeTitle}>Our Offline-First Guarantee</Text>
          <View style={styles.guaranteeItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#00E699" />
            <Text style={styles.guaranteeText}>
              Every action saves instantly to local SQLite first (0ms latency).
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#00E699" />
            <Text style={styles.guaranteeText}>
              You are never locked out of your apps or habits without internet.
            </Text>
          </View>
          <View style={styles.guaranteeItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#00E699" />
            <Text style={styles.guaranteeText}>
              No initial login required — connect only when you want cloud sync.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sync Auth Modal */}
      <SyncAuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => void handleTriggerSync()}
      />
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
    fontSize: 9,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  syncTopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#0B1220',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
    padding: 18,
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statusDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  profilePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  providerPill: {
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  providerPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#070A11',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00E699',
  },
  statTag: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    borderRadius: 14,
    height: 46,
    gap: 6,
  },
  syncBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  logoutBtn: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    height: 46,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  connectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    borderRadius: 14,
    height: 48,
    gap: 8,
  },
  connectBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  card: {
    backgroundColor: '#0B1220',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    gap: 10,
  },
  webHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.1,
  },
  webDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  openWebBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070A11',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  openWebBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00E699',
  },
  urlDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urlLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  urlValue: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '700',
  },
  editUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  editUrlText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E699',
  },
  urlEditBox: {
    gap: 10,
  },
  urlInput: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  urlEditBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F1829',
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#00E699',
  },
  saveBtnText: {
    fontSize: 12,
    color: '#070A11',
    fontWeight: '800',
  },
  guaranteeCard: {
    backgroundColor: '#0B1220',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.15)',
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00E699',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guaranteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guaranteeText: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 16,
  },
});
