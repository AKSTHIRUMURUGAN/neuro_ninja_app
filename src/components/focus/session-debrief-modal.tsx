import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  intent: string;
  durationMinutes: number;
  distractionsCount: number;
  stakedCoins: number;
  onDismiss: () => void;
  onComplete: (params: { focusDepth: number; intentCompleted: boolean }) => void;
}

export function SessionDebriefModal({
  visible,
  intent,
  durationMinutes,
  distractionsCount,
  stakedCoins,
  onDismiss,
  onComplete,
}: Props) {
  const [focusDepth, setFocusDepth] = useState(4); // default 4 stars
  const [intentCompleted, setIntentCompleted] = useState(true);

  const handleSelectStar = async (star: number) => {
    await Haptics.selectionAsync();
    setFocusDepth(star);
  };

  const handleFinish = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete({ focusDepth, intentCompleted });
  };

  const getFocusDepthLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return 'Foggy / Scatterbrain';
      case 2:
        return 'Frequent Urges';
      case 3:
        return 'Steady Effort';
      case 4:
        return 'Locked-In Flow ⚡';
      case 5:
        return 'Transcendent Deep Work 👑';
      default:
        return 'Locked-In Flow';
    }
  };

  const estimatedCoins = Math.max(10, Math.round(durationMinutes * 0.4)) + (stakedCoins > 0 ? stakedCoins * 2 : 0) + (focusDepth >= 4 ? 5 : 0);
  const estimatedXp = Math.max(50, durationMinutes * 2) + (stakedCoins > 0 ? stakedCoins * 3 : 0);
  const bossDamage = Math.max(80, Math.round((durationMinutes / 25) * 80));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.crownCircle}>
              <MaterialCommunityIcons name="crown" size={26} color="#00E699" />
            </View>
            <Text style={styles.title}>SPRINT CONQUERED!</Text>
            <Text style={styles.intentSubtitle}>“{intent}”</Text>
          </View>

          {/* 1. Victory Check */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DID YOU SHIP YOUR INTENDED VICTORY?</Text>
            <View style={styles.binaryRow}>
              <TouchableOpacity
                style={[styles.binaryBtn, intentCompleted && styles.binaryBtnActive]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIntentCompleted(true);
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={intentCompleted ? '#00E699' : '#64748B'}
                />
                <Text style={[styles.binaryText, intentCompleted && styles.binaryTextActive]}>
                  Yes, Milestone Achieved
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.binaryBtn, !intentCompleted && styles.binaryBtnPartial]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIntentCompleted(false);
                }}
              >
                <Ionicons
                  name="ellipsis-horizontal-circle"
                  size={20}
                  color={!intentCompleted ? '#F59E0B' : '#64748B'}
                />
                <Text style={[styles.binaryText, !intentCompleted && styles.binaryTextPartial]}>
                  Partial / Blocked
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Focus Depth (1-5 Stars) */}
          <View style={styles.section}>
            <View style={styles.starLabelRow}>
              <Text style={styles.sectionLabel}>FOCUS DEPTH QUALITY</Text>
              <Text style={styles.depthLabelText}>{getFocusDepthLabel(focusDepth)}</Text>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => void handleSelectStar(star)}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={star <= focusDepth ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= focusDepth ? '#F59E0B' : '#334155'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3. Repercussions & Rewards Breakdown */}
          <View style={styles.rewardsBox}>
            <View style={styles.rewardItem}>
              <MaterialCommunityIcons name="tree" size={20} color="#00E699" />
              <Text style={styles.rewardText}>Bonsai Bloomed in Grove</Text>
            </View>

            <View style={styles.rewardItem}>
              <MaterialCommunityIcons name="sword-cross" size={20} color="#EF4444" />
              <Text style={styles.rewardText}>-{bossDamage} HP Boss Strike</Text>
            </View>

            <View style={styles.rewardItem}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#3B82F6" />
              <Text style={styles.rewardText}>+{estimatedXp} Focus XP</Text>
            </View>

            <View style={styles.rewardItem}>
              <MaterialCommunityIcons name="cash-multiple" size={20} color="#F59E0B" />
              <Text style={styles.rewardText}>+{estimatedCoins} Focus Coins</Text>
            </View>
          </View>

          {distractionsCount > 0 && (
            <Text style={styles.distractionsNote}>
              ⚡ {distractionsCount} impulse{distractionsCount > 1 ? 's' : ''} logged and resisted.
            </Text>
          )}

          {/* Claim Action */}
          <TouchableOpacity style={styles.claimBtn} onPress={() => void handleFinish()}>
            <Text style={styles.claimBtnText}>Claim Victory & Rest</Text>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F1829',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#00E69944',
    padding: 24,
    gap: 18,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  crownCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00E69918',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00E699',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  intentSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  starLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depthLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E699',
  },
  binaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  binaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#070A11',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  binaryBtnActive: {
    backgroundColor: '#00E69915',
    borderColor: '#00E699',
  },
  binaryBtnPartial: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B',
  },
  binaryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  binaryTextActive: {
    color: '#00E699',
  },
  binaryTextPartial: {
    color: '#F59E0B',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#070A11',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  starBtn: {
    padding: 4,
  },
  rewardsBox: {
    backgroundColor: '#070A11',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rewardItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  distractionsNote: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    textAlign: 'center',
  },
  claimBtn: {
    backgroundColor: '#00E699',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#070A11',
  },
});
