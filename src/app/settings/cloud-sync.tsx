import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../../constants/theme';
import { useNinjaAlert } from '../../context/ninja-alert-context';
import {
  syncEngine,
  type SyncStatus,
  DEFAULT_PRODUCTION_API_URL,
} from '../../services/sync/sync-engine';

export default function CloudSyncSettingsScreen() {
  const router = useRouter();
  const { showToast, showAlert } = useNinjaAlert();

  const [status, setStatus] = useState<SyncStatus>({
    state: 'idle',
    pendingCount: 0,
    lastSyncedAt: null,
    user: null,
    apiUrl: DEFAULT_PRODUCTION_API_URL,
  });

  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(DEFAULT_PRODUCTION_API_URL);

  // Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await syncEngine.syncNow();
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        title: 'Sync Complete',
        message: `Cloud synchronized with production server. (${result.syncedItems} local changes pushed).`,
        type: 'success',
        icon: 'cloud-check',
      });
    } else {
      showToast({
        title: 'Sync Deferred',
        message: result.error || 'Server unreachable or offline. Local records safe.',
        type: 'info',
        icon: 'cloud-off-outline',
      });
    }
  };

  const handleAuthSubmit = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please enter both email and password.',
        type: 'warning',
        icon: 'alert-circle',
      });
      return;
    }

    setIsSubmittingAuth(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (authMode === 'login') {
      const res = await syncEngine.login(emailInput, passwordInput);
      setIsSubmittingAuth(false);
      if (res.success) {
        setShowAuthModal(false);
        showToast({
          title: 'Connected to Cloud',
          message: 'Signed in successfully. Cloud sync is active.',
          type: 'success',
          icon: 'check-circle',
        });
      } else {
        showAlert({
          title: 'Sign In Failed',
          message: res.error || 'Could not log in to production server.',
          type: 'error',
          icon: 'alert-circle',
        });
      }
    } else {
      if (!nameInput.trim()) {
        setIsSubmittingAuth(false);
        showAlert({
          title: 'Name Required',
          message: 'Please enter your name.',
          type: 'warning',
          icon: 'account',
        });
        return;
      }
      const res = await syncEngine.register(emailInput, passwordInput, nameInput);
      setIsSubmittingAuth(false);
      if (res.success) {
        setShowAuthModal(false);
        showToast({
          title: 'Account Created',
          message: 'Registration successful. Cloud sync is active.',
          type: 'success',
          icon: 'check-circle',
        });
      } else {
        showAlert({
          title: 'Registration Failed',
          message: res.error || 'Could not register on production server.',
          type: 'error',
          icon: 'alert-circle',
        });
      }
    }
  };

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncEngine.logout();
    showToast({
      title: 'Disconnected',
      message: 'Logged out. Local changes will remain offline.',
      type: 'info',
      icon: 'logout',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>OFFLINE-FIRST CLOUD SYNC</Text>
          <Text style={styles.title}>Cloud Connect</Text>
        </View>
        <TouchableOpacity style={styles.syncTopBtn} onPress={handleTriggerSync}>
          <MaterialCommunityIcons
            name={status.state === 'syncing' ? 'loading' : 'cloud-sync'}
            size={20}
            color="#00E699"
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status Hero Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status.state === 'syncing'
                      ? '#38BDF8'
                      : status.user
                      ? '#00E699'
                      : '#F59E0B',
                },
              ]}
            />
            <Text style={styles.statusLabel}>
              {status.state === 'syncing'
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
              ? 'All your Notes, Journals, and Finances save locally in 0ms and sync to your production web app whenever network is available.'
              : 'Your data is safely stored in local offline SQLite. Sign in with your NeuroNinja web account to sync seamlessly across mobile & desktop.'}
          </Text>

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
                <TouchableOpacity style={styles.syncBtn} onPress={handleTriggerSync}>
                  <MaterialCommunityIcons name="cloud-sync-outline" size={18} color="#070A11" />
                  <Text style={styles.syncBtnText}>Sync Now</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
              >
                <MaterialCommunityIcons name="cloud-lock-outline" size={18} color="#070A11" />
                <Text style={styles.connectBtnText}>Sign In with Web Account</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Server Endpoint Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>PRODUCTION ENDPOINT CONFIGURATION</Text>

          {isEditingUrl ? (
            <View style={styles.urlEditBox}>
              <TextInput
                style={styles.urlInput}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://your-production-url.com"
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
                <Text style={styles.urlLabel}>REST API Endpoint</Text>
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

          <Text style={styles.cardNote}>
            Points to your live Next.js backend for `/api/notes`, `/api/journal`, `/api/expenses`, and `/api/auth`.
          </Text>
        </View>

        {/* Architecture Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>LOCAL-FIRST CAPABILITIES</Text>

          <View style={styles.featureRow}>
            <MaterialCommunityIcons name="flash-outline" size={20} color="#00E699" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.featureTitle}>0ms Instant Local Writes</Text>
              <Text style={styles.featureDesc}>
                All notes, journals, and expense entries commit to device SQLite instantly without waiting for network.
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <MaterialCommunityIcons name="tray-full" size={20} color="#38BDF8" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.featureTitle}>Durable Outbox Queue</Text>
              <Text style={styles.featureDesc}>
                Offline mutations are safely queued and automatically drain in sequential order when you reconnect.
              </Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <MaterialCommunityIcons name="scale-balance" size={20} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.featureTitle}>Last-Write-Wins Conflict Resolution</Text>
              <Text style={styles.featureDesc}>
                Client UUIDs and timestamps prevent duplication and preserve the freshest edit across devices.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Cloud Authentication Modal */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAuthModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalBadge}>NEURONINJA CLOUD</Text>
                <Text style={styles.modalTitle}>
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowAuthModal(false)}
              >
                <Ionicons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {authMode === 'login'
                ? 'Sign in with your NeuroNinja web credentials to sync your entire productivity suite.'
                : 'Create a new account on your production backend.'}
            </Text>

            {authMode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Master Ninja"
                  placeholderTextColor="#64748B"
                  value={nameInput}
                  onChangeText={setNameInput}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="ninja@neuronninja.com"
                placeholderTextColor="#64748B"
                value={emailInput}
                onChangeText={setEmailInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#64748B"
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAuthSubmit}
              disabled={isSubmittingAuth}
            >
              {isSubmittingAuth ? (
                <ActivityIndicator size="small" color="#070A11" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {authMode === 'login' ? 'Connect Account' : 'Register & Connect'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleModeBtn}
              onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              <Text style={styles.toggleModeText}>
                {authMode === 'login'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
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
  syncTopBtn: {
    padding: 8,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#0B132B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.2,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  statusDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statTag: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
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
    gap: 6,
    backgroundColor: '#00E699',
    paddingVertical: 12,
    borderRadius: 12,
  },
  syncBtnText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  connectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectBtnText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
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
    marginBottom: 12,
  },
  urlDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  urlLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  urlValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  editUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
  },
  editUrlText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '700',
  },
  urlEditBox: {
    gap: 10,
  },
  urlInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 13,
  },
  urlEditBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#00E699',
  },
  saveBtnText: {
    color: '#070A11',
    fontSize: 12,
    fontWeight: '800',
  },
  cardNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  featureDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
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
    marginTop: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBadge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 22,
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
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F1829',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  submitBtn: {
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
  },
  toggleModeBtn: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  toggleModeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
});
