import * as Notifications from 'expo-notifications';
import { villainEngine } from '../villains/villain-engine';
import {
  getDatabase,
  generateUuid,
  getLocalTimezoneId,
  getLifeOSState,
  setLifeOSState,
} from '../database/database';
import { computeNextOccurrence, type RecurrenceRule } from './recurrence-engine';

export type TaskStatus = 'inbox' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskSource = 'manual' | 'voice' | 'nlp' | 'routine';

export interface LifeOSTaskList {
  listId: string;
  title: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface TaskReminderRecord {
  reminderId: string;
  taskId: string;
  triggerAtUtc: string;
  timezoneId: string;
  nativeNotificationId?: string | null;
  state: 'scheduled' | 'fired' | 'cancelled';
}

export interface LifeOSTask {
  taskId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  listId?: string | null;
  parentTaskId?: string | null;
  dueAtUtc?: string | null;
  dueLocal?: string | null;
  timezoneId?: string | null;
  estimatedMinutes?: number | null;
  completedAt?: string | null;
  recurrence?: RecurrenceRule | null;
  showCountdown: boolean;
  source: TaskSource;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  subtaskCount?: number;
  subtasksDone?: number;
  verifierType?: 'self' | 'friend' | 'parent' | 'mentor';
  verifierId?: string | null;
  verifierEmail?: string | null;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  verifiedAt?: string | null;
}

export interface DailyCompletionPoint {
  label: string;
  count: number;
}

export interface TaskStatsSummary {
  totalActive: number;
  completedToday: number;
  completedThisWeek: number;
  overdueCount: number;
  completionRatePercent: number;
  urgentCount: number;
  dailyCompletedCounts: DailyCompletionPoint[];
}

export interface SharedListConfig {
  isShared: boolean;
  authorizedMembers: string[];
  ownerRole: 'owner' | 'editor' | 'viewer';
}

const SHARED_LISTS_KEY = 'task_shared_lists_v1';
const TASK_ASSIGNMENTS_KEY = 'task_assignments_v1';

interface RawTaskRow {
  task_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  list_id: string | null;
  parent_task_id: string | null;
  due_at_utc: string | null;
  due_local: string | null;
  timezone_id: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  recurrence_json: string | null;
  show_countdown: number;
  source: string;
  created_at: string;
  updated_at: string;
  verifier_type?: string | null;
  verifier_id?: string | null;
  verifier_email?: string | null;
  verification_status?: string | null;
  verified_at?: string | null;
}

function mapTaskRow(
  row: RawTaskRow,
  tagsMap: Map<string, string[]>,
  subtaskCounts: Map<string, { total: number; done: number }>
): LifeOSTask {
  let recurrence: RecurrenceRule | null = null;
  if (row.recurrence_json) {
    try {
      recurrence = JSON.parse(row.recurrence_json) as RecurrenceRule;
    } catch {
      recurrence = null;
    }
  }
  const counts = subtaskCounts.get(row.task_id);
  return {
    taskId: row.task_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    listId: row.list_id,
    parentTaskId: row.parent_task_id,
    dueAtUtc: row.due_at_utc,
    dueLocal: row.due_local,
    timezoneId: row.timezone_id,
    estimatedMinutes: row.estimated_minutes,
    completedAt: row.completed_at,
    recurrence,
    showCountdown: Boolean(row.show_countdown),
    source: row.source as TaskSource,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: tagsMap.get(row.task_id) ?? [],
    subtaskCount: counts?.total ?? 0,
    subtasksDone: counts?.done ?? 0,
    verifierType: (row.verifier_type as any) || 'self',
    verifierId: row.verifier_id ?? null,
    verifierEmail: row.verifier_email ?? null,
    verificationStatus: (row.verification_status as any) || 'none',
    verifiedAt: row.verified_at ?? null,
  };
}

export async function getTaskLists(): Promise<LifeOSTaskList[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    list_id: string;
    title: string;
    color: string;
    icon: string;
    sort_order: number;
  }>('SELECT list_id, title, color, icon, sort_order FROM task_lists ORDER BY sort_order ASC');

  return rows.map((r) => ({
    listId: r.list_id,
    title: r.title,
    color: r.color,
    icon: r.icon,
    sortOrder: r.sort_order,
  }));
}

export async function createTaskList(title: string, color: string = '#10B981'): Promise<LifeOSTaskList> {
  const db = await getDatabase();
  const listId = generateUuid('list');
  const maxRow = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM task_lists'
  );
  const sortOrder = (maxRow?.max_order ?? 3) + 1;
  await db.runAsync(
    'INSERT INTO task_lists (list_id, title, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    listId,
    title.trim(),
    color,
    'folder-outline',
    sortOrder,
    new Date().toISOString()
  );
  return { listId, title: title.trim(), color, icon: 'folder-outline', sortOrder };
}

export async function getAllTasks(options?: {
  includeSubtasks?: boolean;
}): Promise<LifeOSTask[]> {
  const db = await getDatabase();
  const where = options?.includeSubtasks ? '' : 'WHERE parent_task_id IS NULL';
  const rows = await db.getAllAsync<RawTaskRow>(
    `SELECT * FROM tasks ${where} ORDER BY
      CASE status WHEN 'completed' THEN 1 WHEN 'cancelled' THEN 2 ELSE 0 END ASC,
      CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END ASC,
      COALESCE(due_at_utc, '9999') ASC,
      created_at DESC`
  );

  const tagRows = await db.getAllAsync<{ task_id: string; tag_id: string }>(
    'SELECT task_id, tag_id FROM task_tags'
  );
  const tagsMap = new Map<string, string[]>();
  for (const t of tagRows) {
    const arr = tagsMap.get(t.task_id) ?? [];
    arr.push(t.tag_id);
    tagsMap.set(t.task_id, arr);
  }

  const subRows = await db.getAllAsync<{ parent_task_id: string; total: number; done: number }>(
    `SELECT parent_task_id,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done
     FROM tasks
     WHERE parent_task_id IS NOT NULL
     GROUP BY parent_task_id`
  );
  const subtaskCounts = new Map<string, { total: number; done: number }>();
  for (const s of subRows) {
    subtaskCounts.set(s.parent_task_id, { total: s.total, done: s.done ?? 0 });
  }

  return rows.map((r) => mapTaskRow(r, tagsMap, subtaskCounts));
}

export async function getTaskById(taskId: string): Promise<LifeOSTask | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<RawTaskRow>('SELECT * FROM tasks WHERE task_id = ?', taskId);
  if (!row) return null;

  const tagRows = await db.getAllAsync<{ tag_id: string }>(
    'SELECT tag_id FROM task_tags WHERE task_id = ?',
    taskId
  );
  const tagsMap = new Map<string, string[]>();
  tagsMap.set(taskId, tagRows.map((t) => t.tag_id));
  return mapTaskRow(row, tagsMap, new Map());
}

export async function getSubtasks(parentTaskId: string): Promise<LifeOSTask[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RawTaskRow>(
    'SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at ASC',
    parentTaskId
  );
  return rows.map((r) => mapTaskRow(r, new Map(), new Map()));
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  listId?: string | null;
  parentTaskId?: string | null;
  dueAtUtc?: string | null;
  dueLocal?: string | null;
  estimatedMinutes?: number | null;
  recurrence?: RecurrenceRule | null;
  showCountdown?: boolean;
  source?: TaskSource;
  tags?: string[];
  verifierType?: 'self' | 'friend' | 'parent' | 'mentor';
  verifierId?: string | null;
  verifierEmail?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<LifeOSTask> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const taskId = generateUuid('task');
  const tz = getLocalTimezoneId();
  const status: TaskStatus = input.status ?? (input.dueAtUtc ? 'planned' : 'inbox');

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO tasks (
         task_id, title, description, status, priority, list_id, parent_task_id,
         due_at_utc, due_local, timezone_id, estimated_minutes, recurrence_json,
         show_countdown, source, verifier_type, verifier_id, verifier_email,
         verification_status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', ?, ?)`,
      taskId,
      input.title.trim(),
      input.description ?? null,
      status,
      input.priority ?? 'normal',
      input.listId ?? 'list_inbox',
      input.parentTaskId ?? null,
      input.dueAtUtc ?? null,
      input.dueLocal ?? null,
      tz,
      input.estimatedMinutes ?? null,
      input.recurrence ? JSON.stringify(input.recurrence) : null,
      input.showCountdown ? 1 : 0,
      input.source ?? 'manual',
      input.verifierType ?? 'self',
      input.verifierId ?? null,
      input.verifierEmail ?? null,
      now,
      now
    );

    if (input.tags && input.tags.length > 0) {
      for (const rawTag of input.tags) {
        const cleanTag = rawTag.trim().toLowerCase();
        if (cleanTag) {
          await db.runAsync(
            'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)',
            taskId,
            cleanTag
          );
        }
      }
    }
  });

  const created = await getTaskById(taskId);
  if (!created) throw new Error('Failed to read newly created task');
  return created;
}

export async function updateTask(
  taskId: string,
  patch: Partial<CreateTaskInput> & { status?: TaskStatus; completedAt?: string | null }
): Promise<LifeOSTask | null> {
  const db = await getDatabase();
  const existing = await getTaskById(taskId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextTitle = patch.title !== undefined ? patch.title.trim() : existing.title;
  const nextDesc = patch.description !== undefined ? patch.description : existing.description;
  const nextStatus = patch.status !== undefined ? patch.status : existing.status;
  const nextPriority = patch.priority !== undefined ? patch.priority : existing.priority;
  const nextListId = patch.listId !== undefined ? patch.listId : existing.listId;
  const nextDueUtc = patch.dueAtUtc !== undefined ? patch.dueAtUtc : existing.dueAtUtc;
  const nextDueLocal = patch.dueLocal !== undefined ? patch.dueLocal : existing.dueLocal;
  const nextEst = patch.estimatedMinutes !== undefined ? patch.estimatedMinutes : existing.estimatedMinutes;
  const nextRecurrence = patch.recurrence !== undefined ? patch.recurrence : existing.recurrence;
  const nextCountdown = patch.showCountdown !== undefined ? patch.showCountdown : existing.showCountdown;
  const nextCompletedAt =
    patch.completedAt !== undefined
      ? patch.completedAt
      : nextStatus === 'completed'
        ? existing.completedAt ?? now
        : null;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE tasks SET
         title = ?, description = ?, status = ?, priority = ?, list_id = ?,
         due_at_utc = ?, due_local = ?, estimated_minutes = ?, recurrence_json = ?,
         show_countdown = ?, completed_at = ?, updated_at = ?
       WHERE task_id = ?`,
      nextTitle,
      nextDesc ?? null,
      nextStatus,
      nextPriority,
      nextListId ?? null,
      nextDueUtc ?? null,
      nextDueLocal ?? null,
      nextEst ?? null,
      nextRecurrence ? JSON.stringify(nextRecurrence) : null,
      nextCountdown ? 1 : 0,
      nextCompletedAt,
      now,
      taskId
    );

    if (patch.tags !== undefined) {
      await db.runAsync('DELETE FROM task_tags WHERE task_id = ?', taskId);
      for (const t of patch.tags) {
        const clean = t.trim().toLowerCase();
        if (clean) {
          await db.runAsync(
            'INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)',
            taskId,
            clean
          );
        }
      }
    }
  });

  return getTaskById(taskId);
}

/**
 * Completes or reopens a task. If completing a recurring task, automatically creates
 * the next occurrence if an uncompleted successor with the same due timestamp doesn't exist.
 */
export async function toggleTaskComplete(taskId: string): Promise<{
  updated: LifeOSTask | null;
  nextOccurrence: LifeOSTask | null;
}> {
  const existing = await getTaskById(taskId);
  if (!existing) return { updated: null, nextOccurrence: null };

  const completing = existing.status !== 'completed';
  const updated = await updateTask(taskId, {
    status: completing ? 'completed' : existing.dueAtUtc ? 'planned' : 'inbox',
    completedAt: completing ? new Date().toISOString() : null,
  });

  if (completing) {
    // Strike active Daily & Weekly Villains!
    void villainEngine.dealDamage('task', 40, existing.title).catch(() => {});
  }

  if (completing && existing.verifierType && existing.verifierType !== 'self' && existing.verifierId) {
    const db = await getDatabase();
    const vreqId = generateUuid('vreq');
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO verification_requests
       (id, task_id, user_id, verifier_id, verifier_email, type, status, created_at, sync_status)
       VALUES (?, ?, 'local_user', ?, ?, 'task', 'pending', ?, 'pending')`,
      vreqId,
      taskId,
      existing.verifierId,
      existing.verifierEmail || null,
      now
    );
    await db.runAsync(
      "UPDATE tasks SET verification_status = 'pending' WHERE task_id = ?",
      taskId
    );
  }

  let nextOccurrence: LifeOSTask | null = null;
  if (completing && existing.recurrence && !existing.parentTaskId) {
    const db = await getDatabase();
    const { dueLocal, dueAtUtc } = computeNextOccurrence(
      existing.dueLocal ?? existing.dueAtUtc ?? undefined,
      existing.recurrence
    );
    const dup = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks
       WHERE title = ? AND due_local = ? AND status != 'completed' AND status != 'cancelled'`,
      existing.title,
      dueLocal
    );
    if ((dup?.count ?? 0) === 0) {
      nextOccurrence = await createTask({
        title: existing.title,
        description: existing.description ?? undefined,
        status: 'planned',
        priority: existing.priority,
        listId: existing.listId,
        dueAtUtc,
        dueLocal,
        estimatedMinutes: existing.estimatedMinutes,
        recurrence: existing.recurrence,
        showCountdown: existing.showCountdown,
        source: existing.source,
        tags: existing.tags,
      });
    }
  }

  return { updated, nextOccurrence };
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = await getDatabase();
  const reminders = await getTaskReminders(taskId);
  for (const r of reminders) {
    if (r.nativeNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(r.nativeNotificationId).catch(() => {});
    }
  }
  await db.runAsync('DELETE FROM tasks WHERE task_id = ?', taskId);
}

export async function getTaskReminders(taskId: string): Promise<TaskReminderRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    reminder_id: string;
    task_id: string;
    trigger_at_utc: string;
    timezone_id: string;
    native_notification_id: string | null;
    state: string;
  }>('SELECT * FROM task_reminders WHERE task_id = ? ORDER BY trigger_at_utc ASC', taskId);

  return rows.map((r) => ({
    reminderId: r.reminder_id,
    taskId: r.task_id,
    triggerAtUtc: r.trigger_at_utc,
    timezoneId: r.timezone_id,
    nativeNotificationId: r.native_notification_id,
    state: r.state as TaskReminderRecord['state'],
  }));
}

export async function addTaskReminder(taskId: string, triggerDate: Date): Promise<TaskReminderRecord> {
  const db = await getDatabase();
  const task = await getTaskById(taskId);
  const reminderId = generateUuid('rem');
  const tz = getLocalTimezoneId();
  let nativeNotificationId: string | null = null;

  try {
    const perms = await Notifications.getPermissionsAsync();
    let granted = perms.status === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === 'granted';
    }
    if (granted && triggerDate.getTime() > Date.now() + 2000) {
      nativeNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'NeuroNinja Task Reminder',
          body: task?.title ?? 'Scheduled task reminder',
          data: { taskId, type: 'task_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  } catch (e) {
    console.warn('Could not schedule notification for task reminder:', e);
  }

  await db.runAsync(
    `INSERT INTO task_reminders (reminder_id, task_id, trigger_at_utc, timezone_id, native_notification_id, state)
     VALUES (?, ?, ?, ?, ?, 'scheduled')`,
    reminderId,
    taskId,
    triggerDate.toISOString(),
    tz,
    nativeNotificationId
  );

  return {
    reminderId,
    taskId,
    triggerAtUtc: triggerDate.toISOString(),
    timezoneId: tz,
    nativeNotificationId,
    state: 'scheduled',
  };
}

export async function deleteTaskReminder(reminderId: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ native_notification_id: string | null }>(
    'SELECT native_notification_id FROM task_reminders WHERE reminder_id = ?',
    reminderId
  );
  if (row?.native_notification_id) {
    await Notifications.cancelScheduledNotificationAsync(row.native_notification_id).catch(() => {});
  }
  await db.runAsync('DELETE FROM task_reminders WHERE reminder_id = ?', reminderId);
}

export async function getCountdownTasks(): Promise<LifeOSTask[]> {
  const all = await getAllTasks();
  return all.filter(
    (t) => t.showCountdown && t.dueAtUtc && t.status !== 'completed' && t.status !== 'cancelled'
  );
}

export async function getTaskStatsSummary(): Promise<TaskStatsSummary> {
  const all = await getAllTasks();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 6 * 86400000;

  const active = all.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const completed = all.filter((t) => t.status === 'completed');

  const completedToday = completed.filter(
    (t) => t.completedAt && new Date(t.completedAt).getTime() >= startOfToday
  ).length;
  const completedThisWeek = completed.filter(
    (t) => t.completedAt && new Date(t.completedAt).getTime() >= weekAgo
  ).length;
  const overdueCount = active.filter(
    (t) => t.dueAtUtc && new Date(t.dueAtUtc).getTime() < now.getTime()
  ).length;
  const urgentCount = active.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
  const totalDenominator = active.length + completed.length;

  const dailyCompletedCounts: DailyCompletionPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = startOfToday - i * 86400000;
    const dayEnd = dayStart + 86400000;
    const d = new Date(dayStart);
    const label = d.toLocaleDateString(undefined, { weekday: 'narrow' });
    const count = completed.filter((t) => {
      if (!t.completedAt) return false;
      const ms = new Date(t.completedAt).getTime();
      return ms >= dayStart && ms < dayEnd;
    }).length;
    dailyCompletedCounts.push({ label, count });
  }

  return {
    totalActive: active.length,
    completedToday,
    completedThisWeek,
    overdueCount,
    completionRatePercent: totalDenominator > 0 ? Math.round((completed.length / totalDenominator) * 100) : 0,
    urgentCount,
    dailyCompletedCounts,
  };
}

export async function getSharedListConfigs(): Promise<Record<string, SharedListConfig>> {
  return getLifeOSState<Record<string, SharedListConfig>>(SHARED_LISTS_KEY, {});
}

export async function setSharedListConfig(
  listId: string,
  config: SharedListConfig
): Promise<void> {
  const all = await getSharedListConfigs();
  await setLifeOSState(SHARED_LISTS_KEY, { ...all, [listId]: config });
}

export async function getTaskAssignments(): Promise<Record<string, string>> {
  return getLifeOSState<Record<string, string>>(TASK_ASSIGNMENTS_KEY, {});
}

export async function assignTaskToMember(taskId: string, memberName: string | null): Promise<void> {
  const all = await getTaskAssignments();
  if (!memberName || !memberName.trim()) {
    delete all[taskId];
  } else {
    all[taskId] = memberName.trim();
  }
  await setLifeOSState(TASK_ASSIGNMENTS_KEY, all);
}

