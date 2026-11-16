import { getDatabase } from '../database/database';
import { villainEngine } from '../villains/villain-engine';
import { walletService } from '../wallet/wallet-service';
import { blockerEngine } from '../blocker/blocker-engine';
import { addPlantToGrove, addWitheredPlantToGrove } from '../../components/focus-grove';
import type {
  DeepWorkSession,
  UpperCircuitProfile,
  SweetSpotCalculation,
  PresetType,
  DistractionImpulse,
  ZeroResistanceState,
} from './deep-work-types';

export const DEFAULT_ZERO_RESISTANCE: ZeroResistanceState = {
  cleanDesk: true,
  phoneDnd: true,
  singleVictory: true,
  hydrated: true,
};

export const DEFAULT_UPPER_CIRCUIT: UpperCircuitProfile = {
  id: 'current',
  ceilingMinutes: 50,
  sweetSpotMinutes: 38,
  weeklyPrMinutes: 50,
  totalFlowHours: 4.5,
  mindfulnessScore: 92.0,
  zeroResistanceState: DEFAULT_ZERO_RESISTANCE,
  updatedAt: new Date().toISOString(),
};

export class DeepWorkEngine {
  /**
   * Calculates optimal dopamine and fatigue-preventing sweet spot
   * based on the user's attention span ceiling.
   */
  public calculateSweetSpot(ceilingMinutes: number): SweetSpotCalculation {
    const safeCeiling = Math.max(15, Math.min(180, ceilingMinutes || 50));
    const min70 = Math.round(safeCeiling * 0.7);
    const max80 = Math.round(safeCeiling * 0.8);
    // 75% optimal threshold
    const recommended = Math.round(safeCeiling * 0.75);
    const breakMinutes = Math.max(5, Math.round(recommended * 0.2));
    const longBreakMinutes = Math.max(10, Math.round(recommended * 0.4));

    return {
      ceiling: safeCeiling,
      min70,
      max80,
      recommended,
      breakMinutes,
      longBreakMinutes,
    };
  }

  /**
   * Fetches the user's upper circuit profile from SQLite.
   */
  public async getUpperCircuitProfile(): Promise<UpperCircuitProfile> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{
        id: string;
        ceiling_minutes: number;
        sweet_spot_minutes: number;
        weekly_pr_minutes: number;
        total_flow_hours: number;
        mindfulness_score: number;
        zero_resistance_json: string;
        updated_at: string;
      }>('SELECT * FROM upper_circuit_profile WHERE id = ?', ['current']);

      if (!row) {
        return DEFAULT_UPPER_CIRCUIT;
      }

      let zr = DEFAULT_ZERO_RESISTANCE;
      try {
        if (row.zero_resistance_json) {
          zr = JSON.parse(row.zero_resistance_json);
        }
      } catch {
        zr = DEFAULT_ZERO_RESISTANCE;
      }

      return {
        id: row.id,
        ceilingMinutes: row.ceiling_minutes ?? 50,
        sweetSpotMinutes: row.sweet_spot_minutes ?? 38,
        weeklyPrMinutes: row.weekly_pr_minutes ?? 50,
        totalFlowHours: row.total_flow_hours ?? 4.5,
        mindfulnessScore: row.mindfulness_score ?? 92.0,
        zeroResistanceState: zr,
        updatedAt: row.updated_at,
      };
    } catch (e) {
      console.warn('[DeepWorkEngine] getUpperCircuitProfile error:', e);
      return DEFAULT_UPPER_CIRCUIT;
    }
  }

  /**
   * Updates the upper circuit profile.
   */
  public async updateUpperCircuitProfile(updates: Partial<UpperCircuitProfile>): Promise<void> {
    try {
      const current = await this.getUpperCircuitProfile();
      const db = await getDatabase();

      const ceiling = updates.ceilingMinutes ?? current.ceilingMinutes;
      const sweetSpot = updates.sweetSpotMinutes ?? current.sweetSpotMinutes;
      const weeklyPr = updates.weeklyPrMinutes ?? current.weeklyPrMinutes;
      const flowHours = updates.totalFlowHours ?? current.totalFlowHours;
      const mindfulness = updates.mindfulnessScore ?? current.mindfulnessScore;
      const zrJson = JSON.stringify(updates.zeroResistanceState ?? current.zeroResistanceState);

      await db.runAsync(
        `INSERT INTO upper_circuit_profile (
          id, ceiling_minutes, sweet_spot_minutes, weekly_pr_minutes, total_flow_hours, mindfulness_score, zero_resistance_json, updated_at
        ) VALUES ('current', ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          ceiling_minutes = excluded.ceiling_minutes,
          sweet_spot_minutes = excluded.sweet_spot_minutes,
          weekly_pr_minutes = excluded.weekly_pr_minutes,
          total_flow_hours = excluded.total_flow_hours,
          mindfulness_score = excluded.mindfulness_score,
          zero_resistance_json = excluded.zero_resistance_json,
          updated_at = datetime('now')`,
        [ceiling, sweetSpot, weeklyPr, flowHours, mindfulness, zrJson]
      );
    } catch (e) {
      console.warn('[DeepWorkEngine] updateUpperCircuitProfile error:', e);
    }
  }

  /**
   * Starts a new Deep Work sprint. Deducts stake if any, activates app blocker.
   */
  public async startDeepWorkSession(params: {
    intent: string;
    presetType: PresetType;
    plannedSeconds: number;
    stakedCoins?: number;
    treeSpecies?: string;
  }): Promise<DeepWorkSession> {
    const id = 'dws_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const staked = Math.max(0, params.stakedCoins || 0);

    // If staked coins > 0, deduct from wallet
    if (staked > 0) {
      try {
        await walletService.spendCoins(
          staked,
          'task',
          `Staked ${staked} Focus Coins on sprint: "${params.intent.slice(0, 30)}"`
        );
      } catch (err) {
        console.warn('[DeepWorkEngine] Failed to deduct stake:', err);
      }
    }

    // Arm native app blocker shield
    try {
      await blockerEngine.armShield();
    } catch (e) {
      console.warn('[DeepWorkEngine] Blocker arm error:', e);
    }

    const session: DeepWorkSession = {
      id,
      intent: params.intent.trim() || 'Deep Work Focus Block',
      presetType: params.presetType,
      plannedSeconds: params.plannedSeconds,
      actualSeconds: 0,
      status: 'active',
      distractionsCount: 0,
      distractions: [],
      stakedCoins: staked,
      coinsRewarded: 0,
      xpRewarded: 0,
      treeSpecies: params.treeSpecies || 'bonsai',
      createdAt: new Date().toISOString(),
    };

    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO deep_work_sessions (
          id, intent, preset_type, planned_seconds, actual_seconds, status,
          distractions_count, distractions_json, staked_coins, coins_rewarded, xp_rewarded, tree_species, created_at
        ) VALUES (?, ?, ?, ?, 0, 'active', 0, '[]', ?, 0, 0, ?, datetime('now'))`,
        [session.id, session.intent, session.presetType, session.plannedSeconds, session.stakedCoins, session.treeSpecies]
      );
    } catch (e) {
      console.warn('[DeepWorkEngine] Insert session error:', e);
    }

    return session;
  }

  /**
   * Logs a distraction impulse without halting the timer.
   */
  public async recordDistractionImpulse(
    sessionId: string,
    tag: DistractionImpulse['tag'],
    note?: string
  ): Promise<{ count: number }> {
    const impulse: DistractionImpulse = {
      timestamp: new Date().toISOString(),
      tag,
      note: note?.trim(),
    };

    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{
        distractions_count: number;
        distractions_json: string;
      }>('SELECT distractions_count, distractions_json FROM deep_work_sessions WHERE id = ?', [sessionId]);

      const currentCount = row ? row.distractions_count : 0;
      let impulses: DistractionImpulse[] = [];
      try {
        if (row?.distractions_json) {
          impulses = JSON.parse(row.distractions_json);
        }
      } catch {
        impulses = [];
      }

      impulses.push(impulse);
      const newCount = currentCount + 1;

      await db.runAsync(
        `UPDATE deep_work_sessions
         SET distractions_count = ?, distractions_json = ?
         WHERE id = ?`,
        [newCount, JSON.stringify(impulses), sessionId]
      );

      return { count: newCount };
    } catch (e) {
      console.warn('[DeepWorkEngine] recordDistractionImpulse error:', e);
      return { count: 1 };
    }
  }

  /**
   * Completes a Deep Work session with debrief metrics.
   * Disarms app blocker, rewards coins & XP, plants tree, and deals boss damage.
   */
  public async completeSession(params: {
    sessionId: string;
    actualSeconds: number;
    focusDepth: number; // 1-5
    intentCompleted: boolean;
  }): Promise<{ coinsEarned: number; xpEarned: number; bossDamage: number }> {
    // Disarm app blocker shield
    try {
      await blockerEngine.disarmShield();
    } catch (e) {
      console.warn('[DeepWorkEngine] Blocker disarm error:', e);
    }

    const db = await getDatabase();
    const sessionRow = await db.getFirstAsync<{
      intent: string;
      preset_type: string;
      staked_coins: number;
      tree_species: string;
      distractions_count: number;
    }>('SELECT intent, preset_type, staked_coins, tree_species, distractions_count FROM deep_work_sessions WHERE id = ?', [params.sessionId]);

    const staked = sessionRow?.staked_coins ?? 0;
    const minutes = Math.max(1, Math.round(params.actualSeconds / 60));

    // Base rewards: 10 coins per 25 min, + double stake returned on success
    let coinsEarned = Math.max(10, Math.round(minutes * 0.4));
    let xpEarned = Math.max(50, minutes * 2);

    if (staked > 0) {
      // Return stake + 100% bonus on staked amount
      coinsEarned += staked * 2;
      xpEarned += staked * 3;
    }

    // High focus depth bonus
    if (params.focusDepth >= 4) {
      coinsEarned += 5;
      xpEarned += 25;
    }

    // Zero/Low distraction mindfulness bonus
    if ((sessionRow?.distractions_count ?? 0) === 0) {
      coinsEarned += 5;
      xpEarned += 20;
    }

    // Credit wallet
    try {
      await walletService.creditCoins(
        coinsEarned,
        xpEarned,
        'task',
        `Conquered Deep Work block: "${(sessionRow?.intent || 'Pomodoro').slice(0, 30)}"`
      );
    } catch (e) {
      console.warn('[DeepWorkEngine] Wallet credit error:', e);
    }

    // Boss damage: 80 HP for 25m, scaled by duration
    const bossDamage = Math.max(80, Math.round((minutes / 25) * 80));
    try {
      await villainEngine.dealDamage('pomodoro', bossDamage, sessionRow?.intent || 'Deep Work Pomodoro');
    } catch (e) {
      console.warn('[DeepWorkEngine] Villain damage error:', e);
    }

    // Plant healthy tree in Focus Grove
    try {
      const validSpecies = (sessionRow?.tree_species || 'bonsai') as 'bonsai' | 'bamboo' | 'sakura' | 'lotus';
      await addPlantToGrove(validSpecies, 'Imperial ' + validSpecies.toUpperCase(), minutes);
    } catch (e) {
      console.warn('[DeepWorkEngine] Focus Grove plant error:', e);
    }

    // Update session record
    try {
      await db.runAsync(
        `UPDATE deep_work_sessions
         SET actual_seconds = ?, status = 'completed', focus_depth = ?, intent_completed = ?,
             coins_rewarded = ?, xp_rewarded = ?
         WHERE id = ?`,
        [params.actualSeconds, params.focusDepth, params.intentCompleted ? 1 : 0, coinsEarned, xpEarned, params.sessionId]
      );
    } catch (e) {
      console.warn('[DeepWorkEngine] Update session error:', e);
    }

    // Update cumulative profile flow hours
    try {
      const profile = await this.getUpperCircuitProfile();
      const newHours = Number((profile.totalFlowHours + (minutes / 60)).toFixed(1));
      let newPr = profile.weeklyPrMinutes;
      if (sessionRow?.preset_type === 'breaker_pr' && minutes > profile.weeklyPrMinutes) {
        newPr = minutes;
      }
      await this.updateUpperCircuitProfile({
        totalFlowHours: newHours,
        weeklyPrMinutes: newPr,
      });
    } catch (e) {
      console.warn('[DeepWorkEngine] Update profile flow hours error:', e);
    }

    return { coinsEarned, xpEarned, bossDamage };
  }

  /**
   * Abandons an active session. Leaves withered tree, forfeits stakes.
   */
  public async abandonSession(params: {
    sessionId: string;
    actualSeconds: number;
  }): Promise<void> {
    // Disarm app blocker shield
    try {
      await blockerEngine.disarmShield();
    } catch (e) {
      console.warn('[DeepWorkEngine] Blocker disarm error:', e);
    }

    const db = await getDatabase();
    const sessionRow = await db.getFirstAsync<{
      intent: string;
      tree_species: string;
    }>('SELECT intent, tree_species FROM deep_work_sessions WHERE id = ?', [params.sessionId]);

    const minutes = Math.max(1, Math.round(params.actualSeconds / 60));

    // Plant withered tree in Focus Grove
    try {
      const validSpecies = (sessionRow?.tree_species || 'bonsai') as 'bonsai' | 'bamboo' | 'sakura' | 'lotus';
      await addWitheredPlantToGrove(validSpecies, 'Withered ' + validSpecies.toUpperCase(), minutes);
    } catch (e) {
      console.warn('[DeepWorkEngine] Withered tree plant error:', e);
    }

    // Update session status in SQLite
    try {
      await db.runAsync(
        `UPDATE deep_work_sessions
         SET actual_seconds = ?, status = 'abandoned'
         WHERE id = ?`,
        [params.actualSeconds, params.sessionId]
      );
    } catch (e) {
      console.warn('[DeepWorkEngine] Update session abandoned error:', e);
    }
  }

  /**
   * Fetches recent sessions history.
   */
  public async getRecentSessions(limit: number = 10): Promise<DeepWorkSession[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<{
        id: string;
        intent: string;
        preset_type: string;
        planned_seconds: number;
        actual_seconds: number;
        status: string;
        focus_depth: number | null;
        intent_completed: number | null;
        distractions_count: number;
        distractions_json: string;
        staked_coins: number;
        coins_rewarded: number;
        xp_rewarded: number;
        tree_species: string;
        created_at: string;
      }>('SELECT * FROM deep_work_sessions ORDER BY created_at DESC LIMIT ?', [limit]);

      return rows.map((r) => {
        let distractions: DistractionImpulse[] = [];
        try {
          if (r.distractions_json) {
            distractions = JSON.parse(r.distractions_json);
          }
        } catch {
          distractions = [];
        }

        return {
          id: r.id,
          intent: r.intent,
          presetType: r.preset_type as PresetType,
          plannedSeconds: r.planned_seconds,
          actualSeconds: r.actual_seconds,
          status: r.status as 'completed' | 'abandoned' | 'active',
          focusDepth: r.focus_depth ?? undefined,
          intentCompleted: r.intent_completed === 1,
          distractionsCount: r.distractions_count,
          distractions,
          stakedCoins: r.staked_coins,
          coinsRewarded: r.coins_rewarded,
          xpRewarded: r.xp_rewarded,
          treeSpecies: r.tree_species,
          createdAt: r.created_at,
        };
      });
    } catch (e) {
      console.warn('[DeepWorkEngine] getRecentSessions error:', e);
      return [];
    }
  }
}

export const deepWorkEngine = new DeepWorkEngine();
