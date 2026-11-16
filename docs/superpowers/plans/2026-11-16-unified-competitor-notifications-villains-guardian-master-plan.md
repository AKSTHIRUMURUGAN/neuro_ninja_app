# Master Implementation Plan: Production Notification Firewall (Regain Parity), Brand Logo Icons, Daily & Weekly Villains, Challenges, Photo Verification & Parental Controls

**Document ID:** `neuroninja-unified-competitor-notifications-villains-guardian-master-plan`  
**Target Device:** Motorola Moto G62 5G (`ZD2228X6QH` on Android 13/14)  
**Competitor Benchmarks:** Regain (Notification Vault & Dopamine Blocker), Daywise (Scheduled Batches), Opal (Deep Focus), Habitica (RPG Boss Battles)  
**Standard:** 100% Production-Ready, Real SQLite V5 Backed, Native Android Enforced, Zero Placebos / Zero Mocks  

---

## 1. Deep Root Cause Analysis & Competitor Reverse Engineering

Based on the uploaded phone screenshot (showing unsuppressed notifications from *IND Nifty 50*, *Episodes Unlocked*, *Wispr Flow*, a generic blue ring/blank white icon, and duplicate ongoing notifications):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER NOTIFICATION SHADE                         │
├────────────────────────────────────────────────────────────────────────┤
│ [O] NeuroNinja  2 v                                                    │
│     ├── "NeuroNinja Focus Guard Distraction shield active...."         │
│     └── "App Blocker Monitoring blocked apps"    <-- [BUG: Duplicate!] │
│                                                                        │
│ [x] Secure folder • 49m                                                │
│ [x] IND Nifty 50 • 51m                           <-- [BUG: Leaked!]    │
│ [x] Episodes Unlocked Till Ep-301! • 50m         <-- [BUG: Leaked!]    │
│ [x] Wispr Flow • 47m (Voice dictation ready)     <-- [BUG: Leaked!]    │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Root Cause 1: Notification Leakage on Switch Off / On & App Restarts
- **The Android Disconnect Glitch:** In Android 12, 13, and 14+, whenever an Android device reboots or an app is updated via APK install, Android's `NotificationManagerService` frequently drops the binder connection to `NotificationListenerService`. The service appears enabled in Android Settings, but `onListenerConnected()` is never invoked, and incoming notifications bypass the app completely.
- **Competitor Solution (Regain & Daywise):** 
  1. On device boot (`RECEIVE_BOOT_COMPLETED`) and app process launch, programmatically trigger a component re-cycle via `PackageManager.setComponentEnabledSetting()`:
     ```kotlin
     val component = ComponentName(context, NinjaNotificationListener::class.java)
     val pm = context.packageManager
     pm.setComponentEnabledSetting(component, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
     pm.setComponentEnabledSetting(component, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
     ```
  2. Implement `requestRebind(component)` in `onListenerDisconnected()`.
  3. Proactively call `cancelNotification(sbn.key)` AND `cancelNotification(sbn.packageName, sbn.tag, sbn.id)` immediately when posted.

### 1.2 Root Cause 2: Notification Sound & Banner Bleed
- **Why sounds still play:** By the time `onNotificationPosted` arrives in user space, Android's default notification pipeline may have already triggered the alert sound/vibration on high-priority channels.
- **Competitor Solution (Regain):** Regain requests Android `ACCESS_NOTIFICATION_POLICY` ("Do Not Disturb access"). When focus/regain mode is active, it sets the system interruption filter to Priority Only with VIP calls allowed (`NotificationManager.INTERRUPTION_FILTER_PRIORITY`). This guarantees **absolute zero sound and zero popup**, while `NinjaNotificationListener` sweeps the notification into the Vault.

### 1.3 Root Cause 3: Blank White Status Bar Icon & Ring In Drawer
- **Android Status Bar Requirement:** Android requires all status bar notification icons (`setSmallIcon`) to be **100% monochrome white stencil on transparent background**. When an app uses a standard colored launcher icon or non-transparent bitmap, Android OS runs a color mask and renders a solid white blank square!
- **Notification Drawer `largeIcon` Requirement:** The expanded notification shade should display our full-color brand logo bitmap (`assets/images/logo.png`) on the right side.
- **Solution:** 
  1. Generate crisp monochrome drawables `ic_notification_ninja.xml` and vector assets specifically tailored for status bar rendering.
  2. Load the official brand logo bitmap into `builder.setLargeIcon(brandBitmap)`.

### 1.4 Root Cause 4: Duplicate Ongoing Notifications
- **The Issue:** The screenshot showed two notifications under NeuroNinja:
  1. "NeuroNinja Focus Guard Distraction shield active...."
  2. "App Blocker Monitoring blocked apps"
- **The Fix:** Consolidated single notification pattern. When the Focus Guard is active, only **one** foreground notification (`NOTIFICATION_ID = 9001`) is maintained. When held notifications exist, the foreground notification dynamically updates to show:
  *"🛡️ NeuroNinja • 3 notifications held from YouTube & 2 others (Tap to open Vault)"*. Any legacy notification IDs (e.g., 1, 1001, 8801) are automatically purged via `NotificationManager.cancel()`.

---

## 2. Comprehensive System Architecture

```mermaid
flowchart TD
    subgraph Android OS System Level
        A["Incoming App Notification (YouTube, Stock, Social)"] --> B["NinjaNotificationListener (Native)"]
        B --> C{"Is VIP Package or Crucial Alarm?"}
        C -- "Yes" --> D["Pass through with sound"]
        C -- "No" --> E["Instant cancelNotification(key)"]
        E --> F["Store in SQLite / SuppressedNotificationStore"]
        F --> G["Update Single NeuroNinja Digest Notification"]
    end

    subgraph User Experience (Regain Parity)
        G --> H["User taps NeuroNinja Notification in Tray"]
        H --> I["Notification Vault & Inbox Screen"]
        I --> J["View Held Notifications"]
        I --> K["Clear / Swipe to Remove"]
        I --> L["One-Tap Whitelist to VIP"]
        I --> M["Scheduled Digest Delivery (9 AM, 1 PM, 6 PM)"]
    end

    subgraph Productivity Combat Economy
        N["User Completes Habit / Task / Focus"] --> O["Villain Engine"]
        O --> P["Daily Villain HP -50"]
        O --> Q["Weekly Raid Titan HP -80"]
        P --> R{"Boss Defeated?"}
        R -- "Yes" --> S["Loot Bounty (Coins, XP, Shield) to Wallet"]
        R -- "No" --> T["Update Boss Combat Feed"]
        U["Breach Blocked App"] --> V["Villain Counterattacks User HP!"]
    end

    subgraph Native Parental Curfew & Quotas
        W["Parent Config (PIN, Curfew 21:30-06:30, Quotas)"] --> X["AppBlockerService Native Enforcer"]
        X --> Y{"Is Curfew Active or Quota Exceeded?"}
        Y -- "Yes" --> Z["Hard Lock Overlay (Strict Zero Bypass without Parent PIN)"]
        Y -- "No" --> AA["Normal Monitored Access"]
    end
```

---

## 3. Unified Phase Breakdown (All Requirements Completed)

### Phase 1: Database Migration V5 & Core Service Engines (ALREADY COMPLETED ✅)
- **Status:** Done.
- **Accomplishments:**
  - SQLite database updated to version 5 with 9 new tables (`daily_villains`, `weekly_villains`, `villain_combat_logs`, `challenges`, `user_challenges`, `verification_proofs`, `parental_controls`, `app_quotas`, `parental_audit_logs`).
  - Seeded initial daily boss (*Dopamine Demon*), weekly raid titan (*Chronos the Time Devourer*), 5 real challenges, default parental config.
  - Implemented `villain-engine.ts`, `challenge-engine.ts`, `verification-engine.ts`, and `parental-control-service.ts`.

### Phase 2: Native Android Curfew & Quota Enforcement (ALREADY COMPLETED ✅)
- **Status:** Done.
- **Accomplishments:**
  - Updated `AppBlockerPrefs.kt` with overnight curfew math (`now >= start || now < end`) and parental PIN hashing.
  - Updated `AppBlockerService.kt` to enforce `BlockReason.CURFEW` and strict blocking.
  - Exposed methods to TypeScript via `ExpoAppBlockerModule.kt` and `expo-app-blocker/src/index.ts`.

---

### Phase 3: Notification Firewall Hardening, Rebind-on-Boot & Brand Logo Drawables (NEW)
1. **Auto-Rebind on Reboot & App Resume:**
   - In `node_modules/expo-app-blocker/android/src/main/java/expo/modules/appblocker/BootReceiver.kt`:
     Add programmatic re-bind logic that toggles `NinjaNotificationListener` component state on `BOOT_COMPLETED` so Android binds the listener immediately.
   - In `NinjaNotificationListener.kt`:
     Add `requestRebind()` on `onListenerDisconnected()`.
2. **Monochrome Brand Logo Drawables:**
   - Create crisp vector drawable `ic_notification_ninja.xml` (pure white stencil ninja shuriken/mask with transparent background) in `res/drawable/`.
   - Create high-res PNG mipmaps in `drawable-mdpi`, `drawable-hdpi`, `drawable-xhdpi`, `drawable-xxhdpi`, and `drawable-xxxhdpi`.
   - Update `AppBlockerService.kt` and `NinjaNotificationListener.kt` to load the brand logo bitmap for `setLargeIcon()`.
3. **Consolidate Notifications to Single Notification:**
   - Cancel all legacy notification IDs (1, 1001, 8801, 9002) in `AppBlockerService.onCreate()`.
   - When notifications are held, dynamically update the primary foreground notification (`NOTIFICATION_ID = 9001`) with:
     - Title: `🛡️ NeuroNinja Focus Guard`
     - Text: `{count} notifications held across {apps} apps • Tap to review`
     - Action intent: opens `neuroninja://notifications`.

---

### Phase 4: Competitive Notification Vault (Regain & Daywise Parity)
1. **Enhanced Notification Vault Screen (`src/app/notifications/index.tsx`):**
   - **App Filtering & Search:** Filter by specific app (YouTube, IND Money, etc.) or search keywords.
   - **One-Tap Actions on Notification Cards:**
     - Tap card to open original app.
     - Swipe / tap trash icon to dismiss single notification.
     - Tap "Add to VIP" badge directly on the card to immediately whitelist the app.
   - **Batch Scheduled Delivery Settings:**
     - Toggle between "Instant Hold (Vault Only)" and "Scheduled Digest Deliveries" (e.g., Morning 09:00, Afternoon 14:00, Evening 20:00).
   - **Permission Diagnostic Banner:**
     - Clear, actionable card if Notification Listener Access or DND Access is missing, with one-tap deep link to Android Settings.

---

### Phase 5: Daily & Weekly Raid Villains UI Screens & Combat Feedback
1. **Daily & Weekly Boss Screen (`src/app/lifeos/villains/index.tsx`):**
   - Live HP bar with animated damage drops (`currentHp / maxHp`).
   - Boss avatar, element badge (e.g. `VOID`, `CHAOS`, `FIRE`), active buffs.
   - Live Combat Log feed: displays recent damage dealt by habits, tasks, and pomodoros.
   - "Claim Bounty" button unlocks when HP reaches 0, depositing Coins & XP to Wallet.
2. **Weekly Raid Boss Tab:**
   - Multi-phase boss (*Chronos the Time Devourer* - 5,000 HP).
   - Phase indicator (Phase 1: Habit Shield, Phase 2: Focus Burn, Phase 3: Final Stand).

---

### Phase 6: Dynamic Challenges Engine & Real Photo Verification Portal
1. **Challenges Screen (`src/app/lifeos/challenges/index.tsx`):**
   - Active Quests & Available Quests tabs.
   - Real progress bars evaluated dynamically against SQLite database (`usage_events`, `habit_checkins`, `brain_game_scores`).
   - "Join Challenge" and "Claim Bounty" buttons.
2. **Photo Verification Submission (`src/app/lifeos/verification/submit-proof.tsx`):**
   - Camera & Gallery integration using `expo-camera` / `expo-image-picker`.
   - Attach notes/proof context, saves to SQLite `verification_proofs`.
3. **Parent & Buddy Verifier Portal (`src/app/lifeos/verification/index.tsx`):**
   - PIN-gated Verifier Mode.
   - Proof inspection inbox: photo zoom viewer, timestamp, habit details.
   - "Approve Proof" (+100 Coins, +250 XP) and "Reject Proof" (with feedback note).

---

### Phase 7: Parental Controls UI, Master PIN, Curfew & Quotas
1. **Parental Controls Dashboard (`src/app/lifeos/guardian/parental-controls.tsx`):**
   - Master Parent PIN authentication modal.
   - Bedtime Curfew toggle and time pickers (e.g. 21:30 to 06:30).
   - Daily Per-App Quota sliders (e.g. YouTube 30m, Instagram 20m).
   - Emergency VIP whitelist.
   - Tamper Audit Log viewer showing curfew changes, PIN attempts, and blocked breach events.

---

### Phase 8: Combat Event Hooks Integration
1. **Habit Completion (`HabitCycleToggle.tsx`):**
   - Check-in calls `villainEngine.dealDamage('habit', 50, habitTitle)`.
2. **Task Completion (`tasks/index.tsx`):**
   - Completing a task calls `villainEngine.dealDamage('task', 40, taskTitle)`.
3. **Pomodoro Completion (`focus/pomodoro.tsx`):**
   - Timer completion calls `villainEngine.dealDamage('pomodoro', 80, 'Deep Work')`.
4. **Arena Game Win (`arena-engine.ts`):**
   - Victory calls `villainEngine.dealDamage('brain_game', 60, gameSlug)`.
5. **Blocked App Breach (`blocked.tsx`):**
   - Breaching a blocked app calls `villainEngine.takeCounterDamage(30, appName)`.

---

### Phase 9: Compilation, Bundling, APK Build & Device Verification
1. **Typecheck & Lint:**
   - Execute `npx tsc --noEmit` and `npx expo lint`.
2. **Bundle & Compile APK:**
   - Generate release bundle: `npx expo export:embed --platform android ...`
   - Build native APK: `gradlew assembleDebug`.
3. **Deploy & Verify on Motorola Moto G62 5G:**
   - Install APK via `adb install -r`.
   - Test notification suppression live (send test notifications or trigger apps).
   - Verify status bar icon is crisp monochrome and drawer icon shows brand logo.
   - Verify single consolidated notification in notification drawer.
   - Capture live screenshots of Bosses, Challenges, Verification, Parental Curfew, and Notification Vault.

---

## 4. Verification & Acceptance Criteria
- [ ] **Zero Notification Leaks:** Non-VIP notifications are instantly intercepted; zero sound, zero vibration, zero system shade appearance.
- [ ] **Brand Logo Icon:** Status bar shows clean monochrome logo silhouette (no solid white block/ring); drawer shows brand logo.
- [ ] **No Duplicate Notifications:** NeuroNinja shows exactly ONE sleek notification in the drawer.
- [ ] **Auto-Rebind on Reboot:** Notification listener automatically reconnects after device restart without manual intervention.
- [ ] **Daily & Weekly Villains:** Real HP deduction on habit/task/pomodoro, real loot deposit to wallet.
- [ ] **Photo Proof & Verifier:** Real photo capture, real SQLite persistence, real verifier approve/reject flow.
- [ ] **Parental Curfew:** Master PIN security, hard curfew lock during bedtime hours, quota enforcement.
