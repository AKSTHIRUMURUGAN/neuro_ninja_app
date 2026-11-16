// Women's Health & Cycle Tracking Engine
// Parity with Flo, Clue, Natural Cycles, and neuro_ninja_web

import { getDatabase } from '../database/database';
import { villainEngine } from '../villains/villain-engine';
import { walletService } from '../wallet/wallet-service';
import type {
  WomensHealthProfile,
  WomensHealthLog,
  CycleStats,
  CyclePhase,
  PregnancyProfile,
} from './body-types';
import { CYCLE_PHASE_META } from './body-types';

export class WomensHealthEngine {
  private getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ────────── Profile Operations ──────────
  async getProfile(): Promise<WomensHealthProfile> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      user_id: string;
      mode: string;
      average_cycle_length: number;
      average_period_length: number;
      last_period_start_date: string | null;
      is_irregular: number;
      pregnancy_profile_json: string | null;
      updated_at: string;
    }>('SELECT * FROM womens_health_profiles WHERE user_id = ?', ['default_user']);

    if (!row) {
      // Seed default profile with last period 14 days ago for realistic demo
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const defaultLmp = twoWeeksAgo.toISOString().split('T')[0];

      const defaultProfile: WomensHealthProfile = {
        userId: 'default_user',
        mode: 'cycle',
        averageCycleLength: 28,
        averagePeriodLength: 5,
        lastPeriodStartDate: defaultLmp,
        isIrregular: false,
        privacyPinEnabled: false,
        updatedAt: new Date().toISOString(),
      };

      await db.runAsync(
        `INSERT INTO womens_health_profiles (
          user_id, mode, average_cycle_length, average_period_length,
          last_period_start_date, is_irregular, pregnancy_profile_json,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultProfile.userId,
          defaultProfile.mode,
          defaultProfile.averageCycleLength,
          defaultProfile.averagePeriodLength,
          defaultProfile.lastPeriodStartDate ?? null,
          0,
          null,
          defaultProfile.updatedAt,
        ]
      );
      return defaultProfile;
    }

    let pregnancyProfile: PregnancyProfile | undefined;
    if (row.pregnancy_profile_json) {
      try {
        pregnancyProfile = JSON.parse(row.pregnancy_profile_json);
      } catch (e) {
        console.warn('[WomensHealthEngine] Failed to parse pregnancy json:', e);
      }
    }

    return {
      userId: row.user_id,
      mode: (row.mode as any) || 'cycle',
      averageCycleLength: row.average_cycle_length || 28,
      averagePeriodLength: row.average_period_length || 5,
      lastPeriodStartDate: row.last_period_start_date ?? undefined,
      isIrregular: Boolean(row.is_irregular),
      pregnancyProfile,
      privacyPinEnabled: false,
      updatedAt: row.updated_at,
    };
  }

  async saveProfile(profile: Partial<WomensHealthProfile>): Promise<WomensHealthProfile> {
    const current = await this.getProfile();
    const updated: WomensHealthProfile = {
      ...current,
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO womens_health_profiles (
        user_id, mode, average_cycle_length, average_period_length,
        last_period_start_date, is_irregular, pregnancy_profile_json,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        updated.userId,
        updated.mode,
        updated.averageCycleLength,
        updated.averagePeriodLength,
        updated.lastPeriodStartDate ?? null,
        updated.isIrregular ? 1 : 0,
        updated.pregnancyProfile ? JSON.stringify(updated.pregnancyProfile) : null,
        updated.updatedAt,
      ]
    );

    return updated;
  }

  // ────────── Daily Logs ──────────
  async getTodayLog(date?: string): Promise<WomensHealthLog | null> {
    const targetDate = date || this.getTodayStr();
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      log_id: string;
      date: string;
      is_period_start: number;
      is_period_end: number;
      flow_level: string | null;
      symptoms_json: string | null;
      moods_json: string | null;
      bbt_celsius: number | null;
      cervical_mucus: string | null;
      notes: string | null;
      created_at: string;
    }>('SELECT * FROM womens_health_logs WHERE date = ?', [targetDate]);

    if (!row) return null;

    let symptoms: string[] = [];
    let moods: string[] = [];
    try {
      if (row.symptoms_json) symptoms = JSON.parse(row.symptoms_json);
      if (row.moods_json) moods = JSON.parse(row.moods_json);
    } catch (e) {
      console.warn('[WomensHealthEngine] Error parsing symptoms/moods JSON:', e);
    }

    return {
      logId: row.log_id,
      date: row.date,
      isPeriodStart: Boolean(row.is_period_start),
      isPeriodEnd: Boolean(row.is_period_end),
      flowLevel: (row.flow_level as any) ?? undefined,
      symptoms,
      moods,
      bbtCelsius: row.bbt_celsius ?? undefined,
      cervicalMucus: (row.cervical_mucus as any) ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    };
  }

  async saveTodayLog(log: Partial<WomensHealthLog>, date?: string): Promise<WomensHealthLog> {
    const targetDate = date || this.getTodayStr();
    const current = (await this.getTodayLog(targetDate)) || {
      logId: `wh_log_${Date.now()}`,
      date: targetDate,
      isPeriodStart: false,
      isPeriodEnd: false,
      symptoms: [],
      moods: [],
      createdAt: new Date().toISOString(),
    };

    const updated: WomensHealthLog = {
      ...current,
      ...log,
      date: targetDate,
    };

    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO womens_health_logs (
        log_id, date, is_period_start, is_period_end, flow_level,
        symptoms_json, moods_json, bbt_celsius, cervical_mucus, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        updated.logId,
        updated.date,
        updated.isPeriodStart ? 1 : 0,
        updated.isPeriodEnd ? 1 : 0,
        updated.flowLevel ?? null,
        JSON.stringify(updated.symptoms || []),
        JSON.stringify(updated.moods || []),
        updated.bbtCelsius ?? null,
        updated.cervicalMucus ?? null,
        updated.notes ?? null,
        updated.createdAt,
      ]
    );

    // If period start was checked, update profile's last period date
    if (updated.isPeriodStart) {
      await this.saveProfile({ lastPeriodStartDate: targetDate });
    }

    // Gamification Hook: Logging cycle symptoms/period awards coins & deals combat damage!
    try {
      await walletService.creditCoins(30, 60, 'habit', 'Logged Cycle & Vitality Health check-in');
      await villainEngine.dealDamage('habit', 40, 'Balanced Hormonal Energy — Struck the Villain!');
    } catch (err) {
      console.warn('[WomensHealthEngine] Combat reward error:', err);
    }

    return updated;
  }

  // ────────── Cycle Statistics & Prediction Engine ──────────
  async calculateCycleStats(targetDateStr?: string): Promise<CycleStats> {
    const date = targetDateStr || this.getTodayStr();
    const profile = await this.getProfile();
    const todayLog = await this.getTodayLog(date);

    const cycleLength = profile.averageCycleLength || 28;
    const periodLength = profile.averagePeriodLength || 5;

    // Calculate days elapsed since last period start
    let daysSinceLmp = 0;
    if (profile.lastPeriodStartDate) {
      const lmpTime = new Date(profile.lastPeriodStartDate).getTime();
      const curTime = new Date(date).getTime();
      const diffDays = Math.floor((curTime - lmpTime) / (1000 * 60 * 60 * 24));
      daysSinceLmp = Math.max(0, diffDays);
    }

    const currentCycleDay = (daysSinceLmp % cycleLength) + 1;
    const ovulationDay = Math.round(cycleLength - 14); // Standard luteal phase is ~14 days

    // Determine predicted cycle phase
    let predictedPhase: CyclePhase = 'follicular';
    if (currentCycleDay <= periodLength) {
      predictedPhase = 'menstrual';
    } else if (currentCycleDay < ovulationDay - 1) {
      predictedPhase = 'follicular';
    } else if (currentCycleDay <= ovulationDay + 1) {
      predictedPhase = 'ovulation';
    } else {
      predictedPhase = 'luteal';
    }

    // Fertile window calculation (5 days before ovulation + 1 day after)
    const fertileStart = ovulationDay - 5;
    const fertileEnd = ovulationDay + 1;
    const isFertileWindow = currentCycleDay >= fertileStart && currentCycleDay <= fertileEnd;

    let conceptionProbability: 'low' | 'medium' | 'high' | 'peak' = 'low';
    if (currentCycleDay === ovulationDay) {
      conceptionProbability = 'peak';
    } else if (currentCycleDay >= ovulationDay - 2 && currentCycleDay < ovulationDay) {
      conceptionProbability = 'high';
    } else if (isFertileWindow) {
      conceptionProbability = 'medium';
    }

    // Days until next period
    const daysUntilNextPeriod = Math.max(0, cycleLength - currentCycleDay + 1);

    // Compute next period start date
    const nextPeriodDate = new Date();
    nextPeriodDate.setDate(nextPeriodDate.getDate() + daysUntilNextPeriod);
    const nextPeriodStartDate = nextPeriodDate.toISOString().split('T')[0];

    // Compute ovulation date
    const ovulDate = new Date();
    ovulDate.setDate(ovulDate.getDate() + (ovulationDay - currentCycleDay));
    const ovulationDate = ovulDate.toISOString().split('T')[0];

    // Pregnancy Calculation if in Pregnancy Mode
    let pregnancy: PregnancyProfile | undefined;
    if (profile.mode === 'pregnancy' && profile.lastPeriodStartDate) {
      const lmp = new Date(profile.lastPeriodStartDate);
      const cur = new Date(date);
      const totalDays = Math.max(0, Math.floor((cur.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24)));
      const currentWeek = Math.min(40, Math.floor(totalDays / 7) + 1);
      const currentDay = totalDays % 7;
      const currentTrimester = currentWeek <= 13 ? 1 : currentWeek <= 26 ? 2 : 3;

      // Estimated Due Date: LMP + 280 days (Naegele's rule)
      const due = new Date(lmp);
      due.setDate(due.getDate() + 280);
      const dueDate = due.toISOString().split('T')[0];

      const fruitSizes: Record<number, string> = {
        4: 'Poppy Seed (1mm)',
        8: 'Raspberry (1.6cm)',
        12: 'Plum (5.4cm)',
        16: 'Avocado (11.6cm)',
        20: 'Banana (25.6cm)',
        24: 'Cantaloupe (30cm)',
        28: 'Eggplant (37.6cm)',
        32: 'Squash (42.4cm)',
        36: 'Papaya (47.4cm)',
        40: 'Watermelon (51.2cm)',
      };

      const matchedWeek = Object.keys(fruitSizes)
        .map(Number)
        .sort((a, b) => b - a)
        .find((w) => currentWeek >= w) || 4;

      pregnancy = {
        lmpDate: profile.lastPeriodStartDate,
        dueDate,
        currentWeek,
        currentDay,
        currentTrimester: currentTrimester as 1 | 2 | 3,
        babySizeComparison: fruitSizes[matchedWeek] || 'Little Sprout 🌱',
        milestoneDescription:
          currentTrimester === 1
            ? 'First Trimester: Vital organ formation and neural tube development.'
            : currentTrimester === 2
            ? 'Second Trimester: Senses developing, rapid growth, flutter movements.'
            : 'Third Trimester: Lung maturation, rapid brain expansion, final nesting.',
      };
    }

    return {
      currentCycleDay,
      totalCycleDays: cycleLength,
      predictedPhase,
      daysUntilNextPeriod,
      isFertileWindow,
      conceptionProbability,
      nextPeriodStartDate,
      ovulationDate,
      phaseMeta: CYCLE_PHASE_META[predictedPhase],
      todayLog,
      pregnancy,
    };
  }
}

export const womensHealthEngine = new WomensHealthEngine();
