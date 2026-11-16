export type GoalType = 'short-term' | 'long-term';

export type GoalCategory =
  | 'career'
  | 'health'
  | 'relationships'
  | 'financial'
  | 'personal'
  | 'education';

export type GoalPriority = 'low' | 'medium' | 'high';

export type GoalStatus = 'not-started' | 'in-progress' | 'completed' | 'paused';

export interface GoalItem {
  id: string;
  title: string;
  description?: string;
  type: GoalType;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  targetDate?: string; // YYYY-MM-DD
  progress: number; // 0 - 100
  coinReward: number;
  xpReward: number;
  linkedTasks: string[]; // task IDs
  linkedHabits: string[]; // habit IDs
  createdAt: string;
  completedAt?: string;
  syncStatus: 'synced' | 'pending';
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  type?: GoalType;
  category?: GoalCategory;
  priority?: GoalPriority;
  targetDate?: string;
  linkedTasks?: string[];
  linkedHabits?: string[];
  coinReward?: number;
  xpReward?: number;
}
