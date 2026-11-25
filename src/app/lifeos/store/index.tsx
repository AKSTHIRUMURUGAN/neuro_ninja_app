import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { storeService } from '../../../services/store/store-service';
import { walletService } from '../../../services/wallet/wallet-service';
import type {
  StoreItem,
  StoreOrder,
  StoreShippingAddress,
} from '../../../services/store/store-types';
import type { WalletBalance } from '../../../services/wallet/wallet-types';

type TabType = 'all' | 'impact' | 'goodies' | 'digital' | 'orders';

const TABS: { label: string; value: TabType }[] = [
  { label: 'All Items', value: 'all' },
  { label: 'Impact Causes', value: 'impact' },
  { label: 'Merch & Gear', value: 'goodies' },
  { label: 'Digital Perks', value: 'digital' },
  { label: 'My Orders', value: 'orders' },
];

export default function StoreScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [redeemQuantity, setRedeemQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shipping Form State
  const [shippingForm, setShippingForm] = useState<StoreShippingAddress>({
    fullName: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    selectedSize: 'L',
  });

  const loadData = useCallback(async () => {
    try {
      const [itemsData, ordersData, balData] = await Promise.all([
        storeService.getItems(activeTab !== 'orders' && activeTab !== 'all' ? activeTab : undefined),
        storeService.getOrders(),
        walletService.getBalance(),
      ]);
      setItems(itemsData);
      setOrders(ordersData);
      setBalance(balData);
    } catch (e) {
      console.warn('[StoreScreen] load error:', e);
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleOpenBuy = (item: StoreItem) => {
    if (item.isPurchased && item.category === 'digital') {
      Alert.alert('Owned', 'You already own this digital superpower!');
      return;
    }
    const totalCost = item.coinsPrice * redeemQuantity;
    if ((balance?.coins ?? 0) < totalCost) {
      Alert.alert(
        'Insufficient Coins',
        `You have ${balance?.coins ?? 0} coins, but this item costs ${totalCost} coins. Complete daily habits, tasks, or breathwork to earn more!`
      );
      return;
    }
    setSelectedItem(item);
    setShowBuyModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedItem) return;

    // Validate shipping form if goods
    if (selectedItem.goodiesMetadata?.requiresShippingAddress) {
      if (!shippingForm.fullName.trim() || !shippingForm.phone.trim() || !shippingForm.addressLine1.trim()) {
        Alert.alert('Incomplete Address', 'Please provide full name, phone number, and delivery street address.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await storeService.purchaseItem(
        selectedItem.id,
        redeemQuantity,
        selectedItem.goodiesMetadata?.requiresShippingAddress ? shippingForm : undefined
      );

      if (res.success && res.order) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowBuyModal(false);
        setSelectedItem(null);
        setRedeemQuantity(1);
        Alert.alert(
          'Purchase Successful! 🎉',
          selectedItem.category === 'impact'
            ? `Certificate ${res.order.certificateId} has been issued! Your positive impact has been recorded.`
            : selectedItem.category === 'goodies'
            ? `Your order ${res.order.orderId} has been placed and is being dispatched!`
            : `Your digital superpower is now active on your account!`
        );
        await loadData();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Order Failed', res.error || 'Failed to complete transaction.');
      }
    } catch (e) {
      console.warn('[StoreScreen] purchase error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.badge}>MERCH & ECO-IMPACT</Text>
          <Text style={styles.title}>Neuro Store</Text>
        </View>
        <View style={styles.coinBalanceBox}>
          <MaterialCommunityIcons name="circle-multiple" size={16} color="#00E699" />
          <Text style={styles.coinBalanceText}>{balance?.coins ?? 0}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map((tab) => {
          const isSel = activeTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tabPill, isSel && styles.tabPillActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.value);
              }}
            >
              <Text style={[styles.tabPillText, isSel && styles.tabPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'orders' ? (
          /* My Orders Tab */
          <View style={styles.ordersContainer}>
            {orders.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="package-variant-closed" size={48} color="#475569" />
                <Text style={styles.emptyTitle}>No Orders Yet</Text>
                <Text style={styles.emptySub}>
                  Redeem your hard-earned Ninja Coins for real trees, meals, or cyberpunk gear!
                </Text>
              </View>
            ) : (
              orders.map((order) => (
                <View key={order.orderId} style={styles.orderCard}>
                  <View style={styles.orderCardHeader}>
                    <View>
                      <Text style={styles.orderIdText}>{order.orderId}</Text>
                      <Text style={styles.orderItemTitle}>{order.itemTitle}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        order.status === 'delivered'
                          ? styles.statusDelivered
                          : styles.statusProcessing,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{order.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.orderMetaRow}>
                    <Text style={styles.orderCoinSpent}>-{order.coinsSpent} Coins</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.orderedAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {order.certificateId && (
                    <View style={styles.certBox}>
                      <MaterialCommunityIcons name="certificate" size={16} color="#00E699" />
                      <Text style={styles.certText}>Impact Certificate: {order.certificateId}</Text>
                    </View>
                  )}

                  {order.shippingAddress && (
                    <View style={styles.shippingInfoBox}>
                      <Text style={styles.shippingInfoTitle}>Shipping to:</Text>
                      <Text style={styles.shippingInfoText}>
                        {order.shippingAddress.fullName} • {order.shippingAddress.city},{' '}
                        {order.shippingAddress.postalCode}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        ) : (
          /* Store Catalog */
          <View style={styles.catalogGrid}>
            {items.map((item) => (
              <View key={item.id} style={styles.catalogCard}>
                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={styles.catalogImage} />
                )}
                {item.badgeText && (
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>{item.badgeText}</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>

                  {item.impactMetadata && (
                    <View style={styles.impactPill}>
                      <MaterialCommunityIcons name="sprout" size={14} color="#00E699" />
                      <Text style={styles.impactPillText}>
                        {item.impactMetadata.partnerName}
                      </Text>
                    </View>
                  )}

                  <View style={styles.priceRow}>
                    <View style={styles.coinsPriceBox}>
                      <MaterialCommunityIcons name="circle-multiple" size={16} color="#00E699" />
                      <Text style={styles.coinsPriceText}>{item.coinsPrice} Coins</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.buyBtn,
                        item.isPurchased && styles.buyBtnDisabled,
                      ]}
                      onPress={() => handleOpenBuy(item)}
                    >
                      <Text style={styles.buyBtnText}>
                        {item.isPurchased ? 'Owned' : 'Redeem'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Checkout / Buy Modal */}
      <Modal visible={showBuyModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Redeem Reward</Text>
              <Text style={styles.modalItemTitle}>{selectedItem?.title}</Text>
              <Text style={styles.modalDesc}>{selectedItem?.description}</Text>

              {/* Quantity Stepper for Causes */}
              {selectedItem?.category === 'impact' && (
                <View style={styles.stepperContainer}>
                  <Text style={styles.stepperLabel}>Impact Units:</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setRedeemQuantity(Math.max(1, redeemQuantity - 1))}
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepValText}>{redeemQuantity}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setRedeemQuantity(redeemQuantity + 1)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Physical Merch Shipping Form */}
              {selectedItem?.goodiesMetadata?.requiresShippingAddress && (
                <View style={styles.formContainer}>
                  <Text style={styles.formHeader}>Delivery Shipping Address</Text>

                  {selectedItem.goodiesMetadata.availableSizes && (
                    <View style={styles.sizeRow}>
                      <Text style={styles.sizeLabel}>Select Size:</Text>
                      {selectedItem.goodiesMetadata.availableSizes.map((sz) => (
                        <TouchableOpacity
                          key={sz}
                          style={[
                            styles.sizeChip,
                            shippingForm.selectedSize === sz && styles.sizeChipActive,
                          ]}
                          onPress={() => setShippingForm({ ...shippingForm, selectedSize: sz })}
                        >
                          <Text
                            style={[
                              styles.sizeChipText,
                              shippingForm.selectedSize === sz && styles.sizeChipTextActive,
                            ]}
                          >
                            {sz}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TextInput
                    style={styles.formInput}
                    placeholder="Recipient Full Name"
                    placeholderTextColor="#64748B"
                    value={shippingForm.fullName}
                    onChangeText={(txt) => setShippingForm({ ...shippingForm, fullName: txt })}
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Phone Number (for Courier)"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                    value={shippingForm.phone}
                    onChangeText={(txt) => setShippingForm({ ...shippingForm, phone: txt })}
                  />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Street Address & Flat / Door #"
                    placeholderTextColor="#64748B"
                    value={shippingForm.addressLine1}
                    onChangeText={(txt) => setShippingForm({ ...shippingForm, addressLine1: txt })}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      placeholder="City"
                      placeholderTextColor="#64748B"
                      value={shippingForm.city}
                      onChangeText={(txt) => setShippingForm({ ...shippingForm, city: txt })}
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      placeholder="Postal Code"
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                      value={shippingForm.postalCode}
                      onChangeText={(txt) => setShippingForm({ ...shippingForm, postalCode: txt })}
                    />
                  </View>
                </View>
              )}

              {/* Total Cost Breakdown */}
              <View style={styles.costBox}>
                <Text style={styles.costLabel}>Total Focus Coins</Text>
                <Text style={styles.costValue}>
                  {(selectedItem?.coinsPrice ?? 0) * redeemQuantity} Coins
                </Text>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowBuyModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, isSubmitting && { opacity: 0.6 }]}
                  disabled={isSubmitting}
                  onPress={handleConfirmPurchase}
                >
                  <Text style={styles.modalConfirmText}>
                    {isSubmitting ? 'Confirming...' : 'Confirm Order'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070A11' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  badge: { fontSize: 10, fontWeight: '800', color: '#00E699', letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#F8FAFC' },
  coinBalanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinBalanceText: { fontSize: 13, fontWeight: '800', color: '#00E699' },
  tabsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabPillActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  tabPillText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  tabPillTextActive: { color: '#00E699' },
  scroll: { padding: 16, paddingBottom: 40 },
  catalogGrid: { gap: 16 },
  catalogCard: {
    backgroundColor: '#0F1829',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  catalogImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#1E293B',
  },
  itemBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(7, 10, 17, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  itemBadgeText: { fontSize: 11, fontWeight: '800', color: '#00E699' },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  cardSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 4, lineHeight: 17 },
  impactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  impactPillText: { fontSize: 11, fontWeight: '700', color: '#00E699' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  coinsPriceBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinsPriceText: { fontSize: 14, fontWeight: '800', color: '#00E699' },
  buyBtn: {
    backgroundColor: '#00E699',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buyBtnDisabled: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  buyBtnText: { fontSize: 13, fontWeight: '800', color: '#070A11' },
  ordersContainer: { gap: 12 },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#0F1829',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#F8FAFC', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  orderCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderIdText: { fontSize: 11, fontWeight: '800', color: '#818CF8' },
  orderItemTitle: { fontSize: 15, fontWeight: '800', color: '#F8FAFC', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusDelivered: { backgroundColor: 'rgba(0, 230, 153, 0.15)' },
  statusProcessing: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', color: '#F8FAFC' },
  orderMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  orderCoinSpent: { fontSize: 13, fontWeight: '800', color: '#EF4444' },
  orderDate: { fontSize: 11, color: '#64748B' },
  certBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  certText: { fontSize: 11, fontWeight: '700', color: '#00E699' },
  shippingInfoBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  shippingInfoTitle: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  shippingInfoText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center' },
  modalScroll: { padding: 20 },
  modalCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: { fontSize: 12, fontWeight: '800', color: '#00E699', letterSpacing: 1 },
  modalItemTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginTop: 4 },
  modalDesc: { fontSize: 12, color: '#94A3B8', marginTop: 6, lineHeight: 18 },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 12,
  },
  stepperLabel: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '800', color: '#00E699' },
  stepValText: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  formContainer: { marginTop: 14 },
  formHeader: { fontSize: 12, fontWeight: '800', color: '#818CF8', marginBottom: 10 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sizeLabel: { fontSize: 12, color: '#94A3B8' },
  sizeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sizeChipActive: { backgroundColor: '#00E699' },
  sizeChipText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  sizeChipTextActive: { color: '#070A11' },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 8,
  },
  costBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  costLabel: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  costValue: { fontSize: 16, fontWeight: '800', color: '#00E699' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#00E699',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '800', color: '#070A11' },
});
