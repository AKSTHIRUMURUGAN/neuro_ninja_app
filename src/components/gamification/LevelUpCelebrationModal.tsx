import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { gameAudio } from '../../services/audio/game-audio-engine';
import type { PlayerChest } from '../../services/gamification/gamification-types';
import { SpriteSheetAnimator } from './SpriteSheetAnimator';
import { NINJA_ANIMATIONS, UI_GAME_ICONS } from '../../assets/game-asset-registry';

interface LevelUpCelebrationModalProps {
  visible: boolean;
  newLevel: number;
  ninjaBelt: string;
  chestAwarded?: PlayerChest;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const NINJA_AVATAR = require('../../../assets/game/characters/ninja_avatar.png');

export function LevelUpCelebrationModal({
  visible,
  newLevel,
  ninjaBelt,
  chestAwarded,
  onClose,
}: LevelUpCelebrationModalProps) {
  const rayRotate = useSharedValue(0);
  const badgeScale = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      void gameAudio.playLevelUp();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      badgeScale.value = withSpring(1, { damping: 10, stiffness: 140 });
      rayRotate.value = withRepeat(
        withTiming(360, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      badgeScale.value = 0.5;
    }
  }, [visible, badgeScale, rayRotate]);

  const rayAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rayRotate.value}deg` }],
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Spinning Golden Sunburst */}
          <Animated.View style={[styles.sunburst, rayAnimStyle]}>
            {[0, 30, 60, 90, 120, 150].map((deg) => (
              <View
                key={deg}
                style={[styles.ray, { transform: [{ rotate: `${deg}deg` }] }]}
              />
            ))}
          </Animated.View>

          <Text style={styles.kicker}>SHINOBI ASCENSION</Text>
          <Text style={styles.headline}>LEVEL UP!</Text>

          <Animated.View style={[styles.avatarRing, badgeAnimStyle]}>
            <Image
              source={newLevel >= 5 ? UI_GAME_ICONS.frame_legendary : UI_GAME_ICONS.frame_rare}
              style={{ position: 'absolute', width: 132, height: 132 }}
              resizeMode="contain"
            />
            <SpriteSheetAnimator
              frames={NINJA_ANIMATIONS.victory}
              fps={10}
              loop={true}
              size={92}
            />
            <View style={styles.levelBadge}>
              <Text style={styles.levelNum}>LV. {newLevel}</Text>
            </View>
          </Animated.View>

          <View style={styles.beltPill}>
            <MaterialCommunityIcons name="karate" size={18} color="#F59E0B" />
            <Text style={styles.beltText}>{ninjaBelt.toUpperCase()}</Text>
          </View>

          <Text style={styles.subText}>
            Your discipline grows stronger! New weapon blueprints and higher castle tiers are now within reach.
          </Text>

          {chestAwarded && (
            <View style={styles.chestRewardCard}>
              <MaterialCommunityIcons name="treasure-chest" size={24} color="#00E699" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.chestTitle}>
                  MILESTONE {chestAwarded.tier.toUpperCase()} CHEST UNLOCKED!
                </Text>
                <Text style={styles.chestSub}>Open it in your Citadel Treasure Vault</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => {
              void gameAudio.playCoinJingle();
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>CLAIM &amp; CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 17, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 40,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F59E0B',
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  sunburst: {
    position: 'absolute',
    top: -40,
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.2,
  },
  ray: {
    position: 'absolute',
    width: 280,
    height: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 5,
  },
  kicker: {
    color: '#F59E0B',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headline: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 18,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#00E699',
    backgroundColor: '#070A11',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarImg: {
    width: 96,
    height: 96,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  levelNum: {
    color: '#070A11',
    fontSize: 13,
    fontWeight: '900',
  },
  beltPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  beltText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  chestRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.35)',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginBottom: 18,
  },
  chestTitle: {
    color: '#00E699',
    fontSize: 12,
    fontWeight: '800',
  },
  chestSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#070A11',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
