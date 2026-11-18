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
  getNetWorthItemsV2,
  saveNetWorthItemV2,
  deleteNetWorthItemV2,
  getNetWorthSummaryV2,
} from '../../services/finance/finance-service';
import {
  AssetItem,
  LiabilityItem,
  NetWorthSummary,
  AssetCategory,
  LiabilityCategory,
} from '../../services/finance/finance-types';

export interface NetWorthViewProps {
  currencySymbol: string;
}

const ASSET_CATEGORIES: { id: AssetCategory; label: string; icon: string }[] = [
  { id: 'bank_cash', label: 'Bank & Cash', icon: '🏦' },
  { id: 'investments', label: 'Investments', icon: '📈' },
  { id: 'gold_jewellery', label: 'Gold & Jewellery', icon: '🥇' },
  { id: 'real_estate', label: 'Real Estate / Land', icon: '🏢' },
  { id: 'vehicles', label: 'Vehicles / Cars', icon: '🚗' },
  { id: 'pf_gratuity', label: 'EPF / PPF / Gratuity', icon: '🔒' },
  { id: 'business', label: 'Business Equity', icon: '💼' },
  { id: 'other', label: 'Other Valuables', icon: '💎' },
];

const LIABILITY_CATEGORIES: { id: LiabilityCategory; label: string; icon: string }[] = [
  { id: 'home_loan', label: 'Home Loan', icon: '🏠' },
  { id: 'vehicle_loan', label: 'Vehicle Loan', icon: '🚗' },
  { id: 'personal_loan', label: 'Personal Loan', icon: '👤' },
  { id: 'education_loan', label: 'Education Loan', icon: '🎓' },
  { id: 'credit_card', label: 'Credit Card Dues', icon: '💳' },
  { id: 'consumer_emi', label: 'Consumer No-Cost EMI', icon: '📱' },
  { id: 'borrowed_family', label: 'Borrowed from Family/Friends', icon: '🤝' },
  { id: 'other', label: 'Other Liabilities', icon: '📑' },
];

export function NetWorthView({ currencySymbol }: NetWorthViewProps) {
  const [summary, setSummary] = useState<NetWorthSummary>({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    liquidCash: 0,
    investmentAssets: 0,
    emergencyFundRunwayMonths: 0,
  });
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>([]);

  // Add Item Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemType, setItemType] = useState<'asset' | 'liability'>('asset');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('bank_cash');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const [sum, items] = await Promise.all([getNetWorthSummaryV2(), getNetWorthItemsV2()]);
      setSummary(sum);
      setAssets(items.assets);
      setLiabilities(items.liabilities);
    } catch (e) {
      console.warn('[NetWorthView] Error loading data:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInit = async () => {
      try {
        const [sum, items] = await Promise.all([getNetWorthSummaryV2(), getNetWorthItemsV2()]);
        if (isMounted) {
          setSummary(sum);
          setAssets(items.assets);
          setLiabilities(items.liabilities);
        }
      } catch (e) {
        console.warn('[NetWorthView] Error loading data:', e);
      }
    };
    void fetchInit();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveItem = async () => {
    const num = Number(amount.replace(/[^0-9.]/g, ''));
    if (!num || num <= 0 || !name.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (itemType === 'asset') {
      await saveNetWorthItemV2(
        {
          name: name.trim(),
          category: category as AssetCategory,
          value: num,
          owner: 'Self',
          notes: notes.trim() || undefined,
        },
        'asset'
      );
    } else {
      await saveNetWorthItemV2(
        {
          name: name.trim(),
          category: category as LiabilityCategory,
          totalOutstanding: num,
          borrower: 'Self',
          notes: notes.trim() || undefined,
        },
        'liability'
      );
    }

    setName('');
    setAmount('');
    setNotes('');
    setIsModalOpen(false);
    await loadData();
  };

  const handleDeleteItem = async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteNetWorthItemV2(id);
    await loadData();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Net Worth Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTag}>TOTAL PORTFOLIO SOLVENCY</Text>
        <Text style={[styles.heroNetWorth, { color: summary.netWorth >= 0 ? '#00E699' : '#F43F5E' }]}>
          {currencySymbol}
          {summary.netWorth.toLocaleString()}
        </Text>
        <Text style={styles.heroSub}>Assets minus all liabilities</Text>

        <View style={styles.heroSplit}>
          <View style={styles.splitBox}>
            <Text style={styles.splitLabel}>TOTAL ASSETS</Text>
            <Text style={[styles.splitVal, { color: '#00E699' }]}>
              {currencySymbol}
              {summary.totalAssets.toLocaleString()}
            </Text>
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitBox}>
            <Text style={styles.splitLabel}>TOTAL DEBTS</Text>
            <Text style={[styles.splitVal, { color: '#F43F5E' }]}>
              {currencySymbol}
              {summary.totalLiabilities.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Liquid Cash Runway Banner */}
        <View style={styles.runwayBanner}>
          <MaterialCommunityIcons name="shield-airplane" size={18} color="#38BDF8" />
          <Text style={styles.runwayText}>
            Liquid Runway: <Text style={{ color: '#38BDF8', fontWeight: '800' }}>{summary.emergencyFundRunwayMonths} months</Text> ({currencySymbol}{summary.liquidCash.toLocaleString()})
          </Text>
        </View>
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: '#00E69940' }]}
          onPress={() => {
            setItemType('asset');
            setCategory('bank_cash');
            setIsModalOpen(true);
          }}
        >
          <MaterialCommunityIcons name="plus-circle" size={18} color="#00E699" />
          <Text style={[styles.actionBtnText, { color: '#00E699' }]}>+ Add Asset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: '#F43F5E40' }]}
          onPress={() => {
            setItemType('liability');
            setCategory('personal_loan');
            setIsModalOpen(true);
          }}
        >
          <MaterialCommunityIcons name="minus-circle" size={18} color="#F43F5E" />
          <Text style={[styles.actionBtnText, { color: '#F43F5E' }]}>+ Add Liability</Text>
        </TouchableOpacity>
      </View>

      {/* Itemized Assets Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="safe" size={18} color="#00E699" />
          <Text style={styles.sectionTitle}>ASSETS INVENTORY ({assets.length})</Text>
        </View>

        {assets.length === 0 ? (
          <Text style={styles.emptyText}>No manual asset items logged yet.</Text>
        ) : (
          assets.map((a) => {
            const meta = ASSET_CATEGORIES.find((c) => c.id === a.category) || { label: a.category, icon: '💎' };
            return (
              <View key={a.id} style={styles.itemRow}>
                <View style={styles.itemIconBox}>
                  <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemName}>{a.name}</Text>
                  <Text style={styles.itemMeta}>{meta.label}</Text>
                </View>
                <Text style={[styles.itemAmount, { color: '#00E699' }]}>
                  {currencySymbol}
                  {a.value.toLocaleString()}
                </Text>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteItem(a.id)}>
                  <Ionicons name="trash-outline" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Itemized Liabilities Section */}
      <View style={[styles.sectionCard, { marginBottom: 30 }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="alert-decagram-outline" size={18} color="#F43F5E" />
          <Text style={styles.sectionTitle}>LIABILITIES & DEBTS ({liabilities.length})</Text>
        </View>

        {liabilities.length === 0 ? (
          <Text style={styles.emptyText}>Zero debts logged! High financial freedom.</Text>
        ) : (
          liabilities.map((l) => {
            const meta = LIABILITY_CATEGORIES.find((c) => c.id === l.category) || { label: l.category, icon: '📑' };
            return (
              <View key={l.id} style={styles.itemRow}>
                <View style={[styles.itemIconBox, { backgroundColor: '#F43F5E20', borderColor: '#F43F5E40' }]}>
                  <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemName}>{l.name}</Text>
                  <Text style={styles.itemMeta}>{meta.label}</Text>
                </View>
                <Text style={[styles.itemAmount, { color: '#F43F5E' }]}>
                  {currencySymbol}
                  {l.totalOutstanding.toLocaleString()}
                </Text>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteItem(l.id)}>
                  <Ionicons name="trash-outline" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Add Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {itemType === 'asset' ? 'Record Asset Item' : 'Record Liability / Debt'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Item Name</Text>
              <TextInput
                style={styles.input}
                placeholder={itemType === 'asset' ? 'e.g. HDFC Salary Account, Gold Sovereign' : 'e.g. ICICI Credit Card, Friend Loan'}
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Valuation / Balance Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="₹ 50000"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {(itemType === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map((cat) => {
                  const active = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, active && styles.catChipActive]}
                      onPress={() => setCategory(cat.id)}
                    >
                      <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
                      <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Notes / Folio / Account # (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Branch XYZ, maturity in 2028"
                placeholderTextColor="#64748B"
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: itemType === 'asset' ? '#00E699' : '#F43F5E' }]}
                onPress={handleSaveItem}
              >
                <Text style={styles.submitBtnText}>
                  {itemType === 'asset' ? 'Save Asset' : 'Save Liability'}
                </Text>
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
    color: '#38BDF8',
    letterSpacing: 1,
  },
  heroNetWorth: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
  },
  heroSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  heroSplit: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#070A11',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  splitBox: {
    flex: 1,
    alignItems: 'center',
  },
  splitDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  splitLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  splitVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  runwayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  runwayText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121D33',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#00E69920',
    borderWidth: 1,
    borderColor: '#00E69940',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '800',
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
  catScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  catChip: {
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
  catChipActive: {
    borderColor: '#00E699',
    backgroundColor: '#00E69920',
  },
  catChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
});
