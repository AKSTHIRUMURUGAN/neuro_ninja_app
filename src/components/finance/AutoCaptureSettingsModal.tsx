import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { financeIngestionEngine } from '../../services/finance/finance-ingestion-engine';
import { gmailSyncService } from '../../services/finance/gmail-sync-service';
import {
  drainNotificationsToEngine,
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
  requestSmsReadPermission,
  scanRecentSmsToEngine,
} from '../../services/finance/native-finance-bridge';

export interface AutoCaptureSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSynced: () => Promise<void>;
}

export function AutoCaptureSettingsModal({
  visible,
  onClose,
  onSynced,
}: AutoCaptureSettingsModalProps) {
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const [notif, token] = await Promise.all([
      isNotificationAccessEnabled(),
      gmailSyncService.getStoredToken(),
    ]);
    setNotifEnabled(notif);
    setGmailConnected(Boolean(token));
    await financeIngestionEngine.setSyncSourceState('notification_listener', notif);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void (async () => {
      const [notif, token] = await Promise.all([
        isNotificationAccessEnabled(),
        gmailSyncService.getStoredToken(),
      ]);
      if (!active) return;
      setNotifEnabled(notif);
      setGmailConnected(Boolean(token));
      await financeIngestionEngine.setSyncSourceState('notification_listener', notif);
    })();
    return () => {
      active = false;
    };
  }, [visible]);

  const handleClose = () => {
    setStatusMessage(null);
    onClose();
  };

  const handleOpenNotifSettings = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openNotificationAccessSettings();
    setStatusMessage('Enable "NeuroNinja" in Notification Access, then return and tap Refresh.');
  };

  const handleDrainNotifications = async () => {
    setBusyAction('notif');
    try {
      const res = await drainNotificationsToEngine();
      setStatusMessage(
        `Notifications checked: ${res.processed} buffered, ${res.saved} auto-saved, ${res.queued} queued.`
      );
      await refreshStatus();
      await onSynced();
    } finally {
      setBusyAction(null);
    }
  };

  const handleScanSms = async () => {
    setBusyAction('sms');
    try {
      const granted = await requestSmsReadPermission();
      if (!granted) {
        setStatusMessage('SMS permission denied. Notification Listener still works without SMS.');
        return;
      }
      const res = await scanRecentSmsToEngine(30);
      setStatusMessage(
        `Scanned ${res.scanned} recent SMS: ${res.saved} auto-saved, ${res.queued} sent to Review Inbox.`
      );
      await onSynced();
    } finally {
      setBusyAction(null);
    }
  };

  const handleConnectGmail = async () => {
    if (!googleClientId.trim()) {
      setStatusMessage('Paste your Google OAuth Android/Web Client ID first to connect Gmail.');
      return;
    }
    setBusyAction('gmail_connect');
    try {
      const res = await gmailSyncService.connectWithGoogleOAuth(googleClientId.trim());
      setGmailConnected(res.success);
      setStatusMessage(
        res.success
          ? `Gmail connected (${res.email || 'read-only'}). Tap Sync Gmail Receipts now.`
          : res.error || 'Google sign-in cancelled or failed.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSyncGmail = async () => {
    setBusyAction('gmail_sync');
    try {
      const res = await gmailSyncService.syncRecentReceipts(25);
      setStatusMessage(
        `Gmail synced ${res.scanned} messages: ${res.imported} imported, ${res.merged} merged, ${res.pendingReview} queued.`
      );
      await onSynced();
    } catch (e: unknown) {
      setStatusMessage(e instanceof Error ? e.message : 'Gmail sync failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDisconnectGmail = async () => {
    await gmailSyncService.disconnect();
    setGmailConnected(false);
    setStatusMessage('Gmail disconnected.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="radar" size={22} color="#38BDF8" />
              <Text style={styles.title}>Auto-Finance Capture Sources</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {statusMessage ? (
              <View style={styles.statusBanner}>
                <Ionicons name="information-circle" size={16} color="#38BDF8" />
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
            ) : null}

            {/* 1. Notification Listener */}
            <View style={styles.sourceCard}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#00E699" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>Live Bank & UPI Notifications</Text>
                  <Text style={styles.cardSub}>
                    Play Store-safe capture from GPay, PhonePe, Paytm, HDFC, SBI & ICICI alerts.
                  </Text>
                </View>
                <View style={[styles.pill, notifEnabled ? styles.pillOn : styles.pillOff]}>
                  <Text style={styles.pillText}>{notifEnabled ? 'ACTIVE' : 'OFF'}</Text>
                </View>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenNotifSettings}>
                  <Text style={styles.secondaryBtnText}>Open Android Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  disabled={busyAction === 'notif'}
                  onPress={handleDrainNotifications}
                >
                  {busyAction === 'notif' ? (
                    <ActivityIndicator size="small" color="#070A11" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sync Buffered</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. SMS Backfill */}
            <View style={styles.sourceCard}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="message-text-lock-outline" size={20} color="#F59E0B" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>SMS Inbox Backfill (Last 30 Days)</Text>
                  <Text style={styles.cardSub}>
                    Optional on-device scan of bank SMS alerts. OTPs and personal chats are skipped.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                disabled={busyAction === 'sms'}
                onPress={handleScanSms}
              >
                {busyAction === 'sms' ? (
                  <ActivityIndicator size="small" color="#070A11" />
                ) : (
                  <Text style={styles.primaryBtnText}>Scan Last 30 Days SMS</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 3. Gmail Receipts */}
            <View style={styles.sourceCard}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="email-check-outline" size={20} color="#38BDF8" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>Gmail Order & Utility Receipts</Text>
                  <Text style={styles.cardSub}>
                    Read-only sync for Swiggy, Zomato, Amazon, Uber, and utility bills.
                  </Text>
                </View>
                <View style={[styles.pill, gmailConnected ? styles.pillOn : styles.pillOff]}>
                  <Text style={styles.pillText}>{gmailConnected ? 'LINKED' : 'OFF'}</Text>
                </View>
              </View>

              {!gmailConnected ? (
                <>
                  <TextInput
                    style={styles.clientInput}
                    value={googleClientId}
                    onChangeText={setGoogleClientId}
                    placeholder="Google OAuth Client ID (apps.googleusercontent.com)"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    disabled={busyAction === 'gmail_connect'}
                    onPress={handleConnectGmail}
                  >
                    <Text style={styles.primaryBtnText}>Connect Gmail (Read-Only)</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handleDisconnectGmail}>
                    <Text style={styles.secondaryBtnText}>Disconnect</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    disabled={busyAction === 'gmail_sync'}
                    onPress={handleSyncGmail}
                  >
                    {busyAction === 'gmail_sync' ? (
                      <ActivityIndicator size="small" color="#070A11" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Sync Gmail Receipts</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B1220',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#131F35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  statusText: {
    color: '#BAE6FD',
    fontSize: 12,
    flex: 1,
  },
  sourceCard: {
    backgroundColor: '#111C30',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  pillOn: {
    backgroundColor: 'rgba(0, 230, 153, 0.18)',
  },
  pillOff: {
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
  },
  pillText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#00E699',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  clientInput: {
    backgroundColor: '#070A11',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
