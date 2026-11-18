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
  getEmisV2,
  saveEmiV2,
  deleteEmiV2,
  getEMISafety,
  calculateEMI,
} from '../../services/finance/finance-service';
import { EMIRecord, EMISafetyInfo, LoanType, ObligationType } from '../../services/finance/finance-types';

export interface EMIManagerViewProps {
  currencySymbol: string;
}

const LOAN_TYPES: { id: LoanType; label: string; icon: string }[] = [
  { id: 'home', label: 'Home Loan', icon: '🏠' },
  { id: 'car', label: 'Car / Auto Loan', icon: '🚗' },
  { id: 'two_wheeler', label: 'Two Wheeler', icon: '🛵' },
  { id: 'personal', label: 'Personal Loan', icon: '👤' },
  { id: 'education', label: 'Education Loan', icon: '🎓' },
  { id: 'credit_card', label: 'Credit Card EMI', icon: '💳' },
  { id: 'consumer_durable', label: 'Electronics / Mobile', icon: '📱' },
  { id: 'gold', label: 'Gold Loan', icon: '🥇' },
  { id: 'other', label: 'Other EMI', icon: '📑' },
];

export function EMIManagerView({ currencySymbol }: EMIManagerViewProps) {
  const [emis, setEmis] = useState<EMIRecord[]>([]);
  const [safety, setSafety] = useState<EMISafetyInfo>({
    maxSafeEMI: 20000,
    remainingCapacity: 20000,
    status: 'safe',
    percentage: 0,
  });

  // Add Loan Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loanName, setLoanName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('personal');
  const obligationType: ObligationType = 'term_loan';
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('10.5');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [lender, setLender] = useState('');
  const [dueDay, setDueDay] = useState('5');

  // Calculator Modal
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcPrincipal, setCalcPrincipal] = useState('500000');
  const [calcRate, setCalcRate] = useState('8.5');
  const [calcTenure, setCalcTenure] = useState('60');

  const loadData = async () => {
    try {
      const [list, s] = await Promise.all([getEmisV2(), getEMISafety()]);
      setEmis(list);
      setSafety(s);
    } catch (e) {
      console.warn('[EMIManager] Error loading data:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInit = async () => {
      try {
        const [list, s] = await Promise.all([getEmisV2(), getEMISafety()]);
        if (isMounted) {
          setEmis(list);
          setSafety(s);
        }
      } catch (e) {
        console.warn('[EMIManager] Error loading data:', e);
      }
    };
    void fetchInit();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveLoan = async () => {
    const p = Number(principal.replace(/[^0-9.]/g, ''));
    if (!p || p <= 0 || !loanName.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const r = Number(interestRate.replace(/[^0-9.]/g, '')) || 10.5;
    const t = Number(tenureMonths.replace(/[^0-9.]/g, '')) || 12;
    const emiCalc = calculateEMI(p, r, t);

    await saveEmiV2({
      loanName: loanName.trim(),
      loanType,
      obligationType,
      principalAmount: p,
      outstandingPrincipal: p,
      interestRate: r,
      tenureMonths: t,
      emiAmount: emiCalc.monthlyEMI,
      lenderName: lender.trim() || 'Bank',
      dueDayOfMonth: Math.min(31, Math.max(1, Number(dueDay) || 5)),
      startDate: new Date().toISOString().substring(0, 10),
      monthsPaid: 0,
      isActive: true,
    });

    setLoanName('');
    setPrincipal('');
    setLender('');
    setIsAddModalOpen(false);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteEmiV2(id);
    await loadData();
  };

  const calcResult = calculateEMI(
    Number(calcPrincipal.replace(/[^0-9.]/g, '')) || 0,
    Number(calcRate.replace(/[^0-9.]/g, '')) || 0,
    Number(calcTenure.replace(/[^0-9.]/g, '')) || 1
  );

  const statusColor = safety.status === 'safe' ? '#00E699' : safety.status === 'moderate' ? '#F59E0B' : '#F43F5E';
  const totalMonthlyEMI = emis.reduce((sum, e) => sum + e.emiAmount, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 40% DTI Safety Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.badgeRow}>
          <Text style={styles.heroTag}>DEBT-TO-INCOME (DTI) SAFETY ENGINE</Text>
          <View style={[styles.statusBadge, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{safety.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={[styles.heroTotal, { color: statusColor }]}>
          {currencySymbol}
          {totalMonthlyEMI.toLocaleString()}/mo
        </Text>
        <Text style={styles.heroSub}>
          {safety.percentage}% of household income committed to EMIs (Safe cap: 40%)
        </Text>

        {/* Progress Bar for DTI */}
        <View style={styles.dtiTrack}>
          <View
            style={[
              styles.dtiFill,
              {
                width: `${Math.min(100, (safety.percentage / 50) * 100)}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        <View style={styles.dtiMetricsRow}>
          <Text style={styles.dtiCapText}>
            Max Safe EMI: {currencySymbol}
            {safety.maxSafeEMI.toLocaleString()}
          </Text>
          <Text style={[styles.dtiCapText, { color: safety.remainingCapacity > 0 ? '#00E699' : '#F43F5E' }]}>
            Remaining Capacity: {currencySymbol}
            {safety.remainingCapacity.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.addLoanBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsAddModalOpen(true);
          }}
        >
          <MaterialCommunityIcons name="credit-card-plus" size={18} color="#070A11" />
          <Text style={styles.addLoanBtnText}>+ Add Loan / EMI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.calcBtn}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsCalcOpen(true);
          }}
        >
          <MaterialCommunityIcons name="calculator" size={18} color="#38BDF8" />
          <Text style={styles.calcBtnText}>Affordability Simulator</Text>
        </TouchableOpacity>
      </View>

      {/* Active Loans List */}
      <Text style={styles.sectionHeader}>ACTIVE DEBT OBLIGATIONS ({emis.length})</Text>

      {emis.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="shield-check" size={42} color="#00E699" />
          <Text style={styles.emptyTitle}>Zero Debt Detected</Text>
          <Text style={styles.emptySub}>You have 100% borrowing headroom with no active monthly EMI burdens.</Text>
        </View>
      ) : (
        emis.map((e) => {
          const typeMeta = LOAN_TYPES.find((t) => t.id === e.loanType) || { label: 'Loan', icon: '📑' };
          const progressPct = e.tenureMonths > 0 ? Math.round((e.monthsPaid / e.tenureMonths) * 100) : 0;

          return (
            <View key={e.id} style={styles.loanCard}>
              <View style={styles.loanCardTop}>
                <View style={styles.loanIconBox}>
                  <Text style={{ fontSize: 18 }}>{typeMeta.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.loanTitle}>{e.loanName}</Text>
                  <Text style={styles.loanMeta}>
                    {e.lenderName || 'Bank'} • Due on {e.dueDayOfMonth}th • {e.interestRate}% APR
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.loanEMI}>
                    {currencySymbol}
                    {e.emiAmount.toLocaleString()}
                  </Text>
                  <Text style={styles.loanEMISub}>/month</Text>
                </View>
              </View>

              {/* Progress and Tenure Bar */}
              <View style={styles.loanProgressWrap}>
                <View style={styles.loanProgressBarBg}>
                  <View style={[styles.loanProgressBarFill, { width: `${progressPct}%` }]} />
                </View>
                <View style={styles.loanProgressTextRow}>
                  <Text style={styles.loanProgressText}>
                    Paid {e.monthsPaid} of {e.tenureMonths} mos ({progressPct}%)
                  </Text>
                  <Text style={styles.loanOutstandingText}>
                    Balance: {currencySymbol}
                    {e.outstandingPrincipal.toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(e.id)}>
                <Ionicons name="trash-outline" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Add Loan Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent onRequestClose={() => setIsAddModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Loan / Consumer EMI</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Loan / Obligation Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. iPhone 16 Pro No-Cost EMI, HDFC Home Loan"
                placeholderTextColor="#64748B"
                value={loanName}
                onChangeText={setLoanName}
              />

              <Text style={styles.inputLabel}>Principal Loan Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="₹ 120000"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={principal}
                onChangeText={setPrincipal}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Interest Rate (% p.a.)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10.5"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={interestRate}
                    onChangeText={setInterestRate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Tenure (Months)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="12"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={tenureMonths}
                    onChangeText={setTenureMonths}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Lender / Financial Inst.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. HDFC Bank, Bajaj Finserv"
                    placeholderTextColor="#64748B"
                    value={lender}
                    onChangeText={setLender}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Due Day of Month</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={dueDay}
                    onChangeText={setDueDay}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Loan Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {LOAN_TYPES.map((t) => {
                  const active = loanType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => setLoanType(t.id)}
                    >
                      <Text style={{ fontSize: 13 }}>{t.icon}</Text>
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveLoan}>
                <Text style={styles.submitBtnText}>Confirm & Add Loan</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Affordability Simulator Modal */}
      <Modal visible={isCalcOpen} animationType="slide" transparent onRequestClose={() => setIsCalcOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EMI Affordability Simulator</Text>
              <TouchableOpacity onPress={() => setIsCalcOpen(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Planned Loan Amount</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={calcPrincipal}
                onChangeText={setCalcPrincipal}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Interest Rate (% p.a.)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={calcRate}
                    onChangeText={setCalcRate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Tenure (Months)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={calcTenure}
                    onChangeText={setCalcTenure}
                  />
                </View>
              </View>

              {/* Simulation Result Box */}
              <View style={styles.simCard}>
                <Text style={styles.simLabel}>CALCULATED MONTHLY EMI</Text>
                <Text style={styles.simEMI}>
                  {currencySymbol}
                  {calcResult.monthlyEMI.toLocaleString()}
                </Text>

                <View style={styles.simRow}>
                  <Text style={styles.simMeta}>Total Interest Payable</Text>
                  <Text style={[styles.simMetaVal, { color: '#F43F5E' }]}>
                    {currencySymbol}
                    {calcResult.totalInterest.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.simRow}>
                  <Text style={styles.simMeta}>Total Repayment</Text>
                  <Text style={styles.simMetaVal}>
                    {currencySymbol}
                    {calcResult.totalPayable.toLocaleString()}
                  </Text>
                </View>

                <View style={[styles.simSafetyBanner, { borderColor: calcResult.monthlyEMI <= safety.remainingCapacity ? '#00E69940' : '#F43F5E40' }]}>
                  <MaterialCommunityIcons
                    name={calcResult.monthlyEMI <= safety.remainingCapacity ? 'check-circle' : 'alert-circle'}
                    size={18}
                    color={calcResult.monthlyEMI <= safety.remainingCapacity ? '#00E699' : '#F43F5E'}
                  />
                  <Text style={styles.simSafetyText}>
                    {calcResult.monthlyEMI <= safety.remainingCapacity
                      ? 'Within your 40% DTI safe borrowing headroom.'
                      : 'WARNING: This EMI will breach your 40% safe DTI ceiling!'}
                  </Text>
                </View>
              </View>
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
  heroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  heroTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroTotal: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  heroSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    textAlign: 'center',
  },
  dtiTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#070A11',
    borderRadius: 4,
    marginTop: 14,
    overflow: 'hidden',
  },
  dtiFill: {
    height: '100%',
    borderRadius: 4,
  },
  dtiMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  dtiCapText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  addLoanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  addLoanBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#070A11',
  },
  calcBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#38BDF840',
    gap: 6,
  },
  calcBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  sectionHeader: {
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
  loanCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  loanCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#38BDF820',
    borderWidth: 1,
    borderColor: '#38BDF840',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  loanMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  loanEMI: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F43F5E',
  },
  loanEMISub: {
    fontSize: 10,
    color: '#64748B',
  },
  loanProgressWrap: {
    marginTop: 12,
  },
  loanProgressBarBg: {
    height: 6,
    backgroundColor: '#070A11',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loanProgressBarFill: {
    height: '100%',
    backgroundColor: '#00E699',
    borderRadius: 3,
  },
  loanProgressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  loanProgressText: {
    fontSize: 10,
    color: '#64748B',
  },
  loanOutstandingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  delBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
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
    borderColor: '#38BDF8',
    backgroundColor: '#38BDF820',
  },
  typeChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#38BDF8',
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
  simCard: {
    backgroundColor: '#070A11',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    marginVertical: 10,
  },
  simLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  simEMI: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00E699',
    marginTop: 4,
    marginBottom: 12,
  },
  simRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  simMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  simMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  simSafetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    width: '100%',
  },
  simSafetyText: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
  },
});
