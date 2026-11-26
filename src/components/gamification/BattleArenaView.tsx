import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { gameAudio } from '../../services/audio/game-audio-engine';

interface DamagePopup {
  id: number;
  text: string;
  isCrit: boolean;
  x: number;
}

interface BattleArenaViewProps {
  bossName: string;
  bossTitle: string;
  currentHp: number;
  maxHp: number;
  themeColor?: string;
  isWeekly?: boolean;
  isEnraged?: boolean;
  isDefeated?: boolean;
  playerWeaponName?: string;
  playerWeaponMultiplier?: number;
  onAttack?: (damage: number, isCrit: boolean) => Promise<void> | void;
  disabled?: boolean;
}

const NINJA_AVATAR = require('../../../assets/game/characters/ninja_avatar.png');
const BOSS_DOOMSCROLL = require('../../../assets/game/villains/boss_doomscroll.png');
const BOSS_PROCRASTINATION = require('../../../assets/game/villains/boss_procrastination.png');
const BOSS_SLOTH = require('../../../assets/game/villains/boss_sloth.png');
const BOSS_AKUMA = require('../../../assets/game/villains/boss_akuma.png');

export function getBossSprite(name: string, isWeekly = false) {
  if (isWeekly || name.toLowerCase().includes('akuma') || name.toLowerCase().includes('colossus')) {
    return BOSS_AKUMA;
  }
  const n = name.toLowerCase();
  if (n.includes('sloth') || n.includes('bed')) {
    return BOSS_SLOTH;
  }
  if (n.includes('gorgon') || n.includes('procrastination') || n.includes('stone')) {
    return BOSS_PROCRASTINATION;
  }
  return BOSS_DOOMSCROLL;
}

export function BattleArenaView({
  bossName,
  bossTitle,
  currentHp,
  maxHp,
  themeColor = '#EF4444',
  isWeekly = false,
  isEnraged = false,
  isDefeated = false,
  playerWeaponName = 'Bamboo Shinai',
  playerWeaponMultiplier = 1.2,
  onAttack,
  disabled = false,
}: BattleArenaViewProps) {
  const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;

  // Dual-layer Ghost HP Animation
  const foregroundHp = useSharedValue(hpPercent);
  const ghostHp = useSharedValue(hpPercent);

  // Screen shake
  const arenaShakeX = useSharedValue(0);
  const arenaShakeY = useSharedValue(0);

  // Shinobi attack lunge & recoil
  const ninjaTranslateX = useSharedValue(0);
  const ninjaScale = useSharedValue(1);

  // Boss recoil & hit-flash
  const bossTranslateX = useSharedValue(0);
  const bossFlashOpacity = useSharedValue(0);
  const bossIdleY = useSharedValue(0);

  // Katana slash particle arc
  const slashOpacity = useSharedValue(0);
  const slashScale = useSharedValue(0.4);
  const slashRotate = useSharedValue(-30);

  // Floating damage popups
  const [popups, setPopups] = useState<DamagePopup[]>([]);
  const popupIdRef = useRef(0);
  const prevHpRef = useRef(currentHp);

  // Idle floating animation
  useEffect(() => {
    bossIdleY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [bossIdleY]);

  // Sync HP bar changes with dual-layer ghost decay
  useEffect(() => {
    const targetPercent = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
    
    // Immediate foreground response
    foregroundHp.value = withSpring(targetPercent, { damping: 15, stiffness: 120 });
    
    // Delayed ghost decay (300ms hold, then decay over 700ms)
    const decayTimer = setTimeout(() => {
      ghostHp.value = withTiming(targetPercent, { duration: 700, easing: Easing.out(Easing.quad) });
    }, 300);

    prevHpRef.current = currentHp;
    return () => clearTimeout(decayTimer);
  }, [currentHp, maxHp, foregroundHp, ghostHp]);

  // Trigger screen shake
  const triggerScreenShake = useCallback(() => {
    arenaShakeX.value = withSequence(
      withTiming(-6, { duration: 40 }),
      withTiming(6, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(4, { duration: 40 }),
      withTiming(0, { duration: 50 })
    );
    arenaShakeY.value = withSequence(
      withTiming(4, { duration: 40 }),
      withTiming(-4, { duration: 40 }),
      withTiming(2, { duration: 40 }),
      withTiming(0, { duration: 50 })
    );
  }, [arenaShakeX, arenaShakeY]);

  // Execute Katana Strike Action
  const handleStrike = async () => {
    if (disabled || isDefeated || currentHp <= 0) return;

    const isCrit = Math.random() < 0.28;
    const baseDamage = 75;
    const totalDmg = Math.round(baseDamage * playerWeaponMultiplier * (isCrit ? 1.75 : 1.0));

    // 1. Shinobi forward lunge
    ninjaTranslateX.value = withSequence(
      withTiming(70, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 240, easing: Easing.out(Easing.back(1.5)) })
    );

    // 2. Play audio & haptics instantly
    if (isCrit) {
      void gameAudio.playCrit();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void gameAudio.playSlash();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // 3. Katana slash arc appears at impact
    setTimeout(() => {
      slashOpacity.value = 1;
      slashScale.value = 0.5;
      slashRotate.value = isCrit ? -45 : 30;

      slashScale.value = withTiming(1.3, { duration: 220, easing: Easing.out(Easing.cubic) });
      slashOpacity.value = withTiming(0, { duration: 250 });

      // 4. Boss recoil & flash
      bossTranslateX.value = withSequence(
        withTiming(18, { duration: 70 }),
        withTiming(-4, { duration: 80 }),
        withTiming(0, { duration: 120 })
      );
      bossFlashOpacity.value = withSequence(
        withTiming(0.85, { duration: 50 }),
        withTiming(0, { duration: 200 })
      );

      // Screen shake
      triggerScreenShake();

      // Boss grunt sound
      void gameAudio.playBossGrunt();

      // 5. Spawn floating damage text
      const nextId = ++popupIdRef.current;
      setPopups((prev) => [
        ...prev,
        {
          id: nextId,
          text: isCrit ? `-${totalDmg} CRIT!` : `-${totalDmg}`,
          isCrit,
          x: Math.floor(Math.random() * 40) - 20,
        },
      ]);

      // Remove popup after animation
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== nextId));
      }, 1000);

      // 6. Invoke onAttack callback if provided
      if (onAttack) {
        void onAttack(totalDmg, isCrit);
      }
    }, 110);
  };

  // Animated Styles
  const arenaStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: arenaShakeX.value },
      { translateY: arenaShakeY.value },
    ],
  }));

  const ninjaStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ninjaTranslateX.value },
      { scale: ninjaScale.value },
    ],
  }));

  const bossStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: bossTranslateX.value },
      { translateY: bossIdleY.value },
    ],
  }));

  const bossFlashStyle = useAnimatedStyle(() => ({
    opacity: bossFlashOpacity.value,
  }));

  const slashStyle = useAnimatedStyle(() => ({
    opacity: slashOpacity.value,
    transform: [
      { scale: slashScale.value },
      { rotate: `${slashRotate.value}deg` },
    ],
  }));

  const fgHpStyle = useAnimatedStyle(() => ({
    width: `${foregroundHp.value}%`,
  }));

  const ghostHpStyle = useAnimatedStyle(() => ({
    width: `${ghostHp.value}%`,
  }));

  const bossSprite = getBossSprite(bossName, isWeekly);

  return (
    <Animated.View style={[styles.container, arenaStyle]}>
      {/* Arena Stage Background & Top Mist */}
      <View style={styles.mistOverlay} />

      {/* Arena Top Info Bar */}
      <View style={styles.topInfoBar}>
        <View style={styles.badgeRow}>
          <View style={[styles.elementBadge, { borderColor: themeColor }]}>
            <Text style={[styles.elementBadgeText, { color: themeColor }]}>
              {isWeekly ? 'WORLD RAID TITAN' : isEnraged ? '🔥 ENRAGED BOSS' : 'DEMON BOSS'}
            </Text>
          </View>
          {isDefeated && (
            <View style={styles.defeatedBadge}>
              <Text style={styles.defeatedBadgeText}>🏆 VANQUISHED</Text>
            </View>
          )}
        </View>

        <Text style={styles.bossNameText} numberOfLines={1}>
          {bossName}
        </Text>
        <Text style={styles.bossTitleText} numberOfLines={1}>
          {bossTitle}
        </Text>
      </View>

      {/* Dual-Layer Fighting Game Health Bar */}
      <View style={styles.healthContainer}>
        <View style={styles.healthLabelRow}>
          <Text style={styles.healthTitle}>BOSS LIFE ESSENCE</Text>
          <Text style={styles.healthDigits}>
            {Math.max(0, currentHp)} / {maxHp} HP ({Math.round(hpPercent)}%)
          </Text>
        </View>
        <View style={styles.hpTrack}>
          {/* Delayed Ghost Decaying Red Bar */}
          <Animated.View style={[styles.ghostHpFill, ghostHpStyle]} />
          {/* Instant Foreground Green / Themed Bar */}
          <Animated.View
            style={[
              styles.foregroundHpFill,
              fgHpStyle,
              {
                backgroundColor:
                  hpPercent > 50 ? '#00E699' : hpPercent > 20 ? '#F59E0B' : '#EF4444',
              },
            ]}
          />
        </View>
      </View>

      {/* 2D Fighting Stage */}
      <View style={styles.stage}>
        {/* Floor Line */}
        <View style={styles.groundPlane} />

        {/* Player Shinobi (Left Fighter) */}
        <Animated.View style={[styles.fighterWrapper, styles.ninjaWrapper, ninjaStyle]}>
          <Image source={NINJA_AVATAR} style={styles.ninjaSprite} resizeMode="contain" />
          <View style={styles.playerShadow} />
          <View style={styles.fighterLabelBox}>
            <Text style={styles.fighterLabelText}>SHINOBI</Text>
            <Text style={styles.weaponLabelText} numberOfLines={1}>
              {playerWeaponName}
            </Text>
          </View>
        </Animated.View>

        {/* Katana Slash Arc VFX Overlay */}
        <Animated.View style={[styles.slashVfx, slashStyle]} pointerEvents="none">
          <View style={styles.slashCore} />
          <View style={styles.slashGlow} />
        </Animated.View>

        {/* Boss Target (Right Fighter) */}
        <Animated.View style={[styles.fighterWrapper, styles.bossWrapper, bossStyle]}>
          <Image
            source={bossSprite}
            style={[
              styles.bossSprite,
              isDefeated && { opacity: 0.35, tintColor: '#64748B' },
            ]}
            resizeMode="contain"
          />
          {/* Boss Hit-Flash Overlay */}
          <Animated.View style={[styles.bossHitFlash, bossFlashStyle]} pointerEvents="none" />
          <View style={styles.bossShadow} />
          <View style={styles.fighterLabelBox}>
            <Text style={[styles.fighterLabelText, { color: themeColor }]}>TARGET</Text>
            <Text style={styles.weaponLabelText} numberOfLines={1}>
              {isEnraged ? 'FURY 2X' : 'ACTIVE'}
            </Text>
          </View>

          {/* Floating Damage Numbers */}
          {popups.map((p) => (
            <FloatingDamageText key={p.id} text={p.text} isCrit={p.isCrit} offsetX={p.x} />
          ))}
        </Animated.View>
      </View>

      {/* Combat Strike Trigger Button */}
      {!isDefeated && currentHp > 0 && (
        <TouchableOpacity
          style={styles.strikeButton}
          onPress={handleStrike}
          activeOpacity={0.75}
          disabled={disabled}
        >
          <MaterialCommunityIcons name="sword-cross" size={20} color="#070A11" />
          <Text style={styles.strikeButtonText}>
            SHINOBI STRIKE ({playerWeaponMultiplier}x DMG)
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

function FloatingDamageText({
  text,
  isCrit,
  offsetX,
}: {
  text: string;
  isCrit: boolean;
  offsetX: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSpring(isCrit ? 1.4 : 1.1, { damping: 10, stiffness: 180 });
    translateY.value = withTiming(-65, { duration: 900, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 900 });
  }, [scale, translateY, opacity, isCrit]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: offsetX },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.floatingTextWrapper, animStyle]} pointerEvents="none">
      <Text style={[styles.damageText, isCrit ? styles.critText : styles.normalDamageText]}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D131F',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mistOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 10, 17, 0.4)',
  },
  topInfoBar: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  elementBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  elementBadgeText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  defeatedBadge: {
    backgroundColor: 'rgba(0, 230, 153, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  defeatedBadgeText: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
  },
  bossNameText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bossTitleText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  healthContainer: {
    marginBottom: 16,
  },
  healthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  healthTitle: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  healthDigits: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  hpTrack: {
    height: 12,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  ghostHpFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#DC2626', // Decaying ghost red trail
    borderRadius: 6,
  },
  foregroundHpFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  stage: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'relative',
    marginVertical: 4,
  },
  groundPlane: {
    position: 'absolute',
    bottom: 24,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  fighterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 140,
    position: 'relative',
  },
  ninjaWrapper: {
    zIndex: 2,
  },
  bossWrapper: {
    zIndex: 1,
  },
  ninjaSprite: {
    width: 90,
    height: 90,
  },
  bossSprite: {
    width: 105,
    height: 105,
  },
  playerShadow: {
    width: 55,
    height: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: -4,
  },
  bossShadow: {
    width: 70,
    height: 12,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: -4,
  },
  fighterLabelBox: {
    alignItems: 'center',
    marginTop: 4,
  },
  fighterLabelText: {
    color: '#00E699',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  weaponLabelText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  bossHitFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
  },
  slashVfx: {
    position: 'absolute',
    right: 25,
    top: 30,
    width: 120,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  slashCore: {
    width: 110,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    shadowColor: '#00E699',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  slashGlow: {
    position: 'absolute',
    width: 120,
    height: 12,
    backgroundColor: 'rgba(0, 230, 153, 0.65)',
    borderRadius: 6,
  },
  floatingTextWrapper: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 20,
  },
  damageText: {
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  normalDamageText: {
    color: '#EF4444',
    fontSize: 18,
  },
  critText: {
    color: '#F59E0B',
    fontSize: 22,
    letterSpacing: 0.5,
  },
  strikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: '#00E699',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  strikeButtonText: {
    color: '#070A11',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 0.6,
    marginLeft: 8,
  },
});
