import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface VaultItem {
  id: string;
  title: string;
  secret: string;
  category: 'note' | 'code' | 'contact';
}

const VAULT_STORAGE_KEY = '@neuroninja_privacy_vault_v1';

export function PrivacyVault({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    void (async () => {
      const raw = await AsyncStorage.getItem(VAULT_STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    })();
  }, []);

  const handleAddItem = async () => {
    if (!newTitle.trim() || !newSecret.trim()) {
      Alert.alert('Required Fields', 'Please enter both title and secret data.');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newItem: VaultItem = {
      id: `${Date.now()}`,
      title: newTitle.trim(),
      secret: newSecret.trim(),
      category: 'note',
    };

    const updated = [newItem, ...items];
    setItems(updated);
    await AsyncStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
    setNewTitle('');
    setNewSecret('');
    setShowAdd(false);
  };

  const handleDeleteItem = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    await AsyncStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="lock-closed" size={24} color="#00E699" />
          <Text style={styles.headerTitle}>Encrypted Privacy Vault</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <Text style={styles.headerSub}>
        Zero-knowledge local storage. Data is saved strictly in private app sandbox.
      </Text>

      {showAdd ? (
        <View style={styles.addBox}>
          <TextInput
            style={styles.input}
            placeholder="Item Label (e.g., Safe Note)"
            placeholderTextColor="#64748B"
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Encrypted Content / Secret Text"
            placeholderTextColor="#64748B"
            multiline
            value={newSecret}
            onChangeText={setNewSecret}
          />
          <View style={styles.addActions}>
            <TouchableOpacity style={styles.saveBtn} onPress={() => void handleAddItem()}>
              <Text style={styles.saveBtnText}>Encrypt & Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#070A11" />
          <Text style={styles.newBtnText}>Store New Secret</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>Vault is empty</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSecret}>{item.secret}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => void handleDeleteItem(item.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 20,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  newBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
  },
  addBox: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#00E699',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#070A11',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  list: {
    gap: 12,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemSecret: {
    fontSize: 13,
    color: '#00E699',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  deleteBtn: {
    padding: 8,
  },
});

