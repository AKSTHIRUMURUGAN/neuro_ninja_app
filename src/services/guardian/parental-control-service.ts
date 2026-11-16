import { getDatabase } from '../database/database';
import {
  setCurfewConfig,
  isCurfewActive,
  setParentalPinHash,
  getParentalPinHash,
} from 'expo-app-blocker';
import type { ParentalConfig, AppQuota, ParentalAuditLog } from './parental-types';

class ParentalControlService {
  /**
   * Get active parental control configuration
   */
  async getConfig(): Promise<ParentalConfig> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: number;
      pin_hash: string;
      curfew_enabled: number;
      curfew_start_time: string;
      curfew_end_time: string;
      daily_total_quota_minutes: number;
      strict_curfew_active: number;
      emergency_contacts_json: string;
      updated_at: string;
    }>('SELECT * FROM parental_controls WHERE id = 1');

    if (!row) {
      return {
        id: 1,
        pinHash: '0000',
        curfewEnabled: true,
        curfewStartTime: '21:30',
        curfewEndTime: '06:30',
        dailyTotalQuotaMinutes: 120,
        strictCurfewActive: true,
        emergencyContacts: ['100', '112'],
        updatedAt: new Date().toISOString(),
      };
    }

    let contacts: string[] = ['100', '112'];
    try {
      contacts = JSON.parse(row.emergency_contacts_json || '[]');
    } catch {}

    return {
      id: row.id,
      pinHash: row.pin_hash,
      curfewEnabled: row.curfew_enabled === 1,
      curfewStartTime: row.curfew_start_time,
      curfewEndTime: row.curfew_end_time,
      dailyTotalQuotaMinutes: row.daily_total_quota_minutes,
      strictCurfewActive: row.strict_curfew_active === 1,
      emergencyContacts: contacts,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Verify master parent PIN
   */
  async verifyParentPin(enteredPin: string): Promise<boolean> {
    const config = await this.getConfig();
    const nativeHash = getParentalPinHash();
    const valid = enteredPin.trim() === config.pinHash || enteredPin.trim() === nativeHash;
    if (!valid) {
      await this.logAuditEvent('settings_tamper_attempt', undefined, 'Invalid master PIN entered');
    }
    return valid;
  }

  /**
   * Update master parent PIN
   */
  async updateParentPin(newPin: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const cleanPin = newPin.trim();

    await db.runAsync(
      'UPDATE parental_controls SET pin_hash = ?, updated_at = ? WHERE id = 1',
      [cleanPin, now]
    );

    setParentalPinHash(cleanPin);
    await this.logAuditEvent('parent_override', undefined, 'Master Parent PIN was updated');
  }

  /**
   * Update bedtime curfew settings & push to native Android AppBlockerService
   */
  async updateCurfew(
    enabled: boolean,
    startTime: string,
    endTime: string,
    strict: boolean
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE parental_controls 
       SET curfew_enabled = ?, curfew_start_time = ?, curfew_end_time = ?, strict_curfew_active = ?, updated_at = ?
       WHERE id = 1`,
      [enabled ? 1 : 0, startTime, endTime, strict ? 1 : 0, now]
    );

    // Parse start & end into minutes from midnight
    const [startH, startM] = startTime.split(':').map((n) => parseInt(n, 10) || 0);
    const [endH, endM] = endTime.split(':').map((n) => parseInt(n, 10) || 0);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Enforce in native SharedPreferences
    setCurfewConfig(enabled, startMinutes, endMinutes, strict);

    await this.logAuditEvent(
      'parent_override',
      undefined,
      `Curfew updated to ${startTime} - ${endTime} (enabled: ${enabled}, strict: ${strict})`
    );
  }

  /**
   * Check if bedtime curfew is active right now
   */
  async isCurfewActiveNow(): Promise<boolean> {
    try {
      return isCurfewActive();
    } catch {
      const config = await this.getConfig();
      if (!config.curfewEnabled) return false;
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = config.curfewStartTime.split(':').map(Number);
      const [endH, endM] = config.curfewEndTime.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;

      if (start <= end) return nowMinutes >= start && nowMinutes <= end;
      return nowMinutes >= start || nowMinutes <= end;
    }
  }

  /**
   * Get all registered app quotas
   */
  async getAppQuotas(): Promise<AppQuota[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      package_name: string;
      app_name: string;
      daily_limit_minutes: number;
      is_curfew_blocked: number;
    }>('SELECT * FROM app_quotas ORDER BY daily_limit_minutes ASC');

    return rows.map((r) => ({
      packageName: r.package_name,
      appName: r.app_name,
      dailyLimitMinutes: r.daily_limit_minutes,
      isCurfewBlocked: r.is_curfew_blocked === 1,
    }));
  }

  /**
   * Add or update an app quota
   */
  async saveAppQuota(packageName: string, appName: string, limitMinutes: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO app_quotas (package_name, app_name, daily_limit_minutes, is_curfew_blocked)
       VALUES (?, ?, ?, 1)`,
      [packageName, appName, limitMinutes]
    );

    await this.logAuditEvent('parent_override', packageName, `Set quota of ${limitMinutes}m for ${appName}`);
  }

  /**
   * Delete an app quota
   */
  async deleteAppQuota(packageName: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_quotas WHERE package_name = ?', [packageName]);
  }

  /**
   * Log an audit event
   */
  async logAuditEvent(
    eventType: ParentalAuditLog['eventType'],
    packageName?: string,
    details = ''
  ): Promise<void> {
    const db = await getDatabase();
    const id = 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO parental_audit_logs (id, event_type, package_name, details, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, eventType, packageName ?? null, details, now]
    );
  }

  /**
   * Get recent parental audit logs
   */
  async getAuditLogs(limit = 30): Promise<ParentalAuditLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      event_type: string;
      package_name: string | null;
      details: string;
      created_at: string;
    }>('SELECT * FROM parental_audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);

    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type as any,
      packageName: r.package_name ?? undefined,
      details: r.details,
      createdAt: r.created_at,
    }));
  }
}

export const parentalControlService = new ParentalControlService();
