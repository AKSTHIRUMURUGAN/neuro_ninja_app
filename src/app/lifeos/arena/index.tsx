import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { arenaEngine, GAME_REGISTRY } from '../../../services/games/arena-engine';
import type { GameCategory } from '../../../services/games/game-types';

const CATEGORIES: { label: string; value: GameCategory | 'all' }[] = [
  { label: 'All Games', value: 'all' },
  { label: 'Viral Logic 👑', value: 'logic' },
  { label: 'Speed & Reflex ⚡', value: 'speed' },
  { label: 'Mental Math ➕', value: 'math' },
  { label: 'Memory 🎴', value: 'memory' },
  { label: 'Chess Tactics ♟️', value: 'chess' },
];

export default function ArenaIndexScreen() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState<GameCategory | 'all'>('all');
  const [statsMap, setStatsMap] = useState<Record<string, { highScore: number; bestStars: number }>>({});

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const map: Record<string, { highScore: number; bestStars: number }> = {};
        for (const g of GAME_REGISTRY) {
          const stats = await arenaEngine.getGameStats(g.slug);
          map[g.slug] = { highScore: stats.highScore, bestStars: stats.bestStars };
        }
        if (isMounted) setStatsMap(map);
      } catch (e) {
        console.warn('[ArenaIndex] stats error:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredGames =
    selectedCat === 'all'
      ? GAME_REGISTRY
      : GAME_REGISTRY.filter(g => g.category === selectedCat);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Neuro Arena</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>DOJO TRAINING</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Arena Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSub}>COGNITIVE EXCELLENCE</Text>
          <Text style={styles.heroHeadline}>Daily Brain Sprints</Text>
          <Text style={styles.heroDesc}>
            Sharpen attention, reflex processing speed, and deduction. Every completed round rewards Focus Coins & XP.
          </Text>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map(cat => {
            const active = selectedCat === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedCat(cat.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Games Grid */}
        <View style={styles.gamesGrid}>
          {filteredGames.map(game => {
            const stats = statsMap[game.slug] || { highScore: 0, bestStars: 0 };

            return (
              <View key={game.slug} style={styles.gameCard}>
                <View style={styles.gameTopRow}>
                  {game.badge ? (
                    <View style={styles.badgePill}>
                      <Text style={styles.badgeText}>{game.badge}</Text>
                    </View>
                  ) : (
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryText}>{game.category.toUpperCase()}</Text>
                    </View>
                  )}

                  <View style={styles.starsRow}>
                    {[1, 2, 3].map(s => (
                      <Ionicons
                        key={s}
                        name={s <= stats.bestStars ? 'star' : 'star-outline'}
                        size={14}
                        color={s <= stats.bestStars ? '#F59E0B' : '#334155'}
                      />
                    ))}
                  </View>
                </View>

                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDesc} numberOfLines={2}>
                  {game.description}
                </Text>

                <View style={styles.gameFooter}>
                  <View style={styles.metaRow}>
                    <Ionicons name="timer-outline" size={14} color="#64748B" />
                    <Text style={styles.metaText}>{game.timeLimitSeconds}s</Text>
                    {stats.highScore > 0 && (
                      <Text style={styles.highScoreText}>• Best: {stats.highScore}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => router.push(`/lifeos/arena/${game.slug}` as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={14} color="#070A11" style={{ marginRight: 4 }} />
                    <Text style={styles.playBtnText}>Play</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070A11',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  headerBadge: {
    backgroundColor: 'rgba(0, 230, 153, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
  },
  headerBadgeText: {
    color: '#00E699',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  heroCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 20,
  },
  heroSub: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroHeadline: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  filterRow: {
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F1829',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 230, 153, 0.15)',
    borderColor: '#00E699',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#00E699',
    fontWeight: '700',
  },
  gamesGrid: {
    gap: 14,
  },
  gameCard: {
    backgroundColor: '#0F1829',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  gameTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  gameName: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  gameDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#64748B',
    fontSize: 12,
  },
  highScoreText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E699',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  playBtnText: {
    color: '#070A11',
    fontSize: 13,
    fontWeight: '800',
  },
});
