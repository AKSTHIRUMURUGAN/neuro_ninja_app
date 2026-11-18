import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getRule50_30_20Breakdown,
  getGoalsV2,
  saveGoalV2,
  deleteGoalV2,
  getProfileV2,
  getNetWorthSummaryV2,
} from '../../services/finance/finance-service';
import { FinancialGoal, FinancialGoalCategory } from '../../services/finance/finance-types';

export interface FinancialPlanningViewProps {
  currencySymbol: string;
}

const GOAL_CATEGORIES: { id: FinancialGoalCategory; label: string; icon: string }[] = [
  { id: 'house', label: 'Home Purchase', icon: '🏠' },
  { id: 'vehicle', label: 'Vehicle / Car', icon: '🚗' },
  { id: 'education', label: 'Education / Upskilling', icon: '🎓' },
  { id: 'wedding', label: 'Wedding / Milestone', icon: '💍' },
  { id: 'travel', label: 'World Travel / Trip', icon: '✈️' },
  { id: 'emergency', label: 'Emergency Fund', icon: '🛡️' },
  { id: 'retirement', label: 'Retirement / FIRE', icon: '🏖️' },
  { id: 'gadget', label: 'Gadget / Tech Gear', icon: '💻' },
  { id: 'other', label: 'Other Goal', icon: '🎯' },
];

export function FinancialPlanningView({ currencySymbol }: FinancialPlanningViewProps) {
  const [rule5020, setRule5020] = useState<{
    needs: number;
    wants: number;
    savings: number;
    totalSpent: number;
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
    targetNeedsPct: number;
    targetWantsPct: number;
    targetSavingsPct: number;
  }>({
    needs: 0,
    wants: 0,
    savings: 0,
    totalSpent: 0,
    needsPct: 0,
    wantsPct: 0,
    savingsPct: 0,
    targetNeedsPct: 50,
    targetWantsPct: 30,
    targetSavingsPct: 20,
  });

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [liquidCash, setLiquidCash] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(25000);

  // Add Goal Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentSaved, setCurrentSaved] = useState('');
  const [targetYearMonth, setTargetYearMonth] = useState('2027-12');
  const [category, setCategory] = useState<FinancialGoalCategory>('house');

  const loadData = async () => {
    try {
      const [r50, gList, prof, nw] = await Promise.all([
        getRule50_30_20Breakdown(),
        getGoalsV2(),
        getProfileV2(),
        getNetWorthSummaryV2(),
      ]);
      setRule5020(r50);
      setGoals(gList);
      setLiquidCash(nw.liquidCash);
      setMonthlyExpense(prof.monthlyExpenses || 25000);
    } catch (e) {
      console.warn('[FinancialPlanning] Error loading data:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInit = async () => {
      try {
        const [r50, gList, prof, nw] = await Promise.all([
          getRule50_30_20Breakdown(),
          getGoalsV2(),
          getProfileV2(),
          getNetWorthSummaryV2(),
        ]);
        if (isMounted) {
          setRule5020(r50);
          setGoals(gList);
          setLiquidCash(nw.liquidCash);
          setMonthlyExpense(prof.monthlyExpenses || 25000);
        }
      } catch (e) {
        console.warn('[FinancialPlanning] Error loading data:', e);
      }
    };
    void fetchInit();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveGoal = async () => {
    const tgt = Number(targetAmount.replace(/[^0-9.]/g, ''));
    if (!tgt || tgt <= 0 || !goalName.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const cur = Number(currentSaved.replace(/[^0-9.]/g, '')) || 0;

    await saveGoalV2({
      name: goalName.trim(),
      targetAmount: tgt,
      currentSaved: cur,
      targetDate: targetYearMonth.trim() || '2028-12',
      category,
      priority: 'high',
    });

    setGoalName('');
    setTargetAmount('');
    setCurrentSaved('');
    setIsModalOpen(false);
    await loadData();
  };

  const handleDeleteGoal = async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteGoalV2(id);
    await loadData();
  };

  // Emergency Fund Tiers
  const tier3m = monthlyExpense * 3;
  const tier6m = monthlyExpense * 6;
  const tier12m = monthlyExpense * 12;

  // FIRE Calculation
  const fireNestEgg = monthlyExpense * 12 * 25; // 4% SWR Rule

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 50 / 30 / 20 Budget Radar Card */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="radar" size={20} color="#00E699" />
          <Text style={styles.sectionTitle}>50-30-20 BUDGET RULE COMPLIANCE</Text>
        </View>
        <Text style={styles.sectionSub}>Gold standard personal finance rule (Needs vs Wants vs Savings)</Text>

        {/* 3 Pillars */}
        <View style={styles.rulePillarsRow}>
          {/* Needs */}
          <View style={styles.pillarCard}>
            <Text style={styles.pillarTag}>NEEDS (50%)</Text>
            <Text style={[styles.pillarActual, { color: rule5020.needsPct <= 50 ? '#10B981' : '#F43F5E' }]}>
              {rule5020.needsPct}%
            </Text>
            <Text style={styles.pillarAmount}>
              {currencySymbol}
              {rule5020.needs.toLocaleString()}
            </Text>
            <Text style={styles.pillarSub}>Rent, Utilities, Food</Text>
          </View>

          {/* Wants */}
          <View style={styles.pillarCard}>
            <Text style={styles.pillarTag}>WANTS (30%)</Text>
            <Text style={[styles.pillarActual, { color: rule5020.wantsPct <= 30 ? '#10B981' : '#F59E0B' }]}>
              {rule5020.wantsPct}%
            </Text>
            <Text style={styles.pillarAmount}>
              {currencySymbol}
              {rule5020.wants.toLocaleString()}
            </Text>
            <Text style={styles.pillarSub}>Dining, Shopping, Fun</Text>
          </View>

          {/* Savings */}
          <View style={styles.pillarCard}>
            <Text style={styles.pillarTag}>SAVINGS (20%)</Text>
            <Text style={[styles.pillarActual, { color: rule5020.savingsPct >= 20 ? '#00E699' : '#F59E0B' }]}>
              {rule5020.savingsPct}%
            </Text>
            <Text style={styles.pillarAmount}>
              {currencySymbol}
              {rule5020.savings.toLocaleString()}
            </Text>
            <Text style={styles.pillarSub}>SIPs, Stocks, EPF</Text>
          </View>
        </View>
      </View>

      {/* Emergency Fund Fortress */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="shield-lock" size={20} color="#38BDF8" />
          <Text style={styles.sectionTitle}>EMERGENCY FUND RUNWAY BUILDER</Text>
        </View>
        <Text style={styles.sectionSub}>Capital cushion insulating you against sudden job loss or medical events</Text>

        <View style={styles.fortressBox}>
          <View style={styles.fortressTop}>
            <Text style={styles.fortressLiquidLabel}>Liquid Shield Funds</Text>
            <Text style={styles.fortressLiquidVal}>
              {currencySymbol}
              {liquidCash.toLocaleString()}
            </Text>
          </View>

          {/* 3 Tier Runway Gauges */}
          <View style={styles.tierGrid}>
            <View style={[styles.tierCard, liquidCash >= tier3m && styles.tierCardActive]}>
              <Text style={styles.tierTitle}>Tier 1: Baseline</Text>
              <Text style={styles.tierMonths}>3 Months</Text>
              <Text style={styles.tierAmt}>{currencySymbol}{tier3m.toLocaleString()}</Text>
              <Text style={styles.tierStatus}>{liquidCash >= tier3m ? '✅ Fortified' : 'Pending'}</Text>
            </View>

            <View style={[styles.tierCard, liquidCash >= tier6m && styles.tierCardActive]}>
              <Text style={styles.tierTitle}>Tier 2: Bulletproof</Text>
              <Text style={styles.tierMonths}>6 Months</Text>
              <Text style={styles.tierAmt}>{currencySymbol}{tier6m.toLocaleString()}</Text>
              <Text style={styles.tierStatus}>{liquidCash >= tier6m ? '✅ Fortified' : 'In Progress'}</Text>
            </View>

            <View style={[styles.tierCard, liquidCash >= tier12m && styles.tierCardActive]}>
              <Text style={styles.tierTitle}>Tier 3: Zen Master</Text>
              <Text style={styles.tierMonths}>12 Months</Text>
              <Text style={styles.tierAmt}>{currencySymbol}{tier12m.toLocaleString()}</Text>
              <Text style={styles.tierStatus}>{liquidCash >= tier12m ? '✅ Fortified' : 'Aspirational'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* FIRE Independence Number Card */}
      <View style={styles.fireCard}>
        <View style={styles.fireHeader}>
          <MaterialCommunityIcons name="fire" size={24} color="#F97316" />
          <Text style={styles.fireTitle}>FINANCIAL INDEPENDENCE (FIRE) NUMBER</Text>
        </View>
        <Text style={styles.fireNumber}>
          {currencySymbol}
          {fireNestEgg.toLocaleString()}
        </Text>
        <Text style={styles.fireSub}>
          Based on the 4% Safe Withdrawal Rule (25x annual expenses of {currencySymbol}{(monthlyExpense * 12).toLocaleString()})
        </Text>
      </View>

      {/* Action to Add Financial Goal */}
      <TouchableOpacity
        style={styles.addGoalBtn}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsModalOpen(true);
        }}
      >
        <MaterialCommunityIcons name="flag-checkered" size={20} color="#070A11" />
        <Text style={styles.addGoalBtnText}>+ Add New Financial Goal</Text>
      </TouchableOpacity>

      {/* Financial Goals Tracker */}
      <Text style={styles.sectionHeaderLabel}>TARGET GOALS ({goals.length})</Text>

      {goals.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="flag-outline" size={42} color="#334155" />
          <Text style={styles.emptyTitle}>No Goals Configured</Text>
          <Text style={styles.emptySub}>Set milestone goals (buying a home, wedding, trip, car) to track progress.</Text>
        </View>
      ) : (
        goals.map((g) => {
          const meta = GOAL_CATEGORIES.find((c) => c.id === g.category) || { label: 'Goal', icon: '🎯' };
          const progress = g.targetAmount > 0 ? Math.round((g.currentSaved / g.targetAmount) * 100) : 0;

          return (
            <View key={g.id} style={styles.goalCard}>
              <View style={styles.goalTop}>
                <View style={styles.goalIconBox}>
                  <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.goalName}>{g.name}</Text>
                  <Text style={styles.goalMeta}>
                    Target Date: {g.targetDate} • {meta.label}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.goalSaved}>
                    {currencySymbol}
                    {g.currentSaved.toLocaleString()}
                  </Text>
                  <Text style={styles.goalTarget}>
                    of {currencySymbol}
                    {g.targetAmount.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.goalProgressWrap}>
                <View style={styles.goalProgressBarBg}>
                  <View style={[styles.goalProgressBarFill, { width: `${Math.min(100, progress)}%` }]} />
                </View>
                <View style={styles.goalProgressFooter}>
                  <Text style={styles.goalProgressPct}>{progress}% Achieved</Text>
                  <Text style={styles.goalRemaining}>
                    Remaining: {currencySymbol}
                    {Math.max(0, g.targetAmount - g.currentSaved).toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteGoal(g.id)}>
                <Ionicons name="trash-outline" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Add Goal Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Financial Milestone Goal</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Goal Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dream House Downpayment, EV Car, Masters Fund"
                placeholderTextColor="#64748B"
                value={goalName}
                onChangeText={setGoalName}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Target Corpus Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₹ 1500000"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={targetAmount}
                    onChangeText={setTargetAmount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Already Saved</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₹ 250000"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={currentSaved}
                    onChangeText={setCurrentSaved}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Target Horizon (YYYY-MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="2027-12"
                placeholderTextColor="#64748B"
                value={targetYearMonth}
                onChangeText={setTargetYearMonth}
              />

              <Text style={styles.inputLabel}>Milestone Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {GOAL_CATEGORIES.map((c) => {
                  const active = category === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => setCategory(c.id)}
                    >
                      <Text style={{ fontSize: 13 }}>{c.icon}</Text>
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveGoal}>
                <Text style={styles.submitBtnText}>Create Goal</Text>
              </TouchableOpacity>
            </ScrollView>
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
  sectionCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  rulePillarsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillarCard: {
    flex: 1,
    backgroundColor: '#070A11',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  pillarTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  pillarActual: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  pillarAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  pillarSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  fortressBox: {
    backgroundColor: '#070A11',
    borderRadius: 14,
    padding: 14,
  },
  fortressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fortressLiquidLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  fortressLiquidVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38BDF8',
  },
  tierGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  tierCardActive: {
    borderColor: '#00E699',
    backgroundColor: '#00E69910',
  },
  tierTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tierMonths: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  tierAmt: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  tierStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  fireCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F9731640',
  },
  fireHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fireTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 0.8,
  },
  fireNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F97316',
    marginTop: 6,
  },
  fireSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 8,
  },
  addGoalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    paddingVertical: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  goalCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#00E69920',
    borderWidth: 1,
    borderColor: '#00E69940',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  goalMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  goalSaved: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00E699',
  },
  goalTarget: {
    fontSize: 10,
    color: '#64748B',
  },
  goalProgressWrap: {
    marginTop: 12,
  },
  goalProgressBarBg: {
    height: 6,
    backgroundColor: '#070A11',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressBarFill: {
    height: '100%',
    backgroundColor: '#00E699',
    borderRadius: 3,
  },
  goalProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  goalProgressPct: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E699',
  },
  goalRemaining: {
    fontSize: 10,
    color: '#64748B',
  },
  delBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
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
    maxHeight: '85%',
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
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalScroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  inputLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#070A11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
  },
  typeScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  typeChip: {
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
  typeChipActive: {
    borderColor: '#00E699',
    backgroundColor: '#00E69920',
  },
  typeChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
});
