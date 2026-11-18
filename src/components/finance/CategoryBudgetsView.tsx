import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomCategory, FinanceTransaction } from '../../services/finance/finance-types';
import { CategoryIcon } from './CategoryIcon';

export interface CategoryBudgetsViewProps {
  categories: CustomCategory[];
  transactions: FinanceTransaction[];
  currencySymbol: string;
  onUpdateCategoryBudget: (id: string, budget: number) => Promise<void>;
}

export function CategoryBudgetsView({
  categories,
  transactions,
  currencySymbol,
  onUpdateCategoryBudget,
}: CategoryBudgetsViewProps) {
  const [selectedCat, setSelectedCat] = useState<CustomCategory | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  // Calculate this month's spending per category
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const spendingMap = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === 'expense' && t.date.startsWith(currentMonthKey)) {
      spendingMap.set(t.category, (spendingMap.get(t.category) || 0) + t.amount);
    }
  }

  const handleOpenEdit = (c: CustomCategory) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCat(c);
    setBudgetInput(c.budgetLimit ? String(c.budgetLimit) : '');
  };

  const handleSaveBudget = async () => {
    if (!selectedCat) return;
    const num = Number(budgetInput.replace(/[^0-9.]/g, '')) || 0;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onUpdateCategoryBudget(selectedCat.id, num);
    setSelectedCat(null);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTag}>EXPENDITURE CEILINGS & DISCIPLINE</Text>
        <Text style={styles.headerTitle}>Category Monthly Budgets</Text>
        <Text style={styles.headerSub}>
          Real-time burn indicators protecting you from silent lifestyle inflation.
        </Text>
      </View>

      {categories.map((c) => {
        const spent = spendingMap.get(c.name) || 0;
        const limit = c.budgetLimit || 0;
        const hasLimit = limit > 0;
        const pct = hasLimit ? Math.round((spent / limit) * 100) : 0;
        const isOver = hasLimit && spent > limit;
        const isWarning = hasLimit && pct >= 80 && !isOver;

        const meterColor = isOver ? '#F43F5E' : isWarning ? '#F59E0B' : '#00E699';

        return (
          <TouchableOpacity
            key={c.id}
            style={styles.budgetCard}
            onPress={() => handleOpenEdit(c)}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <CategoryIcon iconType={c.iconType} iconValue={c.iconValue} color={c.color} size={38} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.catName}>{c.name}</Text>
                <Text style={styles.catGroup}>{(c.group || 'other').toUpperCase()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.spentAmount}>
                  {currencySymbol}
                  {spent.toLocaleString()}
                </Text>
                <Text style={styles.limitAmount}>
                  {hasLimit ? `of ${currencySymbol}${limit.toLocaleString()}` : 'No cap set'}
                </Text>
              </View>
            </View>

            {hasLimit && (
              <View style={styles.meterWrap}>
                <View style={styles.meterTrack}>
                  <View
                    style={[
                      styles.meterFill,
                      {
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: meterColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.meterLabels}>
                  <Text style={[styles.meterPct, { color: meterColor }]}>
                    {pct}% Consumed {isOver ? '(EXCEEDED)' : ''}
                  </Text>
                  <Text style={styles.meterRemaining}>
                    {isOver
                      ? `Over by ${currencySymbol}${(spent - limit).toLocaleString()}`
                      : `${currencySymbol}${(limit - spent).toLocaleString()} left`}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Edit Budget Modal */}
      <Modal visible={!!selectedCat} animationType="slide" transparent onRequestClose={() => setSelectedCat(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Monthly Cap</Text>
              <TouchableOpacity onPress={() => setSelectedCat(null)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.editPrompt}>
                Set spending ceiling for <Text style={{ color: '#00E699', fontWeight: '800' }}>{selectedCat?.name}</Text>:
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="₹ 5000"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={budgetInput}
                onChangeText={setBudgetInput}
                autoFocus
              />

              <TouchableOpacity style={styles.saveBudgetBtn} onPress={handleSaveBudget}>
                <Text style={styles.saveBudgetBtnText}>Update Monthly Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBox: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTag: {
    fontSize: 9.5,
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
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  budgetCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  catGroup: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  spentAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  limitAmount: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  meterWrap: {
    marginTop: 10,
  },
  meterTrack: {
    height: 6,
    backgroundColor: '#070A11',
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  meterPct: {
    fontSize: 10,
    fontWeight: '800',
  },
  meterRemaining: {
    fontSize: 10,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  editPrompt: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  saveBudgetBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBudgetBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
});
