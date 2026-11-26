import React, { useState, useEffect, useRef } from 'react';
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
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NinjaFriend } from '../../services/gamification/gamification-types';
import {
  friendDuelEngine,
  type FriendCastleDuelResult,
  type BattleReplayEvent,
} from '../../services/gamification/friend-duel-engine';
import { gameAudio } from '../../services/audio/game-audio-engine';

interface FriendCastleDuelModalProps {
  visible: boolean;
  friend: NinjaFriend | null;
  attackerLevel: number;
  weaponMultiplier: number;
  weaponName: string;
  onClose: () => void;
  onDuelComplete?: () => void;
}

const { width } = Dimensions.get('window');

const NINJA_AVATAR = require('../../../assets/game/characters/ninja_avatar.png');
const TENSHU_T1 = require('../../../assets/game/castle/tenshu_t1.png');
const TENSHU_T2 = require('../../../assets/game/castle/tenshu_t2.png');
const TENSHU_T3 = require('../../../assets/game/castle/tenshu_t3.png');
const GATES_INTACT = require('../../../assets/game/castle/gates_intact.png');
const GATES_DAMAGED = require('../../../assets/game/castle/gates_damaged.png');
const COIN_GOLD_IMG = require('../../../assets/game/items/coin_gold.png');

export function FriendCastleDuelModal({
  visible,
  friend,
  attackerLevel,
  weaponMultiplier,
  weaponName,
  onClose,
  onDuelComplete,
}: FriendCastleDuelModalProps) {
  const [phase, setPhase] = useState<'scout' | 'fighting' | 'result'>('scout');
  const [duelResult, setDuelResult] = useState<FriendCastleDuelResult | null>(null);
  const [gateBreached, setGateBreached] = useState(false);
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [destructionDisplay, setDestructionDisplay] = useState(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Animated values
  const shinobiX = useSharedValue(0);
  const castleShakeX = useSharedValue(0);
  const slashOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.7);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    if (visible) {
      setPhase('scout');
      setDuelResult(null);
      setGateBreached(false);
      setActivePopup(null);
      setDestructionDisplay(0);
      shinobiX.value = 0;
      castleShakeX.value = 0;
      slashOpacity.value = 0;
    } else {
      clearTimers();
    }
    return () => clearTimers();
  }, [visible, shinobiX, castleShakeX, slashOpacity]);

  const tenshuImg =
    friend && friend.castleLevel >= 4
      ? TENSHU_T3
      : friend && friend.castleLevel >= 2
      ? TENSHU_T2
      : TENSHU_T1;

  const playReplayEvents = (result: FriendCastleDuelResult) => {
    if (!friend) return;
    clearTimers();
    setPhase('fighting');
    setGateBreached(false);
    setDestructionDisplay(0);
    setActivePopup('SCOUTING PERIMETER...');

    const totalHp = 100 + friend.castleLevel * 50 + (180 + friend.castleLevel * 100);
    let runningDmg = 0;

    result.replayEvents.forEach((ev: BattleReplayEvent) => {
      const t = setTimeout(() => {
        if (ev.type === 'shinobi_spawn') {
          setActivePopup(ev.textPopup);
          shinobiX.value = withTiming(25, { duration: 250 });
        } else if (ev.type === 'slash_gate' || ev.type === 'gate_breached' || ev.type === 'tenshu_assault') {
          runningDmg += ev.damage;
          setDestructionDisplay(Math.min(100, Math.round((runningDmg / totalHp) * 100)));
          setActivePopup(ev.textPopup);

          // Shinobi lunge
          shinobiX.value = withSequence(
            withTiming(75, { duration: 100, easing: Easing.out(Easing.quad) }),
            withTiming(25, { duration: 220 })
          );

          // Slash VFX
          slashOpacity.value = withSequence(
            withTiming(1, { duration: 60 }),
            withTiming(0, { duration: 220 })
          );

          // Castle shake
          castleShakeX.value = withSequence(
            withTiming(-7, { duration: 40 }),
            withTiming(7, { duration: 40 }),
            withTiming(-4, { duration: 40 }),
            withTiming(0, { duration: 50 })
          );

          // Audio FX
          if (ev.type === 'gate_breached') {
            setGateBreached(true);
            void gameAudio.playGateCrumble();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else if (ev.isCrit) {
            void gameAudio.playCrit();
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            void gameAudio.playSlash();
            void gameAudio.playGateImpact();
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        } else if (ev.type === 'victory') {
          setDestructionDisplay(result.destructionPercent);
          setPhase('result');
          resultScale.value = withSpring(1, { damping: 12, stiffness: 140 });
          if (result.starsEarned > 0) {
            void gameAudio.playLevelUp();
            setTimeout(() => void gameAudio.playCoinJingle(), 300);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          onDuelComplete?.();
        }
      }, ev.timestampMs);

      timersRef.current.push(t);
    });
  };

  const handleLaunchDuel = async () => {
    if (!friend || phase !== 'scout') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const result = await friendDuelEngine.simulateAndExecuteDuel(
      friend,
      attackerLevel,
      weaponMultiplier
    );
    setDuelResult(result);
    playReplayEvents(result);
  };

  const shinobiAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shinobiX.value }],
  }));

  const castleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: castleShakeX.value }],
  }));

  const slashAnimStyle = useAnimatedStyle(() => ({
    opacity: slashOpacity.value,
  }));

  const resultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
  }));

  if (!friend) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.badge}>FRIENDLY CASTLE DUEL</Text>
              <Text style={styles.title}>{friend.displayName}&apos;s Citadel</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Defender Stats Row */}
          <View style={styles.statsBar}>
            <Text style={styles.statText}>🏯 Tier {friend.castleLevel} Keep</Text>
            <Text style={styles.statText}>🥋 {friend.beltRank}</Text>
            <Text style={styles.statText}>🔥 {friend.streakDays}d Streak</Text>
          </View>

          {/* 2D Battle Stage */}
          <View style={styles.battleStage}>
            {/* Destruction Progress Pill */}
            <View style={styles.destructionPill}>
              <Text style={styles.destructionText}>
                DESTRUCTION: {destructionDisplay}%
              </Text>
            </View>

            {/* Attacker Shinobi */}
            <Animated.View style={[styles.attackerBox, shinobiAnimStyle]}>
              <Image source={NINJA_AVATAR} style={styles.shinobiImg} resizeMode="contain" />
              <Text style={styles.unitTag} numberOfLines={1}>{weaponName}</Text>
            </Animated.View>

            {/* Slash Arc Overlay */}
            <Animated.View style={[styles.slashOverlay, slashAnimStyle]} pointerEvents="none">
              <View style={styles.slashBeam} />
            </Animated.View>

            {/* Defender Castle (Gate + Tenshu) */}
            <Animated.View style={[styles.defenderBox, castleAnimStyle]}>
              <Image source={tenshuImg} style={styles.tenshuImg} resizeMode="contain" />
              <Image
                source={gateBreached ? GATES_DAMAGED : GATES_INTACT}
                style={styles.gateImg}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Combat Event Popup */}
            {activePopup && (
              <View style={styles.popupBanner}>
                <Text style={styles.popupText}>{activePopup}</Text>
              </View>
            )}
          </View>

          {/* Action / Result Footer */}
          {phase === 'scout' && (
            <View style={styles.footerBox}>
              <Text style={styles.friendlyRuleHint}>
                🛡️ Friendly Challenge: Defender loses zero resources or buildings. Win stars for bonus Coins & XP!
              </Text>
              <TouchableOpacity
                style={styles.launchBtn}
                onPress={handleLaunchDuel}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="sword-cross" size={20} color="#070A11" />
                <Text style={styles.launchBtnText}>LAUNCH CASTLE DUEL</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'fighting' && (
            <View style={styles.fightingBanner}>
              <Text style={styles.fightingText}>⚔️ ASSAULT IN PROGRESS...</Text>
            </View>
          )}

          {phase === 'result' && duelResult && (
            <Animated.View style={[styles.resultCard, resultAnimStyle]}>
              {/* Stars Row */}
              <View style={styles.starsRow}>
                {[1, 2, 3].map((s) => (
                  <MaterialCommunityIcons
                    key={s}
                    name={s <= duelResult.starsEarned ? 'star' : 'star-outline'}
                    size={36}
                    color={s <= duelResult.starsEarned ? '#F59E0B' : '#334155'}
                  />
                ))}
              </View>

              <Text style={styles.resultHeadline}>
                {duelResult.starsEarned === 3
                  ? 'CITADEL CONQUERED!'
                  : duelResult.starsEarned > 0
                  ? 'VICTORY ACHIEVED!'
                  : 'DEFENSES HELD STRONG!'}
              </Text>
              <Text style={styles.resultSub}>
                {duelResult.destructionPercent}% Destruction • {duelResult.damageDealt} Total DMG
              </Text>

              <View style={styles.rewardsRow}>
                <View style={styles.rewardChip}>
                  <Image source={COIN_GOLD_IMG} style={styles.coinSmall} resizeMode="contain" />
                  <Text style={styles.rewardChipText}>+{duelResult.rewardCoins} Coins</Text>
                </View>
                <View style={styles.rewardChip}>
                  <MaterialCommunityIcons name="star-four-points" size={16} color="#818CF8" />
                  <Text style={styles.rewardChipText}>+{duelResult.rewardXp} XP</Text>
                </View>
              </View>

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.replayBtn}
                  onPress={() => playReplayEvents(duelResult)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="replay" size={18} color="#F8FAFC" />
                  <Text style={styles.replayBtnText}>REPLAY</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>RETURN TO DOJO</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
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
    padding: 16,
  },
  container: {
    width: width - 32,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    color: '#F59E0B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#070A11',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  battleStage: {
    height: 195,
    backgroundColor: '#070C15',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  destructionPill: {
    position: 'absolute',
    top: 10,
    left: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 10,
  },
  destructionText: {
    color: '#EF4444',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
  },
  attackerBox: {
    alignItems: 'center',
    zIndex: 4,
    marginTop: 20,
  },
  shinobiImg: {
    width: 76,
    height: 76,
  },
  unitTag: {
    color: '#00E699',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 85,
  },
  slashOverlay: {
    position: 'absolute',
    right: 45,
    top: 75,
    zIndex: 8,
  },
  slashBeam: {
    width: 90,
    height: 5,
    backgroundColor: '#00E699',
    borderRadius: 3,
    transform: [{ rotate: '-35deg' }],
    shadowColor: '#00E699',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  defenderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 120,
    height: 140,
  },
  tenshuImg: {
    width: 96,
    height: 96,
    marginTop: -12,
  },
  gateImg: {
    width: 68,
    height: 68,
    marginTop: -30,
  },
  popupBanner: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  popupText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerBox: {
    gap: 12,
  },
  friendlyRuleHint: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  launchBtnText: {
    color: '#070A11',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fightingBanner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fightingText: {
    color: '#F59E0B',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '800',
    letterSpacing: 1,
  },
  resultCard: {
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  resultHeadline: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  coinSmall: {
    width: 18,
    height: 18,
  },
  rewardChipText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  replayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  replayBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  doneBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E699',
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#070A11',
    fontSize: 12,
    fontWeight: '800',
  },
});
