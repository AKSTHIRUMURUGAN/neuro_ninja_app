# Competitive Habits & Tasks Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (or `superpowers:subagent-driven-development`) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform NeuroNinja's Habits & Tasks into an industry-leading, competitive system featuring a tri-state completion cycle (`completed` / `not_completed` / `not_attempted`), visual month/week calendar heatmap with real-time streak and adherence statistics, social accountability verification (friend, parent, mentor), and offline-first SQLite V3 storage paired with cloud sync to `neuro_ninja_web`.

**Architecture:** 
Offline-first reactive architecture powered by `expo-sqlite` (V3 migration). Habit completions and task states cycle seamlessly with zero-latency optimistic updates and persist to local SQLite tables (`habits_v2`, `habit_checkins`, `tasks`, `verifiers`, `verification_requests`), simultaneously enqueuing mutation jobs to `sync_outbox` for background sync with production Next.js REST endpoints (`/api/habits`, `/api/tasks`, `/api/verification-requests`, `/api/verifiers`). The UI retains the Cyberpunk Dark theme (`#070A11`, `#0F1829`, `#00E699`, `#EF4444`, `#F59E0B`, `#818CF8`) while adopting the proven tri-state circular toggles and calendar matrix from `neuro_ninja_web`.

**Tech Stack:**
- React Native / Expo SDK 54 / Expo Router
- `expo-sqlite` (WAL mode, schema version 3 migration)
- `expo-haptics`, `lucide-react-native` / `@expo/vector-icons`
- Cyberpunk Dark Design Tokens (`#070A11`, `#0F1829`, `#00E699`, `#EF4444`, `#F59E0B`, `#818CF8`)
- REST APIs matching `neuro_ninja_web` (`/api/habits`, `/api/tasks`, `/api/verifiers`, `/api/verification-requests`)

**Spec:** Benchmarked against `C:\Users\acer\Desktop\neuro_ninja_web\neuro_ninja\components\HabitTracker.tsx`, `HabitDetailModal.tsx`, Habitica, Streaks, and Fabulous.

---

## Global Constraints

- **Theme Palette:** Strictly adhere to NeuroNinja Cyberpunk Dark tokens (`#070A11` canvas, `#0F1829` card surface, `#00E699` green success, `#EF4444` red failure, `#F59E0B` amber warning/streak, `#818CF8` violet accent, `#64748B` neutral gray).
- **Tri-State Semantics:** Follow exact web semantics:
  1. `not_attempted` (gray/dashed ring, pending or rest)
  2. `not_completed` (red 'X' circle, failed or missed)
  3. `completed` (green checkmark circle, success)
  4. Next tap cycles back to `not_attempted` (revert / reset streak).
- **Offline-First:** 100% functional without internet connectivity. All reads and writes target local SQLite; writes push actions to `sync_outbox`.
- **No Regressions:** Preserve existing alarm links, focus timer integrations, and recovery-friendly rest days.
- **Verification Gates:** TypeScript typecheck (`npx tsc --noEmit`) and ESLint (`npx expo lint`) must pass with 0 errors after every phase.

---

## Review Focus

1. **Streak Calculation on Cycle Revert:** When cycling from `completed` back to `not_attempted`, ensure streaks recalculate accurately from historical checkin rows rather than decrementing to negative values.
2. **Timezone Day Normalization:** Date keys must be stored in `YYYY-MM-DD` normalized local time format so day transitions at midnight don't cause duplicate or misaligned checkins across timezones.
3. **Multi-Date Calendar Interaction:** Tapping past dates in the calendar matrix must allow logging historical completions or missed days (backfilling) up to the habit creation date, while future dates remain locked.
4. **Verification Status Isolation:** If a habit or task has a non-self verifier (`friend`, `parent`, `mentor`), marking it completed should enter `pending_verification` state until approved, preventing unearned XP/coins from being granted immediately if verification is mandatory.
5. **Database Migration Safety (V2 -> V3):** Existing habit checkins and task rows must survive the migration without data loss or column collision.

---

## File Structure

```
c:\Users\acer\Desktop\neuro_ninja\
├── src/
│   ├── services/
│   │   ├── database/
│   │   │   └── migrations.ts                 # Add V3 migration (verifiers, requests, habit/task columns)
│   │   ├── habits/
│   │   │   ├── habit-service.ts              # Upgraded with tri-state cycle, streak math, calendar query
│   │   │   └── habit-types.ts                # Expanded types matching web models
│   │   ├── tasks/
│   │   │   └── task-engine.ts                # Upgraded with verification status & priority workflows
│   │   └── verification/
│   │       └── verification-service.ts       # Verifier CRUD, requests dispatch, review actions
│   ├── components/
│   │   ├── habits/
│   │   │   ├── HabitCycleToggle.tsx          # Animated circular tri-state button
│   │   │   ├── HabitCalendarMatrix.tsx       # Interactive month/week grid (Green/Red/Gray cells)
│   │   │   ├── HabitStreakCard.tsx           # Current/longest streak, adherence %, recovery badges
│   │   │   └── HabitDetailSheet.tsx          # Full bottom sheet / modal with calendar & stats
│   │   └── verification/
│   │       ├── VerifierSelectModal.tsx       # Assign friend/parent/mentor to habit or task
│   │       ├── VerificationProofModal.tsx    # Upload proof photo or completion note
│   │       └── VerificationInboxSheet.tsx    # Incoming verification requests for parent/buddy review
│   └── app/
│       ├── habits/
│       │   ├── index.tsx                     # Upgraded main habits screen with tri-state & streak cards
│       │   └── [id].tsx                      # Dedicated habit analytics & calendar screen
│       ├── lifeos/
│       │   ├── tasks/
│       │   │   ├── index.tsx                 # Upgraded task list with verification badges & filters
│       │   │   └── detail.tsx                # Task detail with verifier assignment & proof review
│       │   └── verification/
│       │       └── index.tsx                 # Full Social / Parent / Friend accountability hub
```

---

## Tasks

### Task 1: SQLite V3 Migration & Schema Expansion

**Files:**
- Modify: `src/services/database/migrations.ts`
- Modify: `src/services/habits/habit-types.ts` (create)

**Interfaces:**
- Produces: SQLite tables `verifiers`, `verification_requests`, and adds columns to `habits_v2` (`longest_streak`, `verifier_id`, `verifier_email`, `verifier_type`, `coin_reward`, `xp_reward`, `sync_status`) and `tasks` (`verifier_id`, `verifier_email`, `verifier_type`, `verification_status`, `sync_status`).
- Creates `habit_checkins` expanded columns for `status: 'not_attempted' | 'not_completed' | 'completed' | 'recovered'`.

- [ ] **Step 1: Define TypeScript models in `src/services/habits/habit-types.ts`**
  Add types: `HabitStatus = 'not_attempted' | 'not_completed' | 'completed'`, `VerifierType = 'self' | 'friend' | 'parent' | 'mentor'`, `VerificationStatus = 'pending' | 'verified' | 'rejected'`, `VerifierRecord`, and `VerificationRequestRecord`.

- [ ] **Step 2: Add `SCHEMA_V3` to `src/services/database/migrations.ts`**
  Define tables:
  ```sql
  CREATE TABLE IF NOT EXISTS verifiers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    verifier_email TEXT NOT NULL,
    verifier_name TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'friend',
    status TEXT NOT NULL DEFAULT 'accepted',
    created_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced'
  );

  CREATE TABLE IF NOT EXISTS verification_requests (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    habit_id TEXT,
    date TEXT,
    user_id TEXT,
    verifier_id TEXT,
    verifier_email TEXT,
    type TEXT NOT NULL, -- 'habit' | 'task'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'verified' | 'rejected'
    notes TEXT,
    proof_url TEXT,
    verifier_notes TEXT,
    created_at TEXT NOT NULL,
    responded_at TEXT,
    sync_status TEXT NOT NULL DEFAULT 'synced'
  );
  ```
  And `ALTER TABLE habits_v2 ADD COLUMN longest_streak INTEGER DEFAULT 0;` etc. safely with existence checks. Update `CURRENT_DB_VERSION = 3`.

- [ ] **Step 3: Verify migration executes cleanly**
  Run `npx tsc --noEmit` to verify type compatibility.

---

### Task 2: Upgraded Habit Service with Tri-State Cycling & Calendar Map

**Files:**
- Modify: `src/services/habits/habit-service.ts`
- Create: `src/services/habits/streak-calculator.ts`

**Interfaces:**
- Consumes: SQLite database connection from `src/services/database/database.ts`.
- Produces:
  - `cycleHabitStatus(habitId: string, dateStr: string): Promise<{ newStatus: HabitStatus, streak: number, longestStreak: number }>`
  - `getHabitCompletionsMap(habitId: string, year: number, month: number): Promise<Record<string, HabitStatus>>`
  - `getHabitStats(habitId: string): Promise<{ completionRate: number, failureRate: number, totalCompleted: number, totalFailed: number, currentStreak: number, longestStreak: number }>`

- [ ] **Step 1: Create `src/services/habits/streak-calculator.ts`**
  Implement comprehensive streak algorithm matching web:
  - Takes an array of completions `{ date: string, status: HabitStatus }`, habit `restDays: number[]`, and `createdAt: string`.
  - Calculates `currentStreak` (consecutive `completed` dates up to today/yesterday) and `longestStreak`.
  - Treats `not_completed` as streak breaking.
  - Treats `restDays` (e.g. Sunday) as neutral pass-throughs.

- [ ] **Step 2: Update `cycleHabitStatus` in `src/services/habits/habit-service.ts`**
  Cycle sequence:
  ```
  not_attempted -> not_completed -> completed -> not_attempted
  ```
  On `completed`: Award Focus Coins / XP (+15 XP, +5 Coins). If verifier assigned (`verifierType !== 'self'`), create `verification_requests` row.
  On `not_completed`: Deduct or mark failed, recalculate streaks.
  On `not_attempted`: Remove or set status to unattempted, recalculate streaks.
  Enqueue mutation to `sync_outbox`.

- [ ] **Step 3: Implement `getHabitCompletionsMap`**
  Fetches all checkin records for a habit within the requested month, returning a normalized map `Record<YYYY-MM-DD, HabitStatus>`.

- [ ] **Step 4: Verify with TypeScript check**
  Run `npx tsc --noEmit`.

---

### Task 3: Interactive Visual Components (Tri-State Toggle, Calendar Heatmap, Stats)

**Files:**
- Create: `src/components/habits/HabitCycleToggle.tsx`
- Create: `src/components/habits/HabitCalendarMatrix.tsx`
- Create: `src/components/habits/HabitStreakCard.tsx`

**Interfaces:**
- `HabitCycleToggle`: Props `{ status: HabitStatus; onCycle: () => void; size?: number; disabled?: boolean }`
- `HabitCalendarMatrix`: Props `{ habitId: string; completions: Record<string, HabitStatus>; onSelectDate: (date: string) => void; selectedDate: string; createdAt: string; restDays?: number[] }`
- `HabitStreakCard`: Props `{ currentStreak: number; longestStreak: number; completionRate: number; totalCompleted: number }`

- [ ] **Step 1: Build `HabitCycleToggle.tsx`**
  - `not_attempted`: Hollow circular border `#334155` with subtle dashed ring.
  - `not_completed`: Vivid Red `#EF4444` background with white `X` icon (`Ionicons name="close"`), red glow.
  - `completed`: Vivid Cyber Green `#00E699` background with dark checkmark (`Ionicons name="checkmark"`), green glow.
  - Smooth haptic feedback (`Haptics.impactAsync`) on each tap.

- [ ] **Step 2: Build `HabitCalendarMatrix.tsx`**
  - Month calendar navigation (`<` Month `>`).
  - 7 columns (Sun, Mon, Tue, Wed, Thu, Fri, Sat).
  - Day cells color-coded:
    - Green `#00E699` (`completed`)
    - Red `#EF4444` (`not_completed`)
    - Gray `#1E293B` with dash (`not_attempted` in the past)
    - Blue accent ring for Today
    - Faded for future dates (non-interactive)
  - Tap any past or today date to trigger `onSelectDate` or cycle status directly on that date.

- [ ] **Step 3: Build `HabitStreakCard.tsx`**
  - Displays: Flame icon with `currentStreak` days, Trophy icon with `longestStreak` record, consistency percentage progress bar, and total checkins.
  - Cyberpunk card styling with `#0F1829` background, neon border highlights.

- [ ] **Step 4: Typecheck and lint components**
  Run `npx tsc --noEmit` and `npx expo lint`.

---

### Task 4: Social Accountability & Verification Service

**Files:**
- Create: `src/services/verification/verification-service.ts`
- Create: `src/components/verification/VerifierSelectModal.tsx`
- Create: `src/components/verification/VerificationProofModal.tsx`
- Create: `src/components/verification/VerificationInboxModal.tsx`

**Interfaces:**
- `verification-service.ts`:
  - `getVerifiers(): Promise<VerifierRecord[]>`
  - `addVerifier(name: string, email: string, relationship: 'friend' | 'parent' | 'mentor'): Promise<VerifierRecord>`
  - `createVerificationRequest(params: { habitId?: string; taskId?: string; verifierId: string; notes?: string; proofUrl?: string }): Promise<void>`
  - `getPendingVerificationRequests(): Promise<VerificationRequestRecord[]>`
  - `respondToVerificationRequest(requestId: string, action: 'verify' | 'reject', verifierNotes?: string): Promise<void>`

- [ ] **Step 1: Implement `src/services/verification/verification-service.ts`**
  - Local SQLite CRUD for `verifiers` and `verification_requests`.
  - Queue actions to `sync_outbox` for sync to `/api/verifiers` and `/api/verification-requests`.

- [ ] **Step 2: Build `VerifierSelectModal.tsx`**
  - Modal allowing user to select verifier type (`Self`, `Friend`, `Parent`, `Mentor`).
  - Option to select existing verifier or enter new email and name.

- [ ] **Step 3: Build `VerificationProofModal.tsx`**
  - Allows entering notes or proof description when submitting a habit or task completion for accountability review.

- [ ] **Step 4: Build `VerificationInboxModal.tsx`**
  - Displays pending verification requests where current user acts as parent/buddy.
  - "Approve / Verify" (green check) or "Reject" (red cross) with feedback comment.

---

### Task 5: Mobile Screen Overhaul (`/habits` & `/lifeos/tasks`)

**Files:**
- Modify: `src/app/habits/index.tsx`
- Create: `src/app/habits/[id].tsx` (dedicated habit detail & calendar view)
- Modify: `src/app/lifeos/tasks/index.tsx`
- Modify: `src/app/lifeos/tasks/detail.tsx`

- [ ] **Step 1: Upgrade `src/app/habits/index.tsx`**
  - Replace simple checkbox with `HabitCycleToggle` (Tri-State: Not Attempted $\rightarrow$ Not Completed $\rightarrow$ Completed).
  - Add date selector header bar (scrollable week pill carousel) to switch active date and view historic checkins.
  - Add tap on habit card body to open full detail view `[id].tsx`.
  - Add buddy verifier avatar badge on habits with accountability partners.

- [ ] **Step 2: Create `src/app/habits/[id].tsx` (Habit Detail & Calendar Heatmap Screen)**
  - Prominent header with habit title, category badge, and verifier info.
  - `HabitStreakCard` showing current streak, longest streak, and completion rate %.
  - Full `HabitCalendarMatrix` showing the interactive month grid.
  - Tapping a calendar day opens quick tri-state cycle action sheet.
  - History log tab showing past completions with timestamps and verification badges.

- [ ] **Step 3: Upgrade `src/app/lifeos/tasks/index.tsx`**
  - Add verification badges to tasks with social verifiers.
  - Add filter tab: All, Inbox, Today, Upcoming, Completed, and **Pending Verification**.
  - Show priority color pills (`Urgent`, `High`, `Normal`, `Low`).

- [ ] **Step 4: Upgrade `src/app/lifeos/tasks/detail.tsx`**
  - Add "Accountability Verifier" section with friend/parent/mentor picker.
  - Add proof notes submission upon completion.

---

### Task 6: Verification, Typecheck, Build & Live Testing

**Files:**
- Test all modified files
- Build and run on Motorola Moto G62 5G (`ZD2228X6QH`)

- [ ] **Step 1: Static verification**
  - Run `npx tsc --noEmit` (ensure 0 errors).
  - Run `npx expo lint` (ensure 0 errors and 0 warnings).

- [ ] **Step 2: Bundle JS assets**
  - Run `npx expo export:embed --platform android --dev false --reset-cache`.

- [ ] **Step 3: Compile APK & install on device**
  - Run `./gradlew assembleDebug` in `android/`.
  - Install via `adb -s ZD2228X6QH install -r android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 4: Live UI verification via ADB**
  - Launch app: `adb -s ZD2228X6QH shell am start -n com.neuro_ninja.app/.MainActivity`.
  - Navigate to `/habits` and test tri-state cycle button (Gray $\rightarrow$ Red $\rightarrow$ Green $\rightarrow$ Gray).
  - Open habit detail screen, verify interactive month calendar heatmap with green/red/gray cells and streak calculations.
  - Test verifier selection and task accountability.
  - Capture ADB screenshots and confirm visual quality.
