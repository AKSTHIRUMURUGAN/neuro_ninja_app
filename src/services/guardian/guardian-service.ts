import { getDatabase } from '../database/database';
import { enqueueSyncItem } from '../sync/sync-engine';
import type {
  GuardianLink,
  GuardianRole,
  SubscriptionInfo,
  SubscriptionTier,
} from './guardian-types';

export class GuardianService {
  /**
   * Get all active linked family members / parents
   */
  async getLinkedGuardians(): Promise<GuardianLink[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      link_id: string;
      guardian_name: string;
      guardian_email: string;
      role: GuardianRole;
      status: 'pending' | 'active' | 'revoked';
      remote_lock_enabled: number;
      daily_allowance_minutes: number;
      screen_time_used_minutes: number;
      created_at: string;
    }>('SELECT * FROM guardian_links ORDER BY created_at DESC');

    return rows.map(r => ({
      id: r.link_id,
      name: r.guardian_name,
      email: r.guardian_email,
      role: r.role,
      status: r.status,
      remoteLockEnabled: r.remote_lock_enabled === 1,
      dailyAllowanceMinutes: r.daily_allowance_minutes,
      screenTimeUsedMinutes: r.screen_time_used_minutes,
      createdAt: r.created_at,
    }));
  }

  /**
   * Create new guardian link invite
   */
  async createInvite(name: string, email: string, role: GuardianRole = 'parent'): Promise<GuardianLink> {
    const db = await getDatabase();
    const linkId = 'link_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();

    const link: GuardianLink = {
      id: linkId,
      name,
      email,
      role,
      status: 'active',
      remoteLockEnabled: true,
      dailyAllowanceMinutes: 120,
      screenTimeUsedMinutes: 45,
      createdAt: now,
    };

    await db.runAsync(
      `INSERT INTO guardian_links (
        link_id, guardian_name, guardian_email, role, status,
        remote_lock_enabled, daily_allowance_minutes, screen_time_used_minutes, created_at, sync_status
      ) VALUES (?, ?, ?, ?, 'active', 1, 120, 45, ?, 'pending')`,
      [linkId, name, email, role, now]
    );

    try {
      await enqueueSyncItem('guardian_links', linkId, 'insert', link);
    } catch (e) {
      console.warn('[GuardianService] enqueueSync error:', e);
    }

    return link;
  }

  /**
   * Toggle remote lock for a linked device
   */
  async toggleRemoteLock(linkId: string, enabled: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE guardian_links SET remote_lock_enabled = ?, sync_status = "pending" WHERE link_id = ?',
      [enabled ? 1 : 0, linkId]
    );

    try {
      await enqueueSyncItem('guardian_links', linkId, 'update', { remoteLockEnabled: enabled });
    } catch (e) {
      console.warn('[GuardianService] enqueueSync error:', e);
    }
  }

  /**
   * Update daily screen time allowance
   */
  async updateDailyAllowance(linkId: string, minutes: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE guardian_links SET daily_allowance_minutes = ?, sync_status = "pending" WHERE link_id = ?',
      [minutes, linkId]
    );

    try {
      await enqueueSyncItem('guardian_links', linkId, 'update', { dailyAllowanceMinutes: minutes });
    } catch (e) {
      console.warn('[GuardianService] enqueueSync error:', e);
    }
  }

  /**
   * Get current subscription info
   */
  async getSubscription(): Promise<SubscriptionInfo> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      tier: SubscriptionTier;
      status: 'active' | 'trial' | 'expired';
      expires_at: string | null;
      auto_renew: number;
      billing_cycle: 'monthly' | 'yearly';
      amount_inr: number;
    }>('SELECT * FROM subscriptions WHERE id = 1');

    const tier = row?.tier ?? 'free';
    const features =
      tier === 'guardian'
        ? [
            'All Pro Cyberpunk features',
            'Up to 5 linked Family members',
            'Remote App Blocker & override approvals',
            'Weekly screen time & habit audit report',
            'Priority accountability verification',
          ]
        : tier === 'pro'
        ? [
            'Unlimited Habits & Tasks with Verifiers',
            'All 28 Neuro Arena brain games & Chess bot',
            'Floating Doomscroll HUD overlay with custom thresholds',
            'Unlimited Neuro Store theme downloads',
            'Cloud sync across all your devices',
          ]
        : [
            'Core Habit tracking (up to 3 habits)',
            'Standard App Blocker overlay',
            'Top 3 Brain Games (Queens, Tango, Math Blitz)',
            'Local-only storage',
          ];

    return {
      tier,
      status: row?.status ?? 'active',
      expiresAt: row?.expires_at ?? undefined,
      autoRenew: row ? row.auto_renew === 1 : false,
      billingCycle: row?.billing_cycle ?? 'monthly',
      amountInr: row?.amount_inr ?? 0,
      features,
    };
  }

  /**
   * Upgrade or switch subscription tier
   */
  async upgradeSubscription(
    tier: SubscriptionTier,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<SubscriptionInfo> {
    const db = await getDatabase();
    const amountInr =
      tier === 'guardian'
        ? billingCycle === 'yearly' ? 7999 : 999
        : tier === 'pro'
        ? billingCycle === 'yearly' ? 3999 : 499
        : 0;

    await db.runAsync(
      `UPDATE subscriptions
       SET tier = ?, status = 'active', billing_cycle = ?, amount_inr = ?, auto_renew = 1,
           expires_at = datetime('now', '+30 days'), updated_at = datetime('now')
       WHERE id = 1`,
      [tier, billingCycle, amountInr]
    );

    return this.getSubscription();
  }

  /**
   * Apply promotional coupon
   */
  applyCoupon(code: string): { valid: boolean; discountPercent?: number; message: string } {
    const upper = code.trim().toUpperCase();
    if (upper === 'NINJA50' || upper === 'CYBER50') {
      return { valid: true, discountPercent: 50, message: '50% Lifetime Discount Applied! 🔥' };
    }
    if (upper === 'FREEDOM' || upper === 'DOJO100') {
      return { valid: true, discountPercent: 100, message: '100% Free Pro Month Unlocked! 🥋' };
    }
    return { valid: false, message: 'Invalid or expired coupon code' };
  }
}

export const guardianService = new GuardianService();
