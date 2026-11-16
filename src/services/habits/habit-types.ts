export type HabitCategory = 'mind' | 'body' | 'focus' | 'study' | 'sleep';

export type HabitStatus = 'not_attempted' | 'not_completed' | 'completed' | 'recovered';

export type VerifierType = 'self' | 'friend' | 'parent' | 'mentor';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface HabitItemV3 {
  id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  category: HabitCategory;
  icon: string;
  color: string;
  restDays: number[]; // 0=Sun..6=Sat
  recoveryWindowDays: number;
  challengeTargetDays: number;
  rewardPoints: number;
  coinReward: number;
  xpReward: number;
  streak: number;
  longestStreak: number;
  verifierType: VerifierType;
  verifierId?: string | null;
  verifierEmail?: string | null;
  linkedAlarmId?: string | null;
  linkedFocusMinutes?: number | null;
  completedDays: string[];
  notCompletedDays: string[];
  recoveredDays: string[];
  createdAt: string;
  syncStatus: 'synced' | 'pending';
}

export interface HabitCompletionRecord {
  checkinId: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: HabitStatus;
  notes?: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  createdAt: string;
  syncStatus: 'synced' | 'pending';
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalNotCompleted: number;
  completionRate: number; // 0 - 100
  failureRate: number;
  weeklyAdherence: number;
}

export interface VerifierRecord {
  id: string;
  userId?: string;
  verifierEmail: string;
  verifierName: string;
  relationship: 'friend' | 'parent' | 'mentor' | 'coach';
  status: 'pending' | 'invited' | 'accepted' | 'declined';
  createdAt: string;
  syncStatus: 'synced' | 'pending';
}

export interface VerificationRequestRecord {
  id: string;
  taskId?: string | null;
  habitId?: string | null;
  date?: string | null;
  userId: string;
  verifierId: string;
  verifierEmail?: string | null;
  type: 'habit' | 'task';
  status: VerificationStatus;
  notes?: string | null;
  proofUrl?: string | null;
  verifierNotes?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  syncStatus: 'synced' | 'pending';
}
