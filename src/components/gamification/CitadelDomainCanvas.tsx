import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { gameAudio } from '../../services/audio/game-audio-engine';
import { CASTLE_ASSETS, UI_GAME_ICONS } from '../../assets/game-asset-registry';

interface CitadelDomainCanvasProps {
  tenshuLevel: number;
  sentryGateDurability: number;
  sentryGateMax: number;
  castleStone: number;
  ninjaBelt: string;
  onSelectBuilding?: (buildingType: 'tenshu' | 'forge' | 'springs' | 'gates') => void;
  onRestAtSprings?: () => void;
}

const TENSHU_T1 = CASTLE_ASSETS.keep_lv1;
const TENSHU_T2 = CASTLE_ASSETS.keep_lv2;
const TENSHU_T3 = CASTLE_ASSETS.keep_lv3;
const FORGE_IMG = CASTLE_ASSETS.task_forge;
const SPRINGS_IMG = CASTLE_ASSETS.habit_shrine;
const GATES_INTACT = CASTLE_ASSETS.castle_gate;
const GATES_DAMAGED = CASTLE_ASSETS.castle_gate_damaged;

export function CitadelDomainCanvas({
  tenshuLevel,
  sentryGateDurability,
  sentryGateMax,
  castleStone,
  ninjaBelt,
  onSelectBuilding,
  onRestAtSprings,
}: CitadelDomainCanvasProps) {
  const isGateDamaged = sentryGateDurability < sentryGateMax * 0.5;
  const [isMuted, setIsMuted] = useState(gameAudio.getMuted());
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    gameAudio.setMuted(next);
    setIsMuted(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Tenshu sprite by tier
  const tenshuSprite =
    tenshuLevel >= 3 ? TENSHU_T3 : tenshuLevel === 2 ? TENSHU_T2 : TENSHU_T1;

  // Floating mist animation
  const mistOffset1 = useSharedValue(0);
  const mistOffset2 = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    mistOffset1.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    mistOffset2.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [mistOffset1, mistOffset2]);

  const mistAnimStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateX: mistOffset1.value }],
  }));

  const mistAnimStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: mistOffset2.value }],
  }));

  const handlePressTenshu = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectBuilding?.('tenshu');
  };

  const handlePressForge = () => {
    void gameAudio.playHammer();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onSelectBuilding?.('forge');
  };

  const handlePressSprings = () => {
    void gameAudio.playChestUnlock();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onRestAtSprings) {
      onRestAtSprings();
    } else {
      onSelectBuilding?.('springs');
    }
  };

  const handlePressGates = () => {
    if (isGateDamaged) {
      void gameAudio.playGateImpact();
    } else {
      void gameAudio.playChestUnlock();
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectBuilding?.('gates');
  };

  return (
    <View style={styles.canvasContainer}>
      {/* Sky & Mountain Backdrop */}
      <View style={styles.skyBackdrop}>
        <View style={styles.mountainRidgeBack} />
        <View style={styles.mountainRidgeFront} />
      </View>

      {/* Floating Animated Mist Clouds */}
      <Animated.View style={[styles.mistCloud, styles.mistCloud1, mistAnimStyle1]} />
      <Animated.View style={[styles.mistCloud, styles.mistCloud2, mistAnimStyle2]} />

      {/* Domain Top Status Bar */}
      <View style={styles.domainTopBar}>
        <View style={styles.domainBadge}>
          <MaterialCommunityIcons name="castle" size={14} color="#00E699" />
          <Text style={styles.domainBadgeText}>
            TIER {tenshuLevel} CITADEL • {ninjaBelt.toUpperCase()} DOJO
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.stonePill}>
            <Image source={UI_GAME_ICONS.res_stone} style={{ width: 14, height: 14 }} resizeMode="contain" />
            <Text style={styles.stoneText}>{castleStone} Stones</Text>
          </View>
          <TouchableOpacity style={styles.muteBtn} onPress={toggleMute} activeOpacity={0.7}>
            <MaterialCommunityIcons
              name={isMuted ? 'volume-off' : 'volume-high'}
              size={14}
              color={isMuted ? '#64748B' : '#00E699'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2D Building Interactive Placement Canvas */}
      <View style={styles.buildingsStage}>
        {/* Decorative Isometric Bonsai & Lantern */}
        <Image
          source={CASTLE_ASSETS.decor_bonsai}
          style={{ position: 'absolute', left: 10, top: 8, width: 44, height: 44, opacity: 0.9 }}
          resizeMode="contain"
        />
        <Image
          source={CASTLE_ASSETS.decor_lantern}
          style={{ position: 'absolute', right: 12, top: 8, width: 40, height: 40, opacity: 0.9 }}
          resizeMode="contain"
        />

        {/* Upper Center: Grand Shogun Tenshu Palace */}
        <TouchableOpacity
          style={styles.tenshuPlacement}
          onPress={handlePressTenshu}
          activeOpacity={0.85}
        >
          <Image source={tenshuSprite} style={styles.tenshuImg} resizeMode="contain" />
          <View style={styles.buildingLabelBox}>
            <Text style={styles.buildingTitle}>Tenshu Palace</Text>
            <Text style={styles.buildingSub}>Tier {tenshuLevel}</Text>
          </View>
        </TouchableOpacity>

        {/* Lower Left: Dojo Forge */}
        <TouchableOpacity
          style={styles.forgePlacement}
          onPress={handlePressForge}
          activeOpacity={0.85}
        >
          <Image source={FORGE_IMG} style={styles.forgeImg} resizeMode="contain" />
          <View style={styles.buildingLabelBox}>
            <Text style={styles.buildingTitle}>Dojo Forge</Text>
            <Text style={styles.buildingSub}>Weapons</Text>
          </View>
        </TouchableOpacity>

        {/* Lower Right: Zen Hot Springs */}
        <TouchableOpacity
          style={styles.springsPlacement}
          onPress={handlePressSprings}
          activeOpacity={0.85}
        >
          <Image source={SPRINGS_IMG} style={styles.springsImg} resizeMode="contain" />
          <View style={styles.buildingLabelBox}>
            <Text style={styles.buildingTitle}>Zen Springs</Text>
            <Text style={styles.springsRecoverSub}>Tap to Heal 🌿</Text>
          </View>
        </TouchableOpacity>

        {/* Foreground Bottom Center: Fortified Sentry Gates */}
        <TouchableOpacity
          style={styles.gatesPlacement}
          onPress={handlePressGates}
          activeOpacity={0.85}
        >
          <Image
            source={isGateDamaged ? GATES_DAMAGED : GATES_INTACT}
            style={styles.gatesImg}
            resizeMode="contain"
          />
          <View
            style={[
              styles.gatesLabelBox,
              isGateDamaged ? styles.gatesDamagedBox : styles.gatesIntactBox,
            ]}
          >
            <MaterialCommunityIcons
              name={isGateDamaged ? 'shield-alert' : 'shield-check'}
              size={12}
              color={isGateDamaged ? '#EF4444' : '#00E699'}
            />
            <Text
              style={[
                styles.gatesLabelText,
                { color: isGateDamaged ? '#EF4444' : '#00E699' },
              ]}
            >
              {sentryGateDurability}/{sentryGateMax} HP{' '}
              {isGateDamaged ? '(BREACHED)' : '(INTACT)'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    height: 290,
    backgroundColor: '#070C15',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  skyBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#09101E',
  },
  mountainRidgeBack: {
    position: 'absolute',
    top: 35,
    left: -20,
    right: -20,
    height: 90,
    backgroundColor: '#121D30',
    borderTopLeftRadius: 180,
    borderTopRightRadius: 220,
    opacity: 0.7,
  },
  mountainRidgeFront: {
    position: 'absolute',
    top: 75,
    left: -40,
    right: -40,
    height: 120,
    backgroundColor: '#0E1726',
    borderTopLeftRadius: 240,
    borderTopRightRadius: 160,
    opacity: 0.9,
  },
  mistCloud: {
    position: 'absolute',
    height: 35,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  mistCloud1: {
    top: 50,
    left: 20,
    width: 140,
  },
  mistCloud2: {
    top: 80,
    right: 30,
    width: 160,
  },
  domainTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    zIndex: 10,
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  domainBadgeText: {
    color: '#00E699',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  stonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  stoneText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  muteBtn: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  buildingsStage: {
    flex: 1,
    position: 'relative',
    marginTop: 4,
  },
  tenshuPlacement: {
    position: 'absolute',
    top: 5,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  tenshuImg: {
    width: 100,
    height: 100,
  },
  forgePlacement: {
    position: 'absolute',
    left: 14,
    bottom: 40,
    alignItems: 'center',
    zIndex: 3,
  },
  forgeImg: {
    width: 78,
    height: 78,
  },
  springsPlacement: {
    position: 'absolute',
    right: 14,
    bottom: 40,
    alignItems: 'center',
    zIndex: 3,
  },
  springsImg: {
    width: 78,
    height: 78,
  },
  gatesPlacement: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  gatesImg: {
    width: 86,
    height: 86,
  },
  buildingLabelBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 10, 17, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: -2,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  buildingTitle: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '700',
  },
  buildingSub: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '600',
  },
  springsRecoverSub: {
    color: '#38BDF8',
    fontSize: 8,
    fontWeight: '700',
  },
  gatesLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: -6,
    borderWidth: 1,
    gap: 3,
  },
  gatesIntactBox: {
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  gatesDamagedBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  gatesLabelText: {
    fontSize: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
});
