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
  getInvestmentsV2,
  saveInvestmentV2,
  deleteInvestmentV2,
  getInvestmentSummary,
} from '../../services/finance/finance-service';
import { InvestmentRecord, InvestmentType } from '../../services/finance/finance-types';

export interface InvestmentsViewProps {
  currencySymbol: string;
}

const ASSET_TYPES: { id: InvestmentType; label: string; icon: string; color: string }[] = [
  { id: 'mutual_funds', label: 'Mutual Funds / SIP', icon: '📊', color: '#10B981' },
  { id: 'stocks', label: 'Stocks & Equities', icon: '📈', color: '#38BDF8' },
  { id: 'gold', label: 'Digital Gold & SGB', icon: '🥇', color: '#F59E0B' },
  { id: 'crypto', label: 'Crypto & Web3', icon: '🪙', color: '#F97316' },
  { id: 'ppf', label: 'PPF (Public Provident)', icon: '🔒', color: '#8B5CF6' },
  { id: 'epf', label: 'EPF / VPF', icon: '🏦', color: '#A855F7' },
  { id: 'fd', label: 'Fixed Deposits (FD)', icon: '🛡️', color: '#06B6D4' },
  { id: 'real_estate', label: 'Real Estate / REIT', icon: '🏢', color: '#EC4899' },
  { id: 'other', label: 'Other Investments', icon: '💎', color: '#64748B' },
];

export function InvestmentsView({ currencySymbol }: InvestmentsViewProps) {
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  const [summary, setSummary] = useState<{
    totalInvested: number;
    totalCurrent: number;
    totalReturns: number;
    returnsPercentage: number;
    sipTotal: number;
    byAssetClass: { type: string; label: string; current: number; percentage: number; color: string }[];
  }>({
    totalInvested: 0,
    totalCurrent: 0,
    totalReturns: 0,
    returnsPercentage: 0,
    sipTotal: 0,
    byAssetClass: [],
  });

  // Add Investment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('mutual_funds');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [sipAmount, setSipAmount] = useState('');
  const [sipDay, setSipDay] = useState('10');
  const [platform, setPlatform] = useState('');

  const loadData = async () => {
    try {
      const [list, sum] = await Promise.all([getInvestmentsV2(), getInvestmentSummary()]);
      setInvestments(list);
      setSummary(sum);
    } catch (e) {
      console.warn('[InvestmentsView] Error loading data:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInit = async () => {
      try {
        const [list, sum] = await Promise.all([getInvestmentsV2(), getInvestmentSummary()]);
        if (isMounted) {
          setInvestments(list);
          setSummary(sum);
        }
      } catch (e) {
        console.warn('[InvestmentsView] Error loading data:', e);
      }
    };
    void fetchInit();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    const invNum = Number(investedAmount.replace(/[^0-9.]/g, ''));
    if (!invNum || invNum <= 0 || !name.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const curNum = Number(currentValue.replace(/[^0-9.]/g, '')) || invNum;
    const sipNum = Number(sipAmount.replace(/[^0-9.]/g, '')) || undefined;
    const sipDayNum = sipNum ? Math.min(31, Math.max(1, Number(sipDay) || 10)) : undefined;

    await saveInvestmentV2({
      name: name.trim(),
      type,
      investedAmount: invNum,
      currentValue: curNum,
      sipAmount: sipNum,
      sipDayOfMonth: sipDayNum,
      platform: platform.trim() || undefined,
    });

    setName('');
    setInvestedAmount('');
    setCurrentValue('');
    setSipAmount('');
    setPlatform('');
    setIsModalOpen(false);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteInvestmentV2(id);
    await loadData();
  };

  const isProfit = summary.totalReturns >= 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Portfolio Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTag}>PORTFOLIO VALUATION</Text>
        <Text style={styles.heroTotal}>
          {currencySymbol}
          {summary.totalCurrent.toLocaleString()}
        </Text>

        <View style={styles.returnsPill}>
          <MaterialCommunityIcons
            name={isProfit ? 'arrow-top-right' : 'arrow-bottom-right'}
            size={16}
            color={isProfit ? '#10B981' : '#F43F5E'}
          />
          <Text style={[styles.returnsText, { color: isProfit ? '#10B981' : '#F43F5E' }]}>
            {isProfit ? '+' : ''}
            {currencySymbol}
            {summary.totalReturns.toLocaleString()} ({summary.returnsPercentage}%)
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>INVESTED PRINCIPAL</Text>
            <Text style={styles.metricVal}>
              {currencySymbol}
              {summary.totalInvested.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>MONTHLY SIP RUN-RATE</Text>
            <Text style={[styles.metricVal, { color: '#00E699' }]}>
              {currencySymbol}
              {summary.sipTotal.toLocaleString()}/mo
            </Text>
          </View>
        </View>
      </View>

      {/* Add Investment Trigger */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsModalOpen(true);
        }}
      >
        <MaterialCommunityIcons name="finance" size={18} color="#070A11" />
        <Text style={styles.addBtnText}>+ Record New Asset / SIP</Text>
      </TouchableOpacity>

      {/* Asset Class Distribution */}
      {summary.byAssetClass.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ASSET CLASS BREAKDOWN</Text>
          <View style={styles.distGrid}>
            {summary.byAssetClass.map((cls) => (
              <View key={cls.type} style={styles.distCard}>
                <View style={[styles.distIndicator, { backgroundColor: cls.color }]} />
                <Text style={styles.distLabel}>{cls.label}</Text>
                <Text style={styles.distVal}>
                  {currencySymbol}
                  {cls.current.toLocaleString()}
                </Text>
                <Text style={styles.distPct}>{cls.percentage}% of portfolio</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Holdings List */}
      <Text style={styles.sectionHeader}>PORTFOLIO HOLDINGS ({investments.length})</Text>

      {investments.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="chart-line" size={42} color="#334155" />
          <Text style={styles.emptyTitle}>No Investments Added</Text>
          <Text style={styles.emptySub}>Track mutual fund SIPs, stocks, crypto, and gold in one place.</Text>
        </View>
      ) : (
        investments.map((inv) => {
          const meta = ASSET_TYPES.find((t) => t.id === inv.type) || { label: 'Asset', icon: '📈', color: '#10B981' };
          const invProfit = inv.currentValue >= inv.investedAmount;

          return (
            <View key={inv.id} style={styles.holdingCard}>
              <View style={styles.holdingTop}>
                <View style={[styles.holdingIconBox, { backgroundColor: `${meta.color}20`, borderColor: `${meta.color}40` }]}>
                  <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.holdingName}>{inv.name}</Text>
                  <Text style={styles.holdingMeta}>
                    {meta.label}{inv.platform ? ` • ${inv.platform}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.holdingCurVal}>
                    {currencySymbol}
                    {inv.currentValue.toLocaleString()}
                  </Text>
                  <Text style={[styles.holdingReturns, { color: invProfit ? '#10B981' : '#F43F5E' }]}>
                    {invProfit ? '+' : ''}
                    {inv.returnsPercent}%
                  </Text>
                </View>
              </View>

              <View style={styles.holdingBottom}>
                <Text style={styles.holdingInvested}>
                  Invested: {currencySymbol}
                  {inv.investedAmount.toLocaleString()}
                </Text>
                {inv.sipAmount ? (
                  <View style={styles.sipBadge}>
                    <Text style={styles.sipBadgeText}>
                      SIP: {currencySymbol}{inv.sipAmount.toLocaleString()} on {inv.sipDayOfMonth || 10}th
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(inv.id)}>
                  <Ionicons name="trash-outline" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Add Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Investment Holding</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Asset Name / Scheme</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Parag Parikh Flexi Cap, Nifty 50 ETF"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Invested Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₹ 50000"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={investedAmount}
                    onChangeText={setInvestedAmount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Current Market Value</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₹ 58500"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={currentValue}
                    onChangeText={setCurrentValue}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Monthly SIP (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="₹ 5000"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={sipAmount}
                    onChangeText={setSipAmount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>SIP Day of Month</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={sipDay}
                    onChangeText={setSipDay}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Platform / Broker / Folio</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Zerodha Coin, Groww, INDmoney"
                placeholderTextColor="#64748B"
                value={platform}
                onChangeText={setPlatform}
              />

              <Text style={styles.inputLabel}>Asset Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {ASSET_TYPES.map((t) => {
                  const active = type === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.typeChip, active && { borderColor: t.color, backgroundColor: `${t.color}25` }]}
                      onPress={() => setType(t.id)}
                    >
                      <Text style={{ fontSize: 13 }}>{t.icon}</Text>
                      <Text style={[styles.typeChipText, active && { color: t.color, fontWeight: '800' }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>Save Asset</Text>
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
    color: '#F8FAFC',
    marginTop: 6,
  },
  returnsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
    gap: 4,
  },
  returnsText: {
    fontSize: 12,
    fontWeight: '800',
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
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  metricVal: {
    fontSize: 14,
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
    marginBottom: 16,
    gap: 8,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  sectionCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  distGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distCard: {
    width: '48.5%',
    backgroundColor: '#070A11',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  distIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  distLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  distVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: 2,
  },
  distPct: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
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
  holdingCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  holdingTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  holdingMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  holdingCurVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  holdingReturns: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  holdingBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 10,
    marginTop: 10,
  },
  holdingInvested: {
    fontSize: 11,
    color: '#64748B',
  },
  sipBadge: {
    backgroundColor: '#00E69920',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00E699',
  },
  delBtn: {
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
  typeChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
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
