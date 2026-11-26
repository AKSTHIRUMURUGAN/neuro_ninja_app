import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomCategory } from '../../services/finance/finance-types';
import {
  financeIngestionEngine,
  IngestionQueueItem,
} from '../../services/finance/finance-ingestion-engine';

export interface AutoCaptureInboxModalProps {
  visible: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  currencySymbol: string;
  onChanged: () => Promise<void>;
}

export function AutoCaptureInboxModal({
  visible,
  onClose,
  categories,
  currencySymbol,
  onChanged,
}: AutoCaptureInboxModalProps) {
  const [items, setItems] = useState<IngestionQueueItem[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const pending = await financeIngestionEngine.getPendingItems();
    setItems(pending);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void (async () => {
      const pending = await financeIngestionEngine.getPendingItems();
      if (active) setItems(pending);
    })();
    return () => {
      active = false;
    };
  }, [visible]);

  const handleApprove = async (item: IngestionQueueItem) => {
    setBusyId(item.id);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const overrideCat = selectedCategories[item.id] || item.suggestedCategory;
      await financeIngestionEngine.approvePendingItem(item.id, { category: overrideCat });
      await loadItems();
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setBusyId(id);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await financeIngestionEngine.dismissPendingItem(id);
      await loadItems();
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveAll = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await financeIngestionEngine.approveAllHighConfidence(0.7);
    await loadItems();
    await onChanged();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="inbox-arrow-down" size={22} color="#F59E0B" />
              <Text style={styles.title}>Auto-Capture Review Inbox ({items.length})</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {items.length > 0 ? (
            <TouchableOpacity style={styles.approveAllBtn} onPress={handleApproveAll}>
              <MaterialCommunityIcons name="check-all" size={18} color="#070A11" />
              <Text style={styles.approveAllText}>Approve All High-Confidence (≥70%)</Text>
            </TouchableOpacity>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {items.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="check-decagram" size={40} color="#00E699" />
                <Text style={styles.emptyTitle}>Inbox Clear</Text>
                <Text style={styles.emptySub}>
                  High-confidence bank/UPI alerts auto-log straight to your ledger. Medium-confidence items appear here for one-tap review & rule learning.
                </Text>
              </View>
            ) : (
              items.map((item) => {
                const chosenCat = selectedCategories[item.id] || item.suggestedCategory;
                const isBusy = busyId === item.id;
                return (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.sourceBadge}>
                        <Text style={styles.sourceBadgeText}>{item.source.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.confidencePill}>
                        {Math.round(item.confidence * 100)}% CONFIDENCE
                      </Text>
                    </View>

                    <View style={styles.amountRow}>
                      <Text style={styles.merchantText}>
                        {item.merchantNormalized || item.merchantRaw || 'Detected Transaction'}
                      </Text>
                      <Text
                        style={[
                          styles.amountText,
                          { color: item.type === 'income' ? '#00E699' : '#F43F5E' },
                        ]}
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {currencySymbol}
                        {item.amount.toLocaleString()}
                      </Text>
                    </View>

                    <Text style={styles.metaText}>
                      {item.detectedAt.split('T')[0]} · {item.paymentMethod || 'upi'}
                      {item.utrRef ? ` · UTR ${item.utrRef}` : ''}
                    </Text>

                    <Text style={styles.rawSnippet} numberOfLines={2}>
                      {item.rawSnippet}
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                      {categories.slice(0, 8).map((cat) => {
                        const active = chosenCat === cat.name;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.catChip, active && styles.catChipActive]}
                            onPress={() =>
                              setSelectedCategories((prev) => ({ ...prev, [item.id]: cat.name }))
                            }
                          >
                            <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                              {cat.iconValue} {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.dismissBtn}
                        disabled={isBusy}
                        onPress={() => handleDismiss(item.id)}
                      >
                        <Text style={styles.dismissText}>Dismiss</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        disabled={isBusy}
                        onPress={() => handleApprove(item)}
                      >
                        <Ionicons name="checkmark" size={16} color="#070A11" />
                        <Text style={styles.approveText}>Approve & Learn</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
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
    borderColor: 'rgba(245, 158, 11, 0.25)',
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
  approveAllBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  approveAllText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 13,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 18,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#111C30',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  confidencePill: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  merchantText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  amountText: {
    fontSize: 17,
    fontWeight: '800',
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 3,
  },
  rawSnippet: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 6,
    backgroundColor: '#070A11',
    borderRadius: 8,
    padding: 8,
  },
  catRow: {
    marginTop: 10,
  },
  catChip: {
    backgroundColor: '#070A11',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  catChipText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#070A11',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dismissBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  dismissText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 13,
  },
  approveBtn: {
    flex: 2,
    backgroundColor: '#00E699',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 13,
  },
});
