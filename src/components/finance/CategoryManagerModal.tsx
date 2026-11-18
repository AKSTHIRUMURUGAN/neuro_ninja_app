import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CustomCategory, MajorCategoryGroup, CATEGORY_GROUPS } from '../../services/finance/finance-types';
import { CategoryIcon } from './CategoryIcon';

export interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  onSaveCategory: (cat: Partial<CustomCategory>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const PRESET_EMOJIS = ['🍔', '☕', '🚗', '🛍️', '🎮', '🏥', '📚', '💼', '🏠', '💡', '📶', '🛒', '📈', '💰', '🎁', '🏖️', '✈️', '💊', '💈', '🎬', '🍿', '👶', '🐾', '🧘', '⚡'];
const PRESET_COLORS = ['#38BDF8', '#00E699', '#818CF8', '#F59E0B', '#EC4899', '#14B8A6', '#F43F5E', '#A855F7', '#64748B'];

export function CategoryManagerModal({
  visible,
  onClose,
  categories,
  onSaveCategory,
  onDeleteCategory,
}: CategoryManagerModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MajorCategoryGroup>('personal');
  const [iconType, setIconType] = useState<'emoji' | 'image'>('emoji');
  const [iconValue, setIconValue] = useState('🍔');
  const [imageUrl, setImageUrl] = useState('');
  const [color, setColor] = useState('#38BDF8');
  const [budgetLimit, setBudgetLimit] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const chosenIcon = iconType === 'image' && imageUrl.trim() ? imageUrl.trim() : iconValue;
    const limitNum = budgetLimit.trim() ? Number(budgetLimit.replace(/[^0-9.]/g, '')) : undefined;

    await onSaveCategory({
      name: name.trim(),
      group,
      iconType,
      iconValue: chosenIcon,
      color,
      budgetLimit: limitNum,
    });

    setName('');
    setImageUrl('');
    setBudgetLimit('');
    setIsAdding(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.tag}>HIERARCHICAL TAXONOMY</Text>
              <Text style={styles.title}>Category Manager</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Add Category Toggle Button */}
            {!isAdding ? (
              <TouchableOpacity
                style={styles.addTriggerBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsAdding(true);
                }}
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color="#00E699" />
                <Text style={styles.addTriggerText}>+ Create New Custom Category</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>NEW CATEGORY DETAILS</Text>

                {/* Name */}
                <Text style={styles.inputLabel}>Category Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Pet Care, EV Charging, Books"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                />

                {/* Major Group */}
                <Text style={styles.inputLabel}>Parent Group</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                  {CATEGORY_GROUPS.map((g) => {
                    const active = group === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.groupChip, active && { borderColor: g.color, backgroundColor: `${g.color}20` }]}
                        onPress={() => setGroup(g.id)}
                      >
                        <Text style={styles.groupChipIcon}>{g.icon}</Text>
                        <Text style={[styles.groupChipText, active && { color: g.color }]}>{g.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Icon Type Tabs */}
                <View style={styles.iconTypeRow}>
                  <TouchableOpacity
                    style={[styles.iconTypeTab, iconType === 'emoji' && styles.iconTypeTabActive]}
                    onPress={() => setIconType('emoji')}
                  >
                    <Text style={[styles.iconTypeText, iconType === 'emoji' && styles.iconTypeTextActive]}>Emoji Icon</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconTypeTab, iconType === 'image' && styles.iconTypeTabActive]}
                    onPress={() => setIconType('image')}
                  >
                    <Text style={[styles.iconTypeText, iconType === 'image' && styles.iconTypeTextActive]}>Image URL</Text>
                  </TouchableOpacity>
                </View>

                {/* Emoji Picker or Image URL */}
                {iconType === 'emoji' ? (
                  <View style={styles.emojiGrid}>
                    {PRESET_EMOJIS.map((em) => (
                      <TouchableOpacity
                        key={em}
                        style={[styles.emojiCell, iconValue === em && styles.emojiCellActive]}
                        onPress={() => setIconValue(em)}
                      >
                        <Text style={styles.emojiChar}>{em}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="https://example.com/icon.png"
                    placeholderTextColor="#64748B"
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                  />
                )}

                {/* Color Selector */}
                <Text style={styles.inputLabel}>Accent Theme Color</Text>
                <View style={styles.colorRow}>
                  {PRESET_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                      onPress={() => setColor(c)}
                    />
                  ))}
                </View>

                {/* Monthly Budget Cap */}
                <Text style={styles.inputLabel}>Monthly Budget Limit (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="₹ 5000"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={budgetLimit}
                  onChangeText={setBudgetLimit}
                />

                {/* Action Buttons */}
                <View style={styles.formBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAdding(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                    <Text style={styles.saveBtnText}>Save Category</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Existing Categories List by Group */}
            <Text style={styles.sectionHeader}>ALL ACTIVE CATEGORIES ({categories.length})</Text>
            {categories.map((c) => (
              <View key={c.id} style={styles.catRow}>
                <CategoryIcon iconType={c.iconType} iconValue={c.iconValue} color={c.color} size={36} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.catName}>{c.name}</Text>
                  <Text style={styles.catGroup}>
                    {(c.group || 'other').toUpperCase()}{c.budgetLimit ? ` • Cap: ₹${c.budgetLimit.toLocaleString()}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={async () => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await onDeleteCategory(c.id);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 18,
  },
  addTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121D33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00E69940',
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
  },
  addTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00E699',
  },
  formCard: {
    backgroundColor: '#121D33',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  formTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#070A11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  groupScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  groupChip: {
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
  groupChipIcon: {
    fontSize: 13,
  },
  groupChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  iconTypeRow: {
    flexDirection: 'row',
    backgroundColor: '#070A11',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  iconTypeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  iconTypeTabActive: {
    backgroundColor: '#1E293B',
  },
  iconTypeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  iconTypeTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  emojiCell: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#070A11',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCellActive: {
    borderColor: '#00E699',
    backgroundColor: '#00E69920',
  },
  emojiChar: {
    fontSize: 18,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#00E699',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#070A11',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121D33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 10,
    marginBottom: 8,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  catGroup: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  delBtn: {
    padding: 8,
  },
});
