export interface ReferralMilestone {
  friendsCount: number;
  coinsReward: number;
  xpReward: number;
  rewardTitle: string;
  badgeId?: string;
  isUnlocked: boolean;
  isClaimed: boolean;
}

export interface ReferralBuddy {
  id: string;
  name: string;
  email?: string;
  status: 'invited' | 'registered' | 'qualified';
  invitedAt: string;
  qualifiedAt?: string;
  coinsEarned: number;
}

export interface ReferralProfile {
  referralCode: string;
  shareUrl: string;
  totalInvited: number;
  totalQualified: number;
  totalCoinsEarned: number;
  milestones: ReferralMilestone[];
  buddies: ReferralBuddy[];
}
