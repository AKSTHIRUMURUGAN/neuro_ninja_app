import { getDatabase } from '../database/database';
import { walletService } from '../wallet/wallet-service';
import type {
  DailyVillain,
  WeeklyVillain,
  CombatLog,
  ActionSource,
  DamageResult,
  PlayerRpgProfile,
} from './villain-types';

const DAILY_BOSS_ROSTER = [
  {
    name: 'Chronos the Time-Eater',
    title: 'Archon of Infinite Reels',
    description: 'Feeds on fragmented attention, short clips, and mindless doomscrolling.',
    avatarSymbol: 'timer-sand-full',
    themeColor: '#EF4444',
    element: 'focus' as const,
    maxHp: 500,
    coinsBounty: 180,
    xpBounty: 400,
  },
  {
    name: 'Slothmor the Bed-Lurker',
    title: 'Spectre of Low Energy',
    description: 'Entraps willpower under heavy blankets and whispers "do it tomorrow".',
    avatarSymbol: 'bed',
    themeColor: '#8B5CF6',
    element: 'vitality' as const,
    maxHp: 450,
    coinsBounty: 150,
    xpBounty: 350,
  },
  {
    name: 'Vortex the Distraction Hydra',
    title: 'Multi-Tabbed Chimera',
    description: 'Sprouts two new impulse heads every time you open a quick social notification.',
    avatarSymbol: 'creation',
    themeColor: '#EC4899',
    element: 'discipline' as const,
    maxHp: 600,
    coinsBounty: 200,
    xpBounty: 450,
  },
  {
    name: 'Siren of the Algorithmic Feed',
    title: 'Enchantress of Dopamine Traps',
    description: 'Calculates seductive notifications and micro-rewards to break your flow state.',
    avatarSymbol: 'fire',
    themeColor: '#F59E0B',
    element: 'mind' as const,
    maxHp: 520,
    coinsBounty: 170,
    xpBounty: 380,
  },
  {
    name: 'Gorgon of Procrastination',
    title: 'Titan of the Unstarted Task',
    description: 'Turns urgent, meaningful projects into stone through fear and delay.',
    avatarSymbol: 'shield-alert',
    themeColor: '#3B82F6',
    element: 'discipline' as const,
    maxHp: 580,
    coinsBounty: 190,
    xpBounty: 420,
  },
];

class VillainEngine {
  /**
   * Retrieves player RPG loadout, shield durability, and equippable weapon
   */
  async getPlayerRpgProfile(): Promise<PlayerRpgProfile> {
    const db = await getDatabase();

    // 1. Shield HP
    const shieldRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'player_shield_hp'"
    );
    const shieldHp = shieldRow ? parseInt(shieldRow.value_json, 10) : 100;

    // 2. Soul shards
    const shardRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'player_soul_shards'"
    );
    const soulShards = shardRow ? parseInt(shardRow.value_json, 10) : 0;

    // 3. Vanquished counts
    const dailyCountRow = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM daily_villains WHERE status = 'defeated'"
    );
    const weeklyCountRow = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM weekly_villains WHERE status = 'defeated'"
    );

    // 4. Equipped weapon based on focus streak / achievements
    const streakRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'active_streak_days'"
    );
    const streakDays = streakRow ? parseInt(streakRow.value_json, 10) : 1;

    let weapon = {
      name: 'Bonsai Shinai',
      multiplier: 1.0,
      icon: 'sword',
    };

    if (streakDays >= 14) {
      weapon = {
        name: 'Muramasa of Pure Focus',
        multiplier: 2.0,
        icon: 'sword-cross',
      };
    } else if (streakDays >= 7) {
      weapon = {
        name: 'Titanium Flowblade',
        multiplier: 1.5,
        icon: 'lightning-bolt',
      };
    } else if (streakDays >= 3) {
      weapon = {
        name: 'Shadow Katana',
        multiplier: 1.25,
        icon: 'sword',
      };
    }

    return {
      shieldHp,
      maxShieldHp: 100,
      isShieldBroken: shieldHp <= 0,
      equippedWeapon: weapon,
      soulShards,
      vanquishedDailyCount: dailyCountRow?.count || 0,
      vanquishedWeeklyCount: weeklyCountRow?.count || 0,
    };
  }

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
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
          35,
          today,
          template.coinsBounty,
          template.xpBounty,
          'item_soul_shard',
          now,
        ]
      );

      row = await db.getFirstAsync('SELECT * FROM daily_villains WHERE id = ?', [id]);
    }

    if (!row) return null;

    // Boss Enrage check: If local time >= 20:00 (8 PM) and boss is active
    const currentHour = new Date().getHours();
    const isEnraged = currentHour >= 20 && row.status === 'active';

    return {
      id: row.id,
      name: row.name,
      title: row.title,
      description: row.description,
      avatarSymbol: row.avatar_symbol,
      themeColor: isEnraged ? '#EF4444' : row.theme_color,
      element: row.element as any,
      maxHp: row.max_hp,
      currentHp: row.current_hp,
      attackPower: isEnraged ? row.attack_power * 2 : row.attack_power,
      status: row.status as any,
      dayDate: row.day_date,
      coinsBounty: isEnraged ? row.coins_bounty * 2 : row.coins_bounty,
      xpBounty: isEnraged ? row.xp_bounty * 2 : row.xp_bounty,
      lootItemId: row.loot_item_id ?? undefined,
      isEnraged,
      createdAt: row.created_at,
    };
  }

  /**
   * Get active Weekly Raid Titan
   */
  async getActiveWeeklyVillain(): Promise<WeeklyVillain | null> {
    const db = await getDatabase();
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
      phase: number;
      week_id: string;
      status: string;
      coins_bounty: number;
      xp_bounty: number;
      trophy_title: string;
      created_at: string;
    }>('SELECT * FROM weekly_villains ORDER BY created_at DESC LIMIT 1');

    if (!row) {
      const now = new Date();
      const weekId = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
      const id = 'raid_' + weekId;

      await db.runAsync(
        `INSERT INTO weekly_villains (
          id, name, title, description, avatar_symbol, theme_color, element,
          max_hp, current_hp, phase, week_id, status, coins_bounty, xp_bounty, trophy_title, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'active', ?, ?, ?, ?)`,
        [
          id,
          'Akuma the Flow Devourer',
          'Colossus of Procrastination',
          'Ancient multi-phase world boss feeding on abandoned resolutions.',
          'skull',
          '#DC2626',
          'discipline',
          2500,
          2500,
          weekId,
          1000,
          2500,
          'Slayer of Akuma Trophy',
          now.toISOString(),
        ]
      );
      row = await db.getFirstAsync('SELECT * FROM weekly_villains WHERE id = ?', [id]);
    }

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
   * Deal real focus damage to active villains scaled by equipped weapon multiplier
   */
  async dealDamage(source: ActionSource, baseAmount: number, actionName: string): Promise<DamageResult> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const [player, daily, weekly] = await Promise.all([
      this.getPlayerRpgProfile(),
      this.getActiveDailyVillain(),
      this.getActiveWeeklyVillain(),
    ]);

    const weaponMultiplier = player.equippedWeapon.multiplier;
    const finalDamage = Math.round(baseAmount * weaponMultiplier);

    let dailyDefeated = false;
    let weeklyDefeated = false;
    let coinsEarned = 0;
    let xpEarned = 0;
    let dailyRemaining = daily?.currentHp ?? 0;
    let weeklyRemaining = weekly?.currentHp ?? 0;

    // 1. Damage Daily Boss
    if (daily && daily.status === 'active') {
      const nextHp = Math.max(0, daily.currentHp - finalDamage);
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

        // Credit coins
        await walletService.creditCoins(
          daily.coinsBounty,
          daily.xpBounty,
          'goal',
          `Defeated Boss: ${daily.name} (${player.equippedWeapon.name}) 🗡️`,
          daily.id
        );

        // Award soul shard
        const nextShards = player.soulShards + 1;
        await db.runAsync(
          "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('player_soul_shards', ?, ?)",
          [nextShards.toString(), now]
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
          finalDamage,
          `${player.equippedWeapon.name} dealt -${finalDamage} HP to ${daily.name} via ${actionName}`,
          now,
        ]
      );
    }

    // 2. Also damage Weekly Raid Boss
    if (weekly && weekly.status === 'active') {
      const nextWeeklyHp = Math.max(0, weekly.currentHp - finalDamage);
      weeklyRemaining = nextWeeklyHp;
      const isWeeklyDefeated = nextWeeklyHp === 0;

      // Adjust phase based on HP %
      const hpPercent = (nextWeeklyHp / weekly.maxHp) * 100;
      const nextPhase = hpPercent > 66 ? 1 : hpPercent > 33 ? 2 : 3;

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
          `Vanquished World Raid Boss: ${weekly.name} 🏆`,
          weekly.id
        );
      }
    }

    // 3. Repair player shield on successful focus action
    await this.repairPlayerShield(10);

    return {
      damageDealt: finalDamage,
      weaponMultiplier,
      dailyDefeated,
      weeklyDefeated,
      dailyRemainingHp: dailyRemaining,
      weeklyRemainingHp: weeklyRemaining,
      coinsEarned,
      xpEarned,
      lootItem: dailyDefeated ? 'item_soul_shard' : undefined,
    };
  }

  /**
   * Inflict damage on player shield when giving up or breaching app
   */
  async takeCounterDamage(amount: number, appName: string): Promise<{ damage: number; logText: string }> {
    const db = await getDatabase();
    const player = await this.getPlayerRpgProfile();
    const daily = await this.getActiveDailyVillain();
    const now = new Date().toISOString();

    const nextShield = Math.max(0, player.shieldHp - amount);
    await db.runAsync(
      "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('player_shield_hp', ?, ?)",
      [nextShield.toString(), now]
    );

    const logText = `${daily?.name || 'Villain'} counter-attacked for ${amount} damage due to opening ${appName}! Shield: ${nextShield}/100`;

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
   * Repair player shield up to 100 HP
   */
  async repairPlayerShield(amount: number): Promise<number> {
    const db = await getDatabase();
    const player = await this.getPlayerRpgProfile();
    const nextShield = Math.min(100, player.shieldHp + amount);
    const now = new Date().toISOString();

    await db.runAsync(
      "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('player_shield_hp', ?, ?)",
      [nextShield.toString(), now]
    );

    return nextShield;
  }

  /**
   * Fetch combat history logs
   */
  async getCombatLogs(limit: number = 30): Promise<CombatLog[]> {
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

    return rows.map((r) => ({
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
