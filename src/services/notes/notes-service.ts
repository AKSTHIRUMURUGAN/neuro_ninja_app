import { getDatabase, generateUuid } from '../database/database';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  tags_json: string;
  category: string;
  is_pinned: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
  sync_status: string;
}

function parseRow(row: NoteRow): NoteItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags_json || '[]'),
    category: row.category,
    isPinned: row.is_pinned === 1,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: (row.sync_status as any) || 'synced',
  };
}

export async function getNotes(filter?: {
  category?: string;
  search?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}): Promise<NoteItem[]> {
  const db = await getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter?.isArchived !== undefined) {
    conditions.push('is_archived = ?');
    params.push(filter.isArchived ? 1 : 0);
  } else {
    // Default to active unarchived notes
    conditions.push('is_archived = 0');
  }

  if (filter?.category && filter.category !== 'All') {
    conditions.push('category = ?');
    params.push(filter.category);
  }

  if (filter?.isPinned !== undefined) {
    conditions.push('is_pinned = ?');
    params.push(filter.isPinned ? 1 : 0);
  }

  if (filter?.search?.trim()) {
    const q = `%${filter.search.trim().toLowerCase()}%`;
    conditions.push('(LOWER(title) LIKE ? OR LOWER(content) LIKE ?)');
    params.push(q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes ${whereClause} ORDER BY is_pinned DESC, updated_at DESC`,
    ...params
  );

  return rows.map(parseRow);
}

export async function getNoteById(id: string): Promise<NoteItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', id);
  return row ? parseRow(row) : null;
}

export async function saveNote(note: Partial<NoteItem>): Promise<NoteItem> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = note.id || generateUuid('note');
  const title = note.title?.trim() || 'Untitled Note';
  const content = note.content || '';
  const tagsJson = JSON.stringify(note.tags || []);
  const category = note.category || 'General';
  const isPinned = note.isPinned ? 1 : 0;
  const isArchived = note.isArchived ? 1 : 0;

  await db.withTransactionAsync(async () => {
    // 1. Local SQLite write (0ms latency)
    await db.runAsync(
      `INSERT INTO notes (
        id, title, content, tags_json, category, is_pinned, is_archived,
        created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        tags_json = excluded.tags_json,
        category = excluded.category,
        is_pinned = excluded.is_pinned,
        is_archived = excluded.is_archived,
        updated_at = excluded.updated_at,
        sync_status = 'pending'`,
      id,
      title,
      content,
      tagsJson,
      category,
      isPinned,
      isArchived,
      note.createdAt || now,
      now
    );

    // 2. Queue into sync outbox
    const payload = {
      id,
      title,
      content,
      tags: note.tags || [],
      category,
      isPinned: isPinned === 1,
      isArchived: isArchived === 1,
      updatedAt: now,
    };

    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'note', ?, 'UPSERT', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify(payload),
      now
    );
  });

  const saved = await getNoteById(id);
  if (!saved) throw new Error(`Failed to save note ${id}`);
  return saved;
}

export async function deleteNote(id: string): Promise<boolean> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM notes WHERE id = ?', id);
    await db.runAsync(
      `INSERT INTO sync_outbox (outbox_id, entity_type, entity_id, action, payload_json, created_at, status)
       VALUES (?, 'note', ?, 'DELETE', ?, ?, 'pending')`,
      generateUuid('outbox'),
      id,
      JSON.stringify({ id }),
      now
    );
  });

  return true;
}

export async function togglePinNote(id: string): Promise<boolean> {
  const note = await getNoteById(id);
  if (!note) return false;
  await saveNote({ ...note, isPinned: !note.isPinned });
  return true;
}

export async function toggleArchiveNote(id: string): Promise<boolean> {
  const note = await getNoteById(id);
  if (!note) return false;
  await saveNote({ ...note, isArchived: !note.isArchived });
  return true;
}
