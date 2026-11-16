import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { getDatabase, generateUuid, getLocalTimezoneId, getLifeOSState, setLifeOSState } from '../database/database';
import { getAllTasks, type LifeOSTask } from '../tasks/task-engine';

export interface CalendarBlock {
  blockId: string;
  taskId?: string | null;
  title: string;
  notes?: string | null;
  startAtUtc: string;
  endAtUtc: string;
  timezoneId: string;
  color: string;
  source: 'manual' | 'task_link' | 'ai_approved' | 'external_readonly';
  externalEventRef?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface ProposedScheduleBlock {
  proposalId: string;
  taskId: string;
  title: string;
  startAtUtc: string;
  endAtUtc: string;
  rationale: string;
  confidence: 'high' | 'medium';
  conflicts: CalendarBlock[];
}

export interface ExternalCalendarState {
  connected: boolean;
  readGranted: boolean;
  writeGranted: boolean;
  selectedCalendarIds: string[];
  lastSyncedAt?: string;
}

const EXTERNAL_STATE_KEY = 'external_calendar_connection';

interface RawBlockRow {
  block_id: string;
  task_id: string | null;
  title: string;
  notes: string | null;
  start_at_utc: string;
  end_at_utc: string;
  timezone_id: string;
  color: string;
  source: string;
  external_event_ref: string | null;
  status: string;
}

function mapBlock(r: RawBlockRow): CalendarBlock {
  return {
    blockId: r.block_id,
    taskId: r.task_id,
    title: r.title,
    notes: r.notes,
    startAtUtc: r.start_at_utc,
    endAtUtc: r.end_at_utc,
    timezoneId: r.timezone_id,
    color: r.color,
    source: r.source as CalendarBlock['source'],
    externalEventRef: r.external_event_ref,
    status: r.status as CalendarBlock['status'],
  };
}

export async function getBlocksInRange(startUtcIso: string, endUtcIso: string): Promise<CalendarBlock[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RawBlockRow>(
    `SELECT * FROM calendar_blocks
     WHERE status != 'cancelled'
       AND end_at_utc > ?
       AND start_at_utc < ?
     ORDER BY start_at_utc ASC`,
    startUtcIso,
    endUtcIso
  );
  return rows.map(mapBlock);
}

export async function getBlocksForDay(date: Date): Promise<CalendarBlock[]> {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  return getBlocksInRange(start.toISOString(), end.toISOString());
}

export async function getNextUpcomingBlock(now: Date = new Date()): Promise<CalendarBlock | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<RawBlockRow>(
    `SELECT * FROM calendar_blocks
     WHERE status = 'scheduled' AND end_at_utc >= ?
     ORDER BY start_at_utc ASC LIMIT 1`,
    now.toISOString()
  );
  return row ? mapBlock(row) : null;
}

export async function detectConflicts(
  startUtcIso: string,
  endUtcIso: string,
  excludeBlockId?: string
): Promise<CalendarBlock[]> {
  const overlapping = await getBlocksInRange(startUtcIso, endUtcIso);
  return overlapping.filter((b) => b.blockId !== excludeBlockId);
}

export async function createCalendarBlock(input: {
  title: string;
  notes?: string;
  startDate: Date;
  endDate: Date;
  taskId?: string | null;
  color?: string;
  source?: CalendarBlock['source'];
}): Promise<CalendarBlock> {
  const db = await getDatabase();
  const blockId = generateUuid('blk');
  const tz = getLocalTimezoneId();
  const startIso = input.startDate.toISOString();
  const endIso = input.endDate.toISOString();

  await db.runAsync(
    `INSERT INTO calendar_blocks (
       block_id, task_id, title, notes, start_at_utc, end_at_utc,
       timezone_id, color, source, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
    blockId,
    input.taskId ?? null,
    input.title.trim(),
    input.notes ?? null,
    startIso,
    endIso,
    tz,
    input.color ?? '#10B981',
    input.source ?? 'manual'
  );

  return {
    blockId,
    taskId: input.taskId ?? null,
    title: input.title.trim(),
    notes: input.notes ?? null,
    startAtUtc: startIso,
    endAtUtc: endIso,
    timezoneId: tz,
    color: input.color ?? '#10B981',
    source: input.source ?? 'manual',
    status: 'scheduled',
  };
}

export async function updateCalendarBlockTime(
  blockId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE calendar_blocks SET start_at_utc = ?, end_at_utc = ? WHERE block_id = ?',
    startDate.toISOString(),
    endDate.toISOString(),
    blockId
  );
}

export async function deleteCalendarBlock(blockId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM calendar_blocks WHERE block_id = ?', blockId);
}

/**
 * Generates reviewable AI/heuristic schedule drafts for unscheduled today/urgent tasks
 * inside free working-hour gaps (default 08:00 - 20:00). Never persists anything without
 * explicit user approval per FR-225.
 */
export async function generatePlanMyDayProposals(
  date: Date,
  workingStartHour: number = 8,
  workingEndHour: number = 21
): Promise<ProposedScheduleBlock[]> {
  const existingBlocks = await getBlocksForDay(date);
  const allTasks = await getAllTasks();
  const scheduledTaskIds = new Set(existingBlocks.map((b) => b.taskId).filter(Boolean));

  const priorityRank: Record<LifeOSTask['priority'], number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  const candidates = allTasks
    .filter(
      (t) =>
        t.status !== 'completed' &&
        t.status !== 'cancelled' &&
        !scheduledTaskIds.has(t.taskId)
    )
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 6);

  const proposals: ProposedScheduleBlock[] = [];
  let cursorMs = Math.max(
    Date.now() + 5 * 60000,
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), workingStartHour, 0, 0).getTime()
  );
  const endWindowMs = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    workingEndHour,
    0,
    0
  ).getTime();

  // Round cursor up to next 15m boundary
  const fifteenMin = 15 * 60000;
  cursorMs = Math.ceil(cursorMs / fifteenMin) * fifteenMin;

  for (const task of candidates) {
    const durMin = task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : 30;
    const durMs = durMin * 60000;

    // Advance cursor past conflicting blocks until a clean slot is found
    let placed = false;
    let attempts = 0;
    while (cursorMs + durMs <= endWindowMs && attempts < 24) {
      attempts++;
      const slotEnd = cursorMs + durMs;
      const conflicts = existingBlocks.filter((b) => {
        const bStart = new Date(b.startAtUtc).getTime();
        const bEnd = new Date(b.endAtUtc).getTime();
        return bEnd > cursorMs && bStart < slotEnd;
      });
      if (conflicts.length === 0) {
        const startIso = new Date(cursorMs).toISOString();
        const endIso = new Date(slotEnd).toISOString();
        proposals.push({
          proposalId: generateUuid('prop'),
          taskId: task.taskId,
          title: task.title,
          startAtUtc: startIso,
          endAtUtc: endIso,
          rationale: `${task.priority.toUpperCase()} priority · ${durMin}m open window`,
          confidence: task.estimatedMinutes ? 'high' : 'medium',
          conflicts: [],
        });
        cursorMs = slotEnd + fifteenMin;
        placed = true;
        break;
      } else {
        const latestConflictEnd = Math.max(...conflicts.map((c) => new Date(c.endAtUtc).getTime()));
        cursorMs = Math.ceil((latestConflictEnd + 5 * 60000) / fifteenMin) * fifteenMin;
      }
    }
    if (!placed) break;
  }

  return proposals;
}

export async function getExternalCalendarState(): Promise<ExternalCalendarState> {
  return getLifeOSState<ExternalCalendarState>(EXTERNAL_STATE_KEY, {
    connected: false,
    readGranted: false,
    writeGranted: false,
    selectedCalendarIds: [],
  });
}

export async function connectReadOnlyExternalCalendar(): Promise<{
  state: ExternalCalendarState;
  importedCount: number;
}> {
  if (Platform.OS === 'web') {
    const state: ExternalCalendarState = {
      connected: false,
      readGranted: false,
      writeGranted: false,
      selectedCalendarIds: [],
    };
    return { state, importedCount: 0 };
  }

  const { status } = await Calendar.requestCalendarPermissions();
  if (status !== 'granted') {
    const denied: ExternalCalendarState = {
      connected: false,
      readGranted: false,
      writeGranted: false,
      selectedCalendarIds: [],
    };
    await setLifeOSState(EXTERNAL_STATE_KEY, denied);
    return { state: denied, importedCount: 0 };
  }

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const selectedIds = calendars.slice(0, 5).map((c) => c.id);
  const start = new Date();
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 14);

  let importedCount = 0;
  if (selectedIds.length > 0) {
    const db = await getDatabase();
    const tz = getLocalTimezoneId();
    for (const cal of calendars.slice(0, 5)) {
      const events = await cal.listEvents(start, end);
      for (const ev of events.slice(0, 40)) {
        const extRef = `oscal_${cal.id}_${ev.id}`;
        const existing = await db.getFirstAsync<{ block_id: string }>(
          'SELECT block_id FROM calendar_blocks WHERE external_event_ref = ?',
          extRef
        );
        if (!existing && ev.startDate && ev.endDate) {
          await db.runAsync(
            `INSERT INTO calendar_blocks (
               block_id, title, notes, start_at_utc, end_at_utc,
               timezone_id, color, source, external_event_ref, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, 'external_readonly', ?, 'scheduled')`,
            generateUuid('extblk'),
            ev.title || 'External Event',
            ev.location || null,
            new Date(ev.startDate).toISOString(),
            new Date(ev.endDate).toISOString(),
            tz,
            '#60A5FA',
            extRef
          );
          importedCount++;
        }
      }
    }
  }

  const state: ExternalCalendarState = {
    connected: true,
    readGranted: true,
    writeGranted: false,
    selectedCalendarIds: selectedIds,
    lastSyncedAt: new Date().toISOString(),
  };
  await setLifeOSState(EXTERNAL_STATE_KEY, state);
  return { state, importedCount };
}

export async function disconnectExternalCalendar(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM calendar_blocks WHERE source = 'external_readonly'");
  await setLifeOSState(EXTERNAL_STATE_KEY, {
    connected: false,
    readGranted: false,
    writeGranted: false,
    selectedCalendarIds: [],
  });
}

export async function exportBlockToExternalCalendar(
  block: CalendarBlock
): Promise<{ success: boolean; message: string }> {
  if (Platform.OS === 'web') {
    return { success: false, message: 'OS calendar export is unavailable on web.' };
  }
  const { status } = await Calendar.requestCalendarPermissions(false);
  if (status !== 'granted') {
    return { success: false, message: 'Full calendar write permission was not granted.' };
  }
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications) ?? calendars[0];
  if (!writable) {
    return { success: false, message: 'No writable calendar account found on device.' };
  }
  await writable.createEvent({
    title: block.title,
    notes: block.notes ?? 'Created in NeuroNinja LifeOS',
    startDate: new Date(block.startAtUtc),
    endDate: new Date(block.endAtUtc),
    timeZone: block.timezoneId || getLocalTimezoneId(),
  });
  const cur = await getExternalCalendarState();
  await setLifeOSState(EXTERNAL_STATE_KEY, { ...cur, writeGranted: true });
  return { success: true, message: `Exported "${block.title}" to "${writable.title}".` };
}
