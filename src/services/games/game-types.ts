export type GameCategory = 'logic' | 'speed' | 'math' | 'memory' | 'chess';

export type GameDifficulty = 'easy' | 'medium' | 'hard';

export interface GameMetadata {
  slug: string;
  name: string;
  description: string;
  category: GameCategory;
  icon: string;
  gradientColors: [string, string];
  timeLimitSeconds: number;
  difficulties: GameDifficulty[];
  badge?: string;
}

export interface GameScoreRecord {
  id: string;
  gameSlug: string;
  score: number;
  stars: number; // 1, 2, or 3
  difficulty: GameDifficulty;
  durationSeconds: number;
  coinsEarned: number;
  xpEarned: number;
  playedAt: string;
}

export interface GameStatsSummary {
  gameSlug: string;
  gamesPlayed: number;
  highScore: number;
  bestStars: number;
  totalCoinsWon: number;
}
