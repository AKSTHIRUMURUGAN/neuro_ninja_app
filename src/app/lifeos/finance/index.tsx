import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNinjaBack } from '../../../hooks/use-ninja-back';
import { useNinjaAlert } from '../../../context/ninja-alert-context';
import {
  getCategories,
  saveCategory,
  deleteCategory,
  getFamilyMembers,
  saveFamilyMember,
  deleteFamilyMember,
  getTransactionsV2,
  saveTransactionV2,
  deleteTransactionV2,
  getProfileV2,
  getNetWorthSummaryV2,
  getEMISafety,
} from '../../../services/finance/finance-service';
import {
  CustomCategory,
  FamilyMember,
  FinanceTransaction,
  NetWorthSummary,
  EMISafetyInfo,
} from '../../../services/finance/finance-types';

import { ExpenseLedgerView } from '../../../components/finance/ExpenseLedgerView';
import { ExpenseAnalyticsView } from '../../../components/finance/ExpenseAnalyticsView';
import { NetWorthView } from '../../../components/finance/NetWorthView';
import { SalaryManagerView } from '../../../components/finance/SalaryManagerView';
import { EMIManagerView } from '../../../components/finance/EMIManagerView';
import { InvestmentsView } from '../../../components/finance/InvestmentsView';
import { FinancialPlanningView } from '../../../components/finance/FinancialPlanningView';
import { CategoryBudgetsView } from '../../../components/finance/CategoryBudgetsView';
import { CategoryManagerModal } from '../../../components/finance/CategoryManagerModal';
import { MemberManagerModal } from '../../../components/finance/MemberManagerModal';
import { WealthZenShareModal } from '../../../components/finance/WealthZenShareModal';

type FinanceTab =
  | 'ledger'
  | 'analytics'
  | 'networth'
  | 'salaries'
  | 'emis'
  | 'investments'
  | 'planning'
  | 'budgets';

const TABS: { id: FinanceTab; label: string; icon: string }[] = [
  { id: 'ledger', label: 'Transactions', icon: 'receipt' },
  { id: 'analytics', label: 'Analytics & Burn', icon: 'chart-pie' },
  { id: 'networth', label: 'Net Worth', icon: 'scale-balance' },
  { id: 'salaries', label: 'Salary Manager', icon: 'account-cash' },
  { id: 'emis', label: 'Loans & EMIs', icon: 'credit-card-clock' },
  { id: 'investments', label: 'Investments', icon: 'chart-line' },
  { id: 'planning', label: 'Planning & FIRE', icon: 'radar' },
  { id: 'budgets', label: 'Category Budgets', icon: 'wallet-outline' },
];

export default function NeuroFinanceMasterScreen() {
  const { handleSmartBack } = useNinjaBack({
    fallbackRoute: '/(tabs)/lifeos',
  });
  const { showToast } = useNinjaAlert();

  const [activeTab, setActiveTab] = useState<FinanceTab>('ledger');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Master Data State
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthSummary>({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    liquidCash: 0,
    investmentAssets: 0,
    emergencyFundRunwayMonths: 0,
  });
  const [emiSafety, setEmiSafety] = useState<EMISafetyInfo>({
    maxSafeEMI: 20000,
    remainingCapacity: 20000,
    status: 'safe',
    percentage: 0,
  });

  // Modals State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      const [cats, mems, txs, prof, nw, emi] = await Promise.all([
        getCategories(),
        getFamilyMembers(),
        getTransactionsV2({ limit: 100 }),
        getProfileV2(),
        getNetWorthSummaryV2(),
        getEMISafety(),
      ]);
      setCategories(cats);
      setMembers(mems);
      setTransactions(txs);
      setCurrencySymbol(prof.currency || '₹');
      setNetWorth(nw);
      setEmiSafety(emi);
    } catch (e) {
      console.warn('[NeuroFinance] Error loading master data:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const [cats, mems, txs, prof, nw, emi] = await Promise.all([
          getCategories(),
          getFamilyMembers(),
          getTransactionsV2({ limit: 100 }),
          getProfileV2(),
          getNetWorthSummaryV2(),
          getEMISafety(),
        ]);
        if (isMounted) {
          setCategories(cats);
          setMembers(mems);
          setTransactions(txs);
          setCurrencySymbol(prof.currency || '₹');
          setNetWorth(nw);
          setEmiSafety(emi);
        }
      } catch (e) {
        console.warn('[NeuroFinance] Error loading initial master data:', e);
      }
    };
    void fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTabChange = (t: FinanceTab) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(t);
  };

  // Transaction Handler
  const handleAddTransaction = async (t: Partial<FinanceTransaction>) => {
    await saveTransactionV2(t);
    showToast({
      title: t.type === 'expense' ? 'Expense Logged' : 'Income Added',
      message: `${currencySymbol}${t.amount?.toLocaleString()} recorded to local SQLite ledger.`,
      type: 'success',
      icon: 'check-circle',
    });
    await loadAllData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransactionV2(id);
    showToast({
      title: 'Transaction Deleted',
      message: 'Record removed from local database and queued for sync.',
      type: 'info',
      icon: 'trash-can',
    });
    await loadAllData();
  };

  // Category Handlers
  const handleSaveCategory = async (cat: Partial<CustomCategory>) => {
    await saveCategory(cat);
    showToast({
      title: 'Category Saved',
      message: `"${cat.name}" is now available across your finance ledger.`,
      type: 'success',
      icon: 'tag-check',
    });
    await loadAllData();
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    showToast({
      title: 'Category Removed',
      message: 'Category deleted.',
      type: 'info',
      icon: 'trash-can',
    });
    await loadAllData();
  };

  const handleUpdateCategoryBudget = async (id: string, budget: number) => {
    const existing = categories.find((c) => c.id === id);
    if (existing) {
      await saveCategory({ ...existing, budgetLimit: budget });
      showToast({
        title: 'Monthly Cap Updated',
        message: `${existing.name} cap set to ${currencySymbol}${budget.toLocaleString()}`,
        type: 'success',
        icon: 'wallet',
      });
      await loadAllData();
    }
  };

  // Member / Persona Handlers
  const handleSaveMember = async (member: Partial<FamilyMember>) => {
    await saveFamilyMember(member);
    showToast({
      title: 'Persona Created',
      message: `"${member.name}" added to multi-persona tracking.`,
      type: 'success',
      icon: 'account-check',
    });
    await loadAllData();
  };

  const handleDeleteMember = async (id: string) => {
    await deleteFamilyMember(id);
    showToast({
      title: 'Persona Removed',
      message: 'Persona deleted.',
      type: 'info',
      icon: 'trash-can',
    });
    await loadAllData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleSmartBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.headerTag}>WEB-TO-MOBILE PARITY</Text>
            <View style={styles.liveSyncBadge}>
              <View style={styles.liveSyncDot} />
              <Text style={styles.liveSyncText}>LOCAL-FIRST 0MS</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Neuro Finance</Text>
        </View>

        {/* Share Snapshot Button */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsShareModalOpen(true);
          }}
        >
          <MaterialCommunityIcons name="share-variant-outline" size={20} color="#00E699" />
        </TouchableOpacity>
      </View>

      {/* Quick KPI Strip */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiPill}>
          <Text style={styles.kpiPillLabel}>NET WORTH</Text>
          <Text style={[styles.kpiPillValue, { color: netWorth.netWorth >= 0 ? '#00E699' : '#F43F5E' }]}>
            {currencySymbol}
            {netWorth.netWorth.toLocaleString()}
          </Text>
        </View>

        <View style={styles.kpiPill}>
          <Text style={styles.kpiPillLabel}>DTI SAFETY</Text>
          <Text
            style={[
              styles.kpiPillValue,
              { color: emiSafety.status === 'safe' ? '#00E699' : emiSafety.status === 'moderate' ? '#F59E0B' : '#F43F5E' },
            ]}
          >
            {emiSafety.percentage}% ({emiSafety.status.toUpperCase()})
          </Text>
        </View>

        <View style={styles.kpiPill}>
          <Text style={styles.kpiPillLabel}>RUNWAY</Text>
          <Text style={[styles.kpiPillValue, { color: '#38BDF8' }]}>
            {netWorth.emergencyFundRunwayMonths} mos
          </Text>
        </View>
      </View>

      {/* Tab Switcher Horizontal Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => handleTabChange(tab.id)}
              >
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={15}
                  color={active ? '#070A11' : '#94A3B8'}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab View Body */}
      <View style={styles.body}>
        {activeTab === 'ledger' && (
          <ExpenseLedgerView
            transactions={transactions}
            categories={categories}
            members={members}
            currencySymbol={currencySymbol}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenCategoryManager={() => setIsCatModalOpen(true)}
            onOpenMemberManager={() => setIsMemberModalOpen(true)}
          />
        )}

        {activeTab === 'analytics' && <ExpenseAnalyticsView currencySymbol={currencySymbol} />}

        {activeTab === 'networth' && <NetWorthView currencySymbol={currencySymbol} />}

        {activeTab === 'salaries' && <SalaryManagerView currencySymbol={currencySymbol} />}

        {activeTab === 'emis' && <EMIManagerView currencySymbol={currencySymbol} />}

        {activeTab === 'investments' && <InvestmentsView currencySymbol={currencySymbol} />}

        {activeTab === 'planning' && <FinancialPlanningView currencySymbol={currencySymbol} />}

        {activeTab === 'budgets' && (
          <CategoryBudgetsView
            categories={categories}
            transactions={transactions}
            currencySymbol={currencySymbol}
            onUpdateCategoryBudget={handleUpdateCategoryBudget}
          />
        )}
      </View>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        visible={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Member / Persona Manager Modal */}
      <MemberManagerModal
        visible={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        members={members}
        onSaveMember={handleSaveMember}
        onDeleteMember={handleDeleteMember}
      />

      {/* Wealth Zen Share Modal */}
      <WealthZenShareModal
        visible={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        netWorth={netWorth}
        emiSafety={emiSafety}
        currencySymbol={currencySymbol}
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
    paddingTop: 12,
    paddingBottom: 10,
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    gap: 4,
  },
  liveSyncDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  liveSyncText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#38BDF8',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: '#00E69940',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  kpiPill: {
    flex: 1,
    backgroundColor: '#0F1829',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  kpiPillLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  kpiPillValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#070A11',
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  tabText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#070A11',
    fontWeight: '800',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
