import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { VerifierType, VerifierRecord } from '../../services/habits/habit-types';
import { getVerifiers, addVerifier } from '../../services/verification/verification-service';

interface VerifierSelectModalProps {
  visible: boolean;
  currentType: VerifierType;
  currentVerifierId?: string | null;
  onClose: () => void;
  onSelect: (type: VerifierType, verifierId?: string | null, verifierEmail?: string | null) => void;
}

export default function VerifierSelectModal({
  visible,
  currentType,
  currentVerifierId,
  onClose,
  onSelect,
}: VerifierSelectModalProps) {
  const [selectedType, setSelectedType] = useState<VerifierType>(currentType);
  const [selectedId, setSelectedId] = useState<string | null>(currentVerifierId || null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const [verifiers, setVerifiers] = useState<VerifierRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    let ignore = false;
    if (visible) {
      getVerifiers().then((list) => {
        if (!ignore) {
          setSelectedType(currentType);
          setSelectedId(currentVerifierId || null);
          setVerifiers(list);
          if (currentVerifierId) {
            const match = list.find((v) => v.id === currentVerifierId);
            if (match) setSelectedEmail(match.verifierEmail);
          }
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [visible, currentType, currentVerifierId]);

  const handleAddNew = async () => {
    if (!newName.trim() || !newEmail.trim() || !newEmail.includes('@')) {
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const relationship = selectedType === 'parent' ? 'parent' : selectedType === 'mentor' ? 'mentor' : 'friend';
    const created = await addVerifier({
      verifierName: newName.trim(),
      verifierEmail: newEmail.trim().toLowerCase(),
      relationship,
    });
    setVerifiers([created, ...verifiers]);
    setSelectedId(created.id);
    setSelectedEmail(created.verifierEmail);
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  const handleSave = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (selectedType === 'self') {
      onSelect('self', null, null);
    } else {
      onSelect(selectedType, selectedId, selectedEmail);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Accountability Verifier</Text>
              <Text style={styles.subtitle}>Who should confirm your completion?</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll}>
            {/* Type Selector Tabs */}
            <View style={styles.typeRow}>
              {(['self', 'friend', 'parent', 'mentor'] as VerifierType[]).map((t) => {
                const active = selectedType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePill, active && styles.typePillActive]}
                    onPress={() => {
                      setSelectedType(t);
                      if (t === 'self') {
                        setSelectedId(null);
                        setSelectedEmail(null);
                      }
                    }}
                  >
                    <Text style={[styles.typeText, active && styles.typeTextActive]}>
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedType === 'self' ? (
              <View style={styles.selfBox}>
                <Ionicons name="person-outline" size={32} color="#00E699" />
                <Text style={styles.selfTitle}>Self-Honor System</Text>
                <Text style={styles.selfDesc}>
                  You verify your own progress. Completions award Focus Coins and streaks immediately.
                </Text>
              </View>
            ) : (
              <View style={styles.verifierSection}>
                <Text style={styles.sectionHeader}>
                  SELECT {selectedType.toUpperCase()}
                </Text>

                {verifiers.map((v) => {
                  const isChosen = selectedId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.verifierCard, isChosen && styles.verifierCardChosen]}
                      onPress={() => {
                        setSelectedId(v.id);
                        setSelectedEmail(v.verifierEmail);
                      }}
                    >
                      <View style={styles.avatarCircle}>
                        <Ionicons
                          name={v.relationship === 'parent' ? 'shield-checkmark' : 'person'}
                          size={18}
                          color={isChosen ? '#00E699' : '#818CF8'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.verifierName}>{v.verifierName}</Text>
                        <Text style={styles.verifierEmail}>{v.verifierEmail}</Text>
                      </View>
                      {isChosen && <Ionicons name="checkmark-circle" size={20} color="#00E699" />}
                    </TouchableOpacity>
                  );
                })}

                {/* Add new Verifier button / form */}
                {!showAddForm ? (
                  <TouchableOpacity
                    style={styles.addVerifierBtn}
                    onPress={() => setShowAddForm(true)}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#818CF8" />
                    <Text style={styles.addVerifierText}>+ Add New {selectedType}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.addForm}>
                    <Text style={styles.formTitle}>Invite Accountability Partner</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Name (e.g. Dad, Alex, Coach Ryan)"
                      placeholderTextColor="#64748B"
                      value={newName}
                      onChangeText={setNewName}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={newEmail}
                      onChangeText={setNewEmail}
                    />
                    <View style={styles.formActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setShowAddForm(false)}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.confirmAddBtn} onPress={handleAddNew}>
                        <Text style={styles.confirmAddText}>Save Partner</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Apply Verifier</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  typePillActive: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  typeTextActive: {
    color: '#070A11',
  },
  selfBox: {
    backgroundColor: 'rgba(0, 230, 153, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  selfTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00E699',
  },
  selfDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  verifierSection: {
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  verifierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  verifierCardChosen: {
    borderColor: '#00E699',
    backgroundColor: 'rgba(0, 230, 153, 0.06)',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifierName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  verifierEmail: {
    fontSize: 12,
    color: '#94A3B8',
  },
  addVerifierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#818CF8',
    marginTop: 8,
  },
  addVerifierText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#818CF8',
  },
  addForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 8,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  cancelText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  confirmAddBtn: {
    backgroundColor: '#818CF8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  confirmAddText: {
    fontSize: 12,
    color: '#070A11',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#00E699',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#070A11',
  },
});
