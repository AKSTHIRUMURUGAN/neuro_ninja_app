import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayKey } from '../storage';

export interface DoomscrollEvent {
  id: string;
  packageName: string;
  appName: string;
  timestamp: number;
  durationSeconds: number;
  isProlonged: boolean;   // > 5m
  isExcessive: boolean;   // > 15m
  isRapidReopen: boolean; // reopened < 60s
  isLateNight: boolean;   // 22:00 - 06:00
}

export interface DoomscrollDayReport {
  date: string;
  totalScrollMinutes: number;
  doomscrollSessionsCount: number;
  excessiveSessionsCount: number;
  rapidReopensCount: number;
  lateNightSessionsCount: number;
  scrollDebtMinutes: number;
  appBreakdown: Record<string, number>; // package -> minutes
  hourlyHeatmap: number[];             // 24 slots (0-23 hours)
}

const DOOMSCROLL_STORAGE_KEY = '@neuro_ninja_doomscroll_v1';
const RECENT_EXITS_KEY = '@neuro_ninja_recent_exits_v1';

export class DoomscrollEngine {
  private static instance: DoomscrollEngine;

  static getInstance(): DoomscrollEngine {
    if (!DoomscrollEngine.instance) {
      DoomscrollEngine.instance = new DoomscrollEngine();
    }
    return DoomscrollEngine.instance;
  }

  // Record an exit timestamp for rapid-reopen detection (< 60s)
  async recordAppExit(packageName: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(RECENT_EXITS_KEY);
      const exits: Record<string, number> = raw ? JSON.parse(raw) : {};
      exits[packageName] = Date.now();
      await AsyncStorage.setItem(RECENT_EXITS_KEY, JSON.stringify(exits));
    } catch (e) {
      console.error('Failed to record app exit:', e);
    }
  }

  // Check if an app is being reopened rapidly (< 60s)
  async checkIsRapidReopen(packageName: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(RECENT_EXITS_KEY);
      if (!raw) return false;
      const exits: Record<string, number> = JSON.parse(raw);
      const lastExit = exits[packageName];
      if (!lastExit) return false;
      const elapsedSeconds = (Date.now() - lastExit) / 1000;
      return elapsedSeconds <= 60;
    } catch {
      return false;
    }
  }

  // Determine if timestamp falls in bedtime hours (10:00 PM - 06:00 AM)
  isLateNightHour(date: Date = new Date()): boolean {
    const hour = date.getHours();
    return hour >= 22 || hour < 6;
  }

  // Record a completed usage/scrolling session
  async logSession(
    packageName: string,
    appName: string,
    durationSeconds: number
  ): Promise<DoomscrollEvent> {
    const now = new Date();
    const isRapid = await this.checkIsRapidReopen(packageName);
    const isLate = this.isLateNightHour(now);
    const isProlonged = durationSeconds >= 300; // >= 5m
    const isExcessive = durationSeconds >= 900; // >= 15m

    const event: DoomscrollEvent = {
      id: `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      packageName,
      appName,
      timestamp: now.getTime(),
      durationSeconds,
      isProlonged,
      isExcessive,
      isRapidReopen: isRapid,
      isLateNight: isLate,
    };

    await this.updateDayReport(event);
    return event;
  }

  private async updateDayReport(event: DoomscrollEvent): Promise<void> {
    try {
      const today = getTodayKey();
      const report = await this.getDayReport(today);
      const durationMins = Math.round(event.durationSeconds / 60);
      const hour = new Date(event.timestamp).getHours();

      report.totalScrollMinutes += durationMins;
      if (event.isProlonged) report.doomscrollSessionsCount += 1;
      if (event.isExcessive) report.excessiveSessionsCount += 1;
      if (event.isRapidReopen) report.rapidReopensCount += 1;
      if (event.isLateNight) report.lateNightSessionsCount += 1;

      // Update app breakdown
      report.appBreakdown[event.packageName] =
        (report.appBreakdown[event.packageName] || 0) + durationMins;

      // Update hourly heatmap
      if (hour >= 0 && hour < 24) {
        report.hourlyHeatmap[hour] = (report.hourlyHeatmap[hour] || 0) + durationMins;
      }

      // Calculate scroll debt: any minutes over 60m daily budget
      const healthyTargetMinutes = 60;
      report.scrollDebtMinutes = Math.max(0, report.totalScrollMinutes - healthyTargetMinutes);

      const allReports = await this.getAllReports();
      allReports[today] = report;
      await AsyncStorage.setItem(DOOMSCROLL_STORAGE_KEY, JSON.stringify(allReports));
    } catch (e) {
      console.error('Failed to update doomscroll report:', e);
    }
  }

  async getDayReport(dateKey: string = getTodayKey()): Promise<DoomscrollDayReport> {
    try {
      const allReports = await this.getAllReports();
      if (allReports[dateKey]) {
        return allReports[dateKey];
      }

      // Default empty report for the day
      return {
        date: dateKey,
        totalScrollMinutes: 0,
        doomscrollSessionsCount: 0,
        excessiveSessionsCount: 0,
        rapidReopensCount: 0,
        lateNightSessionsCount: 0,
        scrollDebtMinutes: 0,
        appBreakdown: {},
        hourlyHeatmap: new Array(24).fill(0),
      };
    } catch (e) {
      console.error('Failed to get day report:', e);
      return {
        date: dateKey,
        totalScrollMinutes: 0,
        doomscrollSessionsCount: 0,
        excessiveSessionsCount: 0,
        rapidReopensCount: 0,
        lateNightSessionsCount: 0,
        scrollDebtMinutes: 0,
        appBreakdown: {},
        hourlyHeatmap: new Array(24).fill(0),
      };
    }
  }

  private async getAllReports(): Promise<Record<string, DoomscrollDayReport>> {
    try {
      const raw = await AsyncStorage.getItem(DOOMSCROLL_STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  // Calculate usage exhaustion forecast based on velocity (StayFree parity)
  calculateExhaustionForecast(
    usedMinutes: number,
    limitMinutes: number
  ): { forecastedTimeStr: string; isAtRisk: boolean } {
    const remaining = Math.max(0, limitMinutes - usedMinutes);
    if (remaining === 0) {
      return { forecastedTimeStr: 'Limit Reached', isAtRisk: true };
    }

    const now = new Date();
    const hoursElapsedToday = Math.max(1, now.getHours() + now.getMinutes() / 60);
    const burnRatePerHour = usedMinutes / hoursElapsedToday;

    if (burnRatePerHour <= 0.1) {
      return { forecastedTimeStr: 'Safe Pace (End of Day)', isAtRisk: false };
    }

    const hoursUntilExhaustion = remaining / burnRatePerHour;
    const projectedDate = new Date(now.getTime() + hoursUntilExhaustion * 3600 * 1000);

    const projectedHour = projectedDate.getHours();
    const projectedMin = projectedDate.getMinutes();
    const period = projectedHour >= 12 ? 'PM' : 'AM';
    const hour12 = projectedHour % 12 || 12;
    const minStr = projectedMin < 10 ? `0${projectedMin}` : `${projectedMin}`;

    return {
      forecastedTimeStr: `~${hour12}:${minStr} ${period}`,
      isAtRisk: hoursUntilExhaustion < 4,
    };
  }
}

export const doomscrollEngine = DoomscrollEngine.getInstance();

