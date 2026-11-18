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
import { FamilyMember, FamilyRelationship } from '../../services/finance/finance-types';
import { MemberAvatar } from './MemberAvatar';

export interface MemberManagerModalProps {
  visible: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onSaveMember: (member: Partial<FamilyMember>) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

const RELATIONSHIPS: { id: FamilyRelationship; label: string; icon: string }[] = [
  { id: 'self', label: 'Self', icon: '👤' },
  { id: 'spouse', label: 'Spouse / Partner', icon: '💍' },
  { id: 'father', label: 'Father', icon: '👨' },
  { id: 'mother', label: 'Mother', icon: '👩' },
  { id: 'child', label: 'Child / Kids', icon: '👶' },
  { id: 'sibling', label: 'Sibling', icon: '🧑' },
  { id: 'family', label: 'Family Joint', icon: '🏠' },
  { id: 'office', label: 'Office / Business', icon: '💼' },
  { id: 'friend', label: 'Friend', icon: '🤝' },
  { id: 'roommate', label: 'Roommate', icon: '🚪' },
];

const PRESET_MEMBER_EMOJIS = ['👤', '👨‍👩‍👧', '🏠', '👶', '💍', '💼', '👨', '👩', '🧑', '👵', '👴', '🤝', '🐱', '🐶'];
const PRESET_COLORS = ['#38BDF8', '#00E699', '#818CF8', '#F59E0B', '#EC4899', '#14B8A6', '#F43F5E', '#A855F7', '#64748B'];

export function MemberManagerModal({
  visible,
  onClose,
  members,
  onSaveMember,
  onDeleteMember,
}: MemberManagerModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<FamilyRelationship>('self');
  const [avatarEmoji, setAvatarEmoji] = useState('👤');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [color, setColor] = useState('#38BDF8');

  const handleCreate = async () => {
    if (!name.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await onSaveMember({
      name: name.trim(),
      relationship,
      avatarEmoji,
      avatarType: avatarUrl.trim() ? 'image' : 'emoji',
      avatarUrl: avatarUrl.trim() || undefined,
      color,
      isCustom: true,
    });

    setName('');
    setAvatarUrl('');
    setIsAdding(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.tag}>MULTI-PERSONA EXPENSE ENGINE</Text>
              <Text style={styles.title}>Family Members & Personas</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Add Member Trigger */}
            {!isAdding ? (
              <TouchableOpacity
                style={styles.addTriggerBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsAdding(true);
                }}
              >
                <MaterialCommunityIcons name="account-plus" size={20} color="#00E699" />
                <Text style={styles.addTriggerText}>+ Add Family Member / Persona</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>ADD PERSONA / MEMBER</Text>

                {/* Name */}
                <Text style={styles.inputLabel}>Name / Display Label</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ananya, Mom, Startup Corp, Flatmates"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                />

                {/* Relationship Selector */}
                <Text style={styles.inputLabel}>Relationship</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relScroll}>
                  {RELATIONSHIPS.map((rel) => {
                    const active = relationship === rel.id;
                    return (
                      <TouchableOpacity
                        key={rel.id}
                        style={[styles.relChip, active && styles.relChipActive]}
                        onPress={() => setRelationship(rel.id)}
                      >
                        <Text style={styles.relChipIcon}>{rel.icon}</Text>
                        <Text style={[styles.relChipText, active && styles.relChipTextActive]}>{rel.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Avatar Emoji */}
                <Text style={styles.inputLabel}>Choose Persona Avatar</Text>
                <View style={styles.emojiGrid}>
                  {PRESET_MEMBER_EMOJIS.map((em) => (
                    <TouchableOpacity
                      key={em}
                      style={[styles.emojiCell, avatarEmoji === em && styles.emojiCellActive]}
                      onPress={() => setAvatarEmoji(em)}
                    >
                      <Text style={styles.emojiChar}>{em}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Optional Image URL */}
                <Text style={styles.inputLabel}>Custom Avatar Photo URL (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/avatar.jpg"
                  placeholderTextColor="#64748B"
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  autoCapitalize="none"
                />

                {/* Color Selector */}
                <Text style={styles.inputLabel}>Persona Identification Color</Text>
                <View style={styles.colorRow}>
                  {PRESET_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                      onPress={() => setColor(c)}
                    />
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.formBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAdding(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                    <Text style={styles.saveBtnText}>Save Persona</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* List of Members */}
            <Text style={styles.sectionHeader}>REGISTERED HOUSEHOLD & PERSONAS ({members.length})</Text>
            {members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <MemberAvatar member={m} size={42} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRel}>{String(m.relationship).toUpperCase()}</Text>
                </View>
                {!m.isDefault && (
                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={async () => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await onDeleteMember(m.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                  </TouchableOpacity>
                )}
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
    color: '#38BDF8',
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
    borderColor: '#38BDF840',
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
  },
  addTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
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
  relScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  relChip: {
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
  relChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#38BDF820',
  },
  relChipIcon: {
    fontSize: 13,
  },
  relChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  relChipTextActive: {
    color: '#38BDF8',
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
    borderColor: '#38BDF8',
    backgroundColor: '#38BDF820',
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
    backgroundColor: '#38BDF8',
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121D33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  memberRel: {
    fontSize: 11,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '600',
  },
  delBtn: {
    padding: 8,
  },
});
