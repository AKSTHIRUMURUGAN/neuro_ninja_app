import { getDatabase } from '../database/database';
import { walletService } from '../wallet/wallet-service';
import type {
  DailyVillain,
  WeeklyVillain,
  CombatLog,
  ActionSource,
  DamageResult,
} from './villain-types';

const DAILY_BOSS_ROSTER = [
  {
    name: 'Dopamine Demon',
    title: 'Archon of Endless Feeds',
    description: 'Feeds on fragmented focus and infinite mindless scrolling.',
    avatarSymbol: 'fire',
    themeColor: '#EF4444',
    element: 'focus' as const,
    maxHp: 500,
    coinsBounty: 150,
    xpBounty: 350,
  },
  {
    name: 'Shorts Spectre',
    title: 'Phantom of Micro-Clips',
    description: 'Entraps attention spans into 15-second addictive loops.',
    avatarSymbol: 'flash',
    themeColor: '#F59E0B',
    element: 'mind' as const,
    maxHp: 450,
    coinsBounty: 140,
    xpBounty: 320,
  },
  {
    name: 'Procrastination Golem',
    title: 'Titan of Tomorrow',
    description: 'A heavy stony monster that whispers "do it later".',
    avatarSymbol: 'shield-alert',
    themeColor: '#6366F1',
    element: 'discipline' as const,
    maxHp: 600,
    coinsBounty: 180,
    xpBounty: 400,
  },
  {
    name: 'Algorithm Siren',
    title: 'Enchantress of Recommendations',
    description: 'Calculates seductive notifications to break your flow state.',
    avatarSymbol: 'creation',
    themeColor: '#EC4899',
    element: 'focus' as const,
    maxHp: 550,
    coinsBounty: 160,
    xpBounty: 380,
  },
  {
    name: 'Sloth Serpent',
    title: 'Coil of Low Energy',
    description: 'Drains initiative, making workouts and deep reading feel impossible.',
    avatarSymbol: 'snake',
    themeColor: '#10B981',
    element: 'vitality' as const,
    maxHp: 500,
    coinsBounty: 150,
    xpBounty: 350,
  },
];

class VillainEngine {
  /**
   * Get active Daily Villain, auto-rotating if date changed
   */
  async getActiveDailyVillain(): Promise<DailyVillain | null> {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    let row = await db.getFirstAsync<{
      id: string;
      name: string;
      title: string;
      description: string;
      avatar_symbol: string;
      theme_color: string;
      element: string;
      max_hp: number;
      current_hp: number;
      attack_power: number;
      status: string;
      day_date: string;
      coins_bounty: number;
      xp_bounty: number;
      loot_item_id: string | null;
      created_at: string;
    }>('SELECT * FROM daily_villains WHERE day_date = ? ORDER BY created_at DESC LIMIT 1', [today]);

    if (!row) {
      // Rotate boss for today
      const template = DAILY_BOSS_ROSTER[Math.floor(Math.random() * DAILY_BOSS_ROSTER.length)];
      const id = 'villain_daily_' + today;
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT INTO daily_villains (
          id, name, title, description, avatar_symbol, theme_color, element,
          max_hp, current_hp, attack_power, status, day_date, coins_bounty, xp_bounty, loot_item_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 35, 'active', ?, ?, ?, 'shield_freeze', ?)`,
        [
          id,
          template.name,
          template.title,
          template.description,
          template.avatarSymbol,
          template.themeColor,
          template.element,
          template.maxHp,
          template.maxHp,
          today,
          template.coinsBounty,
          template.xpBounty,
          now,
        ]
      );

      return {
        id,
        name: template.name,
        title: template.title,
        description: template.description,
        avatarSymbol: template.avatarSymbol,
        themeColor: template.themeColor,
        element: template.element,
        maxHp: template.maxHp,
        currentHp: template.maxHp,
        attackPower: 35,
        status: 'active',
        dayDate: today,
        coinsBounty: template.coinsBounty,
        xpBounty: template.xpBounty,
        lootItemId: 'shield_freeze',
        createdAt: now,
      };
    }

    return {
      id: row.id,
      name: row.name,
      title: row.title,
      description: row.description,
      avatarSymbol: row.avatar_symbol,
      themeColor: row.theme_color,
      element: row.element as any,
      maxHp: row.max_hp,
      currentHp: row.current_hp,
      attackPower: row.attack_power,
      status: row.status as any,
      dayDate: row.day_date,
      coinsBounty: row.coins_bounty,
      xpBounty: row.xp_bounty,
      lootItemId: row.loot_item_id ?? undefined,
      createdAt: row.created_at,
    };
  }

  /**
   * Get active Weekly Raid Titan
   */
  async getActiveWeeklyVillain(): Promise<WeeklyVillain | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: string;
      name: string;
      title: string;
      description: string;
      avatar_symbol: string;
      theme_color: string;
      element: string;
      max_hp: number;
      current_hp: number;
      phase: number;
      week_id: string;
      status: string;
      coins_bounty: number;
      xp_bounty: number;
      trophy_title: string;
      created_at: string;
    }>('SELECT * FROM weekly_villains ORDER BY created_at DESC LIMIT 1');

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      title: row.title,
      description: row.description,
      avatarSymbol: row.avatar_symbol,
      themeColor: row.theme_color,
      element: row.element as any,
      maxHp: row.max_hp,
      currentHp: row.current_hp,
      phase: row.phase,
      weekId: row.week_id,
      status: row.status as any,
      coinsBounty: row.coins_bounty,
      xpBounty: row.xp_bounty,
      trophyTitle: row.trophy_title,
      createdAt: row.created_at,
    };
  }

  /**
   * Deal real damage to active villains from productivity actions
   */
  async dealDamage(source: ActionSource, amount: number, actionName: string): Promise<DamageResult> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const [daily, weekly] = await Promise.all([
      this.getActiveDailyVillain(),
      this.getActiveWeeklyVillain(),
    ]);

    let dailyDefeated = false;
    let weeklyDefeated = false;
    let coinsEarned = 0;
    let xpEarned = 0;
    let dailyRemaining = daily?.currentHp ?? 0;
    let weeklyRemaining = weekly?.currentHp ?? 0;

    // 1. Damage Daily Boss
    if (daily && daily.status === 'active') {
      const nextHp = Math.max(0, daily.currentHp - amount);
      dailyRemaining = nextHp;
      const isDefeated = nextHp === 0;

      await db.runAsync(
        'UPDATE daily_villains SET current_hp = ?, status = ? WHERE id = ?',
        [nextHp, isDefeated ? 'defeated' : 'active', daily.id]
      );

      if (isDefeated) {
        dailyDefeated = true;
        coinsEarned += daily.coinsBounty;
        xpEarned += daily.xpBounty;
        await walletService.creditCoins(
          daily.coinsBounty,
          daily.xpBounty,
          'goal',
          `Defeated Daily Boss: ${daily.name}`,
          daily.id
        );
      }

      await db.runAsync(
        `INSERT INTO villain_combat_logs (
          id, villain_id, villain_type, action_source, damage_dealt, counter_damage, log_text, created_at
        ) VALUES (?, ?, 'daily', ?, ?, 0, ?, ?)`,
        [
          'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          daily.id,
          source,
          amount,
          `Dealt ${amount} HP to ${daily.name} via ${actionName}`,
          now,
        ]
      );
    }

    // 2. Damage Weekly Boss
    if (weekly && weekly.status === 'active') {
      const nextWeeklyHp = Math.max(0, weekly.currentHp - amount);
      weeklyRemaining = nextWeeklyHp;
      const isWeeklyDefeated = nextWeeklyHp === 0;

      // Adjust phase based on HP %
      const hpPercent = (nextWeeklyHp / weekly.maxHp) * 100;
      const nextPhase = hpPercent > 60 ? 1 : hpPercent > 25 ? 2 : 3;

      await db.runAsync(
        'UPDATE weekly_villains SET current_hp = ?, phase = ?, status = ? WHERE id = ?',
        [nextWeeklyHp, nextPhase, isWeeklyDefeated ? 'defeated' : 'active', weekly.id]
      );

      if (isWeeklyDefeated) {
        weeklyDefeated = true;
        coinsEarned += weekly.coinsBounty;
        xpEarned += weekly.xpBounty;
        await walletService.creditCoins(
          weekly.coinsBounty,
          weekly.xpBounty,
          'goal',
          `Vanquished Raid Titan: ${weekly.name}`,
          weekly.id
        );
      }
    }

    return {
      damageDealt: amount,
      dailyDefeated,
      weeklyDefeated,
      dailyRemainingHp: dailyRemaining,
      weeklyRemainingHp: weeklyRemaining,
      coinsEarned,
      xpEarned,
      lootItem: dailyDefeated ? daily?.lootItemId : undefined,
    };
  }

  /**
   * Record villain counter-attack when user opens a blocked app
   */
  async takeCounterDamage(amount: number, appName: string): Promise<{ damage: number; logText: string }> {
    const db = await getDatabase();
    const daily = await this.getActiveDailyVillain();
    const now = new Date().toISOString();
    const logText = `${daily?.name || 'Villain'} counter-attacked for ${amount} damage due to opening ${appName}!`;

    if (daily) {
      await db.runAsync(
        `INSERT INTO villain_combat_logs (
          id, villain_id, villain_type, action_source, damage_dealt, counter_damage, log_text, created_at
        ) VALUES (?, ?, 'daily', 'breach_penalty', 0, ?, ?, ?)`,
        [
          'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          daily.id,
          amount,
          logText,
          now,
        ]
      );
    }

    return { damage: amount, logText };
  }

  /**
   * Get combat event history
   */
  async getCombatLogs(limit = 20): Promise<CombatLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      villain_id: string;
      villain_type: string;
      action_source: string;
      damage_dealt: number;
      counter_damage: number;
      log_text: string;
      created_at: string;
    }>('SELECT * FROM villain_combat_logs ORDER BY created_at DESC LIMIT ?', [limit]);

    return rows.map(r => ({
      id: r.id,
      villainId: r.villain_id,
      villainType: r.villain_type as any,
      actionSource: r.action_source as any,
      damageDealt: r.damage_dealt,
      counterDamage: r.counter_damage,
      logText: r.log_text,
      createdAt: r.created_at,
    }));
  }
}

export const villainEngine = new VillainEngine();
