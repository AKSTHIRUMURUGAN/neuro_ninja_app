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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { guardianService } from '../../../services/guardian/guardian-service';
import type { GuardianLink } from '../../../services/guardian/guardian-types';

export default function GuardianScreen() {
  const router = useRouter();
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await guardianService.getLinkedGuardians();
      setLinks(data);
    } catch (e) {
      console.error('[GuardianScreen] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    guardianService
      .getLinkedGuardians()
      .then(data => {
        if (isMounted) {
          setLinks(data);
          setLoading(false);
        }
      })
      .catch(e => {
        console.error('[GuardianScreen] load error:', e);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleLock = async (link: GuardianLink) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextVal = !link.remoteLockEnabled;
    await guardianService.toggleRemoteLock(link.id, nextVal);
    loadData();
  };

  const handleAddLink = async () => {
    if (!nameInput.trim() || !emailInput.trim()) {
      Alert.alert('Required', 'Please enter both name and email.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await guardianService.createInvite(nameInput.trim(), emailInput.trim(), 'child');
    setNameInput('');
    setEmailInput('');
    setShowInviteModal(false);
    Alert.alert('Family Link Created', 'Linked device is now active under Guardian shield.');
    loadData();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guardian Mode</Text>
        <TouchableOpacity
          style={styles.billingShortcut}
          onPress={() => router.push('/lifeos/billing' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="card-outline" size={18} color="#00E699" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Guardian Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Ionicons name="shield-checkmark" size={28} color="#00E699" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroSub}>PARENTAL OVERSIGHT SHIELD</Text>
            <Text style={styles.heroHeadline}>Family Focus Management</Text>
            <Text style={styles.heroDesc}>
              Set screen time boundaries, review habit verifications, and remotely enforce focus locks.
            </Text>
          </View>
        </View>

        {/* Action Row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity
            style={[styles.addMemberBtn, { flex: 1, backgroundColor: '#818CF8' }]}
            onPress={() => router.push('/lifeos/guardian/parental-controls' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="lock-closed" size={16} color="#070A11" style={{ marginRight: 6 }} />
            <Text style={styles.addMemberText}>Bedtime Curfew</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addMemberBtn, { flex: 1, backgroundColor: '#00E699' }]}
            onPress={() => router.push('/guardian' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={16} color="#070A11" style={{ marginRight: 6 }} />
            <Text style={styles.addMemberText}>DNS Firewall</Text>
          </TouchableOpacity>
        </View>

        {/* Link Child Action Button */}
        <TouchableOpacity
          style={styles.addMemberBtn}
          onPress={() => setShowInviteModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={18} color="#070A11" style={{ marginRight: 8 }} />
          <Text style={styles.addMemberText}>Link Child or Family Member</Text>
        </TouchableOpacity>

        {/* Linked Members List */}
        <Text style={styles.sectionTitle}>LINKED FAMILY MEMBERS ({links.length})</Text>

        {links.map(link => {
          const usedMin = link.screenTimeUsedMinutes;
          const totalMin = link.dailyAllowanceMinutes;
          const pct = Math.min(100, Math.round((usedMin / totalMin) * 100));

          return (
            <View key={link.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarEmoji}>👶</Text>
                </View>
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>{link.name}</Text>
                  <Text style={styles.memberEmail}>{link.email}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{link.status.toUpperCase()}</Text>
                </View>
              </View>

              {/* Screen Time Progress Bar */}
              <View style={styles.screenTimeContainer}>
                <View style={styles.screenTimeLabels}>
                  <Text style={styles.screenTimeLabel}>DAILY ALLOWANCE</Text>
                  <Text style={styles.screenTimeVal}>
                    {usedMin}m / {totalMin}m ({pct}%)
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${pct}%` },
                      pct > 80 && { backgroundColor: '#EF4444' },
                    ]}
                  />
                </View>
              </View>

              {/* Remote Lock Enforce Toggle */}
              <View style={styles.lockRow}>
                <View style={styles.lockInfo}>
                  <Text style={styles.lockTitle}>Enforce Remote Lock</Text>
                  <Text style={styles.lockSub}>
                    {link.remoteLockEnabled
                      ? 'Distraction shield sealed on child device'
                      : 'Child device permitted standard usage'}
                  </Text>
                </View>
                <Switch
                  value={link.remoteLockEnabled}
                  onValueChange={() => handleToggleLock(link)}
                  trackColor={{ false: '#334155', true: '#00E699' }}
                  thumbColor="#F8FAFC"
                />
              </View>
            </View>
          );
        })}

        {links.length === 0 && !loading && (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color="#334155" />
            <Text style={styles.emptyTitle}>No linked family members</Text>
            <Text style={styles.emptySub}>
              Link a child device above to remotely guide healthy digital habits.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Link Family Member</Text>

            <Text style={styles.inputLabel}>NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Maya K."
              placeholderTextColor="#64748B"
              value={nameInput}
              onChangeText={setNameInput}
            />

            <Text style={styles.inputLabel}>EMAIL OR DEVICE ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. maya@family.com"
              keyboardType="email-address"
              placeholderTextColor="#64748B"
              value={emailInput}
              onChangeText={setEmailInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowInviteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleAddLink} activeOpacity={0.8}>
                <Text style={styles.createText}>Link Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  billingShortcut: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  heroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    marginBottom: 20,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroText: {
    flex: 1,
  },
  heroSub: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroHeadline: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  addMemberBtn: {
    flexDirection: 'row',
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  addMemberText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  memberCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#070A11',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  memberEmail: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
  },
  screenTimeContainer: {
    marginBottom: 14,
  },
  screenTimeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  screenTimeLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  screenTimeVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  track: {
    height: 8,
    backgroundColor: '#070A11',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#00E699',
    borderRadius: 4,
  },
  lockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  lockInfo: {
    flex: 1,
    paddingRight: 12,
  },
  lockTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  lockSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 17, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeading: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  createBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#00E699',
    alignItems: 'center',
  },
  createText: {
    color: '#070A11',
    fontSize: 14,
    fontWeight: '800',
  },
});
