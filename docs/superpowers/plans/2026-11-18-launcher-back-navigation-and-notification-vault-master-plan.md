# Ghost Launcher Back Navigation & Notification Vault Performance & Grouping Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Ghost Launcher entrapment by establishing a universal, launcher-aware back-navigation system (hardware back, swipe back, and header arrows); resolve Notification Vault freezing by implementing non-blocking pagination (10-by-10 chunking) and instant skeleton UI; and organize suppressed notifications into collapsible, count-badged app bundles with Daywise/Regain competitor parity.

**Architecture:** 
1. **Universal Navigation Fallback (`useNinjaBack` / `NinjaHeader`):** A centralized navigation controller that detects if Ghost Launcher is active (`settings.ghostLauncherAsHome || isDefaultHome`). When back is pressed (hardware, swipe, or header arrow), if `router.canGoBack()` is true it pops the stack; if at root or arrived via deep link, it smoothly returns to `/focus/ghost-launcher` instead of trapping the user in NeuroNinja or hanging.
2. **Paginated Vault Engine (`10-by-10 Chunking`):** Transforms the monolithic 300-item fetch and render into an instant, non-blocking asynchronous pipeline with a zero-jank skeleton placeholder, rendering the first 10 items/groups with an on-demand "Load Next 10" / infinite scroll trigger so UI responsiveness is preserved.
3. **Collapsible App Bundle Accordion:** Aggregates alerts by `packageName` into structured `AppNotificationGroup` models displaying app icon, app name, category, and an alert count badge (e.g. `WhatsApp (3 messages)`). Tapping toggles an animated accordion revealing individual messages with swipe dismiss, launch, and VIP whitelist actions.

**Tech Stack:** React Native 0.88, Expo SDK 58, Expo Router, React 19, SQLite / Native `expo-app-blocker` bridge, React Native Reanimated / LayoutAnimation, Haptics.

---

## 1. Competitive & Industry Benchmarking

| Feature Area | Industry Best Practice (Niagara, Daywise, Regain, Minimalist Phone) | NeuroNinja Current State (Bugs) | Planned Production Solution |
| :--- | :--- | :--- | :--- |
| **Launcher Back Navigation** | Back button / swipe from ANY internal screen returns to Launcher Home without trapping user. | `router.replace('/(tabs)')` drops history; sub-screens call `router.back()` which fails or exits app. User is trapped inside app. | Universal `useNinjaBack` handler: intercepts hardware back and header back; routes to `/focus/ghost-launcher` if at root in launcher mode. |
| **Notification Loading & Freezing** | Instant skeleton frame (<16ms), asynchronous non-blocking fetch, paginated list. Back button remains clickable during load. | Synchronous render of up to 300 notifications in a raw ScrollView with heavy `<AppIcon>` lookups. Freezes UI thread; back tap ignored. | Initial batch of 10 items, instant skeleton placeholder, non-blocking asynchronous fetch, Back button instantly interactive. |
| **Deep Link Back Exit** | When opened from status bar digest (`neuroninja://notifications`), back returns to Launcher or Home. | Deep link has empty back stack (`canGoBack() === false`). `router.back()` does nothing; user cannot exit vault. | Safe deep-link escape: if `!router.canGoBack()`, redirects to `/focus/ghost-launcher` (or `/(tabs)`). |
| **App Notification Bundling** | Same-app alerts grouped into collapsible cards (e.g. `Instagram (4)`), expandable on tap. | Flat chronological list of raw alerts; 20 WhatsApp messages spam 20 giant cards. | Grouped app cards with count badges (`WhatsApp (3)`), expandable accordion, and group actions (Open, Clear App). |
| **Feed Presentation** | User can switch between Grouped Accordion and Flat Chronological Stream. | Only flat stream. | Toggle switch: `📁 Grouped by App` vs `🕒 Timeline Stream`. |

---

## 2. Global Constraints & Guardrails

- **React 19 Hooks Discipline:** No `useRef(new Animated.Value(...)).current` (triggers React 19 render warnings). Use `useState(() => new Animated.Value(...))` or Reanimated.
- **Expo Router Conventions:** Never import router from external packages; use `useRouter()` from `expo-router`.
- **Navigation Safety:** Always guard `router.back()` with `if (router.canGoBack()) router.back(); else router.replace(...)`.
- **Theme Consistency:** Follow Cyberpunk Dark Palette (`#070A11`, `#0F1829`, `#00E699`, `#38BDF8`, `#F59E0B`, `#F43F5E`).
- **Real Device Verification:** Must compile offline Android bundle (`npx expo export:embed`), assemble debug APK, install on Motorola Moto G62 5G (`ZD2228X6QH`), and capture live verification screenshots.

---

## 3. Review Focus & Failure Modes

1. **Failure Mode 1 (Deep Link Trap):** Arriving from Android status bar summary notification (`neuroninja://notifications`) has zero back stack history.
   - *Fix:* If `!router.canGoBack()`, header arrow and hardware back navigate to `/focus/ghost-launcher` (if launcher active) or `/(tabs)`.
2. **Failure Mode 2 (Main Thread Freeze during 300-Item Parse):** Fetching 300 suppressed alerts from SharedPreferences JSON locks React 19 rendering.
   - *Fix:* Paginate in memory: slice first 10, render instantly, and load next 10 on scroll or "Load More" click.
3. **Failure Mode 3 (Ghost Launcher Infinite Loop):** Pressing back while inside `/focus/ghost-launcher` triggers a loop back into the Dojo.
   - *Fix:* Inside Ghost Launcher, `BackHandler` does nothing or calls `BackHandler.exitApp()` / `moveTaskToBack`, never navigating to `/(tabs)`.
4. **Failure Mode 4 (App Icon Flooding):** Rendering 300 app icons simultaneously queries Android PackageManager 300 times.
   - *Fix:* In grouped view, only 1 icon per app bundle is rendered. In paginated view, max 10 icons are rendered initially.
5. **Failure Mode 5 (Empty Group Artifacts):** Dismissing the last notification in a group leaves an empty card.
   - *Fix:* Auto-collapse and prune the group when its notifications array reaches zero.

---

## 4. Implementation Tasks

### Task 1: Create Universal Navigation Hook (`useNinjaBack`) & Shared Header Component

**Files:**
- Create: `src/hooks/use-ninja-back.ts`
- Create: `src/components/ui/ninja-screen-header.tsx`
- Test: `src/hooks/__tests__/use-ninja-back.test.ts`

- [ ] **Step 1:** Write unit test for `useNinjaBack` resolving:
  - If `canGoBack()` is true $\rightarrow$ calls `router.back()`.
  - If `canGoBack()` is false and `isLauncherMode` is true $\rightarrow$ calls `router.replace('/focus/ghost-launcher')`.
  - If `canGoBack()` is false and `isLauncherMode` is false $\rightarrow$ calls `router.replace('/(tabs)')`.
- [ ] **Step 2:** Implement `useNinjaBack` hook:
  ```ts
  export function useNinjaBack() {
    const router = useRouter();
    const { settings } = useNinja();
    const [isDefaultHome, setIsDefaultHome] = useState(false);
    // checks checkLauncherStatus()
    const handleSmartBack = useCallback(() => {
      if (router.canGoBack()) {
        router.back();
      } else if (settings.ghostLauncherAsHome || isDefaultHome) {
        router.replace('/focus/ghost-launcher' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    }, [router, settings.ghostLauncherAsHome, isDefaultHome]);
    // registers BackHandler for hardware back
    return { handleSmartBack, isLauncherMode: settings.ghostLauncherAsHome || isDefaultHome };
  }
  ```
- [ ] **Step 3:** Implement `NinjaScreenHeader` with standard back button calling `handleSmartBack()`.

---

### Task 2: Fix Ghost Launcher Entry & Sub-Screen Back Navigation

**Files:**
- Modify: `src/app/focus/ghost-launcher.tsx`
- Modify: `src/app/(tabs)/_layout.tsx`
- Modify: `src/app/dojo-games/index.tsx`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1:** In `src/app/focus/ghost-launcher.tsx`:
  - When launching NeuroNinja Dojo (`NeuroNinja Dojo & App Blocker →` button), use `router.push('/(tabs)' as any)` so the back stack retains `/focus/ghost-launcher` as its previous route.
  - When in Ghost Launcher, hardware back handler must not navigate to `/(tabs)`.
- [ ] **Step 2:** In `src/app/dojo-games/index.tsx`:
  - Replace `<TouchableOpacity onPress={() => (activeGame ? handleCloseGame() : router.back())}>` with `handleSmartBack()`.
- [ ] **Step 3:** In `src/app/(tabs)/_layout.tsx`:
  - Ensure hardware back from any tab root navigates back to `/focus/ghost-launcher` when launcher mode is active.

---

### Task 3: Build Notification Grouping & Pagination Engine

**Files:**
- Create: `src/services/notifications/notification-grouper.ts`
- Test: `src/services/notifications/__tests__/notification-grouper.test.ts`

- [ ] **Step 1:** Define models:
  ```ts
  export interface AppNotificationGroup {
    packageName: string;
    appName: string;
    category: 'Communication' | 'Social' | 'Productivity' | 'Study' | 'General';
    count: number;
    latestPostTime: number;
    latestFormattedTime: string;
    items: SuppressedNotification[];
  }
  ```
- [ ] **Step 2:** Write unit tests for:
  - Grouping an array of notifications by `packageName`.
  - Sorting groups by `latestPostTime` descending.
  - Paginating groups or items with `page` and `pageSize` (10 per page).
  - Counting notifications per app.
- [ ] **Step 3:** Implement `groupNotificationsByApp(items: SuppressedNotification[]): AppNotificationGroup[]`.
- [ ] **Step 4:** Implement `paginateNotifications<T>(items: T[], page: number, pageSize: number = 10)`.

---

### Task 4: Upgrade Notification Vault with Chunked 10-by-10 Loading & Skeleton UI

**Files:**
- Modify: `src/app/notifications/index.tsx`

- [ ] **Step 1:** Add skeleton loading state:
  - Display 3 pulse-shimmer skeleton cards while `isInitialLoading` is true.
  - Keep the header and Back button immediately interactive during loading so the user can exit without waiting.
- [ ] **Step 2:** Implement pagination state:
  - `page: number` (defaults to 1).
  - `pageSize = 10`.
  - Compute visible items/groups with `slice(0, page * pageSize)`.
  - If more items remain, show `+ Load Next 10 Notifications (${remaining} remaining)` button and infinite scroll trigger.
- [ ] **Step 3:** Wire `useNinjaBack()` to the header back button and hardware back press:
  - If arrived via deep link `neuroninja://notifications`, pressing back smoothly exits to `/focus/ghost-launcher` or `/(tabs)` instead of failing.

---

### Task 5: Implement Collapsible App Notification Cards (Accordion UI)

**Files:**
- Create: `src/components/notifications/app-notification-group-card.tsx`
- Modify: `src/app/notifications/index.tsx`

- [ ] **Step 1:** Build `AppNotificationGroupCard`:
  - Header: App Icon, App Name, Category chip, and Badge: e.g. `3 messages held`.
  - Right: Expand/Collapse chevron icon (rotates or changes arrow-down / arrow-up).
  - Action buttons: "Open App", "Clear App Alerts", "VIP Star".
  - Body: Expandable list of nested alerts when `isExpanded` is true.
  - Each nested alert displays: title, obfuscated or clean body, time, and single-dismiss button.
- [ ] **Step 2:** Add View Mode Switcher in Notification Vault:
  - Tabs: `📁 Grouped by App` | `🕒 All Alerts Stream`.
- [ ] **Step 3:** Add bulk dismissal for an entire app group.

---

### Task 6: Verification, Build & Live Testing on Motorola Moto G62 5G

- [ ] **Step 1:** Run TypeScript typecheck: `npx tsc --noEmit` (0 errors).
- [ ] **Step 2:** Run linter: `npx expo lint` (0 errors, 0 warnings).
- [ ] **Step 3:** Export embedded offline bundle:
  `npx expo export:embed --entry-file index.js --platform android --dev false --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res`
- [ ] **Step 4:** Assemble debug APK: `cd android; ./gradlew assembleDebug`.
- [ ] **Step 5:** Install APK onto Motorola Moto G62 5G via ADB.
- [ ] **Step 6:** Live device testing:
  - Test 1: From Ghost Launcher, tap Dojo / Ninja Brain Arcade $\rightarrow$ press hardware back / swipe back / header back $\rightarrow$ verify it smoothly returns to Ghost Launcher!
  - Test 2: Tap Notification Vault $\rightarrow$ verify instant skeleton render and immediate back-button responsiveness.
  - Test 3: Verify 10-by-10 pagination and "Load Next 10" button.
  - Test 4: Verify collapsible app grouping with count badges (`WhatsApp (3)`, etc.) and accordion expansion.
  - Capture live screenshots of each verified state.
