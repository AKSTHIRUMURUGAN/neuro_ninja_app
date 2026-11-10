import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NinjaPalette } from '../constants/theme';
import { loadNinjaSettings, addFocusCoins } from '../services/storage';

export interface PlantRecord {
  id: string;
  species: 'bonsai' | 'bamboo' | 'sakura' | 'lotus';
  name: string;
  timestamp: number;
  durationMinutes: number;
  completed: boolean;
}

const GROVE_STORAGE_KEY = '@neuro_ninja_focus_grove_v1';

export function FocusGrove() {
  const [plants, setPlants] = useState<PlantRecord[]>([]);
  const [focusCoins, setFocusCoins] = useState(120);
  const [showArmory, setShowArmory] = useState(false);

  const refreshGrove = async () => {
    const settings = await loadNinjaSettings();
    setFocusCoins(settings.focusCoins ?? 120);
    try {
      const raw = await AsyncStorage.getItem(GROVE_STORAGE_KEY);
      if (raw) setPlants(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load grove:', e);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const settings = await loadNinjaSettings();
      if (!active) return;
      setFocusCoins(settings.focusCoins ?? 120);
      try {
        const raw = await AsyncStorage.getItem(GROVE_STORAGE_KEY);
        if (raw && active) setPlants(JSON.parse(raw));
      } catch (e) {
        console.error('Failed to load grove:', e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handlePurchaseSeed = async (
    species: PlantRecord['species'],
    name: string,
    cost: number
  ) => {
    if (focusCoins < cost) {
      Alert.alert('Insufficient Coins', `You need ${cost} Focus Coins to acquire this rare seed.`);
      return;
    }
    await addFocusCoins(-cost);
    await addPlantToGrove(species, name, 25);
    await refreshGrove();
    Alert.alert('Seed Acquired!', `${name} has been added to your Focus Garden.`);
    setShowArmory(false);
  };

  const getSpeciesIcon = (species: PlantRecord['species']) => {
    switch (species) {
      case 'bonsai':
        return 'tree-outline';
      case 'bamboo':
        return 'nature';
      case 'sakura':
        return 'flower-tulip-outline';
      case 'lotus':
        return 'spa-outline';
      default:
        return 'tree';
    }
  };

  const getSpeciesColor = (species: PlantRecord['species']) => {
    switch (species) {
      case 'bonsai':
        return '#00E699';
      case 'bamboo':
        return '#10B981';
      case 'sakura':
        return '#EC4899';
      case 'lotus':
        return '#06B6D4';
      default:
        return '#00E699';
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="forest" size={20} color="#00E699" />
          </View>
          <View>
            <Text style={styles.badge}>FOCUS GAMIFICATION</Text>
            <Text style={styles.title}>The Ninja Grove</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.coinPill} onPress={() => setShowArmory(true)}>
          <MaterialCommunityIcons name="circle-multiple" size={14} color="#F59E0B" />
          <Text style={styles.coinText}>{focusCoins} Coins</Text>
          <MaterialCommunityIcons name="plus-circle" size={12} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtext}>
        Each deep work session nurtures living flora in your sanctuary. Tap coins to visit the Seed Armory.
      </Text>

      {/* Garden Grid */}
      <View style={styles.gardenBox}>
        <Text style={styles.gardenHeading}>GARDEN HARVEST (THIS WEEK)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gardenScroll}>
          {plants.map((plant) => {
            const isWithered = !plant.completed;
            const itemColor = isWithered ? '#64748B' : getSpeciesColor(plant.species);
            return (
              <View key={plant.id} style={[styles.plantItem, isWithered && styles.plantItemWithered]}>
                <View
                  style={[
                    styles.plantIconCircle,
                    { backgroundColor: `${itemColor}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isWithered ? 'tree' : (getSpeciesIcon(plant.species) as any)}
                    size={26}
                    color={itemColor}
                  />
                </View>
                <Text style={[styles.plantName, isWithered && { color: '#94A3B8' }]}>
                  {plant.name}
                </Text>
                <Text style={[styles.plantDuration, isWithered && { color: '#EF4444' }]}>
                  {isWithered ? 'Withered' : `${plant.durationMinutes}m sprint`}
                </Text>
              </View>
            );
          })}

          {/* Next Plot Ready */}
          <TouchableOpacity
            style={[styles.plantItem, styles.plantItemEmpty]}
            onPress={() => setShowArmory(true)}
          >
            <View style={styles.plantIconEmpty}>
              <MaterialCommunityIcons name="sprout-outline" size={24} color="#64748B" />
            </View>
            <Text style={styles.plantNameEmpty}>Seed Armory</Text>
            <Text style={styles.plantDurationEmpty}>Tap to plant</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Armory Modal */}
      <Modal visible={showArmory} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="store-outline" size={22} color="#00E699" />
                <Text style={styles.modalTitle}>Focus Seed Armory</Text>
              </View>
              <TouchableOpacity onPress={() => setShowArmory(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Spend earned Ninja Focus Coins to acquire and plant rare botanical species.
            </Text>

            <View style={styles.seedList}>
              {[
                { species: 'sakura' as const, name: 'Sakura Blossom', cost: 50, icon: 'flower-tulip-outline', color: '#EC4899' },
                { species: 'lotus' as const, name: 'Zen Lotus Flower', cost: 80, icon: 'spa-outline', color: '#06B6D4' },
                { species: 'bamboo' as const, name: 'Golden Bamboo', cost: 120, icon: 'nature', color: '#F59E0B' },
              ].map((seed) => (
                <View key={seed.name} style={styles.seedRow}>
                  <View style={[styles.seedIconBox, { backgroundColor: `${seed.color}20` }]}>
                    <MaterialCommunityIcons name={seed.icon as any} size={24} color={seed.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.seedName}>{seed.name}</Text>
                    <Text style={styles.seedCost}>{seed.cost} Focus Coins</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.buyBtn, focusCoins < seed.cost && styles.buyBtnDisabled]}
                    onPress={() => handlePurchaseSeed(seed.species, seed.name, seed.cost)}
                  >
                    <Text style={styles.buyBtnText}>Plant</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Grove Rules Note */}
      <View style={styles.infoRow}>
        <MaterialCommunityIcons name="shield-check-outline" size={14} color="#00E699" />
        <Text style={styles.infoText}>
          Forest parity: earn +10 Coins per 25m sprint. Unlock rare Sakura & Lotus seeds in Armory.
        </Text>
      </View>
    </View>
  );
}

export async function addPlantToGrove(
  species: PlantRecord['species'],
  name: string,
  durationMinutes: number
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(GROVE_STORAGE_KEY);
    const list: PlantRecord[] = raw ? JSON.parse(raw) : [];
    const newPlant: PlantRecord = {
      id: `p_${Date.now()}`,
      species,
      name,
      timestamp: Date.now(),
      durationMinutes,
      completed: true,
    };
    list.unshift(newPlant);
    await AsyncStorage.setItem(GROVE_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to add plant to grove:', e);
  }
}

export async function addWitheredPlantToGrove(
  species: PlantRecord['species'],
  name: string,
  durationMinutes: number
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(GROVE_STORAGE_KEY);
    const list: PlantRecord[] = raw ? JSON.parse(raw) : [];
    const newPlant: PlantRecord = {
      id: `p_${Date.now()}`,
      species,
      name: `Withered ${name}`,
      timestamp: Date.now(),
      durationMinutes,
      completed: false,
    };
    list.unshift(newPlant);
    await AsyncStorage.setItem(GROVE_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to record withered plant:', e);
  }
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.2)',
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
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  coinText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  subtext: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  gardenBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  gardenHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  gardenScroll: {
    gap: 12,
    paddingRight: 10,
  },
  plantItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    minWidth: 90,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  plantItemEmpty: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'transparent',
  },
  plantIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  plantIconEmpty: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  plantName: {
    fontSize: 11,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
  },
  plantDuration: {
    fontSize: 9,
    color: NinjaPalette.textMuted,
    marginTop: 2,
  },
  plantNameEmpty: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  plantDurationEmpty: {
    fontSize: 9,
    color: '#475569',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  plantItemWithered: {
    opacity: 0.6,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: NinjaPalette.textSecondary,
    marginBottom: 18,
    lineHeight: 16,
  },
  seedList: {
    gap: 12,
  },
  seedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  seedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedName: {
    fontSize: 13,
    fontWeight: '700',
    color: NinjaPalette.textPrimary,
  },
  seedCost: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
  },
  buyBtn: {
    backgroundColor: '#00E699',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buyBtnDisabled: {
    backgroundColor: '#334155',
  },
  buyBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#070A11',
  },
});
