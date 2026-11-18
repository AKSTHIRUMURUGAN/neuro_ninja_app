export type HabitCategory = 'mind' | 'body' | 'focus' | 'study' | 'sleep';

export type HabitStatus = 'not_attempted' | 'not_completed' | 'completed' | 'recovered';

export type VerifierType = 'self' | 'friend' | 'parent' | 'mentor';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type RecurrenceType =
  | 'daily'
  | 'specific_days'
  | 'weekdays'
  | 'weekends'
  | 'interval'
  | 'times_per_period';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export type TargetType = 'boolean' | 'count' | 'duration';

export interface HabitScheduleConfig {
  recurrenceType: RecurrenceType;
  specificDays: number[]; // 0=Sun..6=Sat
  intervalDays?: number; // e.g. 2 for every 2 days
  timesPerWeek?: number; // e.g. 3 times per week
  timeOfDay: TimeOfDay;
  targetType: TargetType;
  targetValue: number; // e.g. 1 for boolean, 8 for glasses, 30 for minutes
  targetUnit?: string; // e.g. 'glasses', 'pages', 'mins'
  habitStackTrigger?: string; // e.g. "After I pour morning coffee"
}

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
  schedule?: HabitScheduleConfig;
  targetType?: TargetType;
  targetValue?: number;
  targetUnit?: string;
  currentProgress?: number;
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
  progressValue?: number;
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
