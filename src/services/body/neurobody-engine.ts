// NeuroBody Engine (Offline-First Vitality OS)
// Parity with neuro_ninja_web & industry leaders (Flo, Clue, Zero, Waterllama, MyFitnessPal, Whoop, Oura)

import { getDatabase } from '../database/database';
import { villainEngine } from '../villains/villain-engine';
import { walletService } from '../wallet/wallet-service';
import { womensHealthEngine } from './womens-health-engine';
import type {
  FastingProtocol,
  FastingSession,
  WaterLog,
  WaterEntry,
  FluidType,
  MealItem,
  BodyMetric,
  BodyProfile,
  BodyDaySummary,
  VitalityScore,
} from './body-types';
import { FASTING_BIO_STAGES, FASTING_PROTOCOLS, FLUID_TYPES } from './body-types';

export class NeuroBodyEngine {
  private getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ─────────────────────────────────────────────
  // 1. HYDRATION & MULTI-FLUID TRACKER
  // ─────────────────────────────────────────────

  async getWaterLog(date?: string): Promise<WaterLog> {
    const targetDate = date || this.getTodayStr();
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      log_id: string;
      date: string;
      target_ml: number;
      total_ml: number;
      logs_json: string;
      updated_at: string;
    }>('SELECT * FROM water_logs WHERE date = ?', [targetDate]);

    if (!row) {
      const profile = await this.getBodyProfile();
      const defaultTarget = profile.defaultWaterTargetMl || 2500;
      return {
        logId: `water_${targetDate}`,
        date: targetDate,
        targetMl: defaultTarget,
        totalMl: 0,
        effectiveMl: 0,
        logs: [],
        updatedAt: new Date().toISOString(),
      };
    }

    let logs: WaterEntry[] = [];
    try {
      logs = JSON.parse(row.logs_json);
    } catch {
      logs = [];
    }

    const effectiveMl = logs.reduce((sum, item) => {
      const mult = item.fluidType ? (FLUID_TYPES[item.fluidType]?.multiplier ?? 1.0) : 1.0;
      return sum + Math.round(item.amountMl * mult);
    }, 0);

    return {
      logId: row.log_id,
      date: row.date,
      targetMl: row.target_ml,
      totalMl: row.total_ml,
      effectiveMl: effectiveMl || row.total_ml,
      logs,
      updatedAt: row.updated_at,
    };
  }

  async addWater(amountMl: number, fluidType: FluidType = 'water', date?: string): Promise<WaterLog> {
    const targetDate = date || this.getTodayStr();
    const db = await getDatabase();
    const current = await this.getWaterLog(targetDate);
    const newTotal = current.totalMl + amountMl;
    const mult = FLUID_TYPES[fluidType]?.multiplier ?? 1.0;
    const effectiveAdd = Math.round(amountMl * mult);

    const newEntry: WaterEntry = {
      time: new Date().toISOString(),
      amountMl,
      fluidType,
      effectiveMl: effectiveAdd,
    };
    const updatedLogs = [...current.logs, newEntry];
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO water_logs (log_id, date, target_ml, total_ml, logs_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         total_ml = total_ml + excluded.total_ml,
         logs_json = excluded.logs_json,
         updated_at = excluded.updated_at`,
      [
        current.logId,
        targetDate,
        current.targetMl,
        amountMl,
        JSON.stringify(updatedLogs),
        now,
      ]
    );

    // Gamification Hook: Did user reach target just now?
    if (current.totalMl < current.targetMl && newTotal >= current.targetMl) {
      try {
        await villainEngine.dealDamage('habit', 50, 'Aqua Blade: 100% Hydration Strike! 💧');
        await walletService.creditCoins(35, 70, 'habit', 'Hydration Target Achieved (+35 Coins 💧)');
      } catch (err) {
        console.warn('[NeuroBodyEngine] Water gamification reward error:', err);
      }
    }

    return {
      ...current,
      totalMl: newTotal,
      effectiveMl: current.effectiveMl + effectiveAdd,
      logs: updatedLogs,
      updatedAt: now,
    };
  }

  // ─────────────────────────────────────────────
  // 2. INTERMITTENT FASTING ENGINE
  // ─────────────────────────────────────────────

  async getActiveFastingSession(): Promise<FastingSession | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      session_id: string;
      protocol: string;
      target_hours: number;
      start_time: string;
      end_time: string | null;
      status: string;
      mood: string | null;
      notes: string | null;
      created_at: string;
    }>('SELECT * FROM fasting_sessions WHERE status = ? ORDER BY start_time DESC LIMIT 1', ['active']);

    if (!row) return null;

    return {
      sessionId: row.session_id,
      protocol: row.protocol as FastingProtocol,
      targetHours: row.target_hours,
      startTime: row.start_time,
      endTime: row.end_time ?? undefined,
      status: row.status as any,
      mood: row.mood ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    };
  }

  async startFast(protocol: FastingProtocol = '16:8', customHours?: number): Promise<FastingSession> {
    const existing = await this.getActiveFastingSession();
    if (existing) {
      await this.endFast(existing.sessionId, 'cancelled', 'Auto-closed to start new fast');
    }

    const targetHours = customHours || FASTING_PROTOCOLS[protocol]?.fastHours || 16;
    const sessionId = `fast_${Date.now()}`;
    const now = new Date().toISOString();

    const session: FastingSession = {
      sessionId,
      protocol,
      targetHours,
      startTime: now,
      status: 'active',
      createdAt: now,
    };

    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO fasting_sessions (session_id, protocol, target_hours, start_time, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.sessionId, session.protocol, session.targetHours, session.startTime, session.status, session.createdAt]
    );

    return session;
  }

  async endFast(sessionId: string, mood?: string, notes?: string): Promise<FastingSession | null> {
    const db = await getDatabase();
    const current = await db.getFirstAsync<{
      session_id: string;
      protocol: string;
      target_hours: number;
      start_time: string;
      status: string;
      created_at: string;
    }>('SELECT * FROM fasting_sessions WHERE session_id = ?', [sessionId]);

    if (!current) return null;

    const now = new Date().toISOString();
    const elapsedHours = (Date.now() - new Date(current.start_time).getTime()) / 3600000;
    const completed = elapsedHours >= current.target_hours;
    const status = completed ? 'completed' : 'cancelled';

    await db.runAsync(
      `UPDATE fasting_sessions
       SET end_time = ?, status = ?, mood = ?, notes = ?
       WHERE session_id = ?`,
      [now, status, mood ?? null, notes ?? null, sessionId]
    );

    // Gamification Hook: Successfully completed target fast!
    if (completed) {
      try {
        await villainEngine.dealDamage('habit', 70, `Slayed Cravings Demon (${current.target_hours}h Fast) 🔥`);
        await walletService.creditCoins(50, 100, 'habit', `Completed ${current.target_hours}h Fast Protocol (+50 Coins 🔥)`);
      } catch (err) {
        console.warn('[NeuroBodyEngine] Fast gamification reward error:', err);
      }
    }

    return {
      sessionId: current.session_id,
      protocol: current.protocol as FastingProtocol,
      targetHours: current.target_hours,
      startTime: current.start_time,
      endTime: now,
      status,
      mood,
      notes,
      createdAt: current.created_at,
    };
  }

  // ─────────────────────────────────────────────
  // 3. NUTRITION & MEAL PLANNER
  // ─────────────────────────────────────────────

  async getMeals(date?: string): Promise<MealItem[]> {
    const targetDate = date || this.getTodayStr();
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      meal_id: string;
      date: string;
      meal_type: string;
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      ingredients_json: string | null;
      notes: string | null;
      created_at: string;
    }>('SELECT * FROM meal_items WHERE date = ? ORDER BY created_at ASC', [targetDate]);

    return rows.map((r) => ({
      mealId: r.meal_id,
      date: r.date,
      mealType: r.meal_type as any,
      name: r.name,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fats: r.fats,
      ingredients: r.ingredients_json ? JSON.parse(r.ingredients_json) : undefined,
      notes: r.notes ?? undefined,
      createdAt: r.created_at,
    }));
  }

  async addMeal(meal: Omit<MealItem, 'mealId' | 'createdAt'>): Promise<MealItem> {
    const mealId = `meal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = new Date().toISOString();
    const fullMeal: MealItem = { ...meal, mealId, createdAt };

    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO meal_items (meal_id, date, meal_type, name, calories, protein, carbs, fats, ingredients_json, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullMeal.mealId,
        fullMeal.date,
        fullMeal.mealType,
        fullMeal.name,
        fullMeal.calories,
        fullMeal.protein,
        fullMeal.carbs,
        fullMeal.fats,
        fullMeal.ingredients ? JSON.stringify(fullMeal.ingredients) : null,
        fullMeal.notes ?? null,
        fullMeal.createdAt,
      ]
    );

    // Gamification Hook: Did user hit daily protein target with this meal?
    try {
      const allMeals = await this.getMeals(fullMeal.date);
      const totalProtein = allMeals.reduce((acc, m) => acc + m.protein, 0);
      const profile = await this.getBodyProfile();
      if (totalProtein >= profile.proteinGoal && totalProtein - meal.protein < profile.proteinGoal) {
        await villainEngine.dealDamage('habit', 50, 'Muscle Forge Activated! (+15% Damage) 💪');
        await walletService.creditCoins(40, 80, 'habit', 'Reached Daily Protein Goal (+40 Coins 🥩)');
      }
    } catch (err) {
      console.warn('[NeuroBodyEngine] Protein reward error:', err);
    }

    return fullMeal;
  }

  async deleteMeal(mealId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM meal_items WHERE meal_id = ?', [mealId]);
  }

  // ─────────────────────────────────────────────
  // 4. BODY METRICS & COMPOSITION
  // ─────────────────────────────────────────────

  async getLatestMetric(): Promise<BodyMetric | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      metric_id: string;
      date: string;
      weight_kg: number;
      height_cm: number | null;
      waist_cm: number | null;
      chest_cm: number | null;
      hips_cm: number | null;
      body_fat_percentage: number | null;
      notes: string | null;
      created_at: string;
    }>('SELECT * FROM body_metrics ORDER BY date DESC, created_at DESC LIMIT 1');

    if (!row) return null;

    let bmi: number | undefined;
    let whtr: number | undefined;
    if (row.height_cm && row.height_cm > 0) {
      const heightM = row.height_cm / 100;
      bmi = Math.round((row.weight_kg / (heightM * heightM)) * 10) / 10;
      if (row.waist_cm && row.waist_cm > 0) {
        whtr = Math.round((row.waist_cm / row.height_cm) * 100) / 100;
      }
    }

    return {
      metricId: row.metric_id,
      date: row.date,
      weightKg: row.weight_kg,
      heightCm: row.height_cm ?? undefined,
      waistCm: row.waist_cm ?? undefined,
      chestCm: row.chest_cm ?? undefined,
      hipsCm: row.hips_cm ?? undefined,
      bodyFatPercentage: row.body_fat_percentage ?? undefined,
      bmi,
      whtr,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    };
  }

  async logMetric(metric: Omit<BodyMetric, 'metricId' | 'createdAt'>): Promise<BodyMetric> {
    const metricId = `metric_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const fullMetric: BodyMetric = { ...metric, metricId, createdAt };

    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO body_metrics (metric_id, date, weight_kg, height_cm, waist_cm, chest_cm, hips_cm, body_fat_percentage, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         weight_kg = excluded.weight_kg,
         height_cm = excluded.height_cm,
         waist_cm = excluded.waist_cm,
         chest_cm = excluded.chest_cm,
         hips_cm = excluded.hips_cm,
         body_fat_percentage = excluded.body_fat_percentage,
         notes = excluded.notes,
         created_at = excluded.created_at`,
      [
        fullMetric.metricId,
        fullMetric.date,
        fullMetric.weightKg,
        fullMetric.heightCm ?? null,
        fullMetric.waistCm ?? null,
        fullMetric.chestCm ?? null,
        fullMetric.hipsCm ?? null,
        fullMetric.bodyFatPercentage ?? null,
        fullMetric.notes ?? null,
        fullMetric.createdAt,
      ]
    );

    // Gamification Hook: Logged weekly progress
    try {
      await walletService.creditCoins(25, 50, 'habit', 'Logged Body Composition Vitals ⚖️');
    } catch (err) {
      console.warn('[NeuroBodyEngine] Metric reward error:', err);
    }

    return fullMetric;
  }

  // ─────────────────────────────────────────────
  // 5. USER BODY PROFILE
  // ─────────────────────────────────────────────

  async getBodyProfile(): Promise<BodyProfile> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      user_id: string;
      gender: string;
      age: number;
      height_cm: number;
      target_weight_kg: number;
      default_water_target_ml: number;
      preferred_fasting_protocol: string;
      calorie_goal: number;
      protein_goal: number;
      carbs_goal: number;
      fats_goal: number;
      activity_level: string;
      updated_at: string;
    }>('SELECT * FROM body_profiles WHERE user_id = ?', ['default_user']);

    if (!row) {
      const defaultProfile: BodyProfile = {
        userId: 'default_user',
        gender: 'female',
        age: 26,
        heightCm: 165,
        targetWeightKg: 58,
        defaultWaterTargetMl: 2500,
        preferredFastingProtocol: '16:8',
        calorieGoal: 1950,
        proteinGoal: 120,
        carbsGoal: 200,
        fatsGoal: 60,
        activityLevel: 'moderately_active',
        updatedAt: new Date().toISOString(),
      };

      await db.runAsync(
        `INSERT INTO body_profiles (
          user_id, gender, age, height_cm, target_weight_kg,
          default_water_target_ml, preferred_fasting_protocol,
          calorie_goal, protein_goal, carbs_goal, fats_goal,
          activity_level, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultProfile.userId,
          defaultProfile.gender,
          defaultProfile.age,
          defaultProfile.heightCm,
          defaultProfile.targetWeightKg,
          defaultProfile.defaultWaterTargetMl,
          defaultProfile.preferredFastingProtocol,
          defaultProfile.calorieGoal,
          defaultProfile.proteinGoal,
          defaultProfile.carbsGoal,
          defaultProfile.fatsGoal,
          defaultProfile.activityLevel,
          defaultProfile.updatedAt,
        ]
      );

      return defaultProfile;
    }

    return {
      userId: row.user_id,
      gender: (row.gender as any) || 'female',
      age: row.age || 26,
      heightCm: row.height_cm || 165,
      targetWeightKg: row.target_weight_kg || 58,
      defaultWaterTargetMl: row.default_water_target_ml || 2500,
      preferredFastingProtocol: (row.preferred_fasting_protocol as FastingProtocol) || '16:8',
      calorieGoal: row.calorie_goal || 1950,
      proteinGoal: row.protein_goal || 120,
      carbsGoal: row.carbs_goal || 200,
      fatsGoal: row.fats_goal || 60,
      activityLevel: (row.activity_level as any) || 'moderately_active',
      updatedAt: row.updated_at,
    };
  }

  async saveBodyProfile(profile: Partial<BodyProfile>): Promise<BodyProfile> {
    const current = await this.getBodyProfile();
    const updated: BodyProfile = {
      ...current,
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO body_profiles (
        user_id, gender, age, height_cm, target_weight_kg,
        default_water_target_ml, preferred_fasting_protocol,
        calorie_goal, protein_goal, carbs_goal, fats_goal,
        activity_level, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        updated.userId,
        updated.gender,
        updated.age,
        updated.heightCm,
        updated.targetWeightKg,
        updated.defaultWaterTargetMl,
        updated.preferredFastingProtocol,
        updated.calorieGoal,
        updated.proteinGoal,
        updated.carbsGoal,
        updated.fatsGoal,
        updated.activityLevel,
        updated.updatedAt,
      ]
    );

    return updated;
  }

  // ─────────────────────────────────────────────
  // 6. CONSOLIDATED DAY SUMMARY & VITALITY CORE (0-100)
  // ─────────────────────────────────────────────

  async getDaySummary(date?: string): Promise<BodyDaySummary> {
    const targetDate = date || this.getTodayStr();
    const [profile, water, activeFast, meals, latestMetric, womensHealth] = await Promise.all([
      this.getBodyProfile(),
      this.getWaterLog(targetDate),
      this.getActiveFastingSession(),
      this.getMeals(targetDate),
      this.getLatestMetric(),
      womensHealthEngine.calculateCycleStats(targetDate),
    ]);

    let fastingElapsedHours = 0;
    if (activeFast && activeFast.status === 'active') {
      fastingElapsedHours = (Date.now() - new Date(activeFast.startTime).getTime()) / 3600000;
    }

    const fastingBioStage =
      FASTING_BIO_STAGES.find(
        (s) => fastingElapsedHours >= s.minHours && fastingElapsedHours < s.maxHours
      ) || FASTING_BIO_STAGES[FASTING_BIO_STAGES.length - 1];

    const totalCalories = meals.reduce((acc, m) => acc + m.calories, 0);
    const totalProtein = meals.reduce((acc, m) => acc + m.protein, 0);
    const totalCarbs = meals.reduce((acc, m) => acc + m.carbs, 0);
    const totalFats = meals.reduce((acc, m) => acc + m.fats, 0);

    // Dynamic Cycle Adjustment: In Luteal Phase, metabolic rate increases by ~200 kcal
    let adjustedCalorieGoal = profile.calorieGoal;
    if (womensHealth?.predictedPhase === 'luteal') {
      adjustedCalorieGoal += 200;
    }

    // 0-100 Composite Vitality Core Scoring
    const hydScore = Math.min(20, Math.round(((water.effectiveMl || water.totalMl) / (water.targetMl || 2500)) * 20));
    const fastScore = activeFast
      ? Math.min(20, Math.round((fastingElapsedHours / (activeFast.targetHours || 16)) * 20))
      : 12;
    const nutScore = Math.min(20, Math.round((totalProtein / (profile.proteinGoal || 120)) * 20));
    const bodyScore = latestMetric ? 18 : 12;
    const mindScore = womensHealth?.todayLog ? 20 : 16;

    const totalVitality = Math.min(100, hydScore + fastScore + nutScore + bodyScore + mindScore);

    let status: VitalityScore['status'] = 'moderate';
    let statusLabel = 'MODERATE BALANCE';
    let statusColor = '#F59E0B';
    let buffDescription = '⚡ Standard Combat Readiness';

    if (totalVitality >= 85) {
      status = 'surging';
      statusLabel = 'VITALITY SURGING';
      statusColor = '#00E699';
      buffDescription = '⚔️ +25% Critical Boss Damage Active!';
    } else if (totalVitality >= 70) {
      status = 'optimal';
      statusLabel = 'OPTIMAL HARMONY';
      statusColor = '#38BDF8';
      buffDescription = '🛡️ Divine Siphon Shield Active';
    } else if (totalVitality < 50) {
      status = 'depleted';
      statusLabel = 'DEPLETED VIGOR';
      statusColor = '#EF4444';
      buffDescription = '⚠️ Rest & Nourish Recommended';
    }

    const vitalityScore: VitalityScore = {
      total: totalVitality,
      hydration: hydScore,
      fasting: fastScore,
      nutrition: nutScore,
      bodycare: bodyScore,
      mindfulness: mindScore,
      status,
      statusLabel,
      statusColor,
      buffDescription,
    };

    const waterPercentage = Math.round((water.totalMl / (water.targetMl || 2500)) * 100);

    return {
      date: targetDate,
      vitalityScore,
      waterTotalMl: water.totalMl,
      waterTargetMl: water.targetMl,
      waterPercentage,
      activeFast,
      fastingElapsedHours,
      fastingBioStage,
      totalCalories,
      calorieGoal: adjustedCalorieGoal,
      totalProtein,
      proteinGoal: profile.proteinGoal,
      totalCarbs,
      totalFats,
      meals,
      latestMetric,
      womensHealth,
      profile,
    };
  }
}

export const neuroBodyEngine = new NeuroBodyEngine();
