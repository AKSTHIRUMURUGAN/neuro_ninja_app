import { getDatabase, generateUuid } from '../database/database';
import { walletService } from '../wallet/wallet-service';
import { villainEngine } from '../villains/villain-engine';
import type { ActionSource } from '../villains/villain-types';
import type {
  PlayerRpgState,
  WeaponItem,
  PlayerChest,
  CastleBuilding,
  NinjaFriend,
  ClanRaidContribution,
  CombatEventResult,
  BreachPenaltyResult,
  ChestTier,
} from './gamification-types';

const BELT_THRESHOLDS = [
  { belt: 'White Belt', minLevel: 1 },
  { belt: 'Yellow Belt', minLevel: 2 },
  { belt: 'Orange Belt', minLevel: 4 },
  { belt: 'Green Belt', minLevel: 6 },
  { belt: 'Blue Belt', minLevel: 8 },
  { belt: 'Purple Belt', minLevel: 10 },
  { belt: 'Brown Belt', minLevel: 12 },
  { belt: 'Black Belt', minLevel: 15 },
  { belt: 'Shadow Grandmaster', minLevel: 20 },
];

class UnifiedGamificationEngine {
  /**
   * Fetch complete player RPG state, equipped weapon, belt, and stats
   */
  async getPlayerRpgState(): Promise<PlayerRpgState> {
    const db = await getDatabase();

    const row = await db.getFirstAsync<{
      player_level: number;
      current_xp: number;
      current_hp: number;
      max_hp: number;
      equipped_weapon_id: string;
      equipped_title: string;
      ninja_belt: string;
      castle_stone: number;
      tenshu_level: number;
      sentry_gate_durability: number;
      sentry_gate_max: number;
    }>('SELECT * FROM player_rpg_state WHERE id = ?', ['current_player']);

    const playerLevel = row?.player_level ?? 1;
    const currentXp = row?.current_xp ?? 0;
    const currentHp = row?.current_hp ?? 100;
    const maxHp = row?.max_hp ?? 100;
    const equippedWeaponId = row?.equipped_weapon_id ?? 'wpn_shinai';
    const equippedTitle = row?.equipped_title ?? 'Dojo Initiate';
    const castleStone = row?.castle_stone ?? 100;
    const tenshuLevel = row?.tenshu_level ?? 1;
    const sentryGateDurability = row?.sentry_gate_durability ?? 100;
    const sentryGateMax = row?.sentry_gate_max ?? 100;

    // Determine current belt by level
    let ninjaBelt = 'White Belt';
    for (const b of BELT_THRESHOLDS) {
      if (playerLevel >= b.minLevel) ninjaBelt = b.belt;
    }

    const xpToNextLevel = playerLevel * 500;

    // Fetch equipped weapon
    const weapons = await this.getWeapons();
    const equippedWeapon =
      weapons.find((w) => w.weaponId === equippedWeaponId) ||
      weapons[0] || {
        weaponId: 'wpn_shinai',
        name: 'Bamboo Shinai',
        tier: 1,
        multiplier: 1.2,
        icon: 'sword',
        description: 'Traditional bamboo dojo practice blade.',
        passiveEffectType: 'coin_boost',
        costCoins: 0,
        costStone: 0,
        minPlayerLevel: 1,
        isUnlocked: true,
        isEquipped: true,
      };

    // Shards & counts
    const shardRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'player_soul_shards'"
    );
    const soulShards = shardRow ? parseInt(shardRow.value_json, 10) : 0;

    const dailyRow = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM daily_villains WHERE status = 'defeated'"
    );
    const weeklyRow = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM weekly_villains WHERE status = 'defeated'"
    );

    return {
      playerLevel,
      currentXp,
      xpToNextLevel,
      currentHp,
      maxHp,
      equippedWeaponId,
      equippedWeapon,
      equippedTitle,
      ninjaBelt,
      castleStone,
      tenshuLevel,
      sentryGateDurability,
      sentryGateMax,
      soulShards,
      dailyDefeatedCount: dailyRow?.count ?? 0,
      weeklyDefeatedCount: weeklyRow?.count ?? 0,
    };
  }

  /**
   * Central Combat Dispatcher:
   * Called whenever a habit, task, pomodoro, alarm, or mindful gate is completed.
   */
  async dealActionDamage(
    source: ActionSource,
    baseAmount: number,
    actionName: string
  ): Promise<CombatEventResult> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const [player, daily, weekly] = await Promise.all([
      this.getPlayerRpgState(),
      villainEngine.getActiveDailyVillain(),
      villainEngine.getActiveWeeklyVillain(),
    ]);

    // Multiplier & Passive bonuses
    let weaponMultiplier = player.equippedWeapon.multiplier;
    if (player.equippedWeapon.passiveEffectType === 'discipline_crit' && daily?.element === 'discipline') {
      weaponMultiplier += 0.2;
    }

    const finalDamage = Math.round(baseAmount * weaponMultiplier);

    let dailyDefeated = false;
    let weeklyDefeated = false;
    let coinsEarned = Math.round(baseAmount * 0.35);
    let xpEarned = Math.round(baseAmount * 0.85);
    let castleStoneEarned = Math.max(5, Math.round(baseAmount * 0.25));

    // Weapon passive: coin boost
    if (player.equippedWeapon.passiveEffectType === 'coin_boost') {
      coinsEarned = Math.round(coinsEarned * 1.05);
    }

    let dailyRemaining = daily?.currentHp ?? 0;
    let weeklyRemaining = weekly?.currentHp ?? 0;
    let awardedChest: PlayerChest | undefined;

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
        castleStoneEarned += 80;

        // Muramasa life-steal passive
        if (player.equippedWeapon.passiveEffectType === 'life_steal') {
          await this.restoreHealth(25, 'Muramasa Life Steal');
        }

        // Award Jade Chest on Daily Boss defeat
        awardedChest = await this.awardChest('jade', `Slayed Boss: ${daily.name}`);
      }
    }

    // 2. Damage Weekly Clan Titan
    if (weekly && weekly.status === 'active') {
      const nextHp = Math.max(0, weekly.currentHp - finalDamage);
      weeklyRemaining = nextHp;
      const isDefeated = nextHp === 0;

      await db.runAsync(
        'UPDATE weekly_villains SET current_hp = ?, status = ? WHERE id = ?',
        [nextHp, isDefeated ? 'defeated' : 'active', weekly.id]
      );

      // Record Clan contribution
      await db.runAsync(
        `INSERT INTO clan_raid_contributions (id, week_id, friend_id, damage_dealt, action_summary, contributed_at)
         VALUES (?, ?, 'current_player', ?, ?, ?)`,
        [generateUuid('contrib'), weekly.weekId, finalDamage, actionName, now]
      );

      if (isDefeated) {
        weeklyDefeated = true;
        coinsEarned += weekly.coinsBounty;
        xpEarned += weekly.xpBounty;
        castleStoneEarned += 250;

        // Award Mythic Akuma Vault
        awardedChest = await this.awardChest('mythic', `Vanquished Colossus: ${weekly.name}`);
      }
    }

    // 3. Credit Currency into Wallet
    await walletService.creditCoins(
      coinsEarned,
      xpEarned,
      'goal',
      `Combat Victory: ${actionName} (${finalDamage} dmg, ${player.equippedWeapon.name}) 🗡️`,
      daily?.id || weekly?.id || 'combat_action'
    );

    // 4. Update XP, Level Up & Castle Stone in player_rpg_state
    const newXpTotal = player.currentXp + xpEarned;
    let newLevel = player.playerLevel;
    let leveledUp = false;
    let remainingXp = newXpTotal;
    let requiredXp = newLevel * 500;

    while (remainingXp >= requiredXp) {
      remainingXp -= requiredXp;
      newLevel += 1;
      leveledUp = true;
      requiredXp = newLevel * 500;
    }

    const nextStone = player.castleStone + castleStoneEarned;

    await db.runAsync(
      `UPDATE player_rpg_state
       SET current_xp = ?, player_level = ?, castle_stone = ?, updated_at = ?
       WHERE id = 'current_player'`,
      [remainingXp, newLevel, nextStone, now]
    );

    // 5. Log Combat History
    const logDesc = `${actionName} struck for ${finalDamage} damage! (${player.equippedWeapon.name})`;
    await db.runAsync(
      `INSERT INTO villain_combat_logs (
        id, villain_id, villain_type, action_source, damage_dealt, counter_damage, log_text, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        generateUuid('cbt'),
        daily?.id || weekly?.id || 'boss',
        daily?.status === 'active' ? 'daily' : 'weekly',
        source,
        finalDamage,
        logDesc,
        now,
      ]
    );

    return {
      damageDealt: finalDamage,
      weaponMultiplier,
      dailyDefeated,
      weeklyDefeated,
      dailyRemainingHp: dailyRemaining,
      weeklyRemainingHp: weeklyRemaining,
      coinsEarned,
      xpEarned,
      castleStoneEarned,
      chestAwarded: awardedChest,
      leveledUp,
      newLevel,
    };
  }

  /**
   * Distraction Breach & Lock Penalty Handler:
   * Called when the user attempts a blocked app or breaches doomscroll thresholds.
   */
  async applyDistractionBreach(packageName: string, violationReason: string): Promise<BreachPenaltyResult> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const player = await this.getPlayerRpgState();

    const baseCounter = 20;

    // Sentry Gates absorb half of breach damage
    const gateAbsorb = Math.min(player.sentryGateDurability, Math.round(baseCounter * 0.5));
    const nextGate = Math.max(0, player.sentryGateDurability - gateAbsorb);

    const remainingDamage = baseCounter - gateAbsorb;
    const nextPlayerHp = Math.max(0, player.currentHp - remainingDamage);
    const isShieldBroken = nextPlayerHp === 0;

    await db.runAsync(
      `UPDATE player_rpg_state
       SET current_hp = ?, sentry_gate_durability = ?, updated_at = ?
       WHERE id = 'current_player'`,
      [nextPlayerHp, nextGate, now]
    );

    // Also sync to legacy lifeos_state for backward compatibility
    await db.runAsync(
      "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('player_shield_hp', ?, ?)",
      [nextPlayerHp.toString(), now]
    );

    const logText = `Breached ${violationReason} (${packageName})! Sentry absorbed ${gateAbsorb} dmg, Player lost ${remainingDamage} HP. HP: ${nextPlayerHp}/${player.maxHp}`;

    await db.runAsync(
      `INSERT INTO villain_combat_logs (
        id, villain_id, villain_type, action_source, damage_dealt, counter_damage, log_text, created_at
      ) VALUES (?, 'active_threat', 'daily', 'breach_penalty', 0, ?, ?, ?)`,
      [generateUuid('cbt_breach'), baseCounter, logText, now]
    );

    return {
      counterDamage: baseCounter,
      playerRemainingHp: nextPlayerHp,
      sentryGateRemaining: nextGate,
      isShieldBroken,
      logText,
    };
  }

  /**
   * Armory & Weapons Management
   */
  async getWeapons(): Promise<WeaponItem[]> {
    const db = await getDatabase();
    const state = await db.getFirstAsync<{ equipped_weapon_id: string }>(
      "SELECT equipped_weapon_id FROM player_rpg_state WHERE id = 'current_player'"
    );
    const equippedId = state?.equipped_weapon_id ?? 'wpn_shinai';

    const rows = await db.getAllAsync<{
      weapon_id: string;
      name: string;
      tier: number;
      multiplier: number;
      icon: string;
      description: string;
      passive_effect_type: string;
      cost_coins: number;
      cost_stone: number;
      min_player_level: number;
      is_unlocked: number;
    }>('SELECT * FROM weapons_catalog ORDER BY tier ASC');

    return rows.map((r) => ({
      weaponId: r.weapon_id,
      name: r.name,
      tier: r.tier,
      multiplier: r.multiplier,
      icon: r.icon,
      description: r.description,
      passiveEffectType: r.passive_effect_type,
      costCoins: r.cost_coins,
      costStone: r.cost_stone,
      minPlayerLevel: r.min_player_level,
      isUnlocked: r.is_unlocked === 1,
      isEquipped: r.weapon_id === equippedId,
    }));
  }

  async unlockWeapon(weaponId: string): Promise<{ success: boolean; message: string }> {
    const db = await getDatabase();
    const [player, balance] = await Promise.all([
      this.getPlayerRpgState(),
      walletService.getBalance(),
    ]);

    const weapon = (await this.getWeapons()).find((w) => w.weaponId === weaponId);
    if (!weapon) return { success: false, message: 'Weapon not found' };
    if (weapon.isUnlocked) return { success: true, message: 'Already unlocked' };

    if (player.playerLevel < weapon.minPlayerLevel) {
      return { success: false, message: `Requires Player Level ${weapon.minPlayerLevel}` };
    }
    if (balance.coins < weapon.costCoins) {
      return { success: false, message: `Insufficient Focus Coins (Need ${weapon.costCoins})` };
    }
    if (player.castleStone < weapon.costStone) {
      return { success: false, message: `Insufficient Castle Stone (Need ${weapon.costStone})` };
    }

    // Debit coins & stone
    await walletService.spendCoins(weapon.costCoins, 'store', `Forged weapon: ${weapon.name}`, weaponId);
    await db.runAsync(
      `UPDATE player_rpg_state SET castle_stone = castle_stone - ?, updated_at = ? WHERE id = 'current_player'`,
      [weapon.costStone, new Date().toISOString()]
    );

    // Unlock in catalog
    await db.runAsync('UPDATE weapons_catalog SET is_unlocked = 1 WHERE weapon_id = ?', [weaponId]);

    // Auto-equip
    await this.equipWeapon(weaponId);

    return { success: true, message: `Successfully forged and equipped ${weapon.name}!` };
  }

  async equipWeapon(weaponId: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE player_rpg_state SET equipped_weapon_id = ?, updated_at = ? WHERE id = 'current_player'`,
      [weaponId, new Date().toISOString()]
    );
    return true;
  }

  /**
   * Mystery Chests Inventory & Opening
   */
  async getChests(): Promise<PlayerChest[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      chest_id: string;
      tier: string;
      status: string;
      source_action: string;
      awarded_at: string;
      opened_at: string | null;
      loot_summary_json: string | null;
    }>('SELECT * FROM player_chests ORDER BY status ASC, awarded_at DESC');

    return rows.map((r) => ({
      chestId: r.chest_id,
      tier: r.tier as ChestTier,
      status: r.status as any,
      sourceAction: r.source_action,
      awardedAt: r.awarded_at,
      openedAt: r.opened_at || undefined,
      lootSummary: r.loot_summary_json ? JSON.parse(r.loot_summary_json) : undefined,
    }));
  }

  async awardChest(tier: ChestTier, source: string): Promise<PlayerChest> {
    const db = await getDatabase();
    const chest: PlayerChest = {
      chestId: generateUuid('chest'),
      tier,
      status: 'unopened',
      sourceAction: source,
      awardedAt: new Date().toISOString(),
    };

    await db.runAsync(
      `INSERT INTO player_chests (chest_id, tier, status, source_action, awarded_at)
       VALUES (?, ?, 'unopened', ?, ?)`,
      [chest.chestId, chest.tier, chest.sourceAction, chest.awardedAt]
    );

    return chest;
  }

  async openChest(chestId: string): Promise<PlayerChest['lootSummary']> {
    const db = await getDatabase();
    const chestRow = await db.getFirstAsync<{
      chest_id: string;
      tier: string;
      status: string;
    }>('SELECT * FROM player_chests WHERE chest_id = ?', [chestId]);

    if (!chestRow || chestRow.status === 'opened') return undefined;

    let coins = 25;
    let xp = 75;
    let castleStone = 20;
    let soulShards = 0;
    let itemTitle = 'Bamboo Focus Talisman';

    switch (chestRow.tier) {
      case 'bamboo':
        coins = Math.floor(20 + Math.random() * 25);
        xp = Math.floor(50 + Math.random() * 50);
        castleStone = Math.floor(15 + Math.random() * 20);
        itemTitle = 'Novice Whetstone (+5 Chi)';
        break;
      case 'jade':
        coins = Math.floor(80 + Math.random() * 70);
        xp = Math.floor(200 + Math.random() * 150);
        castleStone = Math.floor(80 + Math.random() * 60);
        soulShards = 1;
        itemTitle = 'Jade Dragon Elixir (+50 HP)';
        await this.restoreHealth(50, 'Jade Dragon Elixir');
        break;
      case 'shadow':
        coins = Math.floor(300 + Math.random() * 200);
        xp = Math.floor(600 + Math.random() * 400);
        castleStone = Math.floor(250 + Math.random() * 150);
        soulShards = 3;
        itemTitle = 'Shadow Katana Blueprint & Streak Freeze';
        break;
      case 'mythic':
        coins = Math.floor(1200 + Math.random() * 800);
        xp = Math.floor(2500 + Math.random() * 1500);
        castleStone = Math.floor(800 + Math.random() * 500);
        soulShards = 10;
        itemTitle = 'Imperial Shogun Relic & Divine Chi';
        break;
    }

    const loot = { coins, xp, castleStone, soulShards, itemTitle };

    // Credit coins & XP to wallet
    await walletService.creditCoins(
      coins,
      xp,
      'game',
      `Opened ${chestRow.tier.toUpperCase()} Chest! 🎁`,
      chestId
    );

    // Credit castle stone
    await db.runAsync(
      `UPDATE player_rpg_state SET castle_stone = castle_stone + ?, updated_at = ? WHERE id = 'current_player'`,
      [castleStone, new Date().toISOString()]
    );

    // Save opened state
    await db.runAsync(
      `UPDATE player_chests SET status = 'opened', opened_at = ?, loot_summary_json = ? WHERE chest_id = ?`,
      [new Date().toISOString(), JSON.stringify(loot), chestId]
    );

    return loot;
  }

  /**
   * Castle Buildings & Domain
   */
  async getCastleBuildings(): Promise<CastleBuilding[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      building_id: string;
      name: string;
      icon: string;
      level: number;
      max_level: number;
      current_durability: number;
      max_durability: number;
      perk_description: string;
      upgrade_stone_cost: number;
      upgrade_coin_cost: number;
    }>('SELECT * FROM castle_buildings ORDER BY building_id ASC');

    return rows.map((r) => ({
      buildingId: r.building_id,
      name: r.name,
      icon: r.icon,
      level: r.level,
      maxLevel: r.max_level,
      currentDurability: r.current_durability,
      maxDurability: r.max_durability,
      perkDescription: r.perk_description,
      upgradeStoneCost: r.upgrade_stone_cost,
      upgradeCoinCost: r.upgrade_coin_cost,
    }));
  }

  async upgradeCastleBuilding(buildingId: string): Promise<{ success: boolean; message: string }> {
    const db = await getDatabase();
    const [player, balance] = await Promise.all([
      this.getPlayerRpgState(),
      walletService.getBalance(),
    ]);

    const building = (await this.getCastleBuildings()).find((b) => b.buildingId === buildingId);
    if (!building) return { success: false, message: 'Building not found' };
    if (building.level >= building.maxLevel) return { success: false, message: 'Already maximum level!' };

    if (balance.coins < building.upgradeCoinCost) {
      return { success: false, message: `Need ${building.upgradeCoinCost} Focus Coins` };
    }
    if (player.castleStone < building.upgradeStoneCost) {
      return { success: false, message: `Need ${building.upgradeStoneCost} Castle Stone` };
    }

    // Debit costs
    await walletService.spendCoins(
      building.upgradeCoinCost,
      'store',
      `Upgraded ${building.name} to Lv. ${building.level + 1}`,
      buildingId
    );

    const nextStone = player.castleStone - building.upgradeStoneCost;
    const nextLevel = building.level + 1;
    const nextStoneCost = Math.round(building.upgradeStoneCost * 1.4);
    const nextCoinCost = Math.round(building.upgradeCoinCost * 1.4);

    await db.runAsync(
      `UPDATE player_rpg_state SET castle_stone = ?, tenshu_level = MAX(tenshu_level, ?), updated_at = ? WHERE id = 'current_player'`,
      [nextStone, buildingId === 'tenshu' ? nextLevel : player.tenshuLevel, new Date().toISOString()]
    );

    await db.runAsync(
      `UPDATE castle_buildings
       SET level = ?, upgrade_stone_cost = ?, upgrade_coin_cost = ?, updated_at = ?
       WHERE building_id = ?`,
      [nextLevel, nextStoneCost, nextCoinCost, new Date().toISOString(), buildingId]
    );

    // If Sentry Gate upgraded, also restore durability
    if (buildingId === 'gates') {
      await db.runAsync(
        `UPDATE player_rpg_state SET sentry_gate_durability = sentry_gate_max, updated_at = ? WHERE id = 'current_player'`,
        [new Date().toISOString()]
      );
    }

    return { success: true, message: `Successfully upgraded ${building.name} to Level ${nextLevel}! 🏯` };
  }

  async restoreHealth(amount: number, source: string): Promise<number> {
    const db = await getDatabase();
    const player = await this.getPlayerRpgState();
    const nextHp = Math.min(player.maxHp, player.currentHp + amount);

    await db.runAsync(
      `UPDATE player_rpg_state SET current_hp = ?, updated_at = ? WHERE id = 'current_player'`,
      [nextHp, new Date().toISOString()]
    );

    await db.runAsync(
      "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('player_shield_hp', ?, ?)",
      [nextHp.toString(), new Date().toISOString()]
    );

    return nextHp;
  }

  /**
   * Ninja Friends & Co-Op Raids
   */
  async getFriends(): Promise<NinjaFriend[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      friend_id: string;
      ninja_tag: string;
      display_name: string;
      avatar_url: string | null;
      belt_rank: string;
      equipped_weapon_name: string;
      streak_days: number;
      total_focus_minutes: number;
      castle_level: number;
      is_clan_member: number;
      last_active_at: string;
    }>('SELECT * FROM ninja_friends ORDER BY streak_days DESC');

    return rows.map((r) => ({
      friendId: r.friend_id,
      ninjaTag: r.ninja_tag,
      displayName: r.display_name,
      avatarUrl: r.avatar_url || undefined,
      beltRank: r.belt_rank,
      equippedWeaponName: r.equipped_weapon_name,
      streakDays: r.streak_days,
      totalFocusMinutes: r.total_focus_minutes,
      castleLevel: r.castle_level,
      isClanMember: r.is_clan_member === 1,
      lastActiveAt: r.last_active_at,
    }));
  }

  async getClanRaidContributions(): Promise<ClanRaidContribution[]> {
    const db = await getDatabase();
    const weekly = await villainEngine.getActiveWeeklyVillain();
    const weekId = weekly?.weekId || 'current_week';

    const rows = await db.getAllAsync<{
      id: string;
      week_id: string;
      friend_id: string;
      damage_dealt: number;
      action_summary: string;
      contributed_at: string;
    }>(
      'SELECT * FROM clan_raid_contributions WHERE week_id = ? ORDER BY contributed_at DESC LIMIT 20',
      [weekId]
    );

    const friends = await this.getFriends();
    const friendMap = new Map(friends.map((f) => [f.friendId, f.displayName]));

    return rows.map((r) => ({
      id: r.id,
      weekId: r.week_id,
      friendId: r.friend_id,
      displayName: r.friend_id === 'current_player' ? 'You' : friendMap.get(r.friend_id) || 'Clan Ninja',
      damageDealt: r.damage_dealt,
      actionSummary: r.action_summary,
      contributedAt: r.contributed_at,
    }));
  }

  async sendBuddySmokeBomb(friendId: string): Promise<boolean> {
    const db = await getDatabase();
    const weekly = await villainEngine.getActiveWeeklyVillain();
    const weekId = weekly?.weekId || 'current_week';

    // Log a smoke bomb relief action
    await db.runAsync(
      `INSERT INTO clan_raid_contributions (id, week_id, friend_id, damage_dealt, action_summary, contributed_at)
       VALUES (?, ?, 'current_player', 50, 'Deployed Rescue Smoke Bomb to friend! 💨', ?)`,
      [generateUuid('smoke'), weekId, new Date().toISOString()]
    );

    return true;
  }
}

export const unifiedGamificationEngine = new UnifiedGamificationEngine();
