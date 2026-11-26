import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PlayerChest } from '../../services/gamification/gamification-types';
import { unifiedGamificationEngine } from '../../services/gamification/unified-gamification-engine';
import { gameAudio } from '../../services/audio/game-audio-engine';

interface ChestOpeningModalProps {
  visible: boolean;
  chest: PlayerChest | null;
  onClose: () => void;
  onOpened: () => void;
}

const { width } = Dimensions.get('window');

const CHEST_SPRITES = {
  bamboo: require('../../../assets/game/items/chest_bamboo.png'),
  jade: require('../../../assets/game/items/chest_jade.png'),
  shadow: require('../../../assets/game/items/chest_shadow.png'),
  mythic: require('../../../assets/game/items/chest_mythic.png'),
};

const COIN_GOLD_IMG = require('../../../assets/game/items/coin_gold.png');

const CHEST_THEMES = {
  bamboo: {
    title: 'Bamboo Novice Chest',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.25)',
  },
  jade: {
    title: 'Jade Dragon Chest',
    color: '#00E699',
    glowColor: 'rgba(0, 230, 153, 0.35)',
  },
  shadow: {
    title: 'Shadow Shinobi Vault',
    color: '#818CF8',
    glowColor: 'rgba(129, 140, 248, 0.35)',
  },
  mythic: {
    title: 'Mythic Akuma Emperor Vault',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.45)',
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

  // Reanimated values for chest rumble and light bursts
  const chestShakeX = useSharedValue(0);
  const chestScale = useSharedValue(1);
  const rayRotate = useSharedValue(0);
  const lootScale = useSharedValue(0.5);
  const lootOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setLoot(null);
      setIsOpening(false);
      chestScale.value = 1;
      chestShakeX.value = 0;
    }
  }, [visible, chestScale, chestShakeX]);

  const theme = (chest && CHEST_THEMES[chest.tier]) || CHEST_THEMES.bamboo;
  const chestSprite = (chest && CHEST_SPRITES[chest.tier]) || CHEST_SPRITES.bamboo;

  const handleOpen = async () => {
    if (!chest || isOpening || loot) return;
    setIsOpening(true);

    // Audio & Rumble
    void gameAudio.playChestUnlock();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Chest rumble animation
    chestShakeX.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 40 }),
        withTiming(8, { duration: 40 })
      ),
      10,
      true
    );
    chestScale.value = withSequence(
      withTiming(0.9, { duration: 200 }),
      withTiming(1.15, { duration: 400 })
    );

    try {
      const result = await unifiedGamificationEngine.openChest(chest.chestId);

      // Stop rumble
      chestShakeX.value = 0;

      // Play reveal sound & coin chime
      void gameAudio.playChestReveal();
      setTimeout(() => {
        void gameAudio.playCoinJingle();
      }, 250);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoot(result);

      // Animate loot reveal
      lootScale.value = withSpring(1, { damping: 12, stiffness: 150 });
      lootOpacity.value = withTiming(1, { duration: 400 });

      // Start spinning rays
      rayRotate.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
    } catch (e) {
      console.warn('[ChestOpeningModal] open error:', e);
    } finally {
      setIsOpening(false);
    }
  };

  const handleClaim = () => {
    void gameAudio.playCoinJingle();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoot(null);
    onOpened();
    onClose();
  };

  const chestAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: chestShakeX.value },
      { scale: chestScale.value },
    ],
  }));

  const rayAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rayRotate.value}deg` }],
  }));

  const lootAnimStyle = useAnimatedStyle(() => ({
    opacity: lootOpacity.value,
    transform: [{ scale: lootScale.value }],
  }));

  if (!chest) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { borderColor: theme.color }]}>
          {/* Header */}
          <Text style={[styles.badge, { color: theme.color }]}>
            {chest.tier.toUpperCase()} TREASURE VAULT
          </Text>
          <Text style={styles.title}>{theme.title}</Text>
          <Text style={styles.subtitle}>Sourced from: {chest.sourceAction}</Text>

          {/* Chest Sprite or Loot Reveal */}
          {!loot ? (
            <View style={styles.chestContainer}>
              <View style={[styles.chestHalo, { backgroundColor: theme.glowColor }]}>
                <Animated.View style={chestAnimStyle}>
                  <Image source={chestSprite} style={styles.chestSprite} resizeMode="contain" />
                </Animated.View>
              </View>

              <Text style={styles.instruction}>
                {isOpening ? 'Breaking ninja seal...' : 'Tap below to unlock mystery treasure!'}
              </Text>

              <TouchableOpacity
                style={[styles.openBtn, { backgroundColor: theme.color }]}
                onPress={handleOpen}
                disabled={isOpening}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="key-variant" size={20} color="#070A11" />
                <Text style={styles.openBtnText}>
                  {isOpening ? 'UNLOCKING...' : 'OPEN CHEST'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={[styles.lootContainer, lootAnimStyle]}>
              {/* Radial Sunburst Rays in background */}
              <Animated.View style={[styles.sunburstContainer, rayAnimStyle]}>
                {[0, 45, 90, 135].map((deg) => (
                  <View
                    key={deg}
                    style={[
                      styles.sunburstRay,
                      { transform: [{ rotate: `${deg}deg` }] },
                    ]}
                  />
                ))}
              </Animated.View>

              <Text style={styles.lootCelebration}>🎉 TREASURE UNLOCKED! 🎉</Text>

              {/* Focus Coins with 3D Coin Asset */}
              <View style={styles.lootItemRow}>
                <Image source={COIN_GOLD_IMG} style={styles.coinSprite} resizeMode="contain" />
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
            </Animated.View>
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
    backgroundColor: 'rgba(7, 10, 17, 0.94)',
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
    overflow: 'hidden',
    position: 'relative',
  },
  badge: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    marginBottom: 18,
  },
  chestContainer: {
    alignItems: 'center',
    width: '100%',
  },
  chestHalo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16,
  },
  chestSprite: {
    width: 120,
    height: 120,
  },
  instruction: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  openBtnText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    color: '#070A11',
    letterSpacing: 1,
  },
  closeBtn: {
    marginTop: 14,
    padding: 8,
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 13,
  },
  lootContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  sunburstContainer: {
    position: 'absolute',
    top: -50,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
    opacity: 0.25,
  },
  sunburstRay: {
    position: 'absolute',
    width: 220,
    height: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  lootCelebration: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  coinSprite: {
    width: 26,
    height: 26,
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
