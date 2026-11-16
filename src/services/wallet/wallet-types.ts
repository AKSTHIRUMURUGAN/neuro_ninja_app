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
