export type TransactionType =
  | 'earn'
  | 'spend'
  | 'stake'
  | 'release'
  | 'forfeit'
  | 'referral'
  | 'bonus';

export type TransactionCategory =
  | 'habit'
  | 'task'
  | 'goal'
  | 'game'
  | 'store'
  | 'referral'
  | 'login'
  | 'escrow';

export interface WalletBalance {
  coins: number;
  karmaXp: number;
  escrowCoins: number;
  streakShields: number;
  ninjaRank: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number; // positive for gain, negative for spend/stake
  balanceAfter: number;
  category: TransactionCategory;
  description: string;
  referenceId?: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending';
}

export interface DailyBonusStatus {
  canClaim: boolean;
  consecutiveDays: number;
  nextRewardCoins: number;
  nextRewardXp: number;
  hasShieldBonus: boolean;
  hoursUntilNextClaim: number;
}

export interface RealMoneyDare {
  id: string;
  title: string;
  dareType: 'DOOMSCROLL_LIMIT' | 'FOCUS_SESSION' | 'DAILY_DETOX';
  stakeRupees: number;
  targetLimit: number;
  currentCount: number;
  status: 'ACTIVE' | 'COMPLETED_SUCCESS' | 'BREACHED_FORFEIT' | 'CANCELLED';
  escrowId: string;
  deadline: string;
  startedAt: string;
  settledAt?: string;
  breachReason?: string;
}
