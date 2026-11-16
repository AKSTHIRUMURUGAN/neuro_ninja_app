import { getDatabase } from '../database/database';
import { villainEngine } from '../villains/villain-engine';
import { walletService } from '../wallet/wallet-service';
import type {
  MentalHealthLog,
  MoodRating,
  MentalWellnessScores,
} from './health-types';

export class NeuroHealthEngine {
  private getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  async getTodayLog(date?: string): Promise<MentalHealthLog | null> {
    const targetDate = date || this.getTodayStr();
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      log_id: string;
      date: string;
      mood: string;
      mood_score: number;
      stress: number;
      anxiety: number;
      energy: number;
      motivation: number;
      focus: number;
      happiness: number;
      tags_json: string | null;
      journal_text: string | null;
      gratitude_json: string | null;
      created_at: string;
    }>('SELECT * FROM mental_health_logs WHERE date = ?', [targetDate]);

    if (!row) return null;

    return {
      logId: row.log_id,
      date: row.date,
      mood: row.mood as MoodRating,
      moodScore: row.mood_score,
      wellnessScores: {
        stress: row.stress,
        anxiety: row.anxiety,
        energy: row.energy,
        motivation: row.motivation,
        focus: row.focus,
        happiness: row.happiness,
      },
      tags: row.tags_json ? JSON.parse(row.tags_json) : [],
      journalText: row.journal_text ?? undefined,
      gratitudeList: row.gratitude_json ? JSON.parse(row.gratitude_json) : [],
      createdAt: row.created_at,
    };
  }

  async saveLog(
    mood: MoodRating,
    moodScore: number,
    wellnessScores: MentalWellnessScores,
    tags: string[] = [],
    journalText?: string,
    gratitudeList: string[] = [],
    date?: string
  ): Promise<MentalHealthLog> {
    const targetDate = date || this.getTodayStr();
    const db = await getDatabase();
    const logId = `mental_${targetDate}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO mental_health_logs (
        log_id, date, mood, mood_score, stress, anxiety, energy, motivation, focus, happiness,
        tags_json, journal_text, gratitude_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        mood = excluded.mood,
        mood_score = excluded.mood_score,
        stress = excluded.stress,
        anxiety = excluded.anxiety,
        energy = excluded.energy,
        motivation = excluded.motivation,
        focus = excluded.focus,
        happiness = excluded.happiness,
        tags_json = excluded.tags_json,
        journal_text = excluded.journal_text,
        gratitude_json = excluded.gratitude_json`,
      [
        logId,
        targetDate,
        mood,
        moodScore,
        wellnessScores.stress,
        wellnessScores.anxiety,
        wellnessScores.energy,
        wellnessScores.motivation,
        wellnessScores.focus,
        wellnessScores.happiness,
        JSON.stringify(tags),
        journalText ?? null,
        JSON.stringify(gratitudeList),
        now,
      ]
    );

    // Reward for completing daily mindful check-in
    await walletService.creditCoins(25, 50, 'habit', 'Mindful Mental Check-in (+25 🧠)');
    await villainEngine.dealDamage('habit', 35, 'Mindful Check-in Logged 🧘');

    return {
      logId,
      date: targetDate,
      mood,
      moodScore,
      wellnessScores,
      tags,
      journalText,
      gratitudeList,
      createdAt: now,
    };
  }

  async recordBreathworkSession(patternName: string, cycles: number): Promise<void> {
    await villainEngine.dealDamage('habit', 60, `${patternName} Breathwork (${cycles} cycles) 💨`);
    await walletService.creditCoins(50, 100, 'habit', `Completed Guided Breathwork (+50 💨)`);
  }

  async getRecentLogs(limit: number = 7): Promise<MentalHealthLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      log_id: string;
      date: string;
      mood: string;
      mood_score: number;
      stress: number;
      anxiety: number;
      energy: number;
      motivation: number;
      focus: number;
      happiness: number;
      tags_json: string | null;
      journal_text: string | null;
      gratitude_json: string | null;
      created_at: string;
    }>('SELECT * FROM mental_health_logs ORDER BY date DESC LIMIT ?', [limit]);

    return rows.map((r) => ({
      logId: r.log_id,
      date: r.date,
      mood: r.mood as MoodRating,
      moodScore: r.mood_score,
      wellnessScores: {
        stress: r.stress,
        anxiety: r.anxiety,
        energy: r.energy,
        motivation: r.motivation,
        focus: r.focus,
        happiness: r.happiness,
      },
      tags: r.tags_json ? JSON.parse(r.tags_json) : [],
      journalText: r.journal_text ?? undefined,
      gratitudeList: r.gratitude_json ? JSON.parse(r.gratitude_json) : [],
      createdAt: r.created_at,
    }));
  }
}

export const neuroHealthEngine = new NeuroHealthEngine();
