import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncEngine } from '../sync/sync-engine';
import {
  setActiveDare as setNativeActiveDare,
  clearActiveDare as clearNativeActiveDare,
  getActiveDare as getNativeActiveDare,
  getTodayReelsCount,
} from 'expo-app-blocker';
import type { RealMoneyDare } from './wallet-types';
import {
  scheduleDareExpiryWarning,
  cancelDareExpiryWarning,
} from '../notifications/dare-notifications';

const DARE_STORAGE_KEY = '@neuroninja_active_real_dare_v1';
const DARE_HISTORY_STORAGE_KEY = '@neuroninja_dare_history_v1';
const TASK_STAKES_KEY = '@neuroninja_task_stakes_v1';
const HABIT_STAKES_KEY = '@neuroninja_habit_stakes_v1';
const AUTO_RENEW_KEY = '@neuroninja_dare_auto_renew_v1';

export interface EntityStakeInfo {
  entityId: string;
  referenceType: 'task' | 'habit';
  title: string;
  stakeRupees: number;
  escrowId: string;
  deadline?: string;
  status: 'active' | 'released' | 'forfeited';
  stakedAt: string;
}

class DareService {
  private activeDareCache: RealMoneyDare | null = null;
  private isCheckingBreach = false;

  async clearDare(): Promise<void> {
    this.activeDareCache = null;
    await AsyncStorage.removeItem(DARE_STORAGE_KEY);
    try {
      clearNativeActiveDare();
    } catch {}
    cancelDareExpiryWarning();
  }

  /**
   * Check if user enabled auto-renew
   */
  async isAutoRenewEnabled(): Promise<boolean> {
    const val = await AsyncStorage.getItem(AUTO_RENEW_KEY);
    return val === 'true';
  }

  async setAutoRenewEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(AUTO_RENEW_KEY, enabled ? 'true' : 'false');
  }

  /**
   * Load the active dare from storage or native HUD
   */
  async getActiveDare(): Promise<RealMoneyDare | null> {
    try {
      if (this.activeDareCache && this.activeDareCache.status === 'ACTIVE') {
        return this.activeDareCache;
      }

      const raw = await AsyncStorage.getItem(DARE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RealMoneyDare;
        if (parsed && parsed.status === 'ACTIVE') {
          try {
            const liveReels = getTodayReelsCount();
            parsed.currentCount = liveReels;
          } catch {}
          this.activeDareCache = parsed;
          return parsed;
        }
      }

      // Check native module
      try {
        const nativeDare = getNativeActiveDare();
        if (nativeDare && nativeDare.status === 'ACTIVE' && nativeDare.stakeRupees > 0) {
          const liveReels = getTodayReelsCount();
          const restored: RealMoneyDare = {
            id: nativeDare.dareId || 'dare_' + Date.now(),
            title: nativeDare.title || `Terminator Dare: Max ${nativeDare.targetLimit} Reels`,
            dareType: 'DOOMSCROLL_LIMIT',
            stakeRupees: nativeDare.stakeRupees,
            targetLimit: nativeDare.targetLimit,
            currentCount: liveReels,
            status: 'ACTIVE',
            escrowId: 'escrow_' + (nativeDare.dareId || 'local'),
            deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            startedAt: new Date().toISOString(),
          };
          this.activeDareCache = restored;
          await AsyncStorage.setItem(DARE_STORAGE_KEY, JSON.stringify(restored));
          return restored;
        }
      } catch {}

      return null;
    } catch (e) {
      console.warn('[DareService] Error getting active dare:', e);
      return null;
    }
  }

  /**
   * Fetch active dare from backend cloud
   */
  async fetchCloudDare(): Promise<{
    activeDare: RealMoneyDare | null;
    wallet?: { balance: number; escrowBalance: number };
  }> {
    try {
      const baseUrl = await syncEngine.getApiUrl();
      const token = await syncEngine.getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${baseUrl}/api/wallet/dare/active`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        return { activeDare: await this.getActiveDare() };
      }

      const data = await res.json();
      if (data.hasActiveDare && data.activeDare) {
        const cloudDare = data.activeDare;
        const normalized: RealMoneyDare = {
          id: cloudDare.id,
          title: cloudDare.title,
          dareType: cloudDare.dareType,
          stakeRupees: Math.round(cloudDare.stakeAmount / 100),
          targetLimit: cloudDare.targetLimit,
          currentCount: cloudDare.currentCount || getTodayReelsCount(),
          status: cloudDare.status,
          escrowId: cloudDare.escrowId,
          deadline: cloudDare.deadline,
          startedAt: cloudDare.startedAt,
        };

        this.activeDareCache = normalized;
        await AsyncStorage.setItem(DARE_STORAGE_KEY, JSON.stringify(normalized));

        // Sync with Native HUD
        try {
          setNativeActiveDare(
            normalized.id,
            normalized.stakeRupees,
            normalized.targetLimit,
            normalized.title
          );
        } catch {}

        return { activeDare: normalized, wallet: data.wallet };
      } else {
        return { activeDare: await this.getActiveDare(), wallet: data.wallet };
      }
    } catch (e) {
      console.warn('[DareService] Cloud fetch failed, falling back to local:', e);
      return { activeDare: await this.getActiveDare() };
    }
  }

  /**
   * Create a new Dare commitment (supports micro-stakes down to ₹1)
   */
  async createDare(params: {
    dareType?: 'DOOMSCROLL_LIMIT' | 'FOCUS_SESSION' | 'DAILY_DETOX';
    stakeRupees: number;
    targetLimit: number;
    title?: string;
  }): Promise<{
    success: boolean;
    dare?: RealMoneyDare;
    error?: string;
    requiresDeposit?: boolean;
    requiredRupees?: number;
    availableRupees?: number;
  }> {
    try {
      const { dareType = 'DOOMSCROLL_LIMIT', stakeRupees, targetLimit, title } = params;

      if (!stakeRupees || stakeRupees < 1) {
        return { success: false, error: 'Minimum stake is ₹1' };
      }

      const baseUrl = await syncEngine.getApiUrl();
      const token = await syncEngine.getAuthToken();

      const dareTitle = title || `Terminator Dare: Max ${targetLimit} Reels/Shorts`;
      const dareId = 'dare_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const deadlineDate = new Date(Date.now() + 24 * 3600 * 1000);

      // Optimistic local dare object
      const newDare: RealMoneyDare = {
        id: dareId,
        title: dareTitle,
        dareType,
        stakeRupees,
        targetLimit,
        currentCount: getTodayReelsCount(),
        status: 'ACTIVE',
        escrowId: 'escrow_' + dareId,
        deadline: deadlineDate.toISOString(),
        startedAt: new Date().toISOString(),
      };

      // Try syncing with Cloud Escrow
      if (token) {
        try {
          const res = await fetch(`${baseUrl}/api/wallet/dare/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              dareType,
              stakeAmount: stakeRupees * 100, // in paise
              targetLimit,
              title: dareTitle,
            }),
          });

          const data = await res.json();

          if (res.status === 402 && data.error === 'INSUFFICIENT_BALANCE') {
            return {
              success: false,
              requiresDeposit: true,
              requiredRupees: Math.round(data.requiredAmount / 100),
              availableRupees: Math.round((data.availableBalance || 0) / 100),
              error: data.message,
            };
          }

          if (data.dare) {
            newDare.id = data.dare.id;
            newDare.escrowId = data.dare.escrowId;
          }
        } catch (cloudErr) {
          console.warn('[DareService] Offline mode: creating dare locally', cloudErr);
        }
      }

      // Save locally & activate Native HUD
      this.activeDareCache = newDare;
      await AsyncStorage.setItem(DARE_STORAGE_KEY, JSON.stringify(newDare));

      try {
        setNativeActiveDare(
          newDare.id,
          newDare.stakeRupees,
          newDare.targetLimit,
          newDare.title
        );
      } catch (e) {
        console.warn('[DareService] setNativeActiveDare failed:', e);
      }

      // Schedule renewal / pre-deadline warning alert
      scheduleDareExpiryWarning(newDare.title, newDare.stakeRupees, deadlineDate);

      return { success: true, dare: newDare };
    } catch (e: any) {
      console.error('[DareService] createDare error:', e);
      return { success: false, error: e.message || 'Failed to create dare' };
    }
  }

  /**
   * Renew Dare for Tomorrow (1-tap rollover)
   */
  async renewDare(
    previousDareId?: string,
    customStake?: number,
    customLimit?: number
  ): Promise<{ success: boolean; dare?: RealMoneyDare; error?: string }> {
    try {
      const active = await this.getActiveDare();
      const stake = customStake || (active ? active.stakeRupees : 10);
      const limit = customLimit || (active ? active.targetLimit : 10);

      // Settle active dare first if it was successful
      if (active && active.status === 'ACTIVE') {
        await this.settleDare('COMPLETE', active.currentCount, 'Rolled over to renewed dare');
      }

      const res = await this.createDare({
        stakeRupees: stake,
        targetLimit: limit,
        title: `Renewed Dare: Max ${limit} Reels`,
      });

      return res;
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to renew dare' };
    }
  }

  /**
   * Monitor live reel counts and check for breach or completion
   */
  async checkDareStatus(currentReels: number): Promise<{
    isBreached: boolean;
    isSafe: boolean;
    remaining: number;
    activeDare: RealMoneyDare | null;
  }> {
    const active = await this.getActiveDare();
    if (!active || active.status !== 'ACTIVE') {
      return { isBreached: false, isSafe: true, remaining: 999, activeDare: null };
    }

    active.currentCount = currentReels;
    const remaining = active.targetLimit - currentReels;

    if (currentReels > active.targetLimit && !this.isCheckingBreach) {
      this.isCheckingBreach = true;
      try {
        await this.settleDare(
          'BREACH',
          currentReels,
          `Breached limit: ${currentReels}/${active.targetLimit} reels watched`
        );
      } finally {
        this.isCheckingBreach = false;
      }
      return { isBreached: true, isSafe: false, remaining: 0, activeDare: active };
    }

    return {
      isBreached: false,
      isSafe: remaining > 2,
      remaining: Math.max(0, remaining),
      activeDare: active,
    };
  }

  /**
   * Settle Dare (BREACH forfeit or COMPLETE release)
   */
  async settleDare(
    action: 'BREACH' | 'COMPLETE',
    currentCount: number,
    reason?: string
  ): Promise<{ success: boolean; status: string; message: string }> {
    try {
      const active = await this.getActiveDare();
      if (!active) {
        return { success: false, status: 'NONE', message: 'No active dare to settle' };
      }

      const now = new Date().toISOString();
      const updatedStatus = action === 'BREACH' ? 'BREACHED_FORFEIT' : 'COMPLETED_SUCCESS';

      active.status = updatedStatus;
      active.currentCount = currentCount;
      active.settledAt = now;
      if (reason) active.breachReason = reason;

      // Cancel warning notification
      cancelDareExpiryWarning();

      // Update local storage
      await AsyncStorage.removeItem(DARE_STORAGE_KEY);
      this.activeDareCache = null;

      // Add to Dare History
      try {
        const histRaw = await AsyncStorage.getItem(DARE_HISTORY_STORAGE_KEY);
        const history: RealMoneyDare[] = histRaw ? JSON.parse(histRaw) : [];
        history.unshift(active);
        await AsyncStorage.setItem(DARE_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
      } catch {}

      // Update Native HUD - clear active dare
      try {
        clearNativeActiveDare();
      } catch {}

      // Dispatch to Backend Cloud
      const baseUrl = await syncEngine.getApiUrl();
      const token = await syncEngine.getAuthToken();

      if (token) {
        try {
          await fetch(`${baseUrl}/api/wallet/dare/settle`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              dareId: active.id,
              action,
              currentCount,
              reason,
            }),
          });
        } catch (e) {
          console.warn('[DareService] Cloud settle dispatch failed:', e);
        }
      }

      // Check auto-renew if completed successfully
      if (action === 'COMPLETE') {
        const autoRenew = await this.isAutoRenewEnabled();
        if (autoRenew) {
          console.log('[DareService] Auto-renewing dare for tomorrow...');
          await this.createDare({
            stakeRupees: active.stakeRupees,
            targetLimit: active.targetLimit,
            title: `Auto-Renewed Dare: Max ${active.targetLimit} Reels`,
          });
        }
      }

      return {
        success: true,
        status: updatedStatus,
        message:
          action === 'BREACH'
            ? `Dare breached! ₹${active.stakeRupees} forfeited.`
            : `Dare conquered! ₹${active.stakeRupees} returned to wallet!`,
      };
    } catch (e: any) {
      console.error('[DareService] settleDare error:', e);
      return { success: false, status: 'ERROR', message: e.message || 'Settlement error' };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Task Real-Money Staking
  // ─────────────────────────────────────────────────────────────

  async getTaskStake(taskId: string): Promise<EntityStakeInfo | null> {
    try {
      const raw = await AsyncStorage.getItem(`${TASK_STAKES_KEY}_${taskId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async stakeTask(
    taskId: string,
    title: string,
    stakeRupees: number,
    deadlineDate?: string
  ): Promise<{ success: boolean; stake?: EntityStakeInfo; error?: string }> {
    try {
      if (stakeRupees < 1) return { success: false, error: 'Minimum stake is ₹1' };

      const stakeInfo: EntityStakeInfo = {
        entityId: taskId,
        referenceType: 'task',
        title,
        stakeRupees,
        escrowId: `escrow_task_${taskId}_${Date.now()}`,
        deadline: deadlineDate,
        status: 'active',
        stakedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(`${TASK_STAKES_KEY}_${taskId}`, JSON.stringify(stakeInfo));

      // Sync with cloud escrow if online
      const baseUrl = await syncEngine.getApiUrl();
      const token = await syncEngine.getAuthToken();
      if (token) {
        try {
          await fetch(`${baseUrl}/api/wallet/stake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              referenceType: 'task',
              referenceId: taskId,
              amount: stakeRupees * 100,
              deadline: deadlineDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            }),
          });
        } catch {}
      }

      return { success: true, stake: stakeInfo };
    } catch (e: any) {
      return { success: false, error: e.message || 'Task stake failed' };
    }
  }

  async settleTaskStake(
    taskId: string,
    completed: boolean
  ): Promise<{ success: boolean; released: boolean; amount: number }> {
    const stake = await this.getTaskStake(taskId);
    if (!stake || stake.status !== 'active') return { success: false, released: false, amount: 0 };

    stake.status = completed ? 'released' : 'forfeited';
    await AsyncStorage.setItem(`${TASK_STAKES_KEY}_${taskId}`, JSON.stringify(stake));
    return { success: true, released: completed, amount: stake.stakeRupees };
  }

  // ─────────────────────────────────────────────────────────────
  // Habit Real-Money Staking
  // ─────────────────────────────────────────────────────────────

  async getHabitStake(habitId: string): Promise<EntityStakeInfo | null> {
    try {
      const raw = await AsyncStorage.getItem(`${HABIT_STAKES_KEY}_${habitId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async stakeHabit(
    habitId: string,
    title: string,
    dailyStakeRupees: number
  ): Promise<{ success: boolean; stake?: EntityStakeInfo; error?: string }> {
    try {
      if (dailyStakeRupees < 1) return { success: false, error: 'Minimum stake is ₹1' };

      const stakeInfo: EntityStakeInfo = {
        entityId: habitId,
        referenceType: 'habit',
        title,
        stakeRupees: dailyStakeRupees,
        escrowId: `escrow_habit_${habitId}_${Date.now()}`,
        status: 'active',
        stakedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(`${HABIT_STAKES_KEY}_${habitId}`, JSON.stringify(stakeInfo));

      // Sync with cloud escrow if online
      const baseUrl = await syncEngine.getApiUrl();
      const token = await syncEngine.getAuthToken();
      if (token) {
        try {
          await fetch(`${baseUrl}/api/wallet/stake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              referenceType: 'habit',
              referenceId: habitId,
              amount: dailyStakeRupees * 100,
              deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            }),
          });
        } catch {}
      }

      return { success: true, stake: stakeInfo };
    } catch (e: any) {
      return { success: false, error: e.message || 'Habit stake failed' };
    }
  }

  async settleHabitStake(
    habitId: string,
    completedToday: boolean
  ): Promise<{ success: boolean; released: boolean; amount: number }> {
    const stake = await this.getHabitStake(habitId);
    if (!stake || stake.status !== 'active') return { success: false, released: false, amount: 0 };

    stake.status = completedToday ? 'released' : 'forfeited';
    await AsyncStorage.setItem(`${HABIT_STAKES_KEY}_${habitId}`, JSON.stringify(stake));
    return { success: true, released: completedToday, amount: stake.stakeRupees };
  }
}

export const dareService = new DareService();
