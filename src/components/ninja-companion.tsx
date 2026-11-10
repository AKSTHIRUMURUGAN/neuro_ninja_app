import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NinjaPalette } from '../constants/theme';

interface CompanionProps {
  interceptsCount: number;
  totalFocusCoins?: number;
}

const NINJA_QUOTES = [
  'Dopamine whispers sweet lies. True power lies in quiet focus.',
  'Every sealed app is a victory of your will over impulse.',
  'Autopilot scrolling weakens the spirit. Breathe and return to craft.',
  'The black belt is a white belt who never surrendered to mindless feeds.',
  'Your mind is a sacred garden. Guard its gates with honor.',
];

export function NinjaCompanion({ interceptsCount, totalFocusCoins = 120 }: CompanionProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const getCompanionRank = (count: number) => {
    if (count >= 150) return { title: 'Black Belt Sensei', color: '#10B981', icon: 'shield-crown', level: 'Lv. 10' };
    if (count >= 75) return { title: 'Brown Belt Master', color: '#F59E0B', icon: 'shield-sword', level: 'Lv. 7' };
    if (count >= 30) return { title: 'Blue Belt Guardian', color: '#06B6D4', icon: 'shield-sun', level: 'Lv. 4' };
    if (count >= 10) return { title: 'Yellow Belt Adept', color: '#FBBF24', icon: 'shield-half-full', level: 'Lv. 2' };
    return { title: 'White Belt Apprentice', color: '#E2E8F0', icon: 'shield-outline', level: 'Lv. 1' };
  };

  const rank = getCompanionRank(interceptsCount);

  const handleTapCompanion = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuoteIndex((prev) => (prev + 1) % NINJA_QUOTES.length);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.card}
      onPress={handleTapCompanion}
    >
      <View style={styles.topRow}>
        {/* Companion Avatar Orb */}
        <View style={[styles.avatarOrb, { borderColor: rank.color }]}>
          <MaterialCommunityIcons name={rank.icon as any} size={28} color={rank.color} />
          <View style={[styles.levelBadge, { backgroundColor: rank.color }]}>
            <Text style={styles.levelText}>{rank.level}</Text>
          </View>
        </View>

        {/* Info & Speech Bubble */}
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>Kage (Shadow Companion)</Text>
            <Text style={[styles.rankTag, { color: rank.color }]}>{rank.title}</Text>
          </View>

          {/* Speech Bubble */}
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
              &ldquo;{NINJA_QUOTES[quoteIndex]}&rdquo;
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.statPill}>
          <MaterialCommunityIcons name="lightning-bolt" size={13} color={NinjaPalette.emerald} />
          <Text style={styles.statPillText}>{interceptsCount} Impulses Conquered</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialCommunityIcons name="circle-multiple" size={13} color="#F59E0B" />
          <Text style={styles.statPillText}>{totalFocusCoins} Coins</Text>
        </View>
        <Text style={styles.tapPrompt}>Tap Kage for wisdom</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1829',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  avatarOrb: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  levelText: {
    color: '#070A11',
    fontSize: 9,
    fontWeight: '900',
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: 'bold',
    color: NinjaPalette.textPrimary,
  },
  rankTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  speechBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  speechText: {
    fontSize: 11,
    color: NinjaPalette.textSecondary,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tapPrompt: {
    fontSize: 9,
    color: '#64748B',
  },
});

