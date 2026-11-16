import { getDatabase } from '../database/database';
import { enqueueSyncItem } from '../sync/sync-engine';
import { walletService } from '../wallet/wallet-service';
import type {
  GoalItem,
  GoalType,
  GoalCategory,
  GoalPriority,
  GoalStatus,
  CreateGoalInput,
} from './goal-types';

export class GoalService {
  /**
   * Get all goals with optional category / status filter
   */
  async getGoals(filter?: { category?: GoalCategory; status?: GoalStatus }): Promise<GoalItem[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM goals';
    const params: (string | number)[] = [];

    if (filter?.category && filter?.status) {
      query += ' WHERE category = ? AND status = ?';
      params.push(filter.category, filter.status);
    } else if (filter?.category) {
      query += ' WHERE category = ?';
      params.push(filter.category);
    } else if (filter?.status) {
      query += ' WHERE status = ?';
      params.push(filter.status);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await db.getAllAsync<{
      goal_id: string;
      title: string;
      description: string | null;
      type: GoalType;
      category: GoalCategory;
      priority: GoalPriority;
      status: GoalStatus;
      target_date: string | null;
      progress: number;
      coin_reward: number;
      xp_reward: number;
      linked_tasks_json: string | null;
      linked_habits_json: string | null;
      created_at: string;
      completed_at: string | null;
      sync_status: 'synced' | 'pending';
    }>(query, params);

    return rows.map(r => ({
      id: r.goal_id,
      title: r.title,
      description: r.description ?? undefined,
      type: r.type,
      category: r.category,
      priority: r.priority,
      status: r.status,
      targetDate: r.target_date ?? undefined,
      progress: r.progress,
      coinReward: r.coin_reward,
      xpReward: r.xp_reward,
      linkedTasks: r.linked_tasks_json ? JSON.parse(r.linked_tasks_json) : [],
      linkedHabits: r.linked_habits_json ? JSON.parse(r.linked_habits_json) : [],
      createdAt: r.created_at,
      completedAt: r.completed_at ?? undefined,
      syncStatus: r.sync_status,
    }));
  }

  /**
   * Get single goal by ID
   */
  async getGoalById(goalId: string): Promise<GoalItem | null> {
    const db = await getDatabase();
    const r = await db.getFirstAsync<{
      goal_id: string;
      title: string;
      description: string | null;
      type: GoalType;
      category: GoalCategory;
      priority: GoalPriority;
      status: GoalStatus;
      target_date: string | null;
      progress: number;
      coin_reward: number;
      xp_reward: number;
      linked_tasks_json: string | null;
      linked_habits_json: string | null;
      created_at: string;
      completed_at: string | null;
      sync_status: 'synced' | 'pending';
    }>('SELECT * FROM goals WHERE goal_id = ?', [goalId]);

    if (!r) return null;

    return {
      id: r.goal_id,
      title: r.title,
      description: r.description ?? undefined,
      type: r.type,
      category: r.category,
      priority: r.priority,
      status: r.status,
      targetDate: r.target_date ?? undefined,
      progress: r.progress,
      coinReward: r.coin_reward,
      xpReward: r.xp_reward,
      linkedTasks: r.linked_tasks_json ? JSON.parse(r.linked_tasks_json) : [],
      linkedHabits: r.linked_habits_json ? JSON.parse(r.linked_habits_json) : [],
      createdAt: r.created_at,
      completedAt: r.completed_at ?? undefined,
      syncStatus: r.sync_status,
    };
  }

  /**
   * Create new goal
   */
  async createGoal(input: CreateGoalInput): Promise<GoalItem> {
    const db = await getDatabase();
    const goalId = 'goal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();

    const newGoal: GoalItem = {
      id: goalId,
      title: input.title,
      description: input.description,
      type: input.type ?? 'short-term',
      category: input.category ?? 'personal',
      priority: input.priority ?? 'medium',
      status: 'in-progress',
      targetDate: input.targetDate,
      progress: 0,
      coinReward: input.coinReward ?? 100,
      xpReward: input.xpReward ?? 250,
      linkedTasks: input.linkedTasks ?? [],
      linkedHabits: input.linkedHabits ?? [],
      createdAt: now,
      syncStatus: 'pending',
    };

    await db.runAsync(
      `INSERT INTO goals (
        goal_id, title, description, type, category, priority, status,
        target_date, progress, coin_reward, xp_reward,
        linked_tasks_json, linked_habits_json, created_at, completed_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')`,
      [
        newGoal.id,
        newGoal.title,
        newGoal.description ?? null,
        newGoal.type,
        newGoal.category,
        newGoal.priority,
        newGoal.status,
        newGoal.targetDate ?? null,
        newGoal.progress,
        newGoal.coinReward,
        newGoal.xpReward,
        JSON.stringify(newGoal.linkedTasks),
        JSON.stringify(newGoal.linkedHabits),
        newGoal.createdAt,
      ]
    );

    try {
      await enqueueSyncItem('goals', goalId, 'insert', newGoal);
    } catch (e) {
      console.warn('[GoalService] enqueueSync error:', e);
    }

    return newGoal;
  }

  /**
   * Update goal progress percentage
   */
  async updateGoalProgress(goalId: string, progress: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    const db = await getDatabase();

    if (clamped >= 100) {
      await this.completeGoal(goalId);
      return;
    }

    await db.runAsync(
      `UPDATE goals SET progress = ?, status = 'in-progress', sync_status = 'pending' WHERE goal_id = ?`,
      [clamped, goalId]
    );

    try {
      await enqueueSyncItem('goals', goalId, 'update', { progress: clamped, status: 'in-progress' });
    } catch (e) {
      console.warn('[GoalService] enqueueSync error:', e);
    }
  }

  /**
   * Complete goal and award wallet bounty
   */
  async completeGoal(goalId: string): Promise<{ success: boolean; coinsAwarded: number; xpAwarded: number }> {
    const db = await getDatabase();
    const goal = await this.getGoalById(goalId);
    if (!goal) return { success: false, coinsAwarded: 0, xpAwarded: 0 };

    if (goal.status === 'completed') {
      return { success: true, coinsAwarded: 0, xpAwarded: 0 };
    }

    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE goals
       SET status = 'completed', progress = 100, completed_at = ?, sync_status = 'pending'
       WHERE goal_id = ?`,
      [now, goalId]
    );

    // Award Coins and XP to Wallet
    await walletService.creditCoins(
      goal.coinReward,
      goal.xpReward,
      'goal',
      `Completed Goal: ${goal.title} 🎯`,
      goalId
    );

    try {
      await enqueueSyncItem('goals', goalId, 'update', {
        status: 'completed',
        progress: 100,
        completedAt: now,
      });
    } catch (e) {
      console.warn('[GoalService] enqueueSync error:', e);
    }

    return {
      success: true,
      coinsAwarded: goal.coinReward,
      xpAwarded: goal.xpReward,
    };
  }

  /**
   * Delete goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM goals WHERE goal_id = ?', [goalId]);

    try {
      await enqueueSyncItem('goals', goalId, 'delete', { goalId });
    } catch (e) {
      console.warn('[GoalService] enqueueSync error:', e);
    }
  }
}

export const goalService = new GoalService();
