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
  getSalariesV2,
  saveSalaryV2,
  deleteSalaryV2,
  getCombinedHouseholdIncome,
} from '../../services/finance/finance-service';
import { SalaryProfile } from '../../services/finance/finance-types';

export interface SalaryManagerViewProps {
  currencySymbol: string;
}

export function SalaryManagerView({ currencySymbol }: SalaryManagerViewProps) {
  const [profiles, setProfiles] = useState<SalaryProfile[]>([]);
  const [household, setHousehold] = useState<{
    totalGross: number;
    totalInHand: number;
    totalDeductions: number;
    totalSideIncome: number;
    effectiveTotalMonthlyIncome: number;
  }>({
    totalGross: 0,
    totalInHand: 0,
    totalDeductions: 0,
    totalSideIncome: 0,
    effectiveTotalMonthlyIncome: 0,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [gross, setGross] = useState('');
  const [sideIncome, setSideIncome] = useState('');
  const [payDay, setPayDay] = useState('1');
  const [pf, setPf] = useState('1800');
  const [pt, setPt] = useState('200');
  const [tds, setTds] = useState('0');
  const [insurance, setInsurance] = useState('0');

  const loadSalaries = async () => {
    try {
      const [list, hh] = await Promise.all([getSalariesV2(), getCombinedHouseholdIncome()]);
      setProfiles(list);
      setHousehold(hh);
      if (list.length > 0 && !expandedId) {
        setExpandedId(list[0].id);
      }
    } catch (e) {
      console.warn('[SalaryManager] Error loading salaries:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInit = async () => {
      try {
        const [list, hh] = await Promise.all([getSalariesV2(), getCombinedHouseholdIncome()]);
        if (isMounted) {
          setProfiles(list);
          setHousehold(hh);
          if (list.length > 0 && !expandedId) {
            setExpandedId(list[0].id);
          }
        }
      } catch (e) {
        console.warn('[SalaryManager] Error loading salaries:', e);
      }
    };
    void fetchInit();
    return () => {
      isMounted = false;
    };
  }, [expandedId]);

  const handleSaveSalary = async () => {
    const grossNum = Number(gross.replace(/[^0-9.]/g, ''));
    if (!grossNum || grossNum <= 0 || !name.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const sideNum = Number(sideIncome.replace(/[^0-9.]/g, '')) || 0;
    const pfNum = Number(pf.replace(/[^0-9.]/g, '')) || 0;
    const ptNum = Number(pt.replace(/[^0-9.]/g, '')) || 0;
    const tdsNum = Number(tds.replace(/[^0-9.]/g, '')) || 0;
    const insNum = Number(insurance.replace(/[^0-9.]/g, '')) || 0;

    await saveSalaryV2({
      memberName: name.trim(),
      monthlyGross: grossNum,
      sideIncome: sideNum,
      payDate: Math.min(31, Math.max(1, Number(payDay) || 1)),
      deductions: {
        pf: pfNum,
        pt: ptNum,
        tds: tdsNum,
        insurance: insNum,
        other: 0,
      },
    });

    setName('');
    setGross('');
    setSideIncome('');
    setIsModalOpen(false);
    await loadSalaries();
  };

  const handleDelete = async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteSalaryV2(id);
    await loadSalaries();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Household Summary Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTag}>COMBINED HOUSEHOLD MONTHLY INFLOW</Text>
        <Text style={[styles.heroTotal, { color: '#00E699' }]}>
          {currencySymbol}
          {household.effectiveTotalMonthlyIncome.toLocaleString()}
        </Text>
        <Text style={styles.heroSub}>Net In-Hand plus verified Side Incomes</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TOTAL GROSS</Text>
            <Text style={styles.metricValue}>
              {currencySymbol}
              {household.totalGross.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>DEDUCTIONS (TAX+PF)</Text>
            <Text style={[styles.metricValue, { color: '#F43F5E' }]}>
              -{currencySymbol}
              {household.totalDeductions.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>SIDE INCOMES</Text>
            <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
              +{currencySymbol}
              {household.totalSideIncome.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Add Earner Action */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsModalOpen(true);
        }}
      >
        <MaterialCommunityIcons name="account-cash" size={20} color="#070A11" />
        <Text style={styles.addBtnText}>+ Add Earner / Salary Profile</Text>
      </TouchableOpacity>

      {/* Earners Profiles List */}
      <Text style={styles.sectionHeader}>REGISTERED EARNERS ({profiles.length})</Text>

      {profiles.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="wallet-giftcard" size={42} color="#334155" />
          <Text style={styles.emptyTitle}>No Salary Profiles Added</Text>
          <Text style={styles.emptySub}>Add salary and freelance profiles to track multi-income households.</Text>
        </View>
      ) : (
        profiles.map((p) => {
          const isExp = expandedId === p.id;

          return (
            <View key={p.id} style={styles.salaryCard}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedId(isExp ? null : p.id);
                }}
              >
                <View style={styles.avatarCircle}>
                  <Text style={{ fontSize: 18 }}>💼</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.earnerName}>{p.memberName}</Text>
                  <Text style={styles.payDayText}>
                    Pay Day: {p.payDate}th of month • In-Hand: {currencySymbol}
                    {p.inHandSalary.toLocaleString()}
                  </Text>
                </View>
                <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={20} color="#94A3B8" />
              </TouchableOpacity>

              {/* Expandable Pay Slip */}
              {isExp && (
                <View style={styles.slipBody}>
                  <View style={styles.slipHeader}>
                    <Text style={styles.slipTitle}>ESTIMATED PAY SLIP BREAKDOWN</Text>
                    <TouchableOpacity onPress={() => handleDelete(p.id)}>
                      <Ionicons name="trash-outline" size={16} color="#F43F5E" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Basic Pay</Text>
                    <Text style={styles.slipVal}>
                      {currencySymbol}
                      {p.basicPay.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>House Rent Allowance (HRA)</Text>
                    <Text style={styles.slipVal}>
                      {currencySymbol}
                      {p.hra.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Special / Other Allowances</Text>
                    <Text style={styles.slipVal}>
                      {currencySymbol}
                      {p.specialAllowance.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.slipDivider} />

                  <View style={styles.slipRow}>
                    <Text style={[styles.slipLabel, { color: '#F43F5E' }]}>Provident Fund (PF)</Text>
                    <Text style={[styles.slipVal, { color: '#F43F5E' }]}>
                      -{currencySymbol}
                      {(p.deductions.pf || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={[styles.slipLabel, { color: '#F43F5E' }]}>Professional Tax (PT)</Text>
                    <Text style={[styles.slipVal, { color: '#F43F5E' }]}>
                      -{currencySymbol}
                      {(p.deductions.pt || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={[styles.slipLabel, { color: '#F43F5E' }]}>Income Tax (TDS)</Text>
                    <Text style={[styles.slipVal, { color: '#F43F5E' }]}>
                      -{currencySymbol}
                      {(p.deductions.tds || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.slipRow}>
                    <Text style={[styles.slipLabel, { color: '#F43F5E' }]}>Health Insurance</Text>
                    <Text style={[styles.slipVal, { color: '#F43F5E' }]}>
                      -{currencySymbol}
                      {(p.deductions.insurance || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.slipDivider} />

                  <View style={styles.slipRowTotal}>
                    <Text style={styles.totalLabel}>NET IN-HAND TAKE HOME</Text>
                    <Text style={styles.totalVal}>
                      {currencySymbol}
                      {p.inHandSalary.toLocaleString()}
                    </Text>
                  </View>

                  {p.sideIncome > 0 && (
                    <View style={[styles.slipRow, { marginTop: 6 }]}>
                      <Text style={[styles.slipLabel, { color: '#38BDF8' }]}>+ Moonlighting / Side Income</Text>
                      <Text style={[styles.slipVal, { color: '#38BDF8', fontWeight: '800' }]}>
                        +{currencySymbol}
                        {p.sideIncome.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Add Earner Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Earner Profile</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Earner Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Self, Spouse, Parent"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Monthly CTC / Gross Salary</Text>
              <TextInput
                style={styles.input}
                placeholder="₹ 85000"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={gross}
                onChangeText={setGross}
              />

              <Text style={styles.inputLabel}>Salary Credit Day of Month (1-31)</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={payDay}
                onChangeText={setPayDay}
              />

              <Text style={styles.inputLabel}>Monthly Side Income (Freelance / Consulting)</Text>
              <TextInput
                style={styles.input}
                placeholder="₹ 0"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={sideIncome}
                onChangeText={setSideIncome}
              />

              <Text style={styles.subTitle}>MONTHLY STATUTORY DEDUCTIONS</Text>

              <View style={styles.dedRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.dedLabel}>PF (Provident Fund)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1800"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={pf}
                    onChangeText={setPf}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dedLabel}>PT (Professional Tax)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="200"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={pt}
                    onChangeText={setPt}
                  />
                </View>
              </View>

              <View style={styles.dedRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.dedLabel}>TDS / Income Tax</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={tds}
                    onChangeText={setTds}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dedLabel}>Health Insurance</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={insurance}
                    onChangeText={setInsurance}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveSalary}>
                <Text style={styles.submitBtnText}>Save Salary Profile</Text>
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
  heroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  heroTotal: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
  },
  heroSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#070A11',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 18,
    gap: 8,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
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
  salaryCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#38BDF820',
    borderWidth: 1,
    borderColor: '#38BDF840',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  payDayText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  slipBody: {
    backgroundColor: '#070A11',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slipTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  slipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  slipLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  slipVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  slipDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 8,
  },
  slipRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00E699',
  },
  totalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00E699',
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
  subTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F43F5E',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 8,
  },
  dedRow: {
    flexDirection: 'row',
  },
  dedLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
});
