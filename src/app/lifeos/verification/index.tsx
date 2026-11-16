import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { verificationEngine } from '../../../services/verification/verification-engine';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import type { VerificationProof, VerificationProofStatus } from '../../../services/verification/verification-types';

export default function VerificationPortalScreen() {
  const router = useRouter();
  const { showToast } = useNinjaAlert();

  const [proofs, setProofs] = useState<VerificationProof[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Rejection modal
  const [rejectingProofId, setRejectingProofId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadProofs = useCallback(async () => {
    try {
      const data = await verificationEngine.getProofs(
        filter === 'all' ? undefined : (filter as VerificationProofStatus)
      );
      setProofs(data);
    } catch (e) {
      console.warn('[VerificationPortal] Load error:', e);
    }
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProofs();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProofs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProofs();
    setRefreshing(false);
  };

  const handleApprove = async (id: string, title?: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await verificationEngine.approveProof(id, 'Verified by Accountability Guardian');
      await loadProofs();
      showToast({
        title: '✅ Proof Approved!',
        message: `Awarded +100 Coins & +250 XP to Wallet for "${title || 'Activity'}". Boss took combat damage!`,
        type: 'success',
        icon: 'check-decagram',
      });
    } catch (e) {
      console.warn('[VerificationPortal] Approve error:', e);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingProofId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await verificationEngine.rejectProof(
        rejectingProofId,
        rejectionReason.trim() || 'Proof does not show completed activity'
      );
      setRejectingProofId(null);
      setRejectionReason('');
      await loadProofs();
      showToast({
        title: 'Proof Rejected',
        message: 'Feedback was recorded and habit progress remains unconfirmed.',
        type: 'info',
        icon: 'close-circle',
      });
    } catch (e) {
      console.warn('[VerificationPortal] Reject error:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>GUARDIAN & BUDDY PORTAL</Text>
          <Text style={styles.title}>Proof Verification</Text>
        </View>
        <TouchableOpacity
          style={styles.submitNewBtn}
          onPress={() => router.push('/lifeos/verification/submit-proof' as any)}
        >
          <MaterialCommunityIcons name="camera-plus" size={18} color="#070A11" />
          <Text style={styles.submitNewText}>Snap Proof</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {(['all', 'pending', 'verified', 'rejected'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(tab);
            }}
          >
            <Text style={[styles.tabBtnText, filter === tab && styles.tabBtnTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E699" />}
      >
        {proofs.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="shield-check" size={40} color="#64748B" />
            <Text style={styles.emptyTitle}>No Verification Records</Text>
            <Text style={styles.emptySub}>
              {filter === 'pending'
                ? 'No pending photo proofs awaiting review.'
                : 'Submit camera snapshots for completed habits to get them verified by parents or accountability buddies.'}
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/lifeos/verification/submit-proof' as any)}
            >
              <Text style={styles.actionBtnText}>Submit New Proof</Text>
            </TouchableOpacity>
          </View>
        ) : (
          proofs.map((p) => {
            const isPending = p.status === 'pending';
            const isApproved = p.status === 'verified';
            const statusColor = isApproved ? '#00E699' : isPending ? '#F59E0B' : '#EF4444';

            return (
              <View key={p.id} style={styles.proofCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entityTitle}>{p.entityTitle || p.entityId}</Text>
                    <Text style={styles.submitDate}>
                      Submitted: {new Date(p.submittedAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
                    <Text style={[styles.statusPillText, { color: statusColor }]}>
                      {p.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Photo View */}
                {p.photoUri ? (
                  <View style={styles.imageBox}>
                    <Image source={{ uri: p.photoUri }} style={styles.proofImg} />
                  </View>
                ) : null}

                {p.notes ? (
                  <View style={styles.notesBox}>
                    <MaterialCommunityIcons name="comment-text-outline" size={14} color="#94A3B8" />
                    <Text style={styles.notesText}>{p.notes}</Text>
                  </View>
                ) : null}

                {p.rejectionReason ? (
                  <View style={[styles.notesBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
                    <Text style={[styles.notesText, { color: '#EF4444' }]}>
                      Reason: {p.rejectionReason}
                    </Text>
                  </View>
                ) : null}

                {/* Action Row for Pending */}
                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(p.id, p.entityTitle)}
                    >
                      <MaterialCommunityIcons name="check-bold" size={16} color="#070A11" />
                      <Text style={styles.approveBtnText}>Approve (+100 Coins)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => setRejectingProofId(p.id)}
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#EF4444" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={!!rejectingProofId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Verification Proof</Text>
            <Text style={styles.modalSub}>
              Provide feedback for why this photo proof does not meet verification requirements:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Photo too blurry, not at gym location..."
              placeholderTextColor="#64748B"
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectingProofId(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmReject}>
                <Text style={styles.modalConfirmText}>Confirm Rejection</Text>
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
  submitNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00E699',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  submitNewText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 11,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#0F1829',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#00E699',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  proofCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  submitDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  imageBox: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: '#070A11',
  },
  proofImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  notesText: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00E699',
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#070A11',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  emptyCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
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
  actionBtn: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  actionBtnText: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '800',
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
    marginTop: 14,
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
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 12,
  },
});
