import AsyncStorage from '@react-native-async-storage/async-storage';

const DOJO_STATS_KEY = '@neuro_ninja:dojo_stats_v1';

export interface DojoStats {
  totalXp: number;
  streakDays: number;
  lastPlayedDate: string | null;
  cognitiveElo: number;
  highScores: {
    matiks: number;
    chessTactics: number;
    crossMath: number;
    schulte: number;
    patternMatrix: number;
    stroop: number;
  };
}

const DEFAULT_STATS: DojoStats = {
  totalXp: 1250,
  streakDays: 3,
  lastPlayedDate: null,
  cognitiveElo: 1150,
  highScores: {
    matiks: 1800,
    chessTactics: 5,
    crossMath: 600,
    schulte: 18.4,
    patternMatrix: 5,
    stroop: 1200,
  },
};

export async function loadDojoStats(): Promise<DojoStats> {
  try {
    const raw = await AsyncStorage.getItem(DOJO_STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATS;
  }
}

export async function recordDojoResult(
  gameKey: keyof DojoStats['highScores'],
  score: number,
  xpEarned: number
): Promise<DojoStats> {
  try {
    const current = await loadDojoStats();
    const today = new Date().toISOString().split('T')[0];

    // Update streak
    let newStreak = current.streakDays;
    if (current.lastPlayedDate !== today) {
      newStreak = current.streakDays + 1;
    }

    const currentHigh = current.highScores[gameKey] || 0;
    const isSchulte = gameKey === 'schulte';
    // For Schulte, lower seconds is better!
    const newHigh = isSchulte
      ? currentHigh === 0
        ? score
        : Math.min(currentHigh, score)
      : Math.max(currentHigh, score);

    // ELO adjustment (+15 on good game)
    const newElo = current.cognitiveElo + Math.max(5, Math.min(30, Math.floor(xpEarned / 20)));

    const updated: DojoStats = {
      ...current,
      totalXp: current.totalXp + xpEarned,
      streakDays: newStreak,
      lastPlayedDate: today,
      cognitiveElo: newElo,
      highScores: {
        ...current.highScores,
        [gameKey]: newHigh,
      },
    };

    await AsyncStorage.setItem(DOJO_STATS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_STATS;
  }
}
