import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../database/database';

export interface CloudUserProfile {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
  provider?: string;
  plan?: string;
  level?: number;
  xp?: number;
  coins?: number;
  currentStreak?: number;
  longestStreak?: number;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage?: string;
  user: CloudUserProfile | null;
  apiUrl: string;
}

const STORAGE_KEYS = {
  API_URL: '@nn_cloud_api_url',
  AUTH_TOKEN: '@nn_cloud_jwt_token',
  USER_PROFILE: '@nn_cloud_user_profile',
  LAST_SYNCED_AT: '@nn_last_synced_at',
};

// Official production web URL for bidirectional sync
export const DEFAULT_PRODUCTION_API_URL = 'https://neuroninja.vercel.app';

class SyncEngine {
  private listeners = new Set<(status: SyncStatus) => void>();
  private currentState: SyncState = 'idle';
  private lastErrorMessage?: string;
  private isSyncing = false;

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    void this.getStatus().then(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    void this.getStatus().then((status) => {
      this.listeners.forEach((l) => l(status));
    });
  }

  public async getApiUrl(): Promise<string> {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
    return saved?.trim() || DEFAULT_PRODUCTION_API_URL;
  }

  public async setApiUrl(url: string): Promise<void> {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEYS.API_URL, cleanUrl);
    this.notify();
  }

  public async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  public async getUserProfile(): Promise<CloudUserProfile | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  }

  public async getPendingOutboxCount(): Promise<number> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'pending'"
      );
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  }

  public async getStatus(): Promise<SyncStatus> {
    const [apiUrl, user, pendingCount, lastSyncedAt] = await Promise.all([
      this.getApiUrl(),
      this.getUserProfile(),
      this.getPendingOutboxCount(),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNCED_AT),
    ]);

    return {
      state: this.currentState,
      pendingCount,
      lastSyncedAt,
      errorMessage: this.lastErrorMessage,
      user,
      apiUrl,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Cloud Auth
  // ─────────────────────────────────────────────────────────────

  public async login(
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; user?: CloudUserProfile }> {
    try {
      this.currentState = 'syncing';
      this.notify();

      const apiUrl = await this.getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed. Check your credentials.');
      }

      const token = data.token || res.headers.get('set-cookie') || 'session_token';
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      if (data.user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.user));
      }

      this.currentState = 'synced';
      this.lastErrorMessage = undefined;
      this.notify();

      // Trigger immediate initial synchronization
      void this.syncNow();
      return { success: true, user: data.user };
    } catch (err: any) {
      this.currentState = 'error';
      this.lastErrorMessage = err?.message || 'Login failed';
      this.notify();
      return { success: false, error: this.lastErrorMessage };
    }
  }

  public async register(
    email: string,
    pass: string,
    name: string
  ): Promise<{ success: boolean; error?: string; user?: CloudUserProfile }> {
    try {
      this.currentState = 'syncing';
      this.notify();

      const apiUrl = await this.getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass, name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      // Automatically sign in with credentials
      return await this.login(email, pass);
    } catch (err: any) {
      this.currentState = 'error';
      this.lastErrorMessage = err?.message || 'Registration failed';
      this.notify();
      return { success: false, error: this.lastErrorMessage };
    }
  }

  public async loginWithOAuth(
    user: { uid: string; email: string; displayName?: string; photoURL?: string },
    provider: 'google' | 'facebook' | 'twitter' = 'google',
    isNewUser: boolean = false
  ): Promise<{ success: boolean; error?: string; user?: CloudUserProfile }> {
    try {
      this.currentState = 'syncing';
      this.notify();

      const apiUrl = await this.getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/oauth-handler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, provider, isNewUser }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'OAuth Sign-In failed');
      }

      const token = data.token || 'oauth_session_token';
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      const profile: CloudUserProfile = {
        id: data.user?.id || user.uid,
        email: data.user?.email || user.email,
        name: data.user?.name || user.displayName || 'Ninja User',
        photoURL: data.user?.photoURL || user.photoURL,
        provider,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));

      this.currentState = 'synced';
      this.lastErrorMessage = undefined;
      this.notify();

      void this.syncNow();
      return { success: true, user: profile };
    } catch (err: any) {
      this.currentState = 'error';
      this.lastErrorMessage = err?.message || 'OAuth Sign-In failed';
      this.notify();
      return { success: false, error: this.lastErrorMessage };
    }
  }

  public async setExternalSession(
    token: string,
    user: Partial<CloudUserProfile>
  ): Promise<CloudUserProfile> {
    const profile: CloudUserProfile = {
      id: user.id || 'ninja_' + Date.now(),
      email: user.email || '',
      name: user.name || 'Ninja Explorer',
      photoURL: user.photoURL,
      provider: user.provider || 'google',
    };
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    this.currentState = 'synced';
    this.lastErrorMessage = undefined;
    this.notify();
    void this.syncNow();
    return profile;
  }

  public async refreshProfile(): Promise<CloudUserProfile | null> {
    const token = await this.getAuthToken();
    const apiUrl = await this.getApiUrl();
    if (!token) return null;

    try {
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: `auth-token=${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const profile: CloudUserProfile = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            photoURL: data.user.photoURL,
            provider: data.user.provider,
            plan: data.user.plan,
            level: data.user.level,
            xp: data.user.xp,
            coins: data.user.coins,
            currentStreak: data.user.currentStreak,
            longestStreak: data.user.longestStreak,
          };
          await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
          this.notify();
          return profile;
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Failed to refresh profile:', err);
    }
    return null;
  }

  public async logout(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_PROFILE,
      STORAGE_KEYS.LAST_SYNCED_AT,
    ]);
    this.currentState = 'idle';
    this.lastErrorMessage = undefined;
    this.notify();
  }

  // ─────────────────────────────────────────────────────────────
  // Bi-Directional Synchronization Loop
  // ─────────────────────────────────────────────────────────────

  public async syncNow(): Promise<{ success: boolean; syncedItems: number; error?: string }> {
    if (this.isSyncing) {
      return { success: true, syncedItems: 0 };
    }

    const token = await this.getAuthToken();
    const apiUrl = await this.getApiUrl();

    // If not logged in, remain in offline local mode
    if (!token) {
      this.currentState = 'offline';
      this.notify();
      return { success: false, syncedItems: 0, error: 'No cloud account connected' };
    }

    this.isSyncing = true;
    this.currentState = 'syncing';
    this.notify();

    let syncedCount = 0;

    try {
      // Step 1: Drain pending local Outbox mutations to Web
      syncedCount = await this.drainOutbox(apiUrl, token);

      // Step 2: Pull remote deltas from server (Last-Write-Wins)
      await this.pullRemoteDeltas(apiUrl, token);

      // Step 3: Refresh user level, coins, and streak
      await this.refreshProfile();

      // Step 4: Record successful sync timestamp
      const now = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNCED_AT, now);

      this.currentState = 'synced';
      this.lastErrorMessage = undefined;
      this.notify();
      return { success: true, syncedItems: syncedCount };
    } catch (err: any) {
      console.warn('[SyncEngine] Sync error:', err);
      this.currentState = 'offline';
      this.lastErrorMessage = err?.message || 'Network unavailable';
      this.notify();
      return { success: false, syncedItems: syncedCount, error: this.lastErrorMessage };
    } finally {
      this.isSyncing = false;
    }
  }

  private async drainOutbox(apiUrl: string, token: string): Promise<number> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM sync_outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100"
    );

    if (!rows || rows.length === 0) return 0;
    let successCount = 0;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Cookie: `auth-token=${token}`,
    };

    for (const item of rows) {
      try {
        const payload = JSON.parse(item.payload_json);
        let endpoint = '';
        const method = item.action === 'DELETE' ? 'DELETE' : 'POST';

        switch (item.entity_type) {
          case 'habit_completion': {
            const res = await fetch(`${apiUrl}/api/habits/${payload.habitId}/update-completion`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                date: payload.date,
                state: payload.status,
                confirmForfeit: true,
              }),
            });
            if (res.ok || res.status === 404) {
              await db.runAsync('DELETE FROM sync_outbox WHERE outbox_id = ?', item.outbox_id);
              successCount++;
            } else {
              await db.runAsync(
                "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE outbox_id = ?",
                `HTTP ${res.status}`,
                item.outbox_id
              );
            }
            continue;
          }
          case 'habit':
            endpoint = `${apiUrl}/api/habits`;
            break;
          case 'task':
            endpoint = `${apiUrl}/api/tasks`;
            break;
          case 'journal':
            endpoint = `${apiUrl}/api/journal`;
            break;
          case 'note':
            endpoint = `${apiUrl}/api/notes`;
            break;
          case 'finance_transaction':
            endpoint = `${apiUrl}/api/expenses`;
            break;
          case 'finance_salary':
            endpoint = `${apiUrl}/api/finance/salary`;
            break;
          case 'finance_emi':
            endpoint = `${apiUrl}/api/finance/emi`;
            break;
          case 'finance_investment':
            endpoint = `${apiUrl}/api/finance/investments`;
            break;
          case 'finance_networth':
            endpoint = `${apiUrl}/api/finance/net-worth-items`;
            break;
          case 'body_water':
            endpoint = `${apiUrl}/api/body/water`;
            break;
          case 'body_fasting':
            endpoint = `${apiUrl}/api/body/fasting`;
            break;
          case 'body_meals':
            endpoint = `${apiUrl}/api/body/meals`;
            break;
          case 'body_mental':
            endpoint = `${apiUrl}/api/body/mental-health`;
            break;
          case 'body_metrics':
            endpoint = `${apiUrl}/api/body/metrics`;
            break;
          case 'store_orders':
            endpoint = `${apiUrl}/api/store/order`;
            break;
          case 'shopping_lists':
            endpoint = `${apiUrl}/api/shopping/sync`;
            break;
          case 'user_stats':
            endpoint = `${apiUrl}/api/user/sync-stats`;
            break;
          default:
            continue;
        }

        const res = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok || res.status === 404) {
          // Successfully synchronized or already deleted on remote
          await db.runAsync('DELETE FROM sync_outbox WHERE outbox_id = ?', item.outbox_id);
          successCount++;
        } else {
          await db.runAsync(
            "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE outbox_id = ?",
            `HTTP ${res.status}`,
            item.outbox_id
          );
        }
      } catch (err: any) {
        await db.runAsync(
          "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE outbox_id = ?",
          err?.message || 'Network error',
          item.outbox_id
        );
        throw err; // Stop batch on offline failure
      }
    }

    return successCount;
  }

  private async pullRemoteDeltas(apiUrl: string, token: string): Promise<void> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Cookie: `auth-token=${token}`,
    };

    const db = await getDatabase();

    // 1. Pull Habits
    try {
      const hRes = await fetch(`${apiUrl}/api/habits`, { headers });
      if (hRes.ok) {
        const habits = await hRes.json();
        if (Array.isArray(habits)) {
          for (const h of habits) {
            const hId = h.id || h.habit_id;
            if (!hId) continue;
            await db.runAsync(
              `INSERT INTO habits_v2 (
                habit_id, title, frequency, schedule_json, category, icon, color,
                rest_days_json, recovery_window_days, challenge_target_days, reward_points, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(habit_id) DO UPDATE SET
                title = excluded.title,
                frequency = excluded.frequency,
                schedule_json = excluded.schedule_json,
                category = excluded.category,
                icon = excluded.icon,
                color = excluded.color,
                rest_days_json = excluded.rest_days_json,
                challenge_target_days = excluded.challenge_target_days,
                reward_points = excluded.reward_points`,
              [
                hId,
                h.title || 'Habit',
                h.frequency || 'daily',
                JSON.stringify(h.schedule || h.targetDays || []),
                h.category || 'mind',
                h.icon || 'leaf-outline',
                h.color || '#10B981',
                JSON.stringify(h.restDays || []),
                h.recoveryWindowDays ?? 1,
                h.targetDaysCount ?? h.challenge_target_days ?? 21,
                h.rewardPoints ?? 10,
                h.createdAt || new Date().toISOString(),
              ]
            );

            // Fetch completions for this habit
            try {
              const compRes = await fetch(`${apiUrl}/api/habits/${hId}/completions?limit=100`, { headers });
              if (compRes.ok) {
                const compData = await compRes.json();
                if (Array.isArray(compData)) {
                  for (const c of compData) {
                    if (!c.date) continue;
                    const dateStr = typeof c.date === 'string' ? c.date.split('T')[0] : '';
                    if (!dateStr) continue;
                    const status = c.status || (c.completed ? 'completed' : 'not_attempted');
                    if (status === 'not_attempted') {
                      await db.runAsync('DELETE FROM habit_checkins WHERE habit_id = ? AND date = ?', hId, dateStr);
                    } else {
                      await db.runAsync(
                        `INSERT INTO habit_checkins (checkin_id, habit_id, date, status, notes)
                         VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(habit_id, date) DO UPDATE SET
                           status = excluded.status,
                           notes = excluded.notes`,
                        `chk_${hId}_${dateStr}`,
                        hId,
                        dateStr,
                        status,
                        c.notes || null
                      );
                    }
                  }
                }
              }
            } catch {
              // Ignore single habit completions network errors
            }
          }
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Pull habits failed:', err);
    }

    // 2. Pull Tasks
    try {
      const tRes = await fetch(`${apiUrl}/api/tasks`, { headers });
      if (tRes.ok) {
        const tData = await tRes.json();
        const tasks = Array.isArray(tData) ? tData : (tData.tasks || tData.data || []);
        for (const t of tasks) {
          const tId = t.id || t.task_id;
          if (!tId) continue;
          await db.runAsync(
            `INSERT INTO tasks (
              task_id, title, description, status, priority, list_id,
              due_at_utc, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(task_id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              status = excluded.status,
              priority = excluded.priority,
              list_id = excluded.list_id,
              due_at_utc = excluded.due_at_utc,
              updated_at = excluded.updated_at
            WHERE excluded.updated_at >= tasks.updated_at`,
            [
              tId,
              t.title || 'Task',
              t.description || null,
              t.status || 'inbox',
              t.priority || 'normal',
              t.listId || null,
              t.dueAt || t.dueDate || null,
              t.createdAt || new Date().toISOString(),
              t.updatedAt || new Date().toISOString(),
            ]
          );
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Pull tasks failed:', err);
    }

    // 3. Pull Finance Expenses & Transactions
    try {
      const eRes = await fetch(`${apiUrl}/api/expenses`, { headers });
      if (eRes.ok) {
        const eData = await eRes.json();
        const items = Array.isArray(eData) ? eData : (eData.expenses || eData.data || []);
        for (const exp of items) {
          const expId = exp.id || exp._id;
          if (!expId) continue;
          await db.runAsync(
            `INSERT INTO finance_transactions_v2 (
              id, amount, type, category, category_group, spent_on, payment_method, description, timestamp, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              amount = excluded.amount,
              type = excluded.type,
              category = excluded.category,
              category_group = excluded.category_group,
              spent_on = excluded.spent_on,
              payment_method = excluded.payment_method,
              description = excluded.description,
              timestamp = excluded.timestamp`,
            [
              expId,
              Number(exp.amount) || 0,
              exp.type || 'expense',
              exp.category || 'General',
              exp.categoryGroup || 'personal',
              exp.spentOn || 'personal',
              exp.paymentMethod || 'upi',
              exp.description || '',
              exp.date || exp.timestamp || new Date().toISOString(),
              exp.createdAt || new Date().toISOString(),
            ]
          );
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Pull expenses failed:', err);
    }

    // 4. Pull Journal Entries
    try {
      const jRes = await fetch(`${apiUrl}/api/journal?limit=100`, { headers });
      if (jRes.ok) {
        const data = await jRes.json();
        const entries = data.entries || [];
        for (const e of entries) {
          await db.runAsync(
            `INSERT INTO journal_entries (
              id, type, date, title, content, mood_rating, energy_rating,
              tags_json, morning_data_json, evening_data_json, rant_data_json,
              is_burned, created_at, updated_at, sync_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
            ON CONFLICT(id) DO UPDATE SET
              type = excluded.type,
              date = excluded.date,
              title = excluded.title,
              content = excluded.content,
              mood_rating = excluded.mood_rating,
              energy_rating = excluded.energy_rating,
              tags_json = excluded.tags_json,
              morning_data_json = excluded.morning_data_json,
              evening_data_json = excluded.evening_data_json,
              rant_data_json = excluded.rant_data_json,
              is_burned = excluded.is_burned,
              updated_at = excluded.updated_at,
              sync_status = 'synced'
            WHERE excluded.updated_at >= journal_entries.updated_at`,
            [
              e.id,
              e.type || 'morning',
              e.date,
              e.title || null,
              e.content || '',
              e.moodRating ?? null,
              e.energyRating ?? null,
              JSON.stringify(e.tags || []),
              e.morningData ? JSON.stringify(e.morningData) : null,
              e.eveningData ? JSON.stringify(e.eveningData) : null,
              e.rantData ? JSON.stringify(e.rantData) : null,
              e.isBurned ? 1 : 0,
              e.createdAt || new Date().toISOString(),
              e.updatedAt || new Date().toISOString(),
            ]
          );
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Pull journal failed:', err);
    }

    // 5. Pull Notes
    try {
      const nRes = await fetch(`${apiUrl}/api/notes`, { headers });
      if (nRes.ok) {
        const data = await nRes.json();
        const notes = data.data?.notes || [];
        for (const n of notes) {
          await db.runAsync(
            `INSERT INTO notes (
              id, title, content, tags_json, category, is_pinned, is_archived,
              created_at, updated_at, sync_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              content = excluded.content,
              tags_json = excluded.tags_json,
              category = excluded.category,
              is_pinned = excluded.is_pinned,
              is_archived = excluded.is_archived,
              updated_at = excluded.updated_at,
              sync_status = 'synced'
            WHERE excluded.updated_at >= notes.updated_at`,
            [
              n.id,
              n.title || 'Untitled',
              n.content || '',
              JSON.stringify(n.tags || []),
              n.category || 'General',
              n.isPinned ? 1 : 0,
              n.isArchived ? 1 : 0,
              n.createdAt || new Date().toISOString(),
              n.updatedAt || new Date().toISOString(),
            ]
          );
        }
      }
    } catch (err) {
      console.warn('[SyncEngine] Pull notes failed:', err);
    }
  }
}

export const syncEngine = new SyncEngine();

export async function enqueueSyncItem(
  entityType: string,
  entityId: string,
  action: string,
  payload: unknown
): Promise<void> {
  try {
    const db = await getDatabase();
    const outboxId = 'out_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [outboxId, entityType, entityId, action, JSON.stringify(payload), now]
    );
  } catch (err) {
    console.warn('[SyncEngine] Failed to enqueue sync item:', err);
  }
}
