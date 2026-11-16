import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { VerificationRequestRecord } from '../../services/habits/habit-types';
import {
  getVerificationRequests,
  respondToVerificationRequest,
} from '../../services/verification/verification-service';

interface VerificationInboxModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function VerificationInboxModal({
  visible,
  onClose,
  onUpdated,
}: VerificationInboxModalProps) {
  const [requests, setRequests] = useState<VerificationRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({});

  const loadRequests = async () => {
    setLoading(true);
    try {
      const list = await getVerificationRequests(filter === 'all' ? undefined : filter);
      setRequests(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (visible) {
      getVerificationRequests(filter === 'all' ? undefined : filter).then((list) => {
        if (!ignore) {
          setRequests(list);
          setLoading(false);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [visible, filter]);

  const handleAction = async (id: string, action: 'verify' | 'reject') => {
    await Haptics.notificationAsync(
      action === 'verify'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );

    const notes = feedbackNotes[id];
    await respondToVerificationRequest(id, action, notes);
    await loadRequests();
    if (onUpdated) onUpdated();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.badge}>ACCOUNTABILITY INBOX</Text>
              <Text style={styles.title}>Verification Requests</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {(['pending', 'verified', 'all'] as const).map((f) => {
              const active = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#00E699" />
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#64748B" />
              <Text style={styles.emptyTitle}>All Caught Up</Text>
              <Text style={styles.emptyDesc}>
                No {filter} verification requests at this time.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scroll}>
              {requests.map((r) => {
                const isPending = r.status === 'pending';
                return (
                  <View key={r.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{r.type.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.dateText}>{r.date || r.createdAt.slice(0, 10)}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          r.status === 'verified'
                            ? styles.statusVerified
                            : r.status === 'rejected'
                            ? styles.statusRejected
                            : styles.statusPending,
                        ]}
                      >
                        <Text style={styles.statusText}>{r.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text style={styles.cardTitle}>
                      {r.type === 'habit' ? 'Habit Completion Verification' : 'Task Completion Verification'}
                    </Text>

                    {r.notes ? (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteText}>{`"${r.notes}"`}</Text>
                      </View>
                    ) : null}

                    {isPending ? (
                      <View style={styles.actionContainer}>
                        <TextInput
                          style={styles.commentInput}
                          placeholder="Feedback or praise (optional)..."
                          placeholderTextColor="#64748B"
                          value={feedbackNotes[r.id] || ''}
                          onChangeText={(text) =>
                            setFeedbackNotes({ ...feedbackNotes, [r.id]: text })
                          }
                        />
                        <View style={styles.btnRow}>
                          <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => void handleAction(r.id, 'reject')}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                            <Text style={styles.rejectText}>Reject</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => void handleAction(r.id, 'verify')}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#070A11" />
                            <Text style={styles.approveText}>Approve & Verify</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      r.verifierNotes && (
                        <Text style={styles.resolvedNote}>Feedback: {r.verifierNotes}</Text>
                      )
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterPillActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterTextActive: {
    color: '#070A11',
  },
  scroll: {
    marginBottom: 12,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818CF8',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusVerified: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  noteBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  noteText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  actionContainer: {
    marginTop: 8,
  },
  commentInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 8,
    fontSize: 12,
    color: '#F8FAFC',
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  rejectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#00E699',
  },
  approveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#070A11',
  },
  resolvedNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});
