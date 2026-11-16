export type ChallengeCategory = 'detox' | 'streak' | 'focus' | 'arena' | 'zen';
export type ChallengeTargetMetric =
  | 'screen_time_max'
  | 'habits_completed'
  | 'pomodoro_mins'
  | 'arena_wins'
  | 'zero_breaches';

export type UserChallengeStatus = 'in_progress' | 'completed' | 'failed';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  category: ChallengeCategory;
  durationDays: number;
  targetMetric: ChallengeTargetMetric;
  targetValue: number;
  coinReward: number;
  xpReward: number;
  isActive: boolean;
  createdAt: string;
}

export interface UserChallenge {
  id: string;
  challengeId: string;
  userId: string;
  status: UserChallengeStatus;
  currentProgress: number; // 0 to 100 percentage or count
  startDate: string;
  completedAt?: string;
  rewardClaimed: boolean;
  challenge?: Challenge;
}
