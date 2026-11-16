export type GuardianRole = 'parent' | 'child' | 'mentor';

export interface GuardianLink {
  id: string;
  name: string;
  email: string;
  role: GuardianRole;
  status: 'pending' | 'active' | 'revoked';
  remoteLockEnabled: boolean;
  dailyAllowanceMinutes: number;
  screenTimeUsedMinutes: number;
  createdAt: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'guardian';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: 'active' | 'trial' | 'expired';
  expiresAt?: string;
  autoRenew: boolean;
  billingCycle: 'monthly' | 'yearly';
  amountInr: number;
  features: string[];
}
