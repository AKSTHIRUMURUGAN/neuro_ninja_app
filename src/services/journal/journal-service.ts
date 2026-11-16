import { getDatabase, generateUuid } from '../database/database';

export type JournalType = 'morning' | 'evening' | 'rant';

export interface CognitiveDistortionItem {
  type: string;
  quote: string;
  reframe: string;
}

export interface RationalClarityAnalysis {
  emotionalValidation: string;
  cognitiveDistortions: CognitiveDistortionItem[];
  dichotomyOfControl: {
    withinControl: string[];
    outsideControl: string[];
  };
  clearPictureSteps: {
    title: string;
    description: string;
    suggestedTimeMinutes?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  }[];
  analyzedAt: string;
}

export interface MorningJournalData {
  dailyPriority?: string;
  mindsetNotes?: string;
  gratitudes?: string[];
  affirmation?: string;
}

export interface EveningJournalData {
  wins?: string[];
  lessonsLearned?: string;
  detachmentNotes?: string;
  sleepReadiness?: number;
}

export interface RantJournalData {
  rawVentText: string;
  clarityAnalysis?: RationalClarityAnalysis;
  isBurned?: boolean;
}

export interface JournalEntry {
  id: string;
  type: JournalType;
  date: string; // YYYY-MM-DD
  title?: string;
  content: string;
  moodRating?: number; // 1-10
  energyRating?: number; // 1-10
  tags: string[];
  morningData?: MorningJournalData;
  eveningData?: EveningJournalData;
  rantData?: RantJournalData;
  isBurned: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

interface JournalRow {
  id: string;
  type: JournalType;
  date: string;
  title: string | null;
  content: string;
  mood_rating: number | null;
  energy_rating: number | null;
  tags_json: string;
  morning_data_json: string | null;
  evening_data_json: string | null;
  rant_data_json: string | null;
  is_burned: number;
  created_at: string;
  updated_at: string;
  sync_status: string;
}

function parseRow(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    type: row.type,
    date: row.date,
    title: row.title ?? undefined,
    content: row.content,
    moodRating: row.mood_rating ?? undefined,
    energyRating: row.energy_rating ?? undefined,
    tags: JSON.parse(row.tags_json || '[]'),
    morningData: row.morning_data_json ? JSON.parse(row.morning_data_json) : undefined,
    eveningData: row.evening_data_json ? JSON.parse(row.evening_data_json) : undefined,
    rantData: row.rant_data_json ? JSON.parse(row.rant_data_json) : undefined,
    isBurned: row.is_burned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: (row.sync_status as any) || 'synced',
  };
}

export async function getJournalEntries(filter?: {
  type?: JournalType;
  date?: string;
  limit?: number;
}): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter?.type) {
    conditions.push('type = ?');
    params.push(filter.type);
  }
  if (filter?.date) {
    conditions.push('date = ?');
    params.push(filter.date);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = filter?.limit ? `LIMIT ${filter.limit}` : 'LIMIT 100';

  const rows = await db.getAllAsync<JournalRow>(
    `SELECT * FROM journal_entries ${whereClause} ORDER BY date DESC, created_at DESC ${limitClause}`,
    ...params
  );

  return rows.map(parseRow);
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<JournalRow>(
    'SELECT * FROM journal_entries WHERE id = ?',
    id
  );
  return row ? parseRow(row) : null;
}

export async function saveJournalEntry(entry: Partial<JournalEntry>): Promise<JournalEntry> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = entry.id || generateUuid('jnl');
  const date = entry.date || now.split('T')[0];
  const type = entry.type || 'morning';

  const morningJson = entry.morningData ? JSON.stringify(entry.morningData) : null;
  const eveningJson = entry.eveningData ? JSON.stringify(entry.eveningData) : null;
  const rantJson = entry.rantData ? JSON.stringify(entry.rantData) : null;
  const tagsJson = JSON.stringify(entry.tags || []);
  const isBurned = entry.isBurned ? 1 : 0;

  await db.withTransactionAsync(async () => {
    // 1. Insert or Replace locally (0ms offline-first)
    await db.runAsync(
      `INSERT INTO journal_entries (
        id, type, date, title, content, mood_rating, energy_rating,
        tags_json, morning_data_json, evening_data_json, rant_data_json,
        is_burned, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
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
        sync_status = 'pending'`,
      id,
      type,
      date,
      entry.title || null,
      entry.content || '',
      entry.moodRating ?? null,
      entry.energyRating ?? null,
      tagsJson,
      morningJson,
      eveningJson,
      rantJson,
      isBurned,
      entry.createdAt || now,
      now
    );

    // 2. Enqueue mutation to sync outbox
    const payload = {
      id,
      type,
      date,
      title: entry.title,
      content: entry.content || '',
      moodRating: entry.moodRating,
      energyRating: entry.energyRating,
      tags: entry.tags || [],
      morningData: entry.morningData,
      eveningData: entry.eveningData,
      rantData: entry.rantData,
      isBurned: entry.isBurned || false,
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'journal', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify(payload),
      now
    );
  });

  const saved = await getJournalEntry(id);
  if (!saved) throw new Error(`Failed to save journal entry ${id}`);
  return saved;
}

export async function deleteJournalEntry(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM journal_entries WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'journal', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });

  return true;
}

export async function burnRantEntry(id: string): Promise<void> {
  const entry = await getJournalEntry(id);
  if (!entry) return;
  await saveJournalEntry({
    ...entry,
    isBurned: true,
    rantData: entry.rantData ? { ...entry.rantData, isBurned: true } : { rawVentText: entry.content, isBurned: true },
  });
}
