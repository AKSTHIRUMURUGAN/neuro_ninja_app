import * as Notifications from 'expo-notifications';
import { getDatabase, generateUuid } from '../database/database';

export type RoutineCategory = 'morning' | 'evening' | 'study' | 'work' | 'exercise' | 'sleep';
export type LinkedStepAction = 'start_focus' | 'activate_profile' | 'show_task';

export interface RoutineStepItem {
  stepId: string;
  routineId: string;
  position: number;
  title: string;
  durationSeconds: number;
  linkedAction?: LinkedStepAction | null;
}

export interface RoutineDefinition {
  routineId: string;
  title: string;
  category: RoutineCategory;
  scheduleTime?: string; // "HH:MM"
  days?: number[];
  enabled: boolean;
  steps: RoutineStepItem[];
}

export interface RoutineRunProgress {
  completedStepIds: string[];
  skippedStepIds: string[];
  stepStartedAtMs: number;
  pausedElapsedMs: number;
  isPaused: boolean;
}

export interface RoutineRunState {
  runId: string;
  routineId: string;
  startedAt: string;
  endedAt?: string | null;
  currentStepId: string | null;
  status: 'running' | 'paused' | 'completed' | 'abandoned';
  progress: RoutineRunProgress;
}

export interface RoutineTemplate {
  title: string;
  category: RoutineCategory;
  steps: { title: string; durationSeconds: number; linkedAction?: LinkedStepAction }[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    title: 'Ninja Morning Ignition',
    category: 'morning',
    steps: [
      { title: 'Drink 500ml water', durationSeconds: 120 },
      { title: 'Morning mobility stretch', durationSeconds: 300 },
      { title: 'Mindful breathwork reset', durationSeconds: 240 },
      { title: 'Review top 3 priorities', durationSeconds: 180, linkedAction: 'show_task' },
    ],
  },
  {
    title: 'Deep Study Sprint',
    category: 'study',
    steps: [
      { title: 'Clear desk & close distractions', durationSeconds: 120, linkedAction: 'activate_profile' },
      { title: 'Focused Pomodoro study block', durationSeconds: 1500, linkedAction: 'start_focus' },
      { title: 'Active recall & notes check', durationSeconds: 300 },
    ],
  },
  {
    title: 'Work Deep-Focus Launch',
    category: 'work',
    steps: [
      { title: 'Triage inbox (< 5 min)', durationSeconds: 300 },
      { title: 'Pick #1 milestone deliverable', durationSeconds: 120, linkedAction: 'show_task' },
      { title: 'Engage Shield & 50m Deep Work', durationSeconds: 3000, linkedAction: 'start_focus' },
    ],
  },
  {
    title: 'Kinetic Movement Reset',
    category: 'exercise',
    steps: [
      { title: 'Dynamic joint warm-up', durationSeconds: 180 },
      { title: 'Bodyweight squats & pushups', durationSeconds: 420 },
      { title: 'Cool-down & hydrate', durationSeconds: 180 },
    ],
  },
  {
    title: 'Evening Digital Curfew',
    category: 'evening',
    steps: [
      { title: 'End-of-day task review', durationSeconds: 240, linkedAction: 'show_task' },
      { title: 'Plug phone outside bedroom', durationSeconds: 120 },
      { title: 'Read 10 pages', durationSeconds: 600 },
    ],
  },
  {
    title: 'Sleep Wind-Down Protocol',
    category: 'sleep',
    steps: [
      { title: 'Dim screens & engage Night Mode', durationSeconds: 120, linkedAction: 'activate_profile' },
      { title: '4-7-8 calm breathing', durationSeconds: 240 },
      { title: 'Log Sleep Diary & lights out', durationSeconds: 120 },
    ],
  },
];

async function ensureSeededRoutines(): Promise<void> {
  const db = await getDatabase();
  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM routines');
  if ((countRow?.count ?? 0) > 0) return;

  // Seed 2 starter routines (Morning + Sleep)
  await createRoutineFromTemplate(ROUTINE_TEMPLATES[0]);
  await createRoutineFromTemplate(ROUTINE_TEMPLATES[5]);
}

export async function getAllRoutines(): Promise<RoutineDefinition[]> {
  await ensureSeededRoutines();
  const db = await getDatabase();
  const routineRows = await db.getAllAsync<{
    routine_id: string;
    title: string;
    category: string;
    schedule_json: string | null;
    enabled: number;
  }>('SELECT * FROM routines ORDER BY created_at ASC');

  const stepRows = await db.getAllAsync<{
    step_id: string;
    routine_id: string;
    position: number;
    title: string;
    duration_seconds: number | null;
    linked_action_json: string | null;
  }>('SELECT * FROM routine_steps ORDER BY position ASC');

  const stepsMap = new Map<string, RoutineStepItem[]>();
  for (const s of stepRows) {
    let linkedAction: LinkedStepAction | null = null;
    if (s.linked_action_json) {
      try {
        linkedAction = (JSON.parse(s.linked_action_json) as { type?: LinkedStepAction }).type ?? null;
      } catch {
        linkedAction = null;
      }
    }
    const list = stepsMap.get(s.routine_id) ?? [];
    list.push({
      stepId: s.step_id,
      routineId: s.routine_id,
      position: s.position,
      title: s.title,
      durationSeconds: s.duration_seconds ?? 180,
      linkedAction,
    });
    stepsMap.set(s.routine_id, list);
  }

  return routineRows.map((r) => {
    let schedule: { time?: string; days?: number[] } = {};
    if (r.schedule_json) {
      try {
        schedule = JSON.parse(r.schedule_json) as { time?: string; days?: number[] };
      } catch {
        schedule = {};
      }
    }
    return {
      routineId: r.routine_id,
      title: r.title,
      category: r.category as RoutineCategory,
      scheduleTime: schedule.time,
      days: schedule.days,
      enabled: Boolean(r.enabled),
      steps: stepsMap.get(r.routine_id) ?? [],
    };
  });
}

export async function getRoutineById(routineId: string): Promise<RoutineDefinition | null> {
  const all = await getAllRoutines();
  return all.find((r) => r.routineId === routineId) ?? null;
}

export async function createRoutine(input: {
  title: string;
  category: RoutineCategory;
  scheduleTime?: string;
  steps: { title: string; durationSeconds: number; linkedAction?: LinkedStepAction | null }[];
}): Promise<RoutineDefinition> {
  const db = await getDatabase();
  const routineId = generateUuid('rtn');
  const now = new Date().toISOString();
  const scheduleJson = input.scheduleTime
    ? JSON.stringify({ time: input.scheduleTime, days: [0, 1, 2, 3, 4, 5, 6] })
    : null;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO routines (routine_id, title, category, schedule_json, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      routineId,
      input.title.trim(),
      input.category,
      scheduleJson,
      now,
      now
    );
    for (let i = 0; i < input.steps.length; i++) {
      const st = input.steps[i];
      await db.runAsync(
        `INSERT INTO routine_steps (step_id, routine_id, position, title, duration_seconds, linked_action_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        generateUuid('step'),
        routineId,
        i,
        st.title.trim(),
        st.durationSeconds,
        st.linkedAction ? JSON.stringify({ type: st.linkedAction }) : null
      );
    }
  });

  if (input.scheduleTime) {
    await scheduleRoutineNotification(routineId, input.title, input.scheduleTime);
  }

  const created = await getRoutineById(routineId);
  if (!created) throw new Error('Failed to load created routine');
  return created;
}

export async function createRoutineFromTemplate(tpl: RoutineTemplate): Promise<RoutineDefinition> {
  return createRoutine({
    title: tpl.title,
    category: tpl.category,
    steps: tpl.steps,
  });
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM routines WHERE routine_id = ?', routineId);
}

export async function swapRoutineSteps(
  routineId: string,
  stepIdA: string,
  stepIdB: string
): Promise<void> {
  const db = await getDatabase();
  const routine = await getRoutineById(routineId);
  if (!routine) return;
  const idxA = routine.steps.findIndex((s) => s.stepId === stepIdA);
  const idxB = routine.steps.findIndex((s) => s.stepId === stepIdB);
  if (idxA < 0 || idxB < 0) return;

  await db.withTransactionAsync(async () => {
    // Temporary offset to avoid UNIQUE(routine_id, position) collision
    await db.runAsync('UPDATE routine_steps SET position = -1 WHERE step_id = ?', stepIdA);
    await db.runAsync('UPDATE routine_steps SET position = ? WHERE step_id = ?', idxA, stepIdB);
    await db.runAsync('UPDATE routine_steps SET position = ? WHERE step_id = ?', idxB, stepIdA);
  });
}

export async function getActiveRoutineRun(): Promise<RoutineRunState | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    run_id: string;
    routine_id: string;
    started_at: string;
    ended_at: string | null;
    current_step_id: string | null;
    status: string;
    progress_json: string | null;
  }>("SELECT * FROM routine_runs WHERE status IN ('running', 'paused') ORDER BY started_at DESC LIMIT 1");

  if (!row) return null;
  let progress: RoutineRunProgress = {
    completedStepIds: [],
    skippedStepIds: [],
    stepStartedAtMs: Date.now(),
    pausedElapsedMs: 0,
    isPaused: row.status === 'paused',
  };
  if (row.progress_json) {
    try {
      progress = JSON.parse(row.progress_json) as RoutineRunProgress;
    } catch {
      // use fallback
    }
  }
  return {
    runId: row.run_id,
    routineId: row.routine_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    currentStepId: row.current_step_id,
    status: row.status as RoutineRunState['status'],
    progress,
  };
}

export async function startRoutineRun(routineId: string): Promise<RoutineRunState | null> {
  const routine = await getRoutineById(routineId);
  if (!routine || routine.steps.length === 0) return null;

  const db = await getDatabase();
  // Close any previous dangling active runs cleanly
  await db.runAsync(
    "UPDATE routine_runs SET status = 'abandoned', ended_at = ? WHERE status IN ('running', 'paused')",
    new Date().toISOString()
  );

  const runId = generateUuid('run');
  const now = new Date().toISOString();
  const firstStepId = routine.steps[0].stepId;
  const progress: RoutineRunProgress = {
    completedStepIds: [],
    skippedStepIds: [],
    stepStartedAtMs: Date.now(),
    pausedElapsedMs: 0,
    isPaused: false,
  };

  await db.runAsync(
    `INSERT INTO routine_runs (run_id, routine_id, started_at, current_step_id, status, progress_json)
     VALUES (?, ?, ?, ?, 'running', ?)`,
    runId,
    routineId,
    now,
    firstStepId,
    JSON.stringify(progress)
  );

  return {
    runId,
    routineId,
    startedAt: now,
    endedAt: null,
    currentStepId: firstStepId,
    status: 'running',
    progress,
  };
}

export async function advanceRoutineRun(
  runId: string,
  action: 'complete' | 'skip'
): Promise<RoutineRunState | null> {
  const db = await getDatabase();
  const run = await getActiveRoutineRun();
  if (!run || run.runId !== runId) return null;

  const routine = await getRoutineById(run.routineId);
  if (!routine) return null;

  const currentIdx = routine.steps.findIndex((s) => s.stepId === run.currentStepId);
  const currentStepId = run.currentStepId;
  const nextProgress: RoutineRunProgress = {
    ...run.progress,
    completedStepIds:
      action === 'complete' && currentStepId
        ? [...run.progress.completedStepIds, currentStepId]
        : run.progress.completedStepIds,
    skippedStepIds:
      action === 'skip' && currentStepId
        ? [...run.progress.skippedStepIds, currentStepId]
        : run.progress.skippedStepIds,
    stepStartedAtMs: Date.now(),
    pausedElapsedMs: 0,
    isPaused: false,
  };

  const nextStep = routine.steps[currentIdx + 1];
  if (!nextStep) {
    const endedAt = new Date().toISOString();
    await db.runAsync(
      "UPDATE routine_runs SET status = 'completed', ended_at = ?, current_step_id = NULL, progress_json = ? WHERE run_id = ?",
      endedAt,
      JSON.stringify(nextProgress),
      runId
    );
    return {
      ...run,
      endedAt,
      currentStepId: null,
      status: 'completed',
      progress: nextProgress,
    };
  }

  await db.runAsync(
    "UPDATE routine_runs SET status = 'running', current_step_id = ?, progress_json = ? WHERE run_id = ?",
    nextStep.stepId,
    JSON.stringify(nextProgress),
    runId
  );

  return {
    ...run,
    currentStepId: nextStep.stepId,
    status: 'running',
    progress: nextProgress,
  };
}

export async function togglePauseRoutineRun(runId: string): Promise<RoutineRunState | null> {
  const db = await getDatabase();
  const run = await getActiveRoutineRun();
  if (!run || run.runId !== runId) return null;

  const willPause = run.status !== 'paused';
  const elapsedThisSegment = Date.now() - run.progress.stepStartedAtMs;
  const nextProgress: RoutineRunProgress = willPause
    ? {
        ...run.progress,
        pausedElapsedMs: run.progress.pausedElapsedMs + Math.max(0, elapsedThisSegment),
        isPaused: true,
      }
    : {
        ...run.progress,
        stepStartedAtMs: Date.now(),
        isPaused: false,
      };

  const nextStatus = willPause ? 'paused' : 'running';
  await db.runAsync(
    'UPDATE routine_runs SET status = ?, progress_json = ? WHERE run_id = ?',
    nextStatus,
    JSON.stringify(nextProgress),
    runId
  );

  return { ...run, status: nextStatus, progress: nextProgress };
}

export async function stopRoutineRun(runId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE routine_runs SET status = 'abandoned', ended_at = ? WHERE run_id = ?",
    new Date().toISOString(),
    runId
  );
}

async function scheduleRoutineNotification(
  routineId: string,
  title: string,
  timeHHMM: string
): Promise<void> {
  try {
    const perms = await Notifications.getPermissionsAsync();
    if (perms.status !== 'granted') return;
    const [hStr, mStr] = timeHHMM.split(':');
    const hour = Number(hStr);
    const minute = Number(mStr);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Routine Ready: ${title}`,
        body: 'Tap to launch your guided NeuroNinja routine player.',
        data: { routineId, type: 'routine_start' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch {
    // non-fatal
  }
}

