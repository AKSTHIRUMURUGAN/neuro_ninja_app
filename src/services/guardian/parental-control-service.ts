import * as LocalAuthentication from 'expo-local-authentication';
import { getDatabase } from '../database/database';
import {
  setCurfewConfig,
  isCurfewActive,
  setParentalPinHash,
  getParentalPinHash,
} from 'expo-app-blocker';
import type {
  ParentalConfig,
  AppQuota,
  ParentalAuditLog,
  EmergencyPassResult,
} from './parental-types';

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

    // Retrieve biometric toggle and security question from lifeos_state
    const bioRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'parental_biometrics_enabled'"
    );
    const biometricsEnabled = bioRow?.value_json === '1';

    const secQRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'parental_security_q'"
    );
    const securityQuestion = secQRow?.value_json || 'What is your primary focus goal?';

    const secARow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'parental_security_a'"
    );
    const securityAnswerHash = secARow?.value_json || 'focus';

    const pairingRow = await db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM lifeos_state WHERE key = 'guardian_pairing_key'"
    );
    const guardianPairingKey = pairingRow?.value_json || 'GUARD-7729';

    if (!row) {
      return {
        id: 1,
        pinHash: '0000',
        curfewEnabled: true,
        curfewStartTime: '21:30',
        curfewEndTime: '06:30',
        dailyTotalQuotaMinutes: 120,
        strictCurfewActive: true,
        biometricsEnabled,
        emergencyContacts: ['100', '112'],
        securityQuestion,
        securityAnswerHash,
        guardianPairingKey,
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
      biometricsEnabled,
      emergencyContacts: contacts,
      securityQuestion,
      securityAnswerHash,
      guardianPairingKey,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Biometric Authentication (FaceID / Fingerprint) via expo-local-authentication
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return false;
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock NeuroNinja Guardian Controls',
        fallbackLabel: 'Use Master PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (res.success) {
        await this.logAuditEvent('biometric_unlock', undefined, 'Parental controls unlocked via Biometrics');
      }
      return res.success;
    } catch (e) {
      console.warn('[ParentalControlService] Biometric auth error:', e);
      return false;
    }
  }

  /**
   * Verify master parent PIN
   */
  async verifyParentPin(enteredPin: string): Promise<boolean> {
    const config = await this.getConfig();
    let nativeHash = '';
    try {
      nativeHash = getParentalPinHash();
    } catch {}

    const clean = enteredPin.trim();
    const valid = clean === config.pinHash || clean === nativeHash;
    if (!valid) {
      await this.logAuditEvent('settings_tamper_attempt', undefined, 'Invalid master PIN attempt recorded');
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

    try {
      setParentalPinHash(cleanPin);
    } catch {}

    await this.logAuditEvent('parent_override', undefined, 'Master Parent PIN was updated');
  }

  /**
   * Update biometric enablement
   */
  async updateBiometrics(enabled: boolean): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT OR REPLACE INTO lifeos_state (key, value_json, updated_at) VALUES ('parental_biometrics_enabled', ?, ?)",
      [enabled ? '1' : '0', now]
    );
  }

  /**
   * Generate today's deterministic 4-digit Emergency Override Code
   */
  async getEmergencyOverrideCode(): Promise<string> {
    const config = await this.getConfig();
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const seed = today + '_GUARDIAN_' + config.pinHash;

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const codeNum = Math.abs(hash % 9000) + 1000;
    return codeNum.toString();
  }

  /**
   * Redeem a 15-minute emergency focus pass using the parent's daily emergency override code
   */
  async redeemEmergencyPass(enteredCode: string): Promise<EmergencyPassResult> {
    const expected = await this.getEmergencyOverrideCode();
    if (enteredCode.trim() !== expected) {
      await this.logAuditEvent('settings_tamper_attempt', undefined, 'Invalid emergency override code attempt');
      return {
        success: false,
        message: 'Invalid emergency code. Request the current 4-digit daily code from your guardian.',
        durationMinutes: 0,
      };
    }

    await this.logAuditEvent('emergency_pass_granted', undefined, '15-minute emergency pass granted via Daily Code');
    return {
      success: true,
      message: 'Emergency pass validated! 15 minutes of unlocked focus granted.',
      durationMinutes: 15,
    };
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
    try {
      setCurfewConfig(enabled, startMinutes, endMinutes, strict);
    } catch {}

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
   * Remove an app quota
   */
  async removeAppQuota(packageName: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_quotas WHERE package_name = ?', [packageName]);
    await this.logAuditEvent('parent_override', packageName, `Removed quota for ${packageName}`);
  }

  async deleteAppQuota(packageName: string): Promise<void> {
    return this.removeAppQuota(packageName);
  }

  /**
   * Log parental security audit event
   */
  async logAuditEvent(
    eventType: ParentalAuditLog['eventType'],
    packageName?: string,
    details: string = ''
  ): Promise<void> {
    try {
      const db = await getDatabase();
      const id = 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const now = new Date().toISOString();

      await db.runAsync(
        'INSERT INTO parental_audit_logs (id, event_type, package_name, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, eventType, packageName ?? null, details, now]
      );
    } catch (e) {
      console.warn('[ParentalControlService] Audit log error:', e);
    }
  }

  /**
   * Retrieve recent security audit events
   */
  async getAuditLogs(limit: number = 30): Promise<ParentalAuditLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      event_type: string;
      package_name: string | null;
      details: string | null;
      created_at: string;
    }>('SELECT * FROM parental_audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);

    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type as ParentalAuditLog['eventType'],
      packageName: r.package_name ?? undefined,
      details: r.details || '',
      createdAt: r.created_at,
    }));
  }
}

export const parentalControlService = new ParentalControlService();
