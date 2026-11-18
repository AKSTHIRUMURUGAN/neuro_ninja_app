import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  FinanceTransaction,
  CustomCategory,
  FamilyMember,
  TransactionType,
  PaymentMethod,
  MajorCategoryGroup,
  PAYMENT_METHODS,
  CATEGORY_GROUPS,
} from '../../services/finance/finance-types';
import { CategoryIcon } from './CategoryIcon';
import { MemberAvatar } from './MemberAvatar';

export interface ExpenseLedgerViewProps {
  transactions: FinanceTransaction[];
  categories: CustomCategory[];
  members: FamilyMember[];
  currencySymbol: string;
  onAddTransaction: (t: Partial<FinanceTransaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenCategoryManager: () => void;
  onOpenMemberManager: () => void;
}

export function ExpenseLedgerView({
  transactions,
  categories,
  members,
  currencySymbol,
  onAddTransaction,
  onDeleteTransaction,
  onOpenCategoryManager,
  onOpenMemberManager,
}: ExpenseLedgerViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MajorCategoryGroup>('personal');
  const [selectedCategory, setSelectedCategory] = useState<string>('Food & Dining');
  const [selectedMember, setSelectedMember] = useState<string>('personal');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Filtered categories for currently selected group
  const groupCategories = categories.filter((c) => c.group === selectedGroup);

  const handleSave = async () => {
    const num = Number(amount.replace(/[^0-9.]/g, ''));
    if (!num || num <= 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await onAddTransaction({
      amount: num,
      type,
      category: selectedCategory,
      categoryGroup: selectedGroup,
      spentOn: selectedMember,
      paymentMethod,
      description: description.trim() || undefined,
      date: new Date().toISOString().substring(0, 10),
      tags: [selectedCategory.toLowerCase()],
    });

    setAmount('');
    setDescription('');
    setIsModalOpen(false);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = t.category.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchMember = t.spentOn?.toLowerCase().includes(q);
      return matchCat || matchDesc || matchMember;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsModalOpen(true);
          }}
        >
          <MaterialCommunityIcons name="plus-circle" size={20} color="#070A11" />
          <Text style={styles.logBtnText}>Quick Log Transaction</Text>
        </TouchableOpacity>

        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.mgmtBtn} onPress={onOpenCategoryManager}>
            <MaterialCommunityIcons name="tag-multiple" size={18} color="#00E699" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mgmtBtn} onPress={onOpenMemberManager}>
            <MaterialCommunityIcons name="account-group" size={18} color="#38BDF8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter & Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions, notes, personas..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterPills}>
          {['ALL', 'expense', 'income'].map((ft) => {
            const active = filterType === ft;
            return (
              <TouchableOpacity
                key={ft}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilterType(ft)}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {ft === 'ALL' ? 'All' : ft === 'expense' ? 'Expenses' : 'Income'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Transactions Feed */}
      <ScrollView style={styles.feed} showsVerticalScrollIndicator={false}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="receipt" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? 'Try clearing your search query.' : 'Tap "Quick Log Transaction" to record your first entry.'}
            </Text>
          </View>
        ) : (
          filteredTransactions.map((t) => {
            const isExp = t.type === 'expense';
            const memberObj = members.find((m) => m.id === t.spentOn || m.name.toLowerCase() === t.spentOn?.toLowerCase());
            const catObj = categories.find((c) => c.name === t.category);

            return (
              <View key={t.id} style={styles.txCard}>
                <CategoryIcon
                  iconType={catObj?.iconType}
                  iconValue={catObj?.iconValue}
                  color={catObj?.color || (isExp ? '#F43F5E' : '#10B981')}
                  size={42}
                />

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.txRowTop}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {t.description || t.category}
                    </Text>
                    <Text style={[styles.txAmount, { color: isExp ? '#F43F5E' : '#10B981' }]}>
                      {isExp ? '-' : '+'}
                      {currencySymbol}
                      {t.amount.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.txRowBottom}>
                    <Text style={styles.txMeta}>
                      {t.category} • {t.date}
                    </Text>
                    {memberObj && (
                      <View style={styles.memberTag}>
                        <MemberAvatar member={memberObj} size={16} />
                        <Text style={[styles.memberTagText, { color: memberObj.color || '#38BDF8' }]}>
                          {memberObj.name}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={async () => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await onDeleteTransaction(t.id);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Quick Add Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Log Entry</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Type Switcher */}
              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
                  onPress={() => setType('expense')}
                >
                  <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
                  onPress={() => setType('income')}
                >
                  <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>Income</Text>
                </TouchableOpacity>
              </View>

              {/* Amount Display */}
              <View style={styles.amountBox}>
                <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus
                />
              </View>

              {/* Description Input */}
              <TextInput
                style={styles.descInput}
                placeholder="What was this for? (e.g. Swiggy Lunch, Uber to Client)"
                placeholderTextColor="#64748B"
                value={description}
                onChangeText={setDescription}
              />

              {/* Spent For Whom (Persona Picker) */}
              <Text style={styles.sectionLabel}>SPENT FOR WHOM (PERSONA)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {members.map((m) => {
                  const active = selectedMember === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberPill, active && { borderColor: m.color || '#38BDF8', backgroundColor: `${m.color || '#38BDF8'}25` }]}
                      onPress={() => setSelectedMember(m.id)}
                    >
                      <MemberAvatar member={m} size={22} />
                      <Text style={[styles.memberPillText, active && { color: m.color || '#38BDF8', fontWeight: '800' }]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Major Group Selector */}
              <Text style={styles.sectionLabel}>CATEGORY GROUP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {CATEGORY_GROUPS.map((g) => {
                  const active = selectedGroup === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.groupPill, active && { borderColor: g.color, backgroundColor: `${g.color}25` }]}
                      onPress={() => {
                        setSelectedGroup(g.id);
                        const first = categories.find((c) => c.group === g.id);
                        if (first) setSelectedCategory(first.name);
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>{g.icon}</Text>
                      <Text style={[styles.groupPillText, active && { color: g.color, fontWeight: '800' }]}>{g.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Sub Categories for Group */}
              <Text style={styles.sectionLabel}>SUBCATEGORY</Text>
              <View style={styles.catChipsWrap}>
                {groupCategories.map((c) => {
                  const active = selectedCategory === c.name;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.catChip, active && { borderColor: c.color, backgroundColor: `${c.color}25` }]}
                      onPress={() => setSelectedCategory(c.name)}
                    >
                      <CategoryIcon iconType={c.iconType} iconValue={c.iconValue} color={c.color} size={22} />
                      <Text style={[styles.catChipText, active && { color: '#F8FAFC', fontWeight: '800' }]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Payment Method Pills */}
              <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {PAYMENT_METHODS.map((pm) => {
                  const active = paymentMethod === pm.id;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      style={[styles.methodPill, active && { borderColor: pm.badgeColor, backgroundColor: `${pm.badgeColor}25` }]}
                      onPress={() => setPaymentMethod(pm.id)}
                    >
                      <Text style={{ fontSize: 13 }}>{pm.icon}</Text>
                      <Text style={[styles.methodPillText, active && { color: pm.badgeColor, fontWeight: '800' }]}>
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Action Buttons */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>Record Transaction</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  logBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#070A11',
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mgmtBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    marginBottom: 12,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterPillActive: {
    borderColor: '#00E699',
    backgroundColor: '#00E69920',
  },
  filterPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#00E699',
    fontWeight: '800',
  },
  feed: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginBottom: 8,
  },
  txRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  txMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  memberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  delBtn: {
    padding: 6,
    marginLeft: 6,
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
    maxHeight: '90%',
    paddingBottom: 24,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalScroll: {
    paddingHorizontal: 18,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#070A11',
    borderRadius: 12,
    padding: 3,
    marginTop: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  typeBtnExpense: {
    backgroundColor: '#F43F5E',
  },
  typeBtnIncome: {
    backgroundColor: '#10B981',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  currencyPrefix: {
    fontSize: 32,
    fontWeight: '800',
    color: '#00E699',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '900',
    color: '#F8FAFC',
    minWidth: 100,
  },
  descInput: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  pickerScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  memberPillText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  groupPillText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  catChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  catChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  methodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  methodPillText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#070A11',
  },
});
