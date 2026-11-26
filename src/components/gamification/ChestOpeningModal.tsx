import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PlayerChest } from '../../services/gamification/gamification-types';
import { unifiedGamificationEngine } from '../../services/gamification/unified-gamification-engine';

interface ChestOpeningModalProps {
  visible: boolean;
  chest: PlayerChest | null;
  onClose: () => void;
  onOpened: () => void;
}

const { width } = Dimensions.get('window');

const CHEST_THEMES = {
  bamboo: {
    title: 'Bamboo Novice Chest',
    color: '#10B981',
    bgColor: '#064E3B',
    icon: 'cube-outline',
  },
  jade: {
    title: 'Jade Dragon Chest',
    color: '#00E699',
    bgColor: '#022C22',
    icon: 'treasure-chest',
  },
  shadow: {
    title: 'Shadow Shinobi Vault',
    color: '#818CF8',
    bgColor: '#1E1B4B',
    icon: 'shield-star',
  },
  mythic: {
    title: 'Mythic Akuma Emperor Vault',
    color: '#F59E0B',
    bgColor: '#451A03',
    icon: 'crown',
  },
};

export default function ChestOpeningModal({
  visible,
  chest,
  onClose,
  onOpened,
}: ChestOpeningModalProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [loot, setLoot] = useState<PlayerChest['lootSummary'] | null>(null);

  if (!chest) return null;

  const theme = CHEST_THEMES[chest.tier] || CHEST_THEMES.bamboo;

  const handleOpen = async () => {
    if (isOpening || loot) return;
    setIsOpening(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      const result = await unifiedGamificationEngine.openChest(chest.chestId);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoot(result);
    } catch (e) {
      console.warn('[ChestOpeningModal] open error:', e);
    } finally {
      setIsOpening(false);
    }
  };

  const handleClaim = () => {
    setLoot(null);
    onOpened();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { borderColor: theme.color }]}>
          {/* Header */}
          <Text style={[styles.badge, { color: theme.color }]}>{chest.tier.toUpperCase()} LOOT VAULT</Text>
          <Text style={styles.title}>{theme.title}</Text>
          <Text style={styles.subtitle}>Awarded for: {chest.sourceAction}</Text>

          {/* Chest Icon or Loot Reveal */}
          {!loot ? (
            <View style={styles.chestContainer}>
              <View style={[styles.chestGlow, { backgroundColor: theme.bgColor }]}>
                <MaterialCommunityIcons
                  name={theme.icon as any}
                  size={96}
                  color={theme.color}
                />
              </View>
              <Text style={styles.instruction}>
                {isOpening ? 'Unlocking seals...' : 'Tap the button below to break the seal'}
              </Text>

              <TouchableOpacity
                style={[styles.openBtn, { backgroundColor: theme.color }]}
                onPress={handleOpen}
                disabled={isOpening}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="key-variant" size={20} color="#070A11" />
                <Text style={styles.openBtnText}>
                  {isOpening ? 'OPENING...' : 'UNLOCK CHEST'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.lootContainer}>
              <Text style={styles.lootCelebration}>🎉 TREASURE UNLOCKED! 🎉</Text>

              <View style={styles.lootItemRow}>
                <MaterialCommunityIcons name="circle-multiple" size={24} color="#00E699" />
                <Text style={styles.lootItemText}>+{loot.coins} Focus Coins</Text>
              </View>

              <View style={styles.lootItemRow}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#818CF8" />
                <Text style={styles.lootItemText}>+{loot.xp} Karma XP</Text>
              </View>

              <View style={styles.lootItemRow}>
                <MaterialCommunityIcons name="wall" size={24} color="#F59E0B" />
                <Text style={styles.lootItemText}>+{loot.castleStone} Castle Stones</Text>
              </View>

              {loot.soulShards ? (
                <View style={styles.lootItemRow}>
                  <MaterialCommunityIcons name="diamond-stone" size={24} color="#EC4899" />
                  <Text style={styles.lootItemText}>+{loot.soulShards} Soul Shards</Text>
                </View>
              ) : null}

              {loot.itemTitle ? (
                <View style={styles.specialItemCard}>
                  <FontAwesome5 name="award" size={20} color="#F59E0B" />
                  <Text style={styles.specialItemText}>{loot.itemTitle}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.openBtn, { backgroundColor: '#00E699' }]}
                onPress={handleClaim}
                activeOpacity={0.8}
              >
                <Text style={styles.openBtnText}>CLAIM & RETURN TO DOJO</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loot && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>Open Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 17, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 40,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  chestContainer: {
    alignItems: 'center',
    width: '100%',
  },
  chestGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 18,
  },
  instruction: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 10,
  },
  openBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#070A11',
    letterSpacing: 1,
  },
  closeBtn: {
    marginTop: 16,
    padding: 8,
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 13,
  },
  lootContainer: {
    width: '100%',
    alignItems: 'center',
  },
  lootCelebration: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  lootItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  lootItemText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  specialItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    marginVertical: 10,
  },
  specialItemText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
