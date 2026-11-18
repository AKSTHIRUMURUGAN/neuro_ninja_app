import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNinjaBack } from '../../hooks/use-ninja-back';

import { MatiksSprint } from '../../components/dojo/matiks-sprint';
import { CrossMath } from '../../components/dojo/cross-math';
import { ChessTactics } from '../../components/dojo/chess-tactics';
import { ChessEngineMatch } from '../../components/dojo/chess-engine-match';
import { SchulteGrid } from '../../components/dojo/schulte-grid';
import { StroopClash } from '../../components/dojo/stroop-clash';
import { PatternMatrix } from '../../components/dojo/pattern-matrix';
import { GameResultsModal } from '../../components/dojo/game-results-modal';
import {
  loadDojoStats,
  recordDojoResult,
  DojoStats,
} from '../../services/dojo/dojo-stats';

type GameId =
  | 'matiks_sprint'
  | 'cross_math'
  | 'chess_tactics'
  | 'chess_ai'
  | 'schulte'
  | 'stroop'
  | 'pattern_matrix';

type CategoryFilter = 'all' | 'math' | 'chess' | 'focus' | 'memory';

interface GameMetadata {
  id: GameId;
  title: string;
  tagline: string;
  category: 'math' | 'chess' | 'focus' | 'memory';
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  badge: string;
  color: string;
  highScoreKey: keyof DojoStats['highScores'];
  statLabel: string;
}

const ARCADE_GAMES: GameMetadata[] = [
  {
    id: 'matiks_sprint',
    title: 'Matiks Speed Sprint',
    tagline: '45s arithmetic blitz vs Shadow Ninja bot with combo multipliers',
    category: 'math',
    icon: 'calculator-variant',
    badge: 'FLAGSHIP',
    color: '#00E699',
    highScoreKey: 'matiks',
    statLabel: 'Best Score',
  },
  {
    id: 'chess_tactics',
    title: 'Chess Tactics Rush',
    tagline: 'Solve tactical Mate-in-1 and Mate-in-2 puzzles against the clock',
    category: 'chess',
    icon: 'chess-knight',
    badge: 'POPULAR',
    color: '#38BDF8',
    highScoreKey: 'chessTactics',
    statLabel: 'Solved',
  },
  {
    id: 'cross_math',
    title: 'CrossMath Grid',
    tagline: 'Solve intersecting horizontal and vertical formula matrices',
    category: 'math',
    icon: 'grid',
    badge: 'LOGIC',
    color: '#F59E0B',
    highScoreKey: 'crossMath',
    statLabel: 'Best Streak',
  },
  {
    id: 'chess_ai',
    title: 'Ninja Chess vs AI',
    tagline: '8x8 duel vs Novice, Shadow, or Sensei on-device Minimax bot',
    category: 'chess',
    icon: 'chess-king',
    badge: 'STRATEGY',
    color: '#A855F7',
    highScoreKey: 'chessTactics',
    statLabel: 'AI Matches',
  },
  {
    id: 'schulte',
    title: 'Schulte Focus Matrix',
    tagline: 'Soviet cosmonaut peripheral vision & rapid visual search test',
    category: 'focus',
    icon: 'target',
    badge: 'REFLEX',
    color: '#EC4899',
    highScoreKey: 'schulte',
    statLabel: 'Best Time',
  },
  {
    id: 'stroop',
    title: 'Stroop Reflex 2.0',
    tagline: 'Prefrontal inhibition test with inverted conditions & combo boosts',
    category: 'focus',
    icon: 'lightning-bolt',
    badge: 'SPEED',
    color: '#06B6D4',
    highScoreKey: 'stroop',
    statLabel: 'Best XP',
  },
  {
    id: 'pattern_matrix',
    title: 'Spatial Pattern Recall',
    tagline: 'Progressive working memory sequence matrix (Simon-style levels)',
    category: 'memory',
    icon: 'brain',
    badge: 'MEMORY',
    color: '#10B981',
    highScoreKey: 'patternMatrix',
    statLabel: 'Max Level',
  },
];

export default function DojoGamesScreen() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [stats, setStats] = useState<DojoStats | null>(null);

  const handleCloseGame = useCallback(() => {
    setActiveGame(null);
  }, []);

  const { handleSmartBack } = useNinjaBack({
    onBackOverride: () => {
      if (activeGame) {
        handleCloseGame();
        return true;
      }
      return false;
    },
    fallbackRoute: '/focus/ghost-launcher',
  });

  // Result modal state
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalXp, setModalXp] = useState(0);
  const [modalStats, setModalStats] = useState<{ label: string; value: string | number }[]>([]);

  useEffect(() => {
    void loadDojoStats().then(setStats);
  }, []);

  const handleOpenGame = (gameId: GameId) => {
    setActiveGame(gameId);
  };

  const onMatiksCompleted = async (result: {
    score: number;
    solved: number;
    accuracy: number;
    maxStreak: number;
  }) => {
    const xp = result.score + result.solved * 25;
    const updated = await recordDojoResult('matiks', result.score, xp);
    setStats(updated);

    setModalTitle('Matiks Speed Sprint');
    setModalXp(xp);
    setModalStats([
      { label: 'Score', value: result.score },
      { label: 'Solved', value: result.solved },
      { label: 'Accuracy', value: `${result.accuracy}%` },
      { label: 'Max Streak', value: `${result.maxStreak}x` },
    ]);
    setResultModalVisible(true);
  };

  const onChessTacticsCompleted = async (score: number) => {
    const updated = await recordDojoResult('chessTactics', score, score * 2);
    setStats(updated);

    setModalTitle('Chess Tactics Rush');
    setModalXp(score * 2);
    setModalStats([
      { label: 'Tactical Score', value: score },
      { label: 'Accuracy', value: '100%' },
      { label: 'Tactical Rating', value: 'Master Class' },
      { label: 'Cognitive ELO', value: `+${Math.floor(score / 15)} ELO` },
    ]);
    setResultModalVisible(true);
  };

  const onCrossMathCompleted = async (score: number) => {
    const updated = await recordDojoResult('crossMath', score, score);
    setStats(updated);

    setModalTitle('CrossMath Grid Balanced');
    setModalXp(score);
    setModalStats([
      { label: 'Score', value: score },
      { label: 'Equations', value: '4/4 Balanced' },
      { label: 'Logic Rating', value: 'Exceptional' },
    ]);
    setResultModalVisible(true);
  };

  const onSchulteCompleted = async (result: {
    timeSeconds: number;
    errors: number;
    score: number;
  }) => {
    const updated = await recordDojoResult('schulte', result.timeSeconds, result.score);
    setStats(updated);

    setModalTitle('Schulte Focus Matrix');
    setModalXp(result.score);
    setModalStats([
      { label: 'Speed', value: `${result.timeSeconds}s` },
      { label: 'Errors', value: result.errors },
      { label: 'Peripheral Scope', value: result.timeSeconds < 25 ? 'Cosmonaut' : 'Sharp' },
    ]);
    setResultModalVisible(true);
  };

  const onStroopCompleted = async (result: {
    score: number;
    avgReactionMs: number;
    accuracy: number;
  }) => {
    const updated = await recordDojoResult('stroop', result.score, result.score);
    setStats(updated);

    setModalTitle('Stroop Reflex 2.0');
    setModalXp(result.score);
    setModalStats([
      { label: 'XP', value: result.score },
      { label: 'Reaction', value: `${result.avgReactionMs}ms` },
      { label: 'Inhibition', value: `${result.accuracy}%` },
    ]);
    setResultModalVisible(true);
  };

  const onPatternMatrixCompleted = async (score: number) => {
    const updated = await recordDojoResult('patternMatrix', score, score);
    setStats(updated);

    setModalTitle('Spatial Working Memory');
    setModalXp(score);
    setModalStats([
      { label: 'Memory Score', value: score },
      { label: 'Working Span', value: 'Level 5' },
      { label: 'Hippocampus', value: 'Stimulated' },
    ]);
    setResultModalVisible(true);
  };

  const filteredGames = ARCADE_GAMES.filter((g) => {
    if (filter === 'all') return true;
    return g.category === filter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleSmartBack}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.badge}>NEURO DOJO ARCADE</Text>
          <Text style={styles.title}>
            {activeGame ? ARCADE_GAMES.find((g) => g.id === activeGame)?.title : 'Cognitive Training'}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* If a game is currently active: Render the active game! */}
      {activeGame ? (
        <ScrollView contentContainerStyle={styles.activeGameScroll}>
          {activeGame === 'matiks_sprint' && (
            <MatiksSprint durationSeconds={45} onCompleted={onMatiksCompleted} />
          )}
          {activeGame === 'chess_tactics' && (
            <ChessTactics difficulty="easy" targetSolved={3} onCompleted={onChessTacticsCompleted} />
          )}
          {activeGame === 'chess_ai' && <ChessEngineMatch />}
          {activeGame === 'cross_math' && <CrossMath onCompleted={onCrossMathCompleted} />}
          {activeGame === 'schulte' && <SchulteGrid gridSize={4} onCompleted={onSchulteCompleted} />}
          {activeGame === 'stroop' && <StroopClash totalRounds={8} onCompleted={onStroopCompleted} />}
          {activeGame === 'pattern_matrix' && (
            <PatternMatrix initialLength={3} maxLevel={5} onCompleted={onPatternMatrixCompleted} />
          )}
        </ScrollView>
      ) : (
        /* Arcade Catalog Screen */
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Hero Stats Card */}
          {stats && (
            <View style={styles.heroStatsCard}>
              <View style={styles.heroStatItem}>
                <View style={styles.heroStatHeader}>
                  <MaterialCommunityIcons name="lightning-bolt" size={16} color="#00E699" />
                  <Text style={styles.heroStatLabel}>FOCUS XP</Text>
                </View>
                <Text style={styles.heroStatVal}>{stats.totalXp.toLocaleString()}</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <View style={styles.heroStatHeader}>
                  <Ionicons name="flame" size={16} color="#F59E0B" />
                  <Text style={styles.heroStatLabel}>STREAK</Text>
                </View>
                <Text style={styles.heroStatVal}>{stats.streakDays} Days</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStatItem}>
                <View style={styles.heroStatHeader}>
                  <MaterialCommunityIcons name="trophy-award" size={16} color="#38BDF8" />
                  <Text style={styles.heroStatLabel}>COGNITIVE ELO</Text>
                </View>
                <Text style={styles.heroStatVal}>{stats.cognitiveElo}</Text>
              </View>
            </View>
          )}

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[
              { id: 'all', label: 'All Games', icon: 'gamepad-variant' },
              { id: 'math', label: '⚡ Matiks Math', icon: 'calculator' },
              { id: 'chess', label: '♟️ Chess Dojo', icon: 'chess-knight' },
              { id: 'focus', label: '🎯 Reflex', icon: 'target' },
              { id: 'memory', label: '🧠 Memory', icon: 'brain' },
            ].map((f) => {
              const isSelected = filter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => setFilter(f.id as CategoryFilter)}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Game Cards List */}
          <View style={styles.gamesList}>
            {filteredGames.map((game) => {
              const record = stats?.highScores[game.highScoreKey];
              return (
                <TouchableOpacity
                  key={game.id}
                  activeOpacity={0.8}
                  style={[styles.gameCard, { borderColor: `${game.color}33` }]}
                  onPress={() => handleOpenGame(game.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: `${game.color}15` }]}>
                      <MaterialCommunityIcons name={game.icon} size={28} color={game.color} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.cardTitle}>{game.title}</Text>
                        <View style={[styles.badgePill, { backgroundColor: `${game.color}20` }]}>
                          <Text style={[styles.badgePillText, { color: game.color }]}>
                            {game.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardTagline}>{game.tagline}</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>{game.statLabel}:</Text>
                      <Text style={styles.scoreVal}>
                        {record !== undefined ? record : '--'}
                      </Text>
                    </View>

                    <View style={[styles.playBtn, { backgroundColor: game.color }]}>
                      <Ionicons name="play" size={14} color="#070A11" />
                      <Text style={styles.playBtnText}>PLAY</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Universal Results Modal */}
      <GameResultsModal
        visible={resultModalVisible}
        gameTitle={modalTitle}
        score={modalXp}
        xpEarned={modalXp}
        stats={modalStats}
        onPlayAgain={() => {
          setResultModalVisible(false);
        }}
        onExit={() => {
          setResultModalVisible(false);
          setActiveGame(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A11',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 6,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E699',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  activeGameScroll: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  heroStatLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroStatVal: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1E293B',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterPillActive: {
    backgroundColor: '#00E699',
    borderColor: '#00E699',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#070A11',
    fontWeight: '900',
  },
  gamesList: {
    gap: 14,
  },
  gameCard: {
    backgroundColor: '#0E1726',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTagline: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
  },
  playBtnText: {
    color: '#070A11',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
