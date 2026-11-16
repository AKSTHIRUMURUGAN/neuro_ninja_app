import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import {
  getTransactions,
  saveTransaction,
  deleteTransaction,
  getSalaries,
  getEmis,
  getInvestments,
  getNetWorthSummary,
  getFinanceProfile,
  type FinanceTransaction,
  type FinanceSalary,
  type FinanceEmi,
  type FinanceInvestment,
  type FinanceProfile,
} from '../../../services/finance/finance-service';

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Housing & Rent',
  'Utilities',
  'Health & Medical',
  'Shopping',
  'Transit & Fuel',
  'Entertainment',
  'Education',
  'Other',
];

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other'];

const PAYMENT_METHODS = ['UPI / GPay', 'Credit Card', 'Debit Card', 'Cash', 'Net Banking'];

type ActiveTab = 'transactions' | 'salary' | 'emis' | 'investments';

export default function NeuroFinanceScreen() {
  const router = useRouter();
  const { showToast, showAlert } = useNinjaAlert();

  const [activeTab, setActiveTab] = useState<ActiveTab>('transactions');
  const [profile, setProfile] = useState<FinanceProfile>({
    id: 'default',
    currency: '₹',
    monthlyBudget: 25000,
    savingsGoal: 100000,
    updatedAt: '',
  });

  const [netWorth, setNetWorth] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
  });

  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [salaries, setSalaries] = useState<FinanceSalary[]>([]);
  const [emis, setEmis] = useState<FinanceEmi[]>([]);
  const [investments, setInvestments] = useState<FinanceInvestment[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Add Transaction Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txCategory, setTxCategory] = useState<string>('Food & Dining');
  const [txPaymentMethod, setTxPaymentMethod] = useState<string>('UPI / GPay');
  const [txDescription, setTxDescription] = useState<string>('');

  const loadAllFinanceData = async () => {
    try {
      const [prof, nw, txs, sals, em, invs] = await Promise.all([
        getFinanceProfile(),
        getNetWorthSummary(),
        getTransactions({ limit: 50 }),
        getSalaries(),
        getEmis(),
        getInvestments(),
      ]);
      setProfile(prof);
      setNetWorth(nw);
      setTransactions(txs);
      setSalaries(sals);
      setEmis(em);
      setInvestments(invs);
    } catch (e) {
      console.warn('[NeuroFinance] Error loading data:', e);
    }
  };

  useEffect(() => {
    let ignore = false;
    void Promise.all([
      getFinanceProfile(),
      getNetWorthSummary(),
      getTransactions({ limit: 50 }),
      getSalaries(),
      getEmis(),
      getInvestments(),
    ]).then(([prof, nw, txs, sals, em, invs]) => {
      if (!ignore) {
        setProfile(prof);
        setNetWorth(nw);
        setTransactions(txs);
        setSalaries(sals);
        setEmis(em);
        setInvestments(invs);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllFinanceData();
    setIsRefreshing(false);
  };

  const handleOpenAddTx = (type: 'expense' | 'income' = 'expense') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTxType(type);
    setTxAmount('');
    setTxCategory(type === 'expense' ? 'Food & Dining' : 'Salary');
    setTxPaymentMethod('UPI / GPay');
    setTxDescription('');
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = async () => {
    const val = parseFloat(txAmount.trim());
    if (isNaN(val) || val <= 0) {
      showToast({
        title: 'Invalid Amount',
        message: 'Please enter a valid amount greater than 0.',
        type: 'warning',
        icon: 'alert-circle',
      });
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const today = new Date().toISOString().split('T')[0];
      await saveTransaction({
        amount: val,
        type: txType,
        category: txCategory,
        paymentMethod: txPaymentMethod,
        date: today,
        description: txDescription.trim() || undefined,
        tags: [txCategory.toLowerCase()],
      });

      setIsTxModalOpen(false);
      await loadAllFinanceData();
      showToast({
        title: txType === 'expense' ? 'Expense Logged' : 'Income Added',
        message: `${profile.currency}${val.toLocaleString()} recorded to local ledger.`,
        type: 'success',
        icon: 'check-circle',
      });
    } catch (e) {
      showToast({
        title: 'Error Saving',
        message: String(e),
        type: 'error',
        icon: 'close-circle',
      });
    }
  };

  const handleDeleteTransaction = (id: string) => {
    showAlert({
      title: 'Delete Transaction?',
      message: 'This will remove this record permanently.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(id);
            await loadAllFinanceData();
            showToast({
              title: 'Record Removed',
              message: 'Transaction deleted.',
              type: 'info',
              icon: 'delete',
            });
          },
        },
      ],
    });
  };

  // Monthly expense sum
  const currentMonthExpenses = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const budgetPercent = useMemo(() => {
    if (!profile.monthlyBudget || profile.monthlyBudget <= 0) return 0;
    return Math.min(100, Math.round((currentMonthExpenses / profile.monthlyBudget) * 100));
  }, [currentMonthExpenses, profile.monthlyBudget]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Neuro Finance</Text>
          <Text style={styles.headerSub}>Offline Wealth Ledger & Net Worth Engine</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenAddTx('expense')}>
          <Ionicons name="add" size={18} color="#070A11" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00E699" />}
      >
        {/* Net Worth Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>ESTIMATED NET WORTH</Text>
          <Text style={styles.heroValue}>
            {profile.currency}
            {netWorth.netWorth.toLocaleString()}
          </Text>

          <View style={styles.heroBreakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.dot, { backgroundColor: '#00E699' }]} />
              <Text style={styles.breakdownLabel}>Assets: </Text>
              <Text style={styles.breakdownValue}>
                {profile.currency}
                {netWorth.totalAssets.toLocaleString()}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.breakdownLabel}>Liabilities: </Text>
              <Text style={styles.breakdownValue}>
                {profile.currency}
                {netWorth.totalLiabilities.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Monthly Budget Progress Bar */}
          <View style={styles.budgetBox}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>Monthly Burn</Text>
              <Text style={styles.budgetValue}>
                {profile.currency}
                {currentMonthExpenses.toLocaleString()} / {profile.currency}
                {profile.monthlyBudget.toLocaleString()} ({budgetPercent}%)
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${budgetPercent}%`,
                    backgroundColor: budgetPercent > 90 ? '#EF4444' : budgetPercent > 75 ? '#F59E0B' : '#00E699',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'transactions' && styles.tabBtnActive]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
              Activity
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'salary' && styles.tabBtnActive]}
            onPress={() => setActiveTab('salary')}
          >
            <Text style={[styles.tabText, activeTab === 'salary' && styles.tabTextActive]}>
              Income ({salaries.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'emis' && styles.tabBtnActive]}
            onPress={() => setActiveTab('emis')}
          >
            <Text style={[styles.tabText, activeTab === 'emis' && styles.tabTextActive]}>
              EMIs ({emis.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'investments' && styles.tabBtnActive]}
            onPress={() => setActiveTab('investments')}
          >
            <Text style={[styles.tabText, activeTab === 'investments' && styles.tabTextActive]}>
              Investments ({investments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: Transactions Activity */}
        {activeTab === 'transactions' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>RECENT TRANSACTIONS</Text>
              <TouchableOpacity onPress={() => handleOpenAddTx('income')}>
                <Text style={styles.quickIncomeLink}>+ Add Income</Text>
              </TouchableOpacity>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="cash-register" size={40} color="#334155" />
                <Text style={styles.emptyTitle}>No Transactions Logged</Text>
                <Text style={styles.emptySub}>
                  Record your daily spends or income. Works seamlessly 100% offline.
                </Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => handleOpenAddTx('expense')}>
                  <Text style={styles.emptyAddBtnText}>Log First Spend</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.txList}>
                {transactions.map((tx) => {
                  const isExpense = tx.type === 'expense';
                  return (
                    <TouchableOpacity
                      key={tx.id}
                      style={styles.txItem}
                      onLongPress={() => handleDeleteTransaction(tx.id)}
                    >
                      <View
                        style={[
                          styles.txIconBox,
                          { backgroundColor: isExpense ? '#EF444422' : '#00E69922' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isExpense ? 'arrow-top-right' : 'arrow-bottom-left'}
                          size={20}
                          color={isExpense ? '#EF4444' : '#00E699'}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.txTitle}>{tx.category}</Text>
                        <Text style={styles.txSub}>
                          {tx.paymentMethod} • {tx.date}
                          {tx.description ? ` • ${tx.description}` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.txAmount,
                            { color: isExpense ? '#F87171' : '#00E699' },
                          ]}
                        >
                          {isExpense ? '-' : '+'}
                          {profile.currency}
                          {tx.amount.toLocaleString()}
                        </Text>
                        {tx.syncStatus === 'pending' && <View style={styles.pendingDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: Salaries */}
        {activeTab === 'salary' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeading}>INCOME STREAMS</Text>
            {salaries.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="briefcase-outline" size={40} color="#334155" />
                <Text style={styles.emptyTitle}>No Salaries Configured</Text>
                <Text style={styles.emptySub}>
                  Add recurring salary or freelance inflows to calculate projected savings.
                </Text>
              </View>
            ) : (
              salaries.map((s) => (
                <View key={s.id} style={styles.summaryItemCard}>
                  <View>
                    <Text style={styles.summaryCardTitle}>{s.source}</Text>
                    <Text style={styles.summaryCardSub}>Expected pay date: Day {s.payDate}</Text>
                  </View>
                  <Text style={styles.summaryCardValue}>
                    {profile.currency}
                    {s.monthlyAmount.toLocaleString()}/mo
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: EMIs & Debt */}
        {activeTab === 'emis' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeading}>ACTIVE LOANS & EMIS</Text>
            {emis.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="shield-check" size={40} color="#00E699" />
                <Text style={styles.emptyTitle}>Debt Free</Text>
                <Text style={styles.emptySub}>No active loans or monthly EMIs tracked.</Text>
              </View>
            ) : (
              emis.map((emi) => (
                <View key={emi.id} style={styles.summaryItemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryCardTitle}>{emi.name}</Text>
                    <Text style={styles.summaryCardSub}>
                      Due day: {emi.dueDay} • Remaining: {profile.currency}
                      {emi.remainingAmount.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.summaryCardValue, { color: '#EF4444' }]}>
                    -{profile.currency}
                    {emi.monthlyAmount.toLocaleString()}/mo
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: Investments Portfolio */}
        {activeTab === 'investments' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeading}>INVESTMENT HOLDINGS</Text>
            {investments.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="chart-line" size={40} color="#334155" />
                <Text style={styles.emptyTitle}>No Investments Added</Text>
                <Text style={styles.emptySub}>
                  Track your stocks, crypto, mutual funds, and gold portfolios offline.
                </Text>
              </View>
            ) : (
              investments.map((inv) => (
                <View key={inv.id} style={styles.summaryItemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryCardTitle}>{inv.name}</Text>
                    <Text style={styles.summaryCardSub}>
                      Invested: {profile.currency}
                      {inv.investedAmount.toLocaleString()} ({inv.type})
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.summaryCardValue, { color: '#00E699' }]}>
                      {profile.currency}
                      {inv.currentValue.toLocaleString()}
                    </Text>
                    <Text style={styles.returnsPercent}>
                      {inv.returnsPercent >= 0 ? '+' : ''}
                      {inv.returnsPercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={isTxModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsTxModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsTxModalOpen(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.modalHeading}>
                {txType === 'expense' ? 'Log Expense' : 'Add Income'}
              </Text>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveTransaction}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Type Switcher */}
              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  style={[styles.typeBtn, txType === 'expense' && styles.typeBtnActiveExpense]}
                  onPress={() => {
                    setTxType('expense');
                    setTxCategory('Food & Dining');
                  }}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      txType === 'expense' && styles.typeBtnTextActiveExpense,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeBtn, txType === 'income' && styles.typeBtnActiveIncome]}
                  onPress={() => {
                    setTxType('income');
                    setTxCategory('Salary');
                  }}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      txType === 'income' && styles.typeBtnTextActiveIncome,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>{profile.currency}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                  value={txAmount}
                  onChangeText={setTxAmount}
                  autoFocus
                />
              </View>

              {/* Category Chips */}
              <Text style={styles.modalFieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.modalChip, txCategory === cat && styles.modalChipActive]}
                    onPress={() => setTxCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        txCategory === cat && styles.modalChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Payment Method */}
              <Text style={styles.modalFieldLabel}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {PAYMENT_METHODS.map((pm) => (
                  <TouchableOpacity
                    key={pm}
                    style={[styles.modalChip, txPaymentMethod === pm && styles.modalChipActive]}
                    onPress={() => setTxPaymentMethod(pm)}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        txPaymentMethod === pm && styles.modalChipTextActive,
                      ]}
                    >
                      {pm}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Description Note */}
              <Text style={styles.modalFieldLabel}>Note (Optional)</Text>
              <TextInput
                style={styles.descInput}
                placeholder="What was this for? (e.g. groceries, team lunch)..."
                placeholderTextColor="#475569"
                value={txDescription}
                onChangeText={setTxDescription}
              />
            </ScrollView>
          </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E699',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070A11',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0B111E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748B',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
    marginBottom: 12,
  },
  heroBreakdownRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B44',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  budgetBox: {
    marginTop: 14,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  budgetValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#1E293B',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  tabContent: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748B',
  },
  quickIncomeLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00E699',
  },
  txList: {
    gap: 8,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B111E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  txSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F59E0B',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#0B111E',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyAddBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00E699',
  },
  summaryItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B111E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 8,
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  summaryCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  summaryCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  returnsPercent: {
    fontSize: 11,
    color: '#00E699',
    fontWeight: '600',
    marginTop: 2,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSaveBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#070A11',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActiveExpense: {
    backgroundColor: '#EF444422',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  typeBtnActiveIncome: {
    backgroundColor: '#00E69922',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextActiveExpense: {
    color: '#EF4444',
    fontWeight: '700',
  },
  typeBtnTextActiveIncome: {
    color: '#00E699',
    fontWeight: '700',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: '800',
    color: '#F8FAFC',
    minWidth: 120,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginRight: 8,
  },
  modalChipActive: {
    backgroundColor: '#00E69922',
    borderColor: '#00E699',
  },
  modalChipText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  modalChipTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  descInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
  },
});
