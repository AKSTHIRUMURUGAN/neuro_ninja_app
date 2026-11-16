import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { shoppingService } from '../../../services/shopping/shopping-service';
import type {
  ShoppingList,
  ShoppingItem,
  GroceryCategory,
} from '../../../services/shopping/shopping-types';
import {
  GROCERY_CATEGORIES,
  COMMON_STAPLES,
  GROCERY_PRESETS,
} from '../../../services/shopping/shopping-types';

const CATEGORY_KEYS: (GroceryCategory | 'all')[] = [
  'all',
  'produce',
  'protein',
  'dairy',
  'pantry',
  'supplements',
  'beverages',
  'snacks',
  'household',
];

export default function ShoppingScreen() {
  const router = useRouter();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string>('list_default');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<GroceryCategory | 'all'>('all');
  const [newItemName, setNewItemName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const allLists = await shoppingService.getLists();
      if (allLists.length === 0) {
        const defaultList = await shoppingService.createList('Weekly Groceries & Nutrition');
        setLists([defaultList]);
        setActiveListId(defaultList.listId);
        setItems([]);
      } else {
        setLists(allLists);
        const current = allLists.find((l) => l.listId === activeListId) || allLists[0];
        setActiveListId(current.listId);
        setItems(current.items || []);
      }
    } catch (e) {
      console.warn('[ShoppingScreen] load error:', e);
    }
  }, [activeListId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const activeList = lists.find((l) => l.listId === activeListId) || lists[0];
  const filteredItems = items.filter(
    (item) => selectedCat === 'all' || item.category === selectedCat
  );
  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.isChecked).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const handleToggleCheck = async (item: ShoppingItem) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = !item.isChecked;
    setItems((prev) =>
      prev.map((i) => (i.itemId === item.itemId ? { ...i, isChecked: updated } : i))
    );
    await shoppingService.toggleItemChecked(item.itemId, updated);
  };

  const handleQuickAddStaple = async (staple: (typeof COMMON_STAPLES)[0]) => {
    if (!activeListId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const added = await shoppingService.addItem(
      activeListId,
      staple.name,
      staple.category,
      staple.qty,
      staple.unit
    );
    setItems((prev) => [added, ...prev]);
  };

  const handleAddCustomItem = async (cat: GroceryCategory = 'pantry') => {
    if (!newItemName.trim() || !activeListId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const added = await shoppingService.addItem(activeListId, newItemName.trim(), cat, 1, 'pcs');
    setItems((prev) => [added, ...prev]);
    setNewItemName('');
    setShowAddModal(false);
  };

  const handleImportPreset = async (presetId: string) => {
    if (!activeListId) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await shoppingService.importPreset(activeListId, presetId);
    setShowPresetModal(false);
    await loadData();
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const created = await shoppingService.createList(newListName.trim());
    setLists((prev) => [created, ...prev]);
    setActiveListId(created.listId);
    setItems([]);
    setNewListName('');
    setShowListModal(false);
  };

  const handleClearChecked = async () => {
    if (!activeListId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await shoppingService.clearCheckedItems(activeListId);
    setItems((prev) => prev.filter((i) => !i.isChecked));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.titleBox} onPress={() => setShowListModal(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.badge}>SMART GROCERY & AISLES</Text>
            <Ionicons name="chevron-down" size={12} color="#00E699" />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {activeList?.name || 'Shopping List'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionHeaderBtn} onPress={() => setShowPresetModal(true)}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress Bar & Summary */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <View>
              <Text style={styles.progressLabel}>Shopping Progress</Text>
              <Text style={styles.progressValue}>
                {checkedItems} of {totalItems} items packed
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{progressPercent}%</Text>
            </View>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Quick Staple Horizontal Bar */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick-Add Staples</Text>
          <Text style={styles.sectionSub}>Tap to add immediately</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.staplesRow}
        >
          {COMMON_STAPLES.map((staple, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.stapleChip}
              onPress={() => handleQuickAddStaple(staple)}
            >
              <MaterialCommunityIcons name="plus" size={14} color="#00E699" />
              <Text style={styles.stapleChipText}>{staple.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {CATEGORY_KEYS.map((catKey) => {
            const isSel = selectedCat === catKey;
            const label = catKey === 'all' ? 'All Aisles' : GROCERY_CATEGORIES[catKey]?.label || catKey;
            return (
              <TouchableOpacity
                key={catKey}
                style={[styles.catPill, isSel && styles.catPillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCat(catKey);
                }}
              >
                <Text style={[styles.catPillText, isSel && styles.catPillTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Items List */}
        <View style={styles.itemsContainer}>
          {filteredItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cart-outline" size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No items in this aisle</Text>
              <Text style={styles.emptySub}>
                Tap staples above or use the + button below to stock your pantry.
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <View
                key={item.itemId}
                style={[styles.itemCard, item.isChecked && styles.itemCardChecked]}
              >
                <TouchableOpacity
                  style={styles.checkTouch}
                  onPress={() => handleToggleCheck(item)}
                >
                  <View style={[styles.checkbox, item.isChecked && styles.checkboxActive]}>
                    {item.isChecked && (
                      <MaterialCommunityIcons name="check-bold" size={14} color="#070A11" />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, item.isChecked && styles.itemNameChecked]}>
                    {item.name}
                  </Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemCategoryBadge}>
                      {GROCERY_CATEGORIES[item.category]?.label || item.category}
                    </Text>
                    <Text style={styles.itemQty}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteTouch}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await shoppingService.deleteItem(item.itemId);
                    setItems((prev) => prev.filter((i) => i.itemId !== item.itemId));
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Action Controls */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <MaterialCommunityIcons name="plus" size={20} color="#070A11" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>

          {checkedItems > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearChecked}>
              <MaterialCommunityIcons name="check-all" size={18} color="#F8FAFC" />
              <Text style={styles.clearBtnText}>Clear Checked ({checkedItems})</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Add Custom Item Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to Grocery List</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Grass-fed Ribeye, Organic Berries"
              placeholderTextColor="#64748B"
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => handleAddCustomItem('pantry')}
              >
                <Text style={styles.modalConfirmText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preset Importer Modal */}
      <Modal visible={showPresetModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Import Ninja Preset</Text>
            <Text style={styles.modalSub}>Select a curated nutrition stack to auto-fill items:</Text>

            {GROCERY_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.presetCard}
                onPress={() => handleImportPreset(p.id)}
              >
                <View style={styles.presetIconBox}>
                  <Ionicons name={p.icon as any} size={22} color="#00E699" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.presetTitle}>{p.name}</Text>
                  <Text style={styles.presetDesc}>{p.desc}</Text>
                  <Text style={styles.presetCount}>{p.items.length} items</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowPresetModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* List Switcher Modal */}
      <Modal visible={showListModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Switch Shopping List</Text>

            {lists.map((l) => (
              <TouchableOpacity
                key={l.listId}
                style={[
                  styles.listSelectItem,
                  l.listId === activeListId && styles.listSelectItemActive,
                ]}
                onPress={() => {
                  setActiveListId(l.listId);
                  setShowListModal(false);
                }}
              >
                <Text
                  style={[
                    styles.listSelectText,
                    l.listId === activeListId && styles.listSelectTextActive,
                  ]}
                >
                  {l.name}
                </Text>
                {l.listId === activeListId && (
                  <Ionicons name="checkmark-circle" size={18} color="#00E699" />
                )}
              </TouchableOpacity>
            ))}

            <View style={{ marginTop: 12 }}>
              <TextInput
                style={styles.modalInput}
                placeholder="New List Name (e.g. Supplement Restock)"
                placeholderTextColor="#64748B"
                value={newListName}
                onChangeText={setNewListName}
              />
              <TouchableOpacity style={styles.createListBtn} onPress={handleCreateList}>
                <Text style={styles.createListBtnText}>+ Create New List</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowListModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
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
  titleBox: { flex: 1, marginLeft: 12 },
  badge: { fontSize: 10, fontWeight: '800', color: '#00E699', letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  actionHeaderBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  scroll: { padding: 16, paddingBottom: 40 },
  progressCard: {
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  progressValue: { fontSize: 16, fontWeight: '800', color: '#F8FAFC', marginTop: 2 },
  progressBadge: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: { fontSize: 12, fontWeight: '800', color: '#00E699' },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E699',
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#F8FAFC', letterSpacing: 0.5 },
  sectionSub: { fontSize: 11, color: '#64748B' },
  staplesRow: { gap: 8, paddingBottom: 14 },
  stapleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stapleChipText: { fontSize: 12, fontWeight: '700', color: '#F8FAFC' },
  categoriesRow: { gap: 8, paddingBottom: 14 },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  catPillActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  catPillText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  catPillTextActive: { color: '#00E699' },
  itemsContainer: { gap: 10, marginTop: 4 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  itemCardChecked: {
    opacity: 0.6,
    backgroundColor: 'rgba(15, 24, 41, 0.5)',
  },
  checkTouch: { padding: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  itemName: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#64748B' },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  itemCategoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#818CF8',
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemQty: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  deleteTouch: { padding: 6 },
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
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
  },
  addBtnText: { fontSize: 14, fontWeight: '800', color: '#070A11' },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 6 },
  modalSub: { fontSize: 12, color: '#94A3B8', marginBottom: 14 },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
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
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalCloseText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  presetIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetTitle: { fontSize: 14, fontWeight: '800', color: '#F8FAFC' },
  presetDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  presetCount: { fontSize: 11, fontWeight: '700', color: '#00E699', marginTop: 4 },
  listSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 8,
  },
  listSelectItemActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  listSelectText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  listSelectTextActive: { color: '#00E699' },
  createListBtn: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  createListBtnText: { fontSize: 13, fontWeight: '800', color: '#00E699' },
});
