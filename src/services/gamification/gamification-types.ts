export type ChestTier = 'bamboo' | 'jade' | 'shadow' | 'mythic';
export type ChestStatus = 'unopened' | 'opened';

export interface WeaponItem {
  weaponId: string;
  name: string;
  tier: number;
  multiplier: number;
  icon: string;
  description: string;
  passiveEffectType: string;
  costCoins: number;
  costStone: number;
  minPlayerLevel: number;
  isUnlocked: boolean;
  isEquipped: boolean;
}

export interface PlayerRpgState {
  playerLevel: number;
  currentXp: number;
  xpToNextLevel: number;
  currentHp: number;
  maxHp: number;
  equippedWeaponId: string;
  equippedWeapon: WeaponItem;
  equippedTitle: string;
  ninjaBelt: string;
  castleStone: number;
  tenshuLevel: number;
  sentryGateDurability: number;
  sentryGateMax: number;
  soulShards: number;
  dailyDefeatedCount: number;
  weeklyDefeatedCount: number;
}

export interface PlayerChest {
  chestId: string;
  tier: ChestTier;
  status: ChestStatus;
  sourceAction: string;
  awardedAt: string;
  openedAt?: string;
  lootSummary?: {
    coins: number;
    xp: number;
    castleStone: number;
    soulShards?: number;
    weaponId?: string;
    itemTitle?: string;
  };
}

export interface CastleBuilding {
  buildingId: string;
  name: string;
  icon: string;
  level: number;
  maxLevel: number;
  currentDurability: number;
  maxDurability: number;
  perkDescription: string;
  upgradeStoneCost: number;
  upgradeCoinCost: number;
}

export interface NinjaFriend {
  friendId: string;
  ninjaTag: string;
  displayName: string;
  avatarUrl?: string;
  beltRank: string;
  equippedWeaponName: string;
  streakDays: number;
  totalFocusMinutes: number;
  castleLevel: number;
  isClanMember: boolean;
  lastActiveAt: string;
}

export interface ClanRaidContribution {
  id: string;
  weekId: string;
  friendId: string;
  displayName: string;
  damageDealt: number;
  actionSummary: string;
  contributedAt: string;
}

export interface CombatEventResult {
  damageDealt: number;
  weaponMultiplier: number;
  dailyDefeated: boolean;
  weeklyDefeated: boolean;
  dailyRemainingHp: number;
  weeklyRemainingHp: number;
  coinsEarned: number;
  xpEarned: number;
  castleStoneEarned: number;
  chestAwarded?: PlayerChest;
  leveledUp?: boolean;
  newLevel?: number;
}

export interface BreachPenaltyResult {
  counterDamage: number;
  playerRemainingHp: number;
  sentryGateRemaining: number;
  isShieldBroken: boolean;
  logText: string;
}
