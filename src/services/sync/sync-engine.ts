import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../database/database';

export interface CloudUserProfile {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
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

// Default fallback URL (User can customize to their deployed production Vercel/VPS domain)
export const DEFAULT_PRODUCTION_API_URL = 'https://neuronninja.com';

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
  ): Promise<{ success: boolean; error?: string }> {
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

      // Store user and token
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
      return { success: true };
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
  ): Promise<{ success: boolean; error?: string }> {
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

      // Automatically sign in
      return await this.login(email, pass);
    } catch (err: any) {
      this.currentState = 'error';
      this.lastErrorMessage = err?.message || 'Registration failed';
      this.notify();
      return { success: false, error: this.lastErrorMessage };
    }
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
      // Step 1: Drain pending local Outbox mutations
      syncedCount = await this.drainOutbox(apiUrl, token);

      // Step 2: Pull remote deltas from server (Last-Write-Wins)
      await this.pullRemoteDeltas(apiUrl, token);

      // Step 3: Record successful sync timestamp
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
        let method = item.action === 'DELETE' ? 'DELETE' : 'POST';

        switch (item.entity_type) {
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
          // Increment attempts
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
        throw err; // Stop batch on offline/network failure
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

    // 1. Pull Journal
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
            e.updatedAt || new Date().toISOString()
          );
        }
      }
    } catch {}

    // 2. Pull Notes
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
            n.id,
            n.title || 'Untitled',
            n.content || '',
            JSON.stringify(n.tags || []),
            n.category || 'General',
            n.isPinned ? 1 : 0,
            n.isArchived ? 1 : 0,
            n.createdAt || new Date().toISOString(),
            n.updatedAt || new Date().toISOString()
          );
        }
      }
    } catch {}
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
