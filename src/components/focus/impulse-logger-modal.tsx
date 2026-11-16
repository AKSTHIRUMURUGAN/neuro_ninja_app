import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { DistractionImpulse } from '../../services/focus/deep-work-types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onRecordImpulse: (tag: DistractionImpulse['tag'], note?: string) => void;
}

const IMPULSE_TAGS: { tag: DistractionImpulse['tag']; label: string; icon: string }[] = [
  { tag: 'social_media', label: 'Social Media Urge', icon: 'instagram' },
  { tag: 'email_chat', label: 'Check Email / Chat', icon: 'email-outline' },
  { tag: 'random_thought', label: 'Random Thought', icon: 'lightbulb-outline' },
  { tag: 'hunger_snack', label: 'Snack / Boredom', icon: 'food-apple-outline' },
];

export function ImpulseLoggerModal({ visible, onDismiss, onRecordImpulse }: Props) {
  const [selectedTag, setSelectedTag] = useState<DistractionImpulse['tag']>('social_media');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRecordImpulse(selectedTag, note);
    setNote('');
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>DOPAMINE IMPULSE CAUGHT</Text>
              <Text style={styles.subtitle}>
                Acknowledge and release the itch without breaking your sprint.
              </Text>
            </View>
            <TouchableOpacity onPress={onDismiss}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Tag Grid */}
          <View style={styles.tagGrid}>
            {IMPULSE_TAGS.map((item) => (
              <TouchableOpacity
                key={item.tag}
                style={[styles.tagCard, selectedTag === item.tag && styles.tagCardActive]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedTag(item.tag);
                }}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={20}
                  color={selectedTag === item.tag ? '#F59E0B' : '#94A3B8'}
                />
                <Text style={[styles.tagText, selectedTag === item.tag && styles.tagTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Optional Note */}
          <TextInput
            style={styles.input}
            placeholder="Quick thought note (optional)..."
            placeholderTextColor="#64748B"
            value={note}
            onChangeText={setNote}
            maxLength={40}
          />

          {/* Action Button */}
          <TouchableOpacity style={styles.confirmBtn} onPress={() => void handleSubmit()}>
            <MaterialCommunityIcons name="shield-check" size={18} color="#070A11" />
            <Text style={styles.confirmBtnText}>Log & Return to Flow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F59E0B44',
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#070A11',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tagCardActive: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B',
  },
  tagText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    flex: 1,
  },
  tagTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#070A11',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  confirmBtn: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#070A11',
  },
});
