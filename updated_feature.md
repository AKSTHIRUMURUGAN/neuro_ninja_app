"PRD.md": r"""

# Addendum A — Alarmy & Productivity Suite (v1.1)

## A1. Product expansion: Ninja LifeOS

Add **Ninja LifeOS** as a first-class product pillar connecting alarms, tasks, calendar planning, routines, habits, focus sessions and digital-wellbeing restrictions. It must not become a disconnected task manager: tasks can launch focus sessions, routines can schedule app policies, and alarms can start a routine or challenge.

## A2. Alarmy-inspired mission alarm requirements

Study Alarmy's publicly described mission-alarm patterns: math, memory, shake, typing, squat/exercise, QR/barcode and photo missions; wake-up checks; sleep reports; snore detection and sleep sounds. Implement original NeuronNinja versions.

- FR-180 (P0): Alarm mission selection per alarm.
- FR-181 (P0): Math mission with configurable difficulty and question count.
- FR-182 (P1): Memory sequence and number-order missions.
- FR-183 (P1): Typing mission with configurable text.
- FR-184 (P1): Shake mission using motion sensors, with configurable count and motion calibration.
- FR-185 (P1): Movement mission such as steps/squats only when reliable sensor signals exist; do not claim medically accurate exercise measurement.
- FR-186 (P1): QR/barcode mission with setup scan and wake-up scan.
- FR-187 (P2): Photo mission matching a user-selected reference/location, with clear camera permission and local processing; avoid biometric identification.
- FR-188 (P1): Wake-up check after dismissal, with user-configured delay and gentle reminder.
- FR-189 (P1): Snooze limits and configurable snooze rules.
- FR-190 (P0): Emergency dismissal route; never create a dangerous alarm trap.
- FR-191 (P1): Sleep sounds and bedtime audio timer.
- FR-192 (P2): Sleep diary and manual sleep schedule.
- FR-193 (P3): Optional snore/sound-event detection only with explicit microphone consent, local-first processing, visible recording state, short retention and legal/privacy review. Do not claim clinical sleep diagnosis.
- FR-194 (P0): Mission failures, camera/sensor failure and permission denial have safe fallback paths.

## A3. Task and productivity requirements inspired by TickTick/Todoist

- FR-200 (P0): Quick-capture inbox for tasks.
- FR-201 (P0): Task title, notes, due date/time, priority, status and estimated duration.
- FR-202 (P0): Lists/projects, subtasks, tags and filters.
- FR-203 (P0): Recurring tasks with flexible recurrence rules.
- FR-204 (P0): Multiple reminders and overdue handling.
- FR-205 (P1): Natural-language date/time parsing, always showing parsed result for confirmation.
- FR-206 (P1): Voice capture with on-device transcription where available; explicit microphone consent.
- FR-207 (P1): Kanban and timeline views.
- FR-208 (P1): Task collaboration, assignment and shared lists with authorization.
- FR-209 (P1): Task statistics and completion trends.
- FR-210 (P1): Eisenhower priority matrix.
- FR-211 (P1): Countdown to exams, deadlines and milestones.

## A4. Calendar and time-blocking requirements

- FR-220 (P0): Day, week, month and agenda views.
- FR-221 (P0): Time-block tasks and focus sessions.
- FR-222 (P1): Read/write calendar integration only after explicit account connection and scope consent.
- FR-223 (P1): Conflict detection and manual rescheduling suggestions.
- FR-224 (P2): AI-assisted schedule suggestions using task duration, priority, available time and user-defined working hours.
- FR-225 (P0): User approves all AI schedule changes; never silently move calendar events.
- FR-226 (P1): Calendar/task timezone and travel handling.

## A5. Routine and habit requirements

- FR-230 (P0): Step-by-step routines with ordered tasks, duration estimates and progress.
- FR-231 (P0): Morning, evening, study, work, exercise and sleep templates.
- FR-232 (P1): Routine timer with next-step auto-advance option.
- FR-233 (P0): Habit schedule, check-ins, streaks and weekly review.
- FR-234 (P1): Habit challenges, rewards and companion growth.
- FR-235 (P0): Missed-day recovery without punitive streak manipulation.
- FR-236 (P1): Habit-to-alarm and habit-to-focus links.

## A6. Productivity modes

- Study mode: syllabus/task list, study blocks, revision reminders, focus timer, allowed study apps/sites, break schedule.
- Work mode: task inbox, calendar time blocks, meeting reminders, deep work and notification quiet guidance.
- Personal mode: habits, exercise, routines, appointments and family time.
- Recovery mode: low-pressure tasks, breaks and sleep routine; never shame users for reduced productivity.

## A7. Acceptance criteria
- A mission alarm rings using the native alarm mechanism and can be dismissed only after its selected mission succeeds or the explicit emergency path is used.
- Mission state survives app process recreation where platform permits.
- QR mission handles camera denial, poor lighting and invalid codes.
- Shake/movement missions are calibrated and do not run when sensor access is unavailable.
- Task recurrence is correct across timezone/DST changes.
- Calendar conflicts are surfaced; AI never auto-edits external calendars without confirmation.
- Routine progress survives app restart and can be paused/skipped with transparent history.
- Sleep audio/microphone features have explicit consent, visible status and deletion controls.

## A8. Competitor-inspired product research map
- Alarmy: mission alarms, wake-up check, sleep sounds/report, optional snore/sleep audio insights.
- TickTick: task lists, reminders, calendar views, habit tracker, Pomodoro, Eisenhower matrix, countdown, collaboration, statistics.
- Todoist: quick capture, projects, subtasks, priorities, recurring tasks, filters and integrations.
- Structured: visual day timeline and time-blocked planning.
- Motion/Reclaim: AI-assisted scheduling and calendar-aware planning; NeuronNinja suggestions remain user-approved.
- Sunsama: guided daily planning and end-of-day review.
- Routinery: timed step-by-step routines.
- Habitica: gamified tasks and habits; use original reward mechanics and avoid manipulative loops.
- Notion/Obsidian: optional notes/knowledge capture and task-linked notes; do not attempt to recreate a full knowledge base in v1.

These are public feature-pattern references, not claims of access to proprietary implementation. Use original UI, content, naming and code.
""",
"TRD.md": r"""

# Addendum A — Alarm, Task, Calendar and Routine Technical Design (v1.1)

## A1. Ninja LifeOS subsystem

Add modules:
- `NinjaAlarmMissions`
- `NinjaTaskEngine`
- `NinjaCalendarEngine`
- `NinjaRoutineEngine`
- `NinjaVoiceCapture`
- `NinjaSleepInsights` (optional, privacy-gated)

All scheduling definitions are persisted locally before native scheduling. Native alarms are authoritative for delivery; JavaScript timers are presentation-only.

## A2. Alarm mission implementation

### Android
- Alarm delivery: Kotlin `AlarmManager`, `BroadcastReceiver`, alarm activity and notification/channel setup.
- Use exact alarm APIs only for a genuine user-facing alarm-clock use case and only with eligible permission; check `canScheduleExactAlarms()` before scheduling. Rebuild alarms after boot, time/timezone change and exact-alarm permission changes.
- Math/memory/typing: local challenge engine, deterministic seeded challenge per alarm occurrence; persist challenge state.
- Shake: `SensorManager` accelerometer with calibrated threshold, debounce, sampling rate limits and timeout. Do not keep high-rate sensors active all night.
- Steps/movement: Health Connect/step-counter capability where available; otherwise foreground-only sensor session with clear permission and reliability warning.
- QR/barcode: CameraX/ML Kit or vetted scanner; store only a hash of the registered code where feasible.
- Photo: CameraX capture and on-device similarity comparison with explicit setup consent. Avoid face recognition or biometric identification.
- Wake-up check: schedule a follow-up native notification/alarm after dismissal; explain that OEM restrictions may affect delivery.
- Audio: native audio playback with audio focus and alarm stream policy appropriate to OS version.

### iOS
- Use AlarmKit where supported by deployment target and user authorization for prominent alarms, repeating alarms and countdowns. AlarmKit provides system-managed alarm UI and authorization; implement widget/Live Activity requirements for countdown presentation as specified by Apple.
- Use UserNotifications as fallback for reminders where AlarmKit is unavailable or unauthorized; clearly communicate different reliability/priority.
- Mission completion UI runs in the app; do not imply that a background extension can freely execute arbitrary mission UI.
- Motion and camera permissions are requested only when a mission is configured.
- Confirm current minimum iOS version and AlarmKit API availability during implementation.

## A3. Task engine
- Local-first task repository with UUID IDs, recurrence rules, reminders and completion events.
- Recurrence engine uses IANA timezone IDs and stores wall-clock intent separately from UTC occurrence.
- Reminder scheduler creates/cancels native notifications idempotently.
- NLP parser returns candidate date/time/priority/duration; user confirms before task creation.
- Voice input uses platform speech APIs or approved service; audio retention defaults to none.
- Shared lists use backend authorization and optimistic sync; offline edits use operation IDs and conflict resolution.

## A4. Calendar engine
- Internal calendar is the source of truth for NeuronNinja-created blocks.
- External calendars connect through supported provider APIs/OS calendar permissions; request least privilege.
- Read-only integration is the default; write access is separately requested.
- AI planner outputs a proposed plan with rationale, confidence and conflicts. User must approve each batch of edits.
- Do not scrape calendar apps or use accessibility to read calendar content.

## A5. Routine engine
- Routine definition contains ordered steps, optional duration, completion criteria, skip policy and linked actions.
- Native notifications schedule routine start/step reminders.
- Routine timer calculates elapsed time from monotonic/absolute timestamps, not a JS interval.
- Routine can start a focus session or request activation of a local restriction profile.

## A6. Sleep insights
- Sleep diary and schedule are safe baseline features.
- Health Connect / Apple Health integration is optional and consented.
- Snore detection requires explicit microphone consent, clear active-recording indicator, local processing, configurable retention and deletion.
- Avoid always-on background microphone capture. Do not market results as medical diagnosis.
- Sleep stage detection from phone microphone alone is not a validated medical measure.

## A7. Additional module contracts
```ts
interface AlarmMission {
  missionId: string;
  type: "math" | "memory" | "typing" | "shake" |
        "movement" | "qr" | "photo";
  config: Record<string, unknown>;
  fallback: "emergency" | "simple_dismiss";
}

interface Task {
  id: string;
  title: string;
  dueAt?: string;
  timezoneId?: string;
  priority: "low" | "normal" | "high" | "urgent";
  estimatedMinutes?: number;
  recurrence?: RecurrenceRule;
  status: "inbox" | "planned" | "in_progress" | "completed" | "cancelled";
}

interface RoutineStep {
  id: string;
  title: string;
  durationSeconds?: number;
  linkedAction?: "start_focus" | "activate_profile" | "show_task";
}
```

## A8. New permissions
- Camera: QR/photo missions only.
- Motion/activity: shake/step missions only.
- Microphone: optional snore/sound analysis only, explicit opt-in.
- Speech recognition: voice task capture only.
- Calendar: user-selected read/write scopes.
- Health Connect/HealthKit: only for selected health/activity integration.
No permission is requested during general onboarding solely because a feature exists.
""",
"DRD.md": r"""

# Addendum A — Ninja LifeOS UX and Alarmy-Inspired Experience (v1.1)

## A1. New navigation destination

Add **Plan** or **LifeOS** as a first-class destination with five subareas:
- Tasks
- Calendar
- Routines
- Alarms
- Habits

Keep the main bottom navigation compact. Today dashboard surfaces next alarm, today's top tasks, next calendar block, active routine and focus recommendation.

## A2. Alarm creation flow
1. Time and repeat schedule.
2. Label and sound/vibration.
3. Mission selection.
4. Mission configuration and preview.
5. Snooze/wake-up check.
6. Emergency fallback.
7. Save and show exactness/permission status.

Mission cards:
- Math
- Memory
- Typing
- Shake
- Steps / movement
- QR / barcode
- Photo

Show sensor/camera requirement before the user chooses a mission. The preview must test the selected mission. Provide a safe fallback for accessibility, disability, injury, camera failure or emergency.

## A3. Ringing alarm screen
- Large time and alarm label.
- Clear mission instruction and progress.
- High-contrast controls.
- Accessible audio/haptic cues.
- Emergency route always discoverable.
- Mission completion confirmation.
- Optional wake-up check reminder.
Do not use an inaccessible puzzle or endless challenge to trap the user.

## A4. Task inbox and task detail
- Fast add field at top.
- Inbox, Today, Upcoming, Completed and custom lists.
- Priority, tags, subtasks, notes and estimate.
- Natural language parser preview: show interpreted date/time before saving.
- Swipe actions must have accessible alternatives.
- Quick task-to-focus action.

## A5. Calendar and daily planner
- Day timeline, week, month and agenda.
- Drag-and-drop time blocks where platform allows; accessible edit dialog alternative.
- Overlap/conflict warning.
- “Plan my day” suggestion panel with proposed blocks.
- Every AI-generated move requires user approval.
- End-of-day review: completed, moved, deferred and carry-over tasks.

## A6. Routine builder and player
- Step list with reorder.
- Duration per step.
- Optional linked task, focus session or app profile.
- Start routine full-screen player with current/next step.
- Pause, skip and stop controls.
- Progress indicator and gentle transition sound.
- Morning/evening/study/work/exercise/sleep templates.

## A7. Habit and gamification
- Daily/weekly schedule and check-in.
- Streaks should allow rest days and recovery.
- Reward points for self-defined goals, not raw screen engagement.
- Ninja companion evolves through completed goals, learning and focus.
- No loot-box, variable reward or shame mechanics.

## A8. Sleep and bedtime
- Bedtime schedule, wind-down routine, sleep sounds and sleep diary.
- Optional snore feature clearly labels microphone active state and retention.
- Sleep report should show observations and user-entered data, not medical diagnosis.

## A9. Design acceptance
- User can create a basic alarm in under 30 seconds.
- Mission can be previewed before saving.
- User can always access emergency dismissal.
- Task quick-capture is reachable in one primary action.
- Daily planner clearly distinguishes fixed calendar events from movable tasks.
- AI plan changes require review and confirmation.
- Routines resume or recover gracefully after process death.
- Sleep recording state is visible and can be stopped/deleted.
""",
"DATABASE.md": r"""

# Addendum A — LifeOS Data Model (v1.1)

Add the following SQLite tables (or equivalent normalized models) and cloud collections where sync/collaboration is enabled.

## A1. Local SQLite additions

```sql
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  list_id TEXT,
  parent_task_id TEXT,
  due_at_utc TEXT,
  due_local TEXT,
  timezone_id TEXT,
  estimated_minutes INTEGER,
  completed_at TEXT,
  recurrence_json TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_status_due ON tasks(status, due_at_utc);

CREATE TABLE task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  tag_id TEXT NOT NULL,
  PRIMARY KEY(task_id, tag_id)
);

CREATE TABLE task_reminders (
  reminder_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id),
  trigger_at_utc TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  native_notification_id TEXT,
  state TEXT NOT NULL
);

CREATE TABLE calendar_blocks (
  block_id TEXT PRIMARY KEY,
  task_id TEXT,
  title TEXT NOT NULL,
  start_at_utc TEXT NOT NULL,
  end_at_utc TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  source TEXT NOT NULL,
  external_event_ref TEXT,
  status TEXT NOT NULL
);

CREATE TABLE routines (
  routine_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  schedule_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE routine_steps (
  step_id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines(routine_id),
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  duration_seconds INTEGER,
  linked_action_json TEXT,
  UNIQUE(routine_id, position)
);

CREATE TABLE routine_runs (
  run_id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines(routine_id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  current_step_id TEXT,
  status TEXT NOT NULL,
  progress_json TEXT
);

CREATE TABLE alarm_missions (
  mission_id TEXT PRIMARY KEY,
  alarm_id TEXT NOT NULL REFERENCES alarms(alarm_id),
  mission_type TEXT NOT NULL,
  config_json TEXT NOT NULL,
  fallback_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE alarm_occurrences (
  occurrence_id TEXT PRIMARY KEY,
  alarm_id TEXT NOT NULL REFERENCES alarms(alarm_id),
  scheduled_at TEXT NOT NULL,
  rang_at TEXT,
  dismissed_at TEXT,
  mission_status TEXT,
  fallback_used INTEGER NOT NULL DEFAULT 0,
  delivery_status TEXT NOT NULL
);

CREATE TABLE sleep_diary (
  entry_id TEXT PRIMARY KEY,
  sleep_start TEXT,
  wake_time TEXT,
  timezone_id TEXT NOT NULL,
  subjective_quality INTEGER,
  notes TEXT,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## A2. Cloud collections

- `taskLists`: owner, members, visibility, sort order.
- `tasks`: synced task metadata, recurrence, list, parent/subtask relation, version.
- `calendarConnections`: provider, encrypted token reference, scopes, revokedAt.
- `calendarEventRefs`: provider event ID mapping; avoid duplicating event body unless required and consented.
- `sharedRoutines`: owner, participants, routine definition and version.
- `focusChallenges`: challenge definition, participants and completion aggregate.
- `alarmPreferences`: synced alarm definitions only where user opts in; actual delivery remains device-local.
- `lifeosDailySummary`: aggregate task completion, focus minutes and routine completion; no raw sensor/audio data.

## A3. Alarm mission data minimization
- QR/barcode: store a salted hash or encrypted expected value; never upload scanned code by default.
- Photo mission: keep reference image local and encrypted; delete on alarm deletion.
- Shake/movement: store only mission completion/count result, not continuous sensor traces.
- Snore/audio: do not sync raw recordings by default; explicit opt-in, retention expiry and delete controls.
- Sleep diary: private by default.

## A4. Sync and conflict rules
- Tasks use per-record version and operation IDs; concurrent edits surface conflicts for title/description where necessary.
- Calendar provider is source of truth for external events; NeuronNinja stores provider references and cached display fields only as permitted.
- AI schedule proposals are drafts until user accepts; only accepted blocks are persisted.
- Alarm schedules are device-local; syncing to another device requires explicit user selection to avoid duplicate alarms.
- Routine run state is local-first; optionally sync summary, not every sensor event.
""",
"IMPLEMENTATION.md": r"""

# Addendum A — LifeOS Implementation Workstreams (v1.1)

## A1. Additional workstreams

### Workstream 12 — Mission Alarm
- Native Android alarm delivery and alarm UI.
- AlarmKit iOS integration where supported/authorized.
- Mission engine: math, memory, typing, shake, movement, QR/barcode, photo.
- Wake-up check, snooze policy and emergency fallback.
- Sound library and audio focus.
- Alarm delivery telemetry limited to success/failure metadata.

### Workstream 13 — Task and Reminder Engine
- Task inbox, lists, subtasks, tags, priorities and recurring rules.
- Multiple reminders and notification scheduling.
- Quick capture, NLP date parsing and voice capture.
- Search, filters and task statistics.

### Workstream 14 — Calendar and Daily Planning
- Day/week/month/agenda views.
- Time-blocking and conflict detection.
- External calendar connection with least-privilege OAuth.
- AI schedule suggestions as reviewable drafts.
- Daily planning and end-of-day review.

### Workstream 15 — Routine and Habit Engine
- Step-by-step routine player.
- Routine templates and linked focus/app policies.
- Habit tracker, recovery-friendly streaks and weekly review.
- Companion reward system.

### Workstream 16 — Sleep and Recovery
- Sleep schedule, bedtime reminders, wind-down sounds and diary.
- Optional Health Connect/HealthKit integration.
- Optional snore/sound analysis only after privacy, consent and battery feasibility review.
- No always-on microphone implementation in initial release.

## A2. Updated sequencing

- Release A: Mission alarms (math, memory, typing, QR), tasks, recurring reminders and basic routines.
- Release B: Shake/movement missions, calendar views, time-blocking, habits and daily review.
- Release C: Photo mission, shared lists, focus challenges, external calendar sync and AI-assisted planning.
- Release D: Sleep insights, optional snore detection research, advanced integrations and richer collaboration.

This workstream is added to, not a replacement for, the original 11 implementation phases.

## A3. Technical gates
- Validate AlarmManager exact-alarm eligibility and user permission on Android versions targeted.
- Validate AlarmKit deployment target, authorization, presentation and widget/Live Activity requirements on supported iOS versions.
- Mission engine must have emergency fallback and sensor/camera failure handling.
- Test alarm delivery after reboot, force-stop, battery saver, permission revocation and OEM battery management; document OS limitations.
- Calendar integrations require secure OAuth token storage, scope minimization and revocation.
- NLP/AI planner must show proposed parsing and scheduling before committing.
- Audio assets must be licensed or original.
- Microphone-based sleep analysis remains opt-in research until battery, privacy and validity review passes.

## A4. Added acceptance tests
1. Math alarm completes only after correct answer; difficulty and retries follow settings.
2. Memory/typing mission state restores after activity recreation.
3. QR scan accepts registered code and rejects unrelated code; camera denial offers fallback.
4. Shake mission ignores incidental movement and passes calibrated threshold.
5. Emergency dismissal remains accessible.
6. Alarm recurrence survives timezone and daylight-saving transitions.
7. Task recurrence creates correct next occurrence without duplicates.
8. NLP parser displays interpreted date/time and requires confirmation.
9. Calendar conflict is surfaced before accepting a proposed time block.
10. AI schedule proposal never writes to external calendar before explicit approval.
11. Routine resumes at the correct step after app restart.
12. Habit streak recovery respects configured rest days.
13. Raw audio is not uploaded; recording indicator and deletion work if optional audio feature is enabled.

## A5. Release and policy references
- Alarmy public feature patterns: https://alar.my/en
- TickTick public feature set: https://ticktick.com/features
- Android alarm scheduling: https://developer.android.com/develop/background-work/services/alarms
- Apple AlarmKit: https://developer.apple.com/documentation/AlarmKit
- Apple scheduling sample: https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit
"""
