export type PresetType = 'upper_circuit' | 'pomodoro' | 'extended' | 'sprint' | 'breaker_pr' | 'stopwatch';

export interface DistractionImpulse {
  timestamp: string;
  tag: 'social_media' | 'email_chat' | 'random_thought' | 'hunger_snack' | 'other';
  note?: string;
}

export interface DeepWorkSession {
  id: string;
  intent: string;
  presetType: PresetType;
  plannedSeconds: number;
  actualSeconds: number;
  status: 'completed' | 'abandoned' | 'active';
  focusDepth?: number; // 1-5 stars
  intentCompleted?: boolean;
  distractionsCount: number;
  distractions: DistractionImpulse[];
  stakedCoins: number;
  coinsRewarded: number;
  xpRewarded: number;
  treeSpecies: string;
  createdAt: string;
}

export interface ZeroResistanceState {
  cleanDesk: boolean;
  phoneDnd: boolean;
  singleVictory: boolean;
  hydrated: boolean;
}

export interface UpperCircuitProfile {
  id: string;
  ceilingMinutes: number;
  sweetSpotMinutes: number;
  weeklyPrMinutes: number;
  totalFlowHours: number;
  mindfulnessScore: number;
  zeroResistanceState: ZeroResistanceState;
  updatedAt: string;
}

export interface SweetSpotCalculation {
  ceiling: number;
  min70: number;
  max80: number;
  recommended: number;
  breakMinutes: number;
  longBreakMinutes: number;
}
