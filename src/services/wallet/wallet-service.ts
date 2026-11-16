import { getDatabase } from '../database/database';
import { enqueueSyncItem } from '../sync/sync-engine';
import type {
  WalletBalance,
  WalletTransaction,
  TransactionType,
  TransactionCategory,
  DailyBonusStatus,
} from './wallet-types';

export class WalletService {
  /**
   * Fetch current wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      coins: number;
      karma_xp: number;
      escrow_coins: number;
      streak_shields: number;
      ninja_rank: string;
      updated_at: string;
    }>('SELECT * FROM wallet_balance WHERE id = 1');

    if (!row) {
      const defaultBal: WalletBalance = {
        coins: 500,
        karmaXp: 1200,
        escrowCoins: 0,
        streakShields: 1,
        ninjaRank: 'Green Belt',
        updatedAt: new Date().toISOString(),
      };
      await db.runAsync(
        `INSERT OR IGNORE INTO wallet_balance (id, coins, karma_xp, escrow_coins, streak_shields, ninja_rank, updated_at)
         VALUES (1, 500, 1200, 0, 1, 'Green Belt', datetime('now'))`
      );
      return defaultBal;
    }

    return {
      coins: row.coins,
      karmaXp: row.karma_xp,
      escrowCoins: row.escrow_coins,
      streakShields: row.streak_shields,
      ninjaRank: row.ninja_rank,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Credit focus coins and/or karma XP
   */
  async creditCoins(
    coinsAmount: number,
    xpAmount: number,
    category: TransactionCategory,
    description: string,
    referenceId?: string
  ): Promise<WalletBalance> {
    const db = await getDatabase();
    const current = await this.getBalance();
    const newCoins = current.coins + coinsAmount;
    const newXp = current.karmaXp + xpAmount;

    // Calculate rank
    const newRank = this.calculateRank(newXp);

    await db.runAsync(
      `UPDATE wallet_balance
       SET coins = ?, karma_xp = ?, ninja_rank = ?, updated_at = datetime('now')
       WHERE id = 1`,
      [newCoins, newXp, newRank]
    );

    const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await db.runAsync(
      `INSERT INTO wallet_transactions (tx_id, type, amount, balance_after, category, description, reference_id, created_at, sync_status)
       VALUES (?, 'earn', ?, ?, ?, ?, ?, datetime('now'), 'pending')`,
      [txId, coinsAmount, newCoins, category, description, referenceId ?? null]
    );

    try {
      await enqueueSyncItem(
        'wallet_transactions',
        txId,
        'insert',
        { txId, type: 'earn', amount: coinsAmount, category, description }
      );
    } catch (e) {
      console.warn('[WalletService] enqueueSync error:', e);
    }

    return {
      ...current,
      coins: newCoins,
      karmaXp: newXp,
      ninjaRank: newRank,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Spend focus coins (e.g. at the store)
   */
  async spendCoins(
    amount: number,
    category: TransactionCategory,
    description: string,
    referenceId?: string
  ): Promise<{ success: boolean; balance?: WalletBalance; error?: string }> {
    const current = await this.getBalance();
    if (current.coins < amount) {
      return { success: false, error: 'Insufficient Focus Coins' };
    }

    const db = await getDatabase();
    const newCoins = current.coins - amount;

    await db.runAsync(
      `UPDATE wallet_balance
       SET coins = ?, updated_at = datetime('now')
       WHERE id = 1`,
      [newCoins]
    );

    const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await db.runAsync(
      `INSERT INTO wallet_transactions (tx_id, type, amount, balance_after, category, description, reference_id, created_at, sync_status)
       VALUES (?, 'spend', ?, ?, ?, ?, ?, datetime('now'), 'pending')`,
      [txId, -amount, newCoins, category, description, referenceId ?? null]
    );

    try {
      await enqueueSyncItem(
        'wallet_transactions',
        txId,
        'insert',
        { txId, type: 'spend', amount: -amount, category, description }
      );
    } catch (e) {
      console.warn('[WalletService] enqueueSync error:', e);
    }

    return {
      success: true,
      balance: {
        ...current,
        coins: newCoins,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Move coins to escrow (accountability pledge)
   */
  async pledgeEscrow(amount: number, referenceId: string, description: string): Promise<boolean> {
    const current = await this.getBalance();
    if (current.coins < amount) return false;

    const db = await getDatabase();
    const newCoins = current.coins - amount;
    const newEscrow = current.escrowCoins + amount;

    await db.runAsync(
      `UPDATE wallet_balance
       SET coins = ?, escrow_coins = ?, updated_at = datetime('now')
       WHERE id = 1`,
      [newCoins, newEscrow]
    );

    const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await db.runAsync(
      `INSERT INTO wallet_transactions (tx_id, type, amount, balance_after, category, description, reference_id, created_at, sync_status)
       VALUES (?, 'stake', ?, ?, 'escrow', ?, ?, datetime('now'), 'pending')`,
      [txId, -amount, newCoins, description, referenceId]
    );

    return true;
  }

  /**
   * Release coins from escrow back to user + optional bounty
   */
  async releaseEscrow(escrowAmount: number, bonusCoins: number, referenceId: string, description: string): Promise<boolean> {
    const db = await getDatabase();
    const current = await this.getBalance();
    const deductedEscrow = Math.max(0, current.escrowCoins - escrowAmount);
    const newCoins = current.coins + escrowAmount + bonusCoins;

    await db.runAsync(
      `UPDATE wallet_balance
       SET coins = ?, escrow_coins = ?, updated_at = datetime('now')
       WHERE id = 1`,
      [newCoins, deductedEscrow]
    );

    const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await db.runAsync(
      `INSERT INTO wallet_transactions (tx_id, type, amount, balance_after, category, description, reference_id, created_at, sync_status)
       VALUES (?, 'release', ?, ?, 'escrow', ?, ?, datetime('now'), 'pending')`,
      [txId, escrowAmount + bonusCoins, newCoins, description, referenceId]
    );

    return true;
  }

  /**
   * Fetch recent transaction ledger
   */
  async getTransactions(limit = 40): Promise<WalletTransaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      tx_id: string;
      type: TransactionType;
      amount: number;
      balance_after: number;
      category: TransactionCategory;
      description: string;
      reference_id: string | null;
      created_at: string;
      sync_status: 'synced' | 'pending';
    }>(
      'SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    return rows.map(r => ({
      id: r.tx_id,
      type: r.type,
      amount: r.amount,
      balanceAfter: r.balance_after,
      category: r.category,
      description: r.description,
      referenceId: r.reference_id ?? undefined,
      createdAt: r.created_at,
      syncStatus: r.sync_status,
    }));
  }

  /**
   * Daily bonus streak logic (escalating 7-day bonus)
   */
  async getDailyBonusStatus(): Promise<DailyBonusStatus> {
    const db = await getDatabase();
    const lastClaimRow = await db.getFirstAsync<{ created_at: string }>(
      `SELECT created_at FROM wallet_transactions WHERE category = 'login' ORDER BY created_at DESC LIMIT 1`
    );

    const now = Date.now();
    let canClaim = true;
    let hoursUntilNextClaim = 0;
    let consecutiveDays = 1;

    if (lastClaimRow) {
      const lastTs = new Date(lastClaimRow.created_at).getTime();
      const diffHours = (now - lastTs) / (1000 * 60 * 60);

      if (diffHours < 20) {
        canClaim = false;
        hoursUntilNextClaim = Math.ceil(20 - diffHours);
      } else if (diffHours > 48) {
        // Streak broken
        consecutiveDays = 1;
      } else {
        // Count consecutive days
        const countRow = await db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM wallet_transactions WHERE category = 'login' AND created_at > datetime('now', '-7 days')`
        );
        consecutiveDays = ((countRow?.count ?? 0) % 7) + 1;
      }
    }

    const baseCoins = 25 * consecutiveDays;
    const baseProgressXp = 50 * consecutiveDays;
    const hasShieldBonus = consecutiveDays === 7;

    return {
      canClaim,
      consecutiveDays,
      nextRewardCoins: baseCoins,
      nextRewardXp: baseProgressXp,
      hasShieldBonus,
      hoursUntilNextClaim,
    };
  }

  /**
   * Claim daily bonus
   */
  async claimDailyBonus(): Promise<{ success: boolean; coinsClaimed: number; newBalance: WalletBalance; error?: string }> {
    const status = await this.getDailyBonusStatus();
    if (!status.canClaim) {
      return {
        success: false,
        coinsClaimed: 0,
        newBalance: await this.getBalance(),
        error: `Come back in ${status.hoursUntilNextClaim} hours to claim next bonus!`,
      };
    }

    const newBal = await this.creditCoins(
      status.nextRewardCoins,
      status.nextRewardXp,
      'login',
      `Day ${status.consecutiveDays} Dojo Discipline Bonus 🥋`
    );

    if (status.hasShieldBonus) {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE wallet_balance SET streak_shields = streak_shields + 1 WHERE id = 1'
      );
      newBal.streakShields += 1;
    }

    return {
      success: true,
      coinsClaimed: status.nextRewardCoins,
      newBalance: newBal,
    };
  }

  private calculateRank(xp: number): string {
    if (xp < 500) return 'White Belt';
    if (xp < 1000) return 'Yellow Belt';
    if (xp < 2000) return 'Green Belt';
    if (xp < 4000) return 'Blue Belt';
    if (xp < 7500) return 'Red Belt';
    if (xp < 12000) return 'Black Belt';
    return 'Shadow Master 🥷';
  }
}

export const walletService = new WalletService();
