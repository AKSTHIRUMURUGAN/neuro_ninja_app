export type VillainType = 'daily' | 'weekly';
export type VillainStatus = 'active' | 'defeated' | 'escaped';
export type ActionSource = 'habit' | 'task' | 'pomodoro' | 'brain_game' | 'breach_penalty';

export interface DailyVillain {
  id: string;
  name: string;
  title: string;
  description: string;
  avatarSymbol: string;
  themeColor: string;
  element: 'focus' | 'discipline' | 'mind' | 'vitality';
  maxHp: number;
  currentHp: number;
  attackPower: number;
  status: VillainStatus;
  dayDate: string;
  coinsBounty: number;
  xpBounty: number;
  lootItemId?: string;
  createdAt: string;
}

export interface WeeklyVillain {
  id: string;
  name: string;
  title: string;
  description: string;
  avatarSymbol: string;
  themeColor: string;
  element: 'focus' | 'discipline' | 'mind' | 'vitality';
  maxHp: number;
  currentHp: number;
  phase: number; // 1, 2, or 3
  weekId: string;
  status: VillainStatus;
  coinsBounty: number;
  xpBounty: number;
  trophyTitle: string;
  createdAt: string;
}

export interface CombatLog {
  id: string;
  villainId: string;
  villainType: VillainType;
  actionSource: ActionSource;
  damageDealt: number;
  counterDamage: number;
  logText: string;
  createdAt: string;
}

export interface DamageResult {
  damageDealt: number;
  dailyDefeated: boolean;
  weeklyDefeated: boolean;
  dailyRemainingHp: number;
  weeklyRemainingHp: number;
  coinsEarned: number;
  xpEarned: number;
  lootItem?: string;
}
