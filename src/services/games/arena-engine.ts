import { getDatabase } from '../database/database';
import { enqueueSyncItem } from '../sync/sync-engine';
import { walletService } from '../wallet/wallet-service';
import { villainEngine } from '../villains/villain-engine';
import type {
  GameMetadata,
  GameScoreRecord,
  GameStatsSummary,
  GameDifficulty,
} from './game-types';

export const GAME_REGISTRY: GameMetadata[] = [
  // Viral Logic
  {
    slug: 'queens',
    name: 'Queens 👑',
    description: 'Place 1 Queen per row, column & colored territory without diagonal conflicts',
    category: 'logic',
    icon: 'crown',
    gradientColors: ['#F59E0B', '#D97706'],
    timeLimitSeconds: 120,
    difficulties: ['easy', 'medium', 'hard'],
    badge: 'VIRAL #1',
  },
  {
    slug: 'tango',
    name: 'Tango ☀️🌙',
    description: 'Fill grid with Sun and Moon without 3-in-a-row and following equal/cross clues',
    category: 'logic',
    icon: 'sun',
    gradientColors: ['#6366F1', '#4F46E5'],
    timeLimitSeconds: 120,
    difficulties: ['easy', 'medium', 'hard'],
    badge: 'DAILY HIT',
  },
  {
    slug: 'mini-sudoku',
    name: 'Mini Sudoku 🔢',
    description: '6x6 Speed Sudoku with rapid number placement',
    category: 'logic',
    icon: 'grid',
    gradientColors: ['#10B981', '#059669'],
    timeLimitSeconds: 150,
    difficulties: ['easy', 'medium', 'hard'],
  },
  // Speed & Reflex
  {
    slug: 'mindsnap',
    name: 'MindSnap Stroop ⚡',
    description: 'Match ink color vs font meaning in rapid reflex rounds',
    category: 'speed',
    icon: 'zap',
    gradientColors: ['#EC4899', '#DB2777'],
    timeLimitSeconds: 45,
    difficulties: ['easy', 'medium', 'hard'],
    badge: 'FASTEST',
  },
  {
    slug: 'reaction-test',
    name: 'Reaction Test ⏱️',
    description: 'Test visual response latency down to the exact millisecond',
    category: 'speed',
    icon: 'clock',
    gradientColors: ['#06B6D4', '#0891B2'],
    timeLimitSeconds: 30,
    difficulties: ['medium'],
  },
  // Mental Math
  {
    slug: 'math-blitz',
    name: 'Math Blitz ➕',
    description: 'Rapid-fire mental arithmetic sprints with escalating difficulty',
    category: 'math',
    icon: 'calculator',
    gradientColors: ['#8B5CF6', '#7C3AED'],
    timeLimitSeconds: 60,
    difficulties: ['easy', 'medium', 'hard'],
    badge: 'BOOST IQ',
  },
  {
    slug: 'cross-math',
    name: 'CrossMath ✖️',
    description: 'Fill crossword equations with numbers 1-9 to balance row & column results',
    category: 'math',
    icon: 'hash',
    gradientColors: ['#3B82F6', '#2563EB'],
    timeLimitSeconds: 90,
    difficulties: ['easy', 'medium', 'hard'],
  },
  // Memory
  {
    slug: 'pinpoint',
    name: 'Pinpoint 📍',
    description: 'Guess the hidden common category connecting progressive mystery clues',
    category: 'memory',
    icon: 'help-circle',
    gradientColors: ['#F97316', '#EA580C'],
    timeLimitSeconds: 90,
    difficulties: ['easy', 'medium', 'hard'],
    badge: 'DEDUCTION',
  },
  {
    slug: 'memory-match',
    name: 'Memory Match 🎴',
    description: 'Flip and recall pairs in the shortest moves and fewest mistakes',
    category: 'memory',
    icon: 'layers',
    gradientColors: ['#14B8A6', '#0D9488'],
    timeLimitSeconds: 60,
    difficulties: ['easy', 'medium', 'hard'],
  },
  // Chess
  {
    slug: 'chess-tactics',
    name: 'Chess Tactics ♟️',
    description: 'Solve checkmate-in-1, forks, and tactical combos on dynamic boards',
    category: 'chess',
    icon: 'shield',
    gradientColors: ['#64748B', '#475569'],
    timeLimitSeconds: 120,
    difficulties: ['easy', 'medium', 'hard'],
    badge: 'STRATEGY',
  },
];

export class ArenaEngine {
  /**
   * Get all registered games
   */
  getRegistry(): GameMetadata[] {
    return GAME_REGISTRY;
  }

  /**
   * Get game by slug
   */
  getGameBySlug(slug: string): GameMetadata | undefined {
    return GAME_REGISTRY.find(g => g.slug === slug);
  }

  /**
   * Record game match score and award coins & XP
   */
  async recordScore(
    gameSlug: string,
    score: number,
    stars: number,
    difficulty: GameDifficulty,
    durationSeconds: number
  ): Promise<{ scoreRecord: GameScoreRecord; coinsEarned: number; xpEarned: number }> {
    const db = await getDatabase();
    const scoreId = 'score_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();

    // Reward math based on difficulty & stars
    const diffMultiplier = difficulty === 'hard' ? 2.0 : difficulty === 'medium' ? 1.5 : 1.0;
    const baseCoins = Math.round((stars * 10) * diffMultiplier);
    const baseXp = Math.round((stars * 25) * diffMultiplier);

    const record: GameScoreRecord = {
      id: scoreId,
      gameSlug,
      score,
      stars,
      difficulty,
      durationSeconds,
      coinsEarned: baseCoins,
      xpEarned: baseXp,
      playedAt: now,
    };

    await db.runAsync(
      `INSERT INTO brain_game_scores (score_id, game_slug, score, stars, difficulty, duration_seconds, coins_earned, xp_earned, played_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [scoreId, gameSlug, score, stars, difficulty, durationSeconds, baseCoins, baseXp, now]
    );

    // Credit coins & XP to wallet
    const game = this.getGameBySlug(gameSlug);
    const gameName = game ? game.name : 'Brain Arena';
    await walletService.creditCoins(
      baseCoins,
      baseXp,
      'game',
      `Played ${gameName} (${stars}⭐, ${score} pts) 🎮`,
      scoreId
    );

    if (stars > 0) {
      // Strike active Daily & Weekly Villains!
      void villainEngine.dealDamage('brain_game', 60, gameName).catch(() => {});
    }

    try {
      await enqueueSyncItem('brain_game_scores', scoreId, 'insert', record);
    } catch (e) {
      console.warn('[ArenaEngine] enqueueSync error:', e);
    }

    return {
      scoreRecord: record,
      coinsEarned: baseCoins,
      xpEarned: baseXp,
    };
  }

  /**
   * Get user high scores and stats summary
   */
  async getGameStats(gameSlug: string): Promise<GameStatsSummary> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      games_played: number;
      high_score: number | null;
      best_stars: number | null;
      total_coins: number | null;
    }>(
      `SELECT
         COUNT(*) as games_played,
         MAX(score) as high_score,
         MAX(stars) as best_stars,
         SUM(coins_earned) as total_coins
       FROM brain_game_scores
       WHERE game_slug = ?`,
      [gameSlug]
    );

    return {
      gameSlug,
      gamesPlayed: row?.games_played ?? 0,
      highScore: row?.high_score ?? 0,
      bestStars: row?.best_stars ?? 0,
      totalCoinsWon: row?.total_coins ?? 0,
    };
  }

  /**
   * Get user recent match history
   */
  async getRecentScores(limit = 20): Promise<GameScoreRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      score_id: string;
      game_slug: string;
      score: number;
      stars: number;
      difficulty: GameDifficulty;
      duration_seconds: number;
      coins_earned: number;
      xp_earned: number;
      played_at: string;
    }>('SELECT * FROM brain_game_scores ORDER BY played_at DESC LIMIT ?', [limit]);

    return rows.map(r => ({
      id: r.score_id,
      gameSlug: r.game_slug,
      score: r.score,
      stars: r.stars,
      difficulty: r.difficulty,
      durationSeconds: r.duration_seconds,
      coinsEarned: r.coins_earned,
      xpEarned: r.xp_earned,
      playedAt: r.played_at,
    }));
  }
}

export const arenaEngine = new ArenaEngine();
