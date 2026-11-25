export type ArenaType = 'collection' | 'streak' | 'elimination' | 'custom';
export type ArenaStatus = 'active' | 'invited' | 'pending' | 'completed';
export type ArenaVisibility = 'public' | 'password' | 'private';

export interface ArenaTask {
  id: string;
  title: string;
  points: number;
  required?: boolean;
  completed?: boolean;
}

export interface ArenaHabit {
  id: string;
  title: string;
  points: number;
  frequency: 'daily' | 'weekly' | 'custom';
  targetDays?: number;
  completedDays?: number;
}

export interface ArenaParticipant {
  userId: string;
  name: string;
  email?: string;
  score: number;
  status: 'invited' | 'accepted' | 'completed' | 'forfeited';
  rank?: number;
  level?: number;
}

export interface BattleArena {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  type: ArenaType;
  targetValue: number;
  duration: number; // in days
  stakeAmount: number; // in INR / coins
  status: ArenaStatus;
  visibility?: ArenaVisibility;
  minParticipants?: number;
  maxParticipants?: number;
  participants: ArenaParticipant[];
  creator?: {
    id: string;
    name: string;
    level: number;
    xp: number;
  };
  createdAt: string;
  isCreator: boolean;
  tasks?: ArenaTask[];
  habits?: ArenaHabit[];
  userProgress?: {
    completedTasks: number;
    totalTasks: number;
    completedHabits: number;
    totalHabits: number;
    currentScore: number;
  };
}
