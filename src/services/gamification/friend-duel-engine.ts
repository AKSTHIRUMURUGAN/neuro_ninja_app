import { getDatabase } from '../database/database';
import { walletService } from '../wallet/wallet-service';
import type { NinjaFriend } from './gamification-types';

export interface BattleReplayEvent {
  step: number;
  timestampMs: number;
  type: 'shinobi_spawn' | 'slash_gate' | 'gate_crack' | 'gate_breached' | 'tenshu_assault' | 'victory';
  target: 'gates' | 'tenshu' | 'forge';
  damage: number;
  isCrit: boolean;
  textPopup: string;
}

export interface FriendCastleDuelResult {
  id: string;
  attackerId: string;
  defenderId: string;
  defenderName: string;
  starsEarned: number;
  damageDealt: number;
  destructionPercent: number;
  replayEvents: BattleReplayEvent[];
  rewardCoins: number;
  rewardXp: number;
  createdAt: string;
}

class FriendDuelEngine {
  /**
   * Simulates an asynchronous, non-punitive friendly duel against a clan member's castle.
   * Zero resources are stolen from the defender.
   */
  async simulateAndExecuteDuel(
    friend: NinjaFriend,
    attackerLevel: number,
    weaponMultiplier: number
  ): Promise<FriendCastleDuelResult> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const duelId = 'duel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    const gateMaxHp = 100 + friend.castleLevel * 50;
    const tenshuMaxHp = 180 + friend.castleLevel * 100;
    const totalDefenseHp = gateMaxHp + tenshuMaxHp;

    let gateHp = gateMaxHp;
    let tenshuHp = tenshuMaxHp;
    let totalDamage = 0;

    const baseStrike = Math.round(75 * weaponMultiplier * (1 + attackerLevel * 0.08));
    const events: BattleReplayEvent[] = [];
    let step = 1;

    events.push({
      step: step++,
      timestampMs: 200,
      type: 'shinobi_spawn',
      target: 'gates',
      damage: 0,
      isCrit: false,
      textPopup: 'SHINOBI DEPLOYED!',
    });

    // Simulate 5 tactical strikes
    for (let turn = 1; turn <= 5; turn++) {
      const isCrit = (turn === 2 || turn === 5) && weaponMultiplier >= 1.2;
      const dmg = isCrit ? Math.round(baseStrike * 1.45) : baseStrike;
      const ts = 600 + turn * 550;

      if (gateHp > 0) {
        gateHp = Math.max(0, gateHp - dmg);
        totalDamage += dmg;

        if (gateHp === 0) {
          events.push({
            step: step++,
            timestampMs: ts,
            type: 'gate_breached',
            target: 'gates',
            damage: dmg,
            isCrit,
            textPopup: `-${dmg} GATE BREACHED!`,
          });
        } else {
          events.push({
            step: step++,
            timestampMs: ts,
            type: 'slash_gate',
            target: 'gates',
            damage: dmg,
            isCrit,
            textPopup: isCrit ? `-${dmg} CRIT!` : `-${dmg}`,
          });
        }
      } else if (tenshuHp > 0) {
        tenshuHp = Math.max(0, tenshuHp - dmg);
        totalDamage += dmg;

        events.push({
          step: step++,
          timestampMs: ts,
          type: 'tenshu_assault',
          target: 'tenshu',
          damage: dmg,
          isCrit,
          textPopup: isCrit ? `-${dmg} KEEP CRIT!` : `-${dmg} KEEP HIT`,
        });
      }
    }

    const effectiveDamage = Math.min(totalDefenseHp, totalDamage);
    const destructionPercent = Math.min(100, Math.round((effectiveDamage / totalDefenseHp) * 100));

    let starsEarned = 0;
    if (destructionPercent >= 90 || tenshuHp === 0) {
      starsEarned = 3;
    } else if (destructionPercent >= 50) {
      starsEarned = 2;
    } else if (destructionPercent >= 25 || gateHp === 0) {
      starsEarned = 1;
    }

    events.push({
      step: step++,
      timestampMs: 3600,
      type: 'victory',
      target: 'tenshu',
      damage: 0,
      isCrit: starsEarned === 3,
      textPopup: starsEarned > 0 ? `${starsEarned} STAR VICTORY!` : 'DEFENSE HELD!',
    });

    const rewardCoins = 20 + starsEarned * 15;
    const rewardXp = 15 + starsEarned * 15;

    // Persist to DB
    await db.runAsync(
      `INSERT INTO friend_castle_duels (
        id, attacker_id, defender_id, defender_name, stars_earned, damage_dealt,
        destruction_percent, replay_events_json, reward_coins, reward_xp, created_at
      ) VALUES (?, 'current_player', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        duelId,
        friend.friendId,
        friend.displayName,
        starsEarned,
        totalDamage,
        destructionPercent,
        JSON.stringify(events),
        rewardCoins,
        rewardXp,
        now,
      ]
    );

    // Credit Friendly Duel Rewards
    await walletService.creditCoins(
      rewardCoins,
      rewardXp,
      'game',
      `Friendly Castle Duel vs ${friend.displayName} (${starsEarned}⭐)`,
      duelId
    );

    return {
      id: duelId,
      attackerId: 'current_player',
      defenderId: friend.friendId,
      defenderName: friend.displayName,
      starsEarned,
      damageDealt: totalDamage,
      destructionPercent,
      replayEvents: events,
      rewardCoins,
      rewardXp,
      createdAt: now,
    };
  }

  async getRecentDuels(limit: number = 15): Promise<FriendCastleDuelResult[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      attacker_id: string;
      defender_id: string;
      defender_name: string;
      stars_earned: number;
      damage_dealt: number;
      destruction_percent: number;
      replay_events_json: string;
      reward_coins: number;
      reward_xp: number;
      created_at: string;
    }>('SELECT * FROM friend_castle_duels ORDER BY created_at DESC LIMIT ?', [limit]);

    return rows.map((r) => ({
      id: r.id,
      attackerId: r.attacker_id,
      defenderId: r.defender_id,
      defenderName: r.defender_name,
      starsEarned: r.stars_earned,
      damageDealt: r.damage_dealt,
      destructionPercent: r.destruction_percent,
      replayEvents: JSON.parse(r.replay_events_json) as BattleReplayEvent[],
      rewardCoins: r.reward_coins,
      rewardXp: r.reward_xp,
      createdAt: r.created_at,
    }));
  }
}

export const friendDuelEngine = new FriendDuelEngine();
