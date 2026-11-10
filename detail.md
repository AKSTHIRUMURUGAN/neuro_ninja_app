
**Version:** 1.0  
**Status:** Baseline for implementation  
**Date:** 09 November 2026  
**Platforms:** Android-first; iOS capability-adapted  
**Product:** NeuronNinja Digital Wellness & Productivity

## 1. Executive summary

NeuronNinja is a local-first digital-wellness platform that helps people understand and intentionally manage their phone use. It combines digital wellbeing analytics, app and website restrictions, mindful app opening, a minimalist launcher, focus tools, alarms, habits, family safety and brain-training experiences.

The product takes inspiration from publicly described product patterns in Regain and minimalist phone, alongside established focus and wellbeing products. It must implement original NeuronNinja interaction design, naming, visual assets and code. This document specifies functional equivalents and an expanded product vision; it does not claim that every competitor feature is technically reproducible on every OS.

**Product promise:** Understand your digital habits, interrupt unwanted patterns, and make more room for focused work and life.

## 2. Product principles

1. **User agency:** The device owner can understand, pause, disable or uninstall personal-control features. No covert surveillance or deceptive persistence.
2. **Local-first enforcement:** App limits, focus sessions and schedules continue working without network access.
3. **Honest measurement:** Separate measured facts from estimates. Never label foreground time as exact Reels/Shorts watch time.
4. **Platform truth:** Android and iOS feature parity is not assumed. UI must show capability and permission status.
5. **Privacy by default:** Minimize collection, keep raw app-usage events on device where possible, and sync aggregates only with consent.
6. **Accessible and inclusive:** Support assistive technology, readable contrast, reduced motion and localization.
7. **Resilient operation:** Recover schedules after reboot, process death and time-zone changes where the OS allows.
8. **Safety:** Family supervision is transparent and age-appropriate; no message, call or keystroke surveillance.

## 3. Goals and non-goals

### Goals
- Give users accurate app-level usage, session and launch analytics.
- Let users configure daily budgets, session timers, opening budgets and schedules.
- Provide app blocking and intentional-opening interventions within OS limits.
- Offer an optional Android default launcher with normal, minimalist and deep-focus profiles.
- Provide focus timers, Pomodoro, routines, reminders, alarms and gamification.
- Support parent/child accounts and transparent restrictions on supported devices.
- Deliver a coherent iOS adaptation using Screen Time APIs where entitlements permit.

### Non-goals
- Rooting, jailbreaking or bypassing OS security.
- Guaranteeing an app cannot be force-stopped, uninstalled or bypassed on a personally owned unmanaged device.
- Exact measurement of scroll gestures, Reels, Shorts, individual videos or feed content across arbitrary third-party apps.
- Reading private messages, call audio, keystrokes, passwords or private content.
- Replacing Android/iOS system parental controls or enterprise MDM.
- Guaranteeing that every manufacturer permits reliable background execution.

## 4. Personas and use cases

### Student
Wants scheduled study sessions, YouTube study access, app limits, focus rooms, exam routines and study reports.

### Knowledge worker
Wants work/personal profiles, deep-work blocks, notification quiet periods, task reminders and weekly focus insights.

### Digital-wellness seeker
Wants to understand app habits, reduce doomscrolling, set app-opening intentions and use a minimalist launcher.

### Parent/guardian
Wants transparent family pairing, child-safe schedules, app limits, website restrictions and age-appropriate reports.

### Child/teen
Needs clear explanations of restrictions, visible remaining time, request-more-time workflows and emergency access.

## 5. Product information architecture

Primary navigation:
1. **Today** – daily overview, screen-time summary, focus status, next alarm, daily goal.
2. **Wellbeing** – app usage, timers, opening counts, doomscroll indicators, trends and reports.
3. **Focus** – timer, Pomodoro, strict/flexible sessions, study mode, rooms and focus history.
4. **Shield** – app lock, app/website policies, mindful opening, Reels/Shorts guard, privacy vault.
5. **Routines** – alarms, reminders, habits, sleep and morning routines.
6. **Profile / Family** – launcher profiles, permissions, device health, family controls, privacy and subscription.

Android launcher is an optional system-level experience, not a tab inside the main app. The app must remain usable if the user chooses another launcher.

## 6. Functional requirements

Priority definitions: **P0** required for first public release; **P1** high-value follow-up; **P2** advanced; **P3** research/entitlement-dependent.

### 6.1 Onboarding, identity and permissions
- FR-001 (P0): Explain product value and platform limitations before requesting sensitive permissions.
- FR-002 (P0): Offer guest/local-only mode; account creation is optional for core on-device features.
- FR-003 (P0): Permission center shows purpose, status, last checked time, and a direct system-settings action.
- FR-004 (P0): Request permissions contextually, immediately before the feature needs them.
- FR-005 (P0): Provide a capability matrix and graceful fallback when access is unavailable.
- FR-006 (P1): Support account sign-in, device linking and encrypted preference sync.
- FR-007 (P0): Consent records must be versioned and revocable.

### 6.2 Digital wellbeing and analytics
- FR-010 (P0): Display daily total screen/app usage based on OS-provided usage data.
- FR-011 (P0): Show per-app foreground duration and session count when available.
- FR-012 (P0): Show app launch/foreground transition counts with clear event definitions.
- FR-013 (P0): Provide day/week/month trends, category breakdowns and hourly heatmaps.
- FR-014 (P1): Provide unlock/pickup indicators only when the platform exposes a reliable signal; label proxies.
- FR-015 (P0): Allow users to correct app categories and exclude system/essential apps from selected analytics.
- FR-016 (P0): Show data freshness and coverage; explain missing periods.
- FR-017 (P1): Export a user-requested report.
- FR-018 (P0): Keep raw event history local by default; sync only opted-in aggregates.

### 6.3 App timers and usage budgets
- FR-020 (P0): Daily app budget with reset time and optional grace period.
- FR-021 (P0): Per-session timer selected at app launch or from the app detail page.
- FR-022 (P0): Category-wide budget across selected apps.
- FR-023 (P1): Combined global entertainment/social budget.
- FR-024 (P0): Daily app-open budget and rapid-reopen warning.
- FR-025 (P0): Scheduled windows by day of week and profile.
- FR-026 (P0): Warning thresholds (for example 80%, 100%) are configurable.
- FR-027 (P0): On limit, execute the selected action: notify, mindful pause, soft block or strict block where supported.
- FR-028 (P0): Show remaining time and explain whether time is measured, estimated or pending sync.
- FR-029 (P1): Support rollover policy only if explicitly configured; default is no rollover.
- FR-030 (P0): Resolve overlapping policies deterministically using policy precedence defined in TRD.

### 6.4 Doomscroll intelligence
- FR-040 (P0): Count long app sessions based on user-configurable duration thresholds.
- FR-041 (P0): Detect rapid reopen patterns from foreground transitions with a configurable cooldown.
- FR-042 (P0): Track late-night usage windows selected by the user.
- FR-043 (P0): Calculate time over user-defined budgets.
- FR-044 (P1): Detect app switching patterns and repeated short sessions.
- FR-045 (P1): Provide a Doomscroll Index with transparent formula and no medical claims.
- FR-046 (P1): Offer interventions: pause, breathing, intention prompt, break suggestion or user-selected app limit.
- FR-047 (P2): Estimate short-video/feed exposure only where UI signals are available and permitted; label as estimate and show confidence.
- FR-048 (P0): Deduplicate overlapping events so one continuous session is not counted multiple times.
- FR-049 (P0): Let users disable each detection category independently.

### 6.5 Mindful opening
- FR-050 (P0): Configure app-specific launch delay (e.g. 3/5/10/15 seconds).
- FR-051 (P0): Configure an intention prompt and optional reason choices.
- FR-052 (P0): Allow continue, cancel or return-to-focus actions.
- FR-053 (P1): Increase delay after repeated opens within a configurable window.
- FR-054 (P1): Opening budget per app/day.
- FR-055 (P0): Record intervention shown, completed, cancelled and bypassed as local events.
- FR-056 (P0): Provide emergency/essential-app exemptions.

### 6.6 App blocking and strict mode
- FR-060 (P0): Select protected apps using the OS-supported app selection/inventory mechanism.
- FR-061 (P0): Create flexible and strict policies.
- FR-062 (P0): Schedule policies by weekday/time and bind them to profiles.
- FR-063 (P0): Allow approved apps and emergency contacts/apps.
- FR-064 (P0): Provide a visible countdown and policy explanation on block screen.
- FR-065 (P0): Support a configurable break/pass allowance in flexible mode.
- FR-066 (P0): Strict mode prevents casual in-app rule editing during the active interval, but does not claim to defeat OS force-stop, uninstall, safe mode or administrator control on unmanaged devices.
- FR-067 (P0): Provide a safe emergency exit and explain its effect on the session.
- FR-068 (P1): Record attempts to open blocked apps without collecting app content.
- FR-069 (P0): If enforcement service is unavailable, show degraded status and never claim protection is active.
- FR-070 (P1): Support profile templates: Study, Work, Sleep, Personal and Custom.

### 6.7 Reels/Shorts and app-specific interventions
- FR-080 (P1): Offer app-specific rules for supported third-party apps.
- FR-081 (P1): Detect known UI/feed entry points only through a narrowly scoped, user-consented accessibility service where permitted.
- FR-082 (P1): Block whole app as a robust fallback if feed-only detection is unavailable.
- FR-083 (P1): Show compatibility status by app version/device.
- FR-084 (P0): Do not infer exact video, content or swipe counts from foreground usage alone.
- FR-085 (P1): Provide a detection test and clear explanation of limitations.

### 6.8 YouTube Study Mode
- FR-090 (P1): Provide a study profile with approved apps/sites and blocked entertainment destinations.
- FR-091 (P2): Provide channel/video allowlist assistance only where reliable public URL/domain controls exist.
- FR-092 (P1): Offer YouTube app-wide restriction or browser-based allowlist as dependable fallback.
- FR-093 (P0): Never claim to inspect private YouTube recommendations or video content without a supported, consented mechanism.

### 6.9 Website Guardian
- FR-100 (P1): Configure domain allowlist and blocklist.
- FR-101 (P1): Support category-based DNS filtering from a trusted local or remote policy list.
- FR-102 (P1): Use Android VPNService only for a clearly disclosed, user-consented filtering function.
- FR-103 (P1): Explain DNS limitations: encrypted DNS, in-app networking, VPN conflicts and URL path visibility.
- FR-104 (P1): Support schedule-based web policies.
- FR-105 (P0): Provide a local emergency disable and visible VPN status.
- FR-106 (P2): iOS web-domain restrictions through approved Screen Time APIs and entitlements.

### 6.10 Minimalist launcher (Android)
- FR-110 (P1): Offer optional default-home launcher onboarding.
- FR-111 (P1): Normal, Minimal and Deep Focus home profiles.
- FR-112 (P1): Text-first app list, favourites, search, folders and configurable ordering.
- FR-113 (P1): Hide selected app shortcuts without claiming the app is uninstalled or inaccessible.
- FR-114 (P1): Rename display labels locally.
- FR-115 (P1): Support monochrome/low-stimulation themes within NeuronNinja UI.
- FR-116 (P1): Provide accessible app labels, TalkBack support and system fallback.
- FR-117 (P0): User can switch back to another default launcher through Android system settings.
- FR-118 (P2): Launcher widgets/shortcuts only where supported by Android launcher APIs.

### 6.11 Notifications and grayscale
- FR-120 (P1): Provide per-app quiet-hour recommendations and notification settings deep links.
- FR-121 (P2): Optional NotificationListener-based notification summary/filter features with explicit consent and local processing.
- FR-122 (P0): Do not promise that a third-party app can invisibly suppress all other apps' notifications on every Android version.
- FR-123 (P1): Offer grayscale guidance and supported device-specific activation; do not request privileged secure-settings access as a hidden workaround.
- FR-124 (P0): iOS uses user-configured Focus/notification settings and permitted Screen Time APIs, not Android-equivalent notification interception.

### 6.12 Focus engine and community
- FR-130 (P0): Countdown, stopwatch, Pomodoro and custom interval sessions.
- FR-131 (P0): Pause/resume rules and interruption classification.
- FR-132 (P0): Flexible and strict focus modes.
- FR-133 (P1): Ambient sound/white-noise playback from licensed or original assets.
- FR-134 (P1): Focus history, streaks, total hours and completion metrics.
- FR-135 (P2): Private/public focus rooms, invites, presence and group sessions.
- FR-136 (P2): Leaderboards and challenges with anti-cheat rules and privacy controls.
- FR-137 (P0): Offline timer works without network; room sync resumes later.

### 6.13 Alarms, reminders and routines
- FR-140 (P0): One-time and recurring alarms.
- FR-141 (P0): Task reminders and habit reminders.
- FR-142 (P0): Time-zone and daylight-saving-safe recurrence.
- FR-143 (P0): Rebuild scheduled alarms after reboot/time changes where supported.
- FR-144 (P1): Wake-up challenges: arithmetic, memory, sequence or QR scan.
- FR-145 (P0): Emergency alarm dismissal and accessible controls.
- FR-146 (P0): Request exact-alarm access only where the core alarm feature and store policy qualify; otherwise use inexact scheduling.
- FR-147 (P1): Morning, study, break, exercise and bedtime routines.

### 6.14 Habits, brain games and coach
- FR-150 (P0): Create habits with schedules, reminders and completion history.
- FR-151 (P1): Streaks, goals, badges and weekly review.
- FR-152 (P1): Brain games and math/memory challenges for focus and wake-up workflows.
- FR-153 (P2): Step/activity integration where supported and consented.
- FR-154 (P2): AI-generated summaries based only on user-approved aggregate data.
- FR-155 (P0): AI output is advisory, non-medical and user-editable.
- FR-156 (P0): Never send raw app inventory or detailed usage history to an AI provider without separate explicit consent.

### 6.15 Family and child safety
- FR-160 (P1): Parent and child roles with explicit device pairing.
- FR-161 (P1): Parent schedules, app limits, web policies and time-extension requests.
- FR-162 (P1): Child sees active policies, remaining time and reasons.
- FR-163 (P1): Parent receives aggregate reports, not private message content.
- FR-164 (P1): Support unlinking, guardian verification and age-appropriate consent.
- FR-165 (P2): Managed-device controls only through approved Android enterprise/device-owner or Apple Family Controls paths.
- FR-166 (P0): No covert tracking, message capture, call recording or keystroke logging.

### 6.16 Privacy locker
- FR-170 (P1): Local encrypted vault for user-selected files.
- FR-171 (P1): PIN and supported biometric unlock.
- FR-172 (P1): Auto-lock timeout and secure app-switcher handling where possible.
- FR-173 (P1): Optional failed-unlock event capture only with clear camera disclosure, permission and local retention controls.
- FR-174 (P0): Never store biometric templates; use OS biometric APIs.
- FR-175 (P0): Document recovery and data-loss implications.

## 7. Non-functional requirements

- Performance: home dashboard interactive within 2 seconds on supported mid-range devices after warm start; usage queries paginated/aggregated.
- Battery: event-driven collection; no tight polling loops; measurable battery budget and soak tests.
- Reliability: local schedules survive process death and reboot where OS allows.
- Security: encrypted secrets, TLS, signed sessions, rate limits, authorization checks and audit events.
- Privacy: data minimization, purpose limitation, export and delete workflows, retention controls.
- Accessibility: TalkBack/VoiceOver, scalable text, contrast, reduced motion.
- Offline: core timers, local policies, alarms and local reports remain functional.
- Localization: strings externalized; timezone-aware storage.
- Observability: opt-in crash diagnostics; no sensitive usage data in logs.

## 8. Success metrics

North-star metric: **intentional-use days** — days when a user completes at least one self-selected focus or wellbeing goal, without relying on raw app engagement as the success measure.

Supporting metrics:
- Onboarding completion and permission opt-in by feature.
- Usage-data coverage and freshness.
- App timer rule activation and completion.
- Focus session completion rate.
- Mindful-opening cancellation rate (not maximized as a coercive metric).
- Reduction in user-selected over-budget sessions.
- Reminder usefulness feedback.
- Family policy delivery success.
- Crash-free sessions and battery impact.
- Retention and subscription conversion, evaluated without manipulative notification patterns.

## 9. Release acceptance criteria

A release is not ready unless:
- Each P0 flow has automated and device-level tests.
- Permission denial and revocation paths are tested.
- No screen claims a control is active when native enforcement is unavailable.
- Data export/deletion and consent revocation are verified.
- Battery and background reliability tests pass on representative OEM devices.
- Play Store/App Store declarations match actual API usage.
- Emergency exit and device-owner controls remain functional.
- Feature parity matrix is visible in product and support documentation.

## 10. Competitive inspiration and originality

Study public product patterns from:
- Regain: https://regainapp.ai/
- minimalist phone: https://www.minimalistphone.com/
- one sec: https://www.one-sec.app/
- Opal: https://opalapp.com/
- ScreenZen: https://www.screenzen.co/
- Forest: https://www.forestapp.cc/
- AppBlock: https://appblock.app/

NeuronNinja must use original copy, branding, mascot, visual system, code and workflows. This PRD describes desired outcomes, not a claim that all competitor internals are known.

## 11. Open decisions requiring product-owner sign-off

1. Subscription tiers and which modules are free.
2. Whether family pairing is cloud-only or also local QR pairing.
3. Exact supported Android API-level floor after device testing.
4. Whether VPN website filtering is first-party or a vetted provider.
5. Data retention defaults and jurisdiction-specific legal review.
6. AI provider, processing region and consent model.
"""

docs["TRD.md"] = r"""# NeuronNinja Technical Requirements & Architecture Document (TRD)
**Version:** 1.0 | **Date:** 09 November 2026  
**Status:** Implementation baseline

## 1. Architecture decision

Use Expo React Native with TypeScript for shared product UI and application orchestration. Use custom Kotlin modules/services for Android-only system integrations and Swift modules/extensions for iOS Screen Time integrations. Do not attempt to implement privileged OS behaviour in JavaScript.

Use Expo Development Builds and Continuous Native Generation/config plugins. Expo Go is not a target runtime for the complete product because custom native code, services, receivers, launcher activities and extensions are required.

## 2. High-level system

```text
Expo React Native UI (Expo Router, TypeScript)
        |
Feature services / Zustand / TanStack Query
        |
Typed Native Adapter interfaces
        |
+---------------------------+--------------------------+
| Android Kotlin            | iOS Swift                |
| UsageStats                | FamilyControls           |
| AccessibilityService      | ManagedSettings          |
| Launcher Activity         | DeviceActivity Extension |
| AlarmManager/Receiver     | Shield Extensions        |
| VPNService (optional)     | Local notifications      |
| NotificationListener      | App Groups / Keychain    |
+---------------------------+--------------------------+
        |
Local SQLite + encrypted preferences/files
        |
Optional API: Node.js/Next.js + MongoDB + push
```

Backend must never be a dependency for local enforcement. Cloud is used for identity, device pairing, group focus, parent configuration sync and opt-in aggregate reports.

## 3. Technology choices

### Shared mobile
- Expo SDK compatible with the selected React Native release; pin versions and use `npx expo install`.
- TypeScript strict mode.
- Expo Router.
- Zustand for local UI state.
- TanStack Query for remote state.
- `expo-sqlite` or a vetted SQLite layer for structured local storage.
- SecureStore for small secrets/tokens; native Keychain/Keystore-backed encryption for keys.
- EAS Build or reproducible local native builds.
- Sentry or equivalent only with privacy-safe, opt-in diagnostics.

### Android
- Kotlin, AndroidX, Jetpack libraries where appropriate.
- UsageStatsManager / UsageEvents for app usage.
- AccessibilityService only for clearly disclosed, user-consented, core app-control features; narrow event types and package scope.
- Native lock activity/overlay only as a UI intervention, not a security boundary.
- Launcher activity with HOME intent category; user explicitly chooses it as default launcher.
- AlarmManager + BroadcastReceiver + boot/time-change rescheduling.
- NotificationListenerService only for opt-in notification functionality.
- VPNService only for first-party domain filtering, explicit consent, encryption and Play policy review.
- BiometricPrompt for biometric confirmation.
- WorkManager for deferrable maintenance/sync, not exact alarms or continuous app monitoring.
- Package visibility declarations scoped to product needs; avoid broad QUERY_ALL_PACKAGES unless policy/legal review approves it.

### iOS
- Swift Expo modules.
- FamilyControls authorization and FamilyActivityPicker.
- ManagedSettings for shielding selected apps/categories/domains.
- DeviceActivity schedules/monitor extensions.
- ShieldConfiguration and ShieldAction extensions.
- App Groups for extension/app shared state.
- Keychain for secrets.
- UNUserNotificationCenter for reminders; no general-purpose exact-alarm API equivalent.
- Request Family Controls distribution entitlement for app and relevant extensions before public release.
- iOS launcher replacement and arbitrary third-party app interception are unsupported.

## 4. Platform capability contracts

Every native feature exposes:
```ts
type CapabilityState =
  | "available"
  | "permission_required"
  | "entitlement_required"
  | "unsupported"
  | "temporarily_unavailable"
  | "degraded";

interface NativeCapability {
  id: string;
  state: CapabilityState;
  reason?: string;
  lastCheckedAt: string;
}
```

Native adapter methods return typed results, never assume permission is granted:
```ts
interface UsageAdapter {
  getCapability(): Promise<NativeCapability>;
  requestAccess(): Promise<NativeCapability>;
  queryUsage(input: UsageQuery): Promise<UsageSummary>;
  syncClockAndTimezone(): Promise<void>;
}

interface RestrictionAdapter {
  getCapability(): Promise<NativeCapability>;
  applyPolicy(policy: LocalPolicy): Promise<ApplyPolicyResult>;
  clearPolicy(policyId: string): Promise<ApplyPolicyResult>;
  getEnforcementHealth(): Promise<EnforcementHealth>;
}
```

## 5. Android subsystem design

### 5.1 Usage engine
- User opens an in-app explanation then Android Usage Access settings.
- Check `AppOpsManager`/UsageStatsManager capability on every resume and before reports.
- Query UsageEvents over bounded windows; aggregate foreground transitions into sessions.
- Handle missing end events by closing sessions at query boundary and mark them inferred.
- Deduplicate repeated foreground events.
- Store normalized package identifier, start/end, duration, source confidence and event type locally.
- Exclude own app/system packages from selected metrics by default.
- No polling loop. Query on dashboard open, scheduled aggregation and meaningful app resume; use bounded incremental windows.

### 5.2 App blocker and mindful opening
- Accessibility service receives only required window/package transition events.
- Limit package filters to user-selected targets where API permits.
- Native policy engine evaluates priority and schedule.
- On protected app foreground, show a dedicated intervention activity or permitted overlay.
- Use lock-screen-like UI only as an interruption; it is not equivalent to OS-level app suspension.
- Biometric unlock through BiometricPrompt; PIN verifier uses salted, memory-hard hash and rate limiting.
- Avoid accessibility node scraping unless the feed-only feature specifically requires it, is disclosed, and policy/legal review approves it.
- Reels/Shorts detection is best-effort, app-version-sensitive, and must have whole-app blocking fallback.
- Strict mode cannot claim to resist uninstall, force-stop, safe mode, alternate user profiles or device administrator actions on an unmanaged personal device.

### 5.3 Launcher
- Implement an Android HOME activity with launcher intent filters.
- Ask user to set NeuronNinja as default home via system role/settings flow.
- Query visible launchable activities through PackageManager and allowed package visibility.
- Launch selected package activities via explicit resolved launcher intents.
- Minimal mode: text list, favorites, folders, search, limited colour and reduced animation.
- Deep Focus mode: render only allowed shortcuts; restrictions remain enforced by blocker where possible.
- Always offer system settings route to switch default launcher.
- Do not hide app from system settings or misrepresent hidden shortcuts as locked apps.

### 5.4 Alarms and schedules
- Use AlarmManager for exact alarms only when core alarm use case qualifies and user access is granted; otherwise use inexact alarms/notifications.
- Persist schedule definition in SQLite before scheduling.
- Schedule receiver uses immutable PendingIntents with unique IDs.
- Reschedule after BOOT_COMPLETED, TIME_SET, TIMEZONE_CHANGED and package replacement as appropriate.
- Handle exact-alarm permission revocation and app force-stop limitations.
- Alarm screen must clearly state when exact delivery is unavailable.

### 5.5 Website filtering
- Optional local VPNService for DNS/domain-level policy.
- Explicit disclosure: traffic routing, metadata handled, on-device processing, VPN conflict and limitations.
- Encrypt any remote tunnel; no traffic monetization or unrelated inspection.
- DNS filtering cannot reliably see HTTPS URL paths, content inside app TLS sessions or traffic bypassing the VPN.
- Provide local kill switch/disable and show VPN status.
- Evaluate DNS-over-HTTPS/private DNS, other VPNs, split tunneling and OEM behaviour.

### 5.6 Notifications
- NotificationListenerService is optional and disabled by default.
- Process on device; avoid storing notification text.
- Do not promise global silent removal; API behaviour and user/system controls vary.
- Provide notification-settings deep links as reliable baseline.

## 6. iOS subsystem design

- Personal and guardian authorization flows must be separate and accurately described.
- Use FamilyActivityPicker to let users select apps/categories/domains without exposing unnecessary identifiers.
- Use ManagedSettings stores to apply shields.
- Use DeviceActivity schedules/events and monitor extensions for interval monitoring.
- Implement ShieldConfiguration and ShieldAction extensions for block UI and allowed actions.
- Persist shared configuration through App Groups with strict schema/versioning.
- Request Family Controls entitlement for production distribution for app and extensions.
- Do not design around arbitrary app foreground monitoring, a custom launcher, global notification interception or Android-style overlay.
- If authorization/entitlement is unavailable, show unsupported/permission state and offer manual Screen Time guidance.

## 7. Policy precedence and evaluation

Policy order:
1. Emergency/system-critical allowlist.
2. Parent/guardian policy on a legitimately supervised device.
3. Active strict focus policy.
4. Active scheduled block policy.
5. App/category daily budget.
6. Per-session timer.
7. Mindful-opening delay.
8. Default allow.

Conflict handling:
- A higher-priority allowlist can override lower-level block rules only for explicitly configured essential apps.
- Parent restrictions cannot be silently changed by child account.
- Strict focus may prevent normal editing within the app, but must preserve emergency exit and OS ownership.
- Store policy evaluation result and reason code locally for explainability.

## 8. Local data and synchronization

- SQLite is authoritative for local usage aggregates, timers, schedules and focus sessions.
- Cloud records are replicas/configuration sync, not enforcement source.
- Sync queue uses idempotency keys and monotonic update versions.
- Conflict strategy: server-issued version for shared policies; local event append for personal usage; explicit conflict UI for guardian policy changes.
- Use UTC timestamps plus IANA timezone ID and original local schedule fields.
- Encrypt sensitive fields/files with keys protected by Android Keystore or iOS Keychain.
- Never log app usage payloads, package lists, notification text, PINs or vault paths.

## 9. Backend architecture

Suggested services:
- Identity & Device Service
- Family & Guardian Service
- Policy Sync Service
- Focus Rooms Service (WebSocket/presence)
- Subscription/Entitlement Service
- Notification Delivery Service
- Aggregated Analytics Service
- Audit/Consent Service

Suggested stack: Next.js/Node.js API, MongoDB, Redis for ephemeral room presence/queues if needed, object storage for user exports only if enabled, push provider abstraction.

Security:
- JWT or secure session with rotation.
- Device registration and revocation.
- RBAC: owner, guardian, child, group moderator.
- Object-level authorization on every family/device endpoint.
- Rate limits and abuse controls.
- TLS, encryption at rest, secrets manager, backups and restore drills.
- Signed policy payloads and schema version.
- Idempotent APIs and audit trails for guardian policy changes.

## 10. Native module contracts

Suggested modules:
- `NinjaUsage`
- `NinjaRestrictions`
- `NinjaMindfulOpen`
- `NinjaLauncher`
- `NinjaWebsiteFilter`
- `NinjaNotifications`
- `NinjaAlarms`
- `NinjaBiometrics`
- `NinjaFamilyControls` (iOS)
- `NinjaDeviceHealth`

Each module must expose `getCapability`, permission state, typed events, deterministic error codes and a `dispose`/lifecycle strategy. No module may silently start sensitive collection.

## 11. Permission and disclosure matrix

| Access | Feature | UX/policy requirement |
|---|---|---|
| Usage Access | Screen-time analytics | Explain app usage data and local processing |
| Accessibility | App interventions/feed detection | Prominent disclosure, affirmative consent, narrow scope and Play review |
| Display over other apps | Intervention UI | Explain when and why overlay appears |
| Package visibility | App selection/launcher | Minimum scope; Play declaration if broad access |
| Exact alarm | Alarm clock | Core use-case eligibility; prefer user-granted scheduling if appropriate |
| Notification listener | Notification summary | Optional, explicit consent, local processing |
| VPN | Domain filtering | Prominent disclosure, encryption, core-function eligibility |
| Family Controls entitlement | iOS blocking/family | Apple approval for app and extensions |
| Camera | QR alarm challenge/intruder capture | Contextual permission and explicit opt-in |
| Biometrics | Vault/app unlock | OS prompt; never collect biometric data |

## 12. Security threat model

Assets: local policies, usage history, account credentials, family relationships, vault files, sync tokens, device identity.

Threats: rooted/jailbroken device, malicious accessibility abuse, stolen phone, local DB extraction, replayed policy, guardian account takeover, unauthorized family linking, notification leakage, VPN DNS leakage, malicious deep links.

Controls:
- Hardware-backed keys where available.
- SQLCipher or equivalent encrypted DB where feasible; validate key lifecycle and migration.
- PIN hash with strong KDF, lockout and no plaintext.
- BiometricPrompt/LocalAuthentication.
- TLS and certificate validation.
- Signed policy envelopes, expiry and version checks.
- Device unlink/revoke.
- Family invitation one-time tokens and guardian verification.
- No sensitive data in analytics/crash logs.
- Security review before release.

## 13. Testing and observability

- Kotlin unit tests for sessionization, policy precedence, schedules and deduplication.
- Swift tests for authorization, shields and extension shared state.
- TypeScript tests for timer calculations and UI state.
- Instrumentation tests for service lifecycle, reboot, permission revocation and exact alarms.
- Device matrix: Pixel/AOSP, Samsung, Xiaomi/Redmi, OnePlus, Vivo/Oppo; multiple Android API levels.
- iOS matrix: supported iOS versions, entitlement-enabled and entitlement-denied builds.
- Battery soak: 24-hour idle, active focus, usage aggregation and VPN.
- Privacy tests: verify no notification body or raw usage events leave device by default.
- Accessibility tests with TalkBack and VoiceOver.

## 14. External technical references

- Expo Modules API: https://docs.expo.dev/modules/overview/
- Expo custom native code: https://docs.expo.dev/workflow/customizing/
- Android UsageStatsManager: https://developer.android.com/reference/android/app/usage/UsageStatsManager
- Android AccessibilityService: https://developer.android.com/reference/android/accessibilityservice/AccessibilityService
- Android AlarmManager: https://developer.android.com/develop/background-work/services/alarms
- Android package visibility: https://developer.android.com/training/package-visibility/declaring
- Google Play sensitive API policy: https://support.google.com/googleplay/android-developer/answer/16558241
- Apple Screen Time: https://developer.apple.com/documentation/screentimeapidocumentation
- Apple Family Controls entitlement: https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement
"""

docs["DRD.md"] = r"""# NeuronNinja Design Requirements Document (DRD)
**Version:** 1.0 | **Date:** 09 November 2026

## 1. Design vision

NeuronNinja should feel like a calm, premium digital-wellness companion with a playful Ninja identity. The interface should communicate control and encouragement, not shame or punishment. The visual system must work in both a rich dashboard and a deliberately minimal launcher.

**Design keywords:** calm, precise, encouraging, modern, trustworthy, focused, tactile, low-distraction.

## 2. Design principles

1. Progressive disclosure: show the most useful information first; advanced rules live in detailed settings.
2. Honest status: distinguish enabled, permission required, degraded and unsupported.
3. No guilt-based UX: use neutral language such as “over your chosen budget,” not “addicted” or “failed.”
4. Low cognitive load: reduce unnecessary colour, badges, animations and competing calls to action.
5. Clear control: every restriction explains why it is active and how to request/perform an allowed override.
6. Accessibility: WCAG-informed contrast, dynamic type, screen-reader labels, large touch targets and reduced motion.
7. Consistency: shared components for timers, app rows, policy cards, charts and permission states.

## 3. Brand and visual system

### Brand personality
- Ninja mascot is a guide/coach, not a surveillance character.
- Mascot states: idle, focus, achievement, gentle reminder, celebration and rest.
- Avoid copying competitor mascot or illustration styles.

### Colour tokens
Use semantic tokens rather than hard-coded colours:
- `background.primary`
- `background.secondary`
- `surface.default`
- `surface.elevated`
- `text.primary`
- `text.secondary`
- `border.subtle`
- `accent.focus`
- `accent.wellbeing`
- `status.success`
- `status.warning`
- `status.danger`
- `status.info`

Suggested starting palette: deep ink/navy surfaces, neutral slate, restrained electric blue or violet focus accent, mint success and amber warning. Validate contrast in light and dark modes.

### Typography
- Display: modern geometric sans.
- Body: highly legible system-compatible sans.
- Numeric: tabular numerals for timers and analytics.
- Minimum body size: 14sp where possible; support system font scaling.
- Do not use all-caps for long labels.

### Motion
- Timer progress uses smooth, low-frequency transitions.
- Respect reduced-motion setting.
- No flashing or high-frequency reward loops.
- Mascot animation is optional and never blocks task completion.

## 4. Navigation and screen inventory

### Main app
1. Onboarding
2. Today dashboard
3. Wellbeing overview
4. App usage detail
5. App timer setup
6. Doomscroll insights
7. Mindful opening setup
8. Focus home
9. Focus session
10. Focus completion
11. Focus room
12. Shield overview
13. App selection
14. Blocking policy builder
15. Active block screen
16. Website policy
17. YouTube study setup
18. Permission center
19. Alarm list/editor
20. Reminder list/editor
21. Habit list/detail
22. Brain challenge
23. Family dashboard
24. Child policy explanation/request
25. Vault
26. Settings/privacy/export/delete

### Android launcher
- Normal profile
- Minimal profile
- Deep Focus profile
- Search
- Folder
- Favourites
- App detail/quick action
- Launcher settings
- Switch default launcher help

### iOS adaptation
Use the same product language but remove Android-only launcher and arbitrary app interception surfaces. Use Screen Time selection and shield screens where approved.

## 5. Key screen specifications

### 5.1 Onboarding
- Explain the product in 3–4 short screens.
- Ask the user to choose an initial goal: focus, screen-time awareness, minimal phone, family safety or all.
- Show platform capability preview before requesting access.
- Permission requests are feature-triggered, not one giant first-run dialog.
- Provide “Not now” for optional permissions.
- Completion state lists active features and missing permissions.

Acceptance:
- User can finish onboarding without granting any sensitive permission.
- Every permission has a purpose explanation and settings route.
- No permission request is triggered without a user action.

### 5.2 Today dashboard
Top: greeting, date and profile selector.
Hero: screen-time total versus personal budget.
Secondary cards: focus minutes, next alarm, app budget remaining, mindful opens.
Insights: one actionable insight with a source label.
Actions: Start Focus, Set Timer, View Usage, Create Alarm.
Do not overwhelm with more than 4–5 primary cards above the fold.

Acceptance:
- Data timestamp and coverage are visible.
- Empty state explains how to enable usage access.
- Degraded native service never displays a false “protected” state.

### 5.3 Wellbeing
- Daily/weekly/monthly segmented control.
- Total usage chart and app/category list.
- Sort by duration, launches and budget usage.
- App detail includes sessions, duration, launch count and limits.
- Doomscroll card separates verified metrics from estimated feed detection.
- Heatmap has accessible text alternative.

Acceptance:
- Chart values match local aggregate records.
- Every metric has a tooltip/definition.
- No exact Reels/Shorts count unless source supports it.

### 5.4 App timer builder
Fields: app/category, daily budget, session budget, opening budget, schedule, warning thresholds, action at limit, grace period and emergency exceptions.
Show a live rule summary before saving.
Conflict resolver explains when two rules overlap.

Acceptance:
- Save disabled until valid values are entered.
- Time zone and reset time are explicit.
- User can pause or edit flexible rules.
- Strict rule editing explains restrictions and emergency exit.

### 5.5 Mindful opening
Full-screen calm intervention:
- App name and user-selected icon/colour.
- Countdown ring.
- Prompt: “What did you come here to do?”
- Optional intention chips.
- Actions: Continue, Go Back, Start Focus.
- No shame language.
- Essential apps can be exempted.

Acceptance:
- Delay duration is configurable.
- Accessibility services can navigate controls.
- Intervention can be cancelled safely.
- If interception is unavailable, app reports degraded state.

### 5.6 Active blocking screen
- Clear title: “This app is paused.”
- Reason: “Study schedule until 4:30 PM.”
- Remaining time.
- Allowed actions: Return, Request time, Emergency access (policy dependent).
- Parent-set rule includes guardian identity/relationship label where appropriate.
- Do not obscure emergency system UI or trap the user.

Acceptance:
- Screen appears only when native enforcement detects the target and capability is active.
- Emergency route always works.
- No claim of unbreakable blocking.

### 5.7 Focus timer
- Large timer with mode label.
- Start/pause/resume/end controls.
- Selected block profile and allowed apps.
- Session notes optional.
- Progress ring with accessible textual equivalent.
- Completion summary: planned vs actual, interruptions and next suggested action.

Acceptance:
- Timer remains correct after app backgrounding/process recreation.
- Session state persists locally.
- Focus session does not rely on a JS interval for elapsed-time truth.

### 5.8 Minimal launcher
- Text-first home screen.
- Time/date and optional small focus status.
- Favourites row or list.
- Search field.
- App categories/folders.
- Long-press menu: favourite, hide shortcut, rename label, move folder.
- Settings entry and clear exit route.
- Deep Focus mode shows only selected allowed shortcuts.

Acceptance:
- App launches by resolved package/activity.
- TalkBack labels and keyboard/large-text support.
- User can return to system launcher through settings.
- Hidden shortcut is not represented as a security lock.

### 5.9 Alarms and reminders
- Alarm list with next trigger and repeat pattern.
- Alarm editor includes sound, vibration, snooze, challenge and exactness status.
- Challenge can be disabled for emergency/safety.
- Reminder editor supports recurrence, timezone and completion.
- Missed alarm state is clearly distinguished from delivery failure.

Acceptance:
- Permission state is shown before scheduling exact alarm.
- Recurrence survives reboot/time changes where supported.
- No guarantee of exact delivery when OS permission or manufacturer policy prevents it.

### 5.10 Family controls
Parent dashboard: linked devices, schedules, app limits, web policy, aggregate report, pending requests.
Child view: active rules, remaining time, reason, request more time, emergency help.
Pairing: QR/one-time code, guardian confirmation, revoke access.

Acceptance:
- Child can see all active restrictions.
- Parent policy changes are auditable.
- Unlinking revokes cloud access.
- No private message/call/keystroke content is collected.

## 6. Component library

- `AppUsageRow`
- `AppIconFallback`
- `UsageMetricCard`
- `BudgetProgress`
- `TimeRangeSelector`
- `UsageHeatmap`
- `DoomscrollInsightCard`
- `PolicyRuleCard`
- `PermissionStatusCard`
- `FocusTimerDial`
- `PomodoroPhaseChip`
- `MindfulPrompt`
- `BlockReasonPanel`
- `AlarmListItem`
- `HabitStreakCard`
- `FamilyDeviceCard`
- `EmptyState`
- `ErrorState`
- `DegradedCapabilityBanner`
- `ConfirmEmergencyExitSheet`

All components require loading, empty, error, disabled, permission-required and degraded variants where relevant.

## 7. Interaction and copy rules

- Use “pause”, “limit”, “focus” and “budget”; avoid medical diagnoses.
- Warnings are actionable and non-punitive.
- Strict mode confirmation describes what will be locked and for how long.
- Never use dark patterns to prevent disabling a personal wellness feature.
- Confirm destructive actions such as clearing history or deleting vault data.
- Provide undo for non-security-critical preference changes.
- Avoid infinite streak pressure or variable-reward mechanics.

## 8. Accessibility and localization

- TalkBack and VoiceOver labels on all controls.
- Dynamic font scaling and layout reflow.
- 44pt iOS / 48dp Android touch-target guidance.
- Contrast checked for all semantic states.
- Colour is never the only indicator.
- Charts have data-table/text equivalents.
- Localize date, time, numbers and plural forms.
- Default timezone follows device; user can select a different reporting timezone.
- Support right-to-left layout if product localization expands.

## 9. Design QA checklist

- Dark and light themes.
- Small and large screens.
- Font scaling at 100%, 130%, 180%.
- Screen reader traversal.
- Reduced motion.
- Permission denied/revoked.
- Offline and stale data.
- Empty usage history.
- Long app names and localized text.
- Active strict session and emergency exit.
- Launcher unavailable/default role denied.
- iOS entitlement unavailable.
"""

docs["DATABASE.md"] = r"""# NeuronNinja Data Model & Database Design
**Version:** 1.0 | **Date:** 09 November 2026

## 1. Data architecture

NeuronNinja is local-first. SQLite on the device is authoritative for enforcement schedules, local usage aggregates, timers, alarms and focus sessions. MongoDB stores accounts, device registration, shared family policies, focus-room state and explicitly consented aggregate sync.

Do not upload raw app usage events by default. Store only what is needed for a selected feature. Keep notification content and vault file contents out of cloud sync.

## 2. Storage technologies

### Device
- SQLite for relational structured data.
- SQLCipher or equivalent vetted encrypted database option for sensitive tables where practical.
- Android Keystore / iOS Keychain protects encryption keys.
- Encrypted file storage for vault files.
- SecureStore only for small secrets, not large datasets.
- Database migrations are versioned and tested.

### Cloud
- MongoDB collections for identity, devices, family, shared policies, focus rooms and aggregate summaries.
- Redis optional for ephemeral presence, rate limiting and job queues.
- Object storage only for user-requested exports or explicitly synced assets.
- TTL indexes for ephemeral room presence and short-lived invitations.

## 3. Common conventions

- IDs: UUIDv7 or UUID; never expose sequential database IDs.
- Time: UTC ISO-8601 timestamp plus IANA timezone ID where schedule semantics matter.
- Duration: integer milliseconds or seconds; use one unit consistently per field.
- Soft delete only where audit/recovery requires it; otherwise hard-delete user data on request.
- `schemaVersion` on sync payloads.
- `createdAt`, `updatedAt`, `deletedAt` where applicable.
- `source` and `confidence` on inferred measurements.
- Avoid storing package labels as stable identifiers; package/bundle identifiers are platform-specific.

## 4. Local SQLite schema

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE app_catalog (
  app_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK(platform IN ('android','ios')),
  package_or_token_ref TEXT,
  display_name TEXT NOT NULL,
  category_id TEXT,
  is_system_app INTEGER NOT NULL DEFAULT 0,
  is_user_excluded INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE usage_sessions (
  session_id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES app_catalog(app_id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  end_reason TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('measured','inferred','partial')),
  source TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_usage_sessions_start ON usage_sessions(started_at);
CREATE INDEX idx_usage_sessions_app_start ON usage_sessions(app_id, started_at);

CREATE TABLE daily_usage (
  local_date TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  app_id TEXT NOT NULL REFERENCES app_catalog(app_id),
  foreground_ms INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  launch_count INTEGER NOT NULL DEFAULT 0,
  data_coverage TEXT NOT NULL,
  computed_at TEXT NOT NULL,
  PRIMARY KEY(local_date, timezone_id, app_id)
);

CREATE TABLE app_timer_rules (
  rule_id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK(target_type IN ('app','category','global')),
  target_id TEXT,
  daily_budget_ms INTEGER,
  session_budget_ms INTEGER,
  daily_open_budget INTEGER,
  reset_time_local TEXT,
  timezone_id TEXT NOT NULL,
  action_at_limit TEXT NOT NULL,
  grace_ms INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  profile_id TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE schedule_windows (
  schedule_id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  weekdays_mask INTEGER NOT NULL,
  start_local TEXT NOT NULL,
  end_local TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  effective_from TEXT,
  effective_until TEXT,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE local_policies (
  policy_id TEXT PRIMARY KEY,
  policy_type TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('flexible','strict')),
  target_json TEXT NOT NULL,
  allowed_json TEXT,
  schedule_id TEXT,
  priority INTEGER NOT NULL,
  state TEXT NOT NULL,
  source TEXT NOT NULL,
  policy_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE wellbeing_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  app_id TEXT,
  occurred_at TEXT NOT NULL,
  duration_ms INTEGER,
  confidence TEXT NOT NULL,
  dedupe_key TEXT UNIQUE,
  metadata_json TEXT
);
CREATE INDEX idx_wellbeing_events_type_time ON wellbeing_events(event_type, occurred_at);

CREATE TABLE focus_sessions (
  focus_session_id TEXT PRIMARY KEY,
  profile_id TEXT,
  mode TEXT NOT NULL,
  planned_duration_ms INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  active_duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  interruption_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE alarms (
  alarm_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  local_time TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  recurrence_json TEXT,
  sound_id TEXT,
  vibration_enabled INTEGER NOT NULL DEFAULT 1,
  snooze_minutes INTEGER NOT NULL DEFAULT 5,
  challenge_type TEXT,
  exactness TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  next_fire_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE reminders (
  reminder_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  due_at TEXT,
  timezone_id TEXT NOT NULL,
  recurrence_json TEXT,
  completed_at TEXT,
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE habits (
  habit_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  schedule_json TEXT NOT NULL,
  target_json TEXT,
  reminder_json TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE habit_completions (
  completion_id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(habit_id),
  local_date TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  value_json TEXT,
  UNIQUE(habit_id, local_date, timezone_id)
);

CREATE TABLE consent_records (
  consent_id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  disclosure_version TEXT NOT NULL,
  granted_at TEXT,
  revoked_at TEXT,
  scope_json TEXT NOT NULL
);

CREATE TABLE sync_outbox (
  outbox_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT
);
```

Additional local tables may include launcher configuration, notification preferences, family policy cache, vault metadata and app-opening intentions. Vault file bytes must be encrypted separately and not stored as plain SQLite blobs.

## 5. MongoDB collections

### users
```json
{
  "_id": "uuid",
  "email": "verified-email",
  "displayName": "User",
  "locale": "en-IN",
  "timezone": "Asia/Kolkata",
  "roles": ["user"],
  "status": "active",
  "createdAt": "ISODate",
  "updatedAt": "ISODate",
  "deletedAt": null
}
```
Indexes: unique normalized email; status.

### devices
```json
{
  "_id": "uuid",
  "userId": "uuid",
  "platform": "android",
  "deviceAlias": "My phone",
  "appVersion": "x.y.z",
  "osVersion": "version",
  "capabilities": {
    "usageAccess": "available",
    "accessibility": "permission_required",
    "launcherRole": "available",
    "familyControls": "unsupported"
  },
  "lastSeenAt": "ISODate",
  "revokedAt": null,
  "createdAt": "ISODate"
}
```
Indexes: `{userId:1, revokedAt:1}`; unique device public identifier hash.

### familyGroups
```json
{
  "_id": "uuid",
  "ownerUserId": "uuid",
  "members": [
    {"userId":"uuid","role":"guardian","joinedAt":"ISODate"},
    {"userId":"uuid","role":"child","joinedAt":"ISODate"}
  ],
  "status": "active",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
Indexes: members.userId; ownerUserId; status.

### parentalPolicies
Fields: `_id`, `familyGroupId`, `childUserId`, `deviceId`, `policyType`, `targets`, `schedule`, `mode`, `allowedExceptions`, `version`, `effectiveAt`, `expiresAt`, `createdBy`, `updatedAt`, `revokedAt`.
Indexes: `{deviceId:1, version:-1}`, `{childUserId:1, effectiveAt:1}`.

### policySync
Signed, versioned policy envelope:
`policyId`, `deviceId`, `version`, `payloadHash`, `payload`, `issuedAt`, `expiresAt`, `signatureKeyId`, `acknowledgedAt`.
Do not place secrets in policy payload.

### usageAggregates
Only opted-in aggregate records: `userId`, `deviceId`, `localDate`, `timezone`, `categoryTotals`, `focusMinutes`, `budgetOverruns`, `dataCoverage`, `consentId`, `createdAt`.
No raw event stream by default. TTL/retention according to user setting and legal review.

### focusRooms
`_id`, `ownerUserId`, `name`, `visibility`, `joinCodeHash`, `capacity`, `focusConfig`, `status`, `createdAt`, `expiresAt`.
Indexes: status/expiry; ownerUserId.

### focusRoomParticipants
`roomId`, `userId`, `displayName`, `joinedAt`, `leftAt`, `presenceState`, `sessionId`.
TTL for ephemeral presence where appropriate.

### consentAudit
`userId`, `deviceId`, `purpose`, `disclosureVersion`, `grantedAt`, `revokedAt`, `scope`, `sourceIpHash` only if legally justified, `createdAt`.

### subscriptions
Provider-neutral entitlement: `userId`, `productId`, `status`, `validFrom`, `validUntil`, `store`, `storeTransactionRef`, `updatedAt`. Validate purchase receipts server-side.

## 6. Indexing and retention

- Usage local: indexes on time and app/time; archive or compact raw sessions after daily aggregation according to retention setting.
- Mongo: compound indexes for family membership, device policy version and room status/expiry.
- TTL: invitation tokens, ephemeral presence and temporary exports only.
- Avoid TTL on legally required consent/audit records without legal review.
- Provide configurable retention and delete workflows.
- Backups must have documented deletion propagation/expiry policy.

## 7. Sync protocol

- Outbox pattern on device.
- Idempotency key per operation.
- Server validates device ownership and schema version.
- Policy updates are versioned and signed.
- Parent policy cannot be overwritten by a child-device local update.
- Device acknowledgements include applied version and capability status.
- Conflict: shared policy uses server version; personal local rules use last-write-wins only for non-critical preferences; usage aggregates merge by unique date/device/category.
- Offline devices continue last-known local policy; display stale policy age and expiry semantics.

## 8. API contract outline

- `POST /v1/devices/register`
- `POST /v1/devices/:id/revoke`
- `GET /v1/devices/:id/capabilities`
- `GET /v1/devices/:id/policies?sinceVersion=`
- `POST /v1/devices/:id/policies/ack`
- `POST /v1/usage/aggregates` (consented aggregates only)
- `GET /v1/families`
- `POST /v1/families/invitations`
- `POST /v1/families/invitations/:id/accept`
- `POST /v1/families/:id/policies`
- `POST /v1/focus-rooms`
- `POST /v1/focus-rooms/:id/join`
- `POST /v1/focus-rooms/:id/leave`
- `POST /v1/consents`
- `DELETE /v1/account/data`

All endpoints require authentication, object-level authorization, validation, rate limiting and audit logging where sensitive.

## 9. Data classification

- Public: public room title, marketing content.
- Internal: feature preferences, habit names.
- Sensitive: usage aggregates, app identifiers, family membership, focus history.
- Highly sensitive: vault files, authentication secrets, PIN verifier, tokens.
- Never collect: biometric templates, passwords from other apps, private messages, call audio, keystrokes.

## 10. Migration and recovery

- Version every SQLite migration.
- Test upgrade from at least two prior schema versions.
- Use transactional migration and backup/restore validation.
- If encrypted DB key is lost, explain recovery limitations; never silently create a new empty database over an existing one.
- Provide export in machine-readable JSON/CSV where practical.
- Account deletion must revoke devices, remove cloud records and explain backup expiry.
"""

docs["IMPLEMENTATION.md"] = r"""# NeuronNinja Implementation Plan & Engineering Runbook
**Version:** 1.0 | **Date:** 09 November 2026

## 1. Delivery strategy

The product scope is complete, but implementation must be staged by dependency and platform risk. “Complete scope” means every module is specified and has an implementation path; it does not mean every advanced feature ships in one release.

Build Android native feasibility spikes before polishing all screens. Keep the Expo UI modular and native adapters typed. Do not use Expo Go for acceptance testing of native features.

## 2. Repository structure

```text
neuroninja/
├── app/                         # Expo Router routes
│   ├── (onboarding)/
│   ├── (tabs)/
│   ├── wellbeing/
│   ├── focus/
│   ├── shield/
│   ├── routines/
│   ├── family/
│   └── settings/
├── src/
│   ├── components/
│   ├── features/
│   │   ├── wellbeing/
│   │   ├── app-timers/
│   │   ├── doomscroll/
│   │   ├── mindful-opening/
│   │   ├── blocking/
│   │   ├── launcher/
│   │   ├── website-guardian/
│   │   ├── focus/
│   │   ├── alarms/
│   │   ├── habits/
│   │   └── family/
│   ├── native/
│   │   ├── adapters/
│   │   ├── capability/
│   │   └── contracts/
│   ├── database/
│   ├── sync/
│   ├── stores/
│   ├── hooks/
│   ├── theme/
│   ├── utils/
│   └── types/
├── modules/
│   ├── ninja-usage/
│   ├── ninja-restrictions/
│   ├── ninja-mindful-open/
│   ├── ninja-launcher/
│   ├── ninja-website-filter/
│   ├── ninja-notifications/
│   ├── ninja-alarms/
│   ├── ninja-biometrics/
│   └── ninja-family-controls/
├── backend/
│   ├── src/modules/
│   ├── src/routes/
│   ├── src/workers/
│   └── tests/
├── docs/
├── e2e/
├── plugins/
└── app.config.ts
```

## 3. Development standards

- TypeScript strict mode; Kotlin/Swift linting and formatting.
- Feature-first modules; no business logic in screens.
- All native calls go through typed adapters.
- Every adapter exposes capability, permission, status and failure reason.
- No silent fallback that implies protection is active.
- No sensitive logs.
- Feature flags for experimental feed detection, VPN and iOS entitlement paths.
- Pin Expo/React Native/native dependency versions.
- CI: lint, typecheck, unit tests, Android build, iOS build, migration tests and dependency audit.

## 4. Phase plan and gates

### Phase 0 – Product, policy and device feasibility (1–2 weeks)
Tasks:
- Confirm target Android API floor and supported OEM matrix.
- Review Google Play Accessibility, VPN, package visibility, exact-alarm and data safety policies.
- Apply for Apple Family Controls entitlement early.
- Prototype UsageStats access, app transition events, launcher role and alarm receiver.
- Define privacy notice, data map and consent screens.

Exit criteria:
- Native feasibility report signed off.
- Permission and policy matrix approved.
- No unsupported promise in feature copy.
- Device test lab established.

### Phase 1 – Expo foundation and local-first core (2–3 weeks)
Tasks:
- Create Expo app with development builds and config plugins.
- Implement navigation, theme, localization, permission center and capability model.
- Implement SQLite schema/migrations and secure key storage.
- Implement offline settings and feature flags.
- Add CI and crash-safe diagnostics.

Acceptance:
- App builds on physical Android and iOS test devices.
- User can onboard without sensitive permissions.
- DB migration and recovery tests pass.
- Permission center accurately reflects granted/revoked state.

### Phase 2 – Usage intelligence (2–4 weeks)
Tasks:
- Kotlin UsageStats adapter and UsageEvents sessionizer.
- App catalogue with scoped package visibility.
- Daily aggregate pipeline.
- Usage detail, trends and heatmap UI.
- Coverage and confidence labels.

Acceptance:
- Foreground durations reconcile with Android system settings within documented tolerance.
- Duplicate transitions do not inflate session counts.
- Missing events are marked inferred/partial.
- Data remains local by default.
- Battery soak passes agreed budget.

### Phase 3 – App timers and doomscroll metrics (2–3 weeks)
Tasks:
- Daily/session/category/open-count rules.
- Reset timezone and schedule engine.
- Long-session, rapid-reopen and late-night rules.
- Deduplication and intervention events.
- Warnings and budget UI.

Acceptance:
- Timer calculations survive app process death.
- Multiple rule precedence tests pass.
- Long session counted once.
- User can inspect metric definitions.
- No unsupported Reels/Shorts exact-count claims.

### Phase 4 – App blocking and mindful opening (3–5 weeks)
Tasks:
- AccessibilityService proof of concept with narrow event filters and explicit disclosure.
- Native intervention activity/overlay.
- PIN/biometric flow.
- Flexible and strict policy state machine.
- Emergency allowlist and degraded-service handling.
- Feed detection prototype behind feature flag.

Acceptance:
- Protected-app launch triggers intervention on supported test devices.
- Permission revocation produces visible degraded state.
- Emergency path works.
- No lock screen traps user.
- OEM compatibility documented.
- Play policy review completed before production release.

### Phase 5 – Launcher (2–4 weeks)
Tasks:
- Android HOME activity and default launcher role flow.
- App list/search/favourites/folders.
- Normal, Minimal and Deep Focus profiles.
- Accessibility and switch-back UX.

Acceptance:
- User can select NeuronNinja as default launcher.
- Launchable apps open correctly.
- Large text and TalkBack work.
- User can switch to system launcher.
- Hidden shortcuts are not described as security restrictions.

### Phase 6 – Website Guardian and notification controls (3–5 weeks)
Tasks:
- DNS/domain policy model.
- VPNService local filtering prototype, disclosure and kill switch.
- Test private DNS, other VPN, split tunnelling and encrypted DNS.
- Optional NotificationListener prototype and local summary.

Acceptance:
- DNS block/allow tests pass on supported browsers.
- Limitations are visible.
- VPN can be disabled and never monetizes traffic.
- Notification body is not uploaded.
- Store policy/legal approval obtained.

### Phase 7 – Focus engine and community (3–4 weeks)
Tasks:
- Countdown, stopwatch, Pomodoro, custom cycles.
- Persistent timer state and session reports.
- Ambient sound assets with documented licensing.
- Focus room backend, presence and invites.
- Moderation, abuse prevention and privacy controls.

Acceptance:
- Timer accurate across app backgrounding/restart.
- Offline sessions persist.
- Room access authorization tested.
- No public room exposes private usage data.

### Phase 8 – Alarms, routines, habits and games (3–5 weeks)
Tasks:
- AlarmManager receivers and rescheduling.
- Exact/inexact alarm permission flows.
- Reminders, habits and recurrence engine.
- Wake-up challenges and brain games.
- Routine templates.

Acceptance:
- Reboot/timezone/DST scenarios tested.
- Exactness state is shown accurately.
- Challenge can be dismissed for safety.
- Habit recurrence handles missed days and timezone changes.

### Phase 9 – Family controls (4–6 weeks)
Tasks:
- Family group and guardian verification.
- Child-device pairing and revocation.
- Parent policy authoring and signed sync.
- Child-visible policy explanation and request-more-time.
- Aggregate reports.
- Android managed-device integration considered separately.

Acceptance:
- Only authorized guardian can update child policy.
- Child sees active restrictions.
- Offline policy expiry/staleness is clear.
- Unlink revokes access.
- No covert surveillance features.

### Phase 10 – iOS Screen Time adaptation (4–8+ weeks; entitlement dependent)
Tasks:
- Request Family Controls distribution entitlement for app and extensions.
- Implement Swift modules, App Groups and Screen Time extensions.
- FamilyActivityPicker, ManagedSettings shields and DeviceActivity schedules.
- iOS-specific onboarding and capability matrix.
- Manual fallback for unsupported features.

Acceptance:
- Entitlement approved for production.
- Shield and schedule extension tests pass.
- User selection privacy preserved.
- No Android-only feature is advertised as available on iOS.

### Phase 11 – Security, compliance and release (2–4 weeks)
Tasks:
- Threat model and penetration test.
- Privacy/data map and retention review.
- Store disclosures, permissions declarations and screenshots.
- Crash, battery and OEM compatibility validation.
- Account deletion/export and support playbooks.
- Staged rollout and rollback plan.

Acceptance:
- No unresolved critical/high security findings.
- Data safety forms match actual data flows.
- Battery and reliability thresholds pass.
- Support can diagnose permission and OEM issues.

## 5. Test matrix

Android:
- Pixel/AOSP baseline.
- Samsung One UI.
- Xiaomi/Redmi HyperOS/MIUI variants.
- OnePlus OxygenOS.
- Vivo/Oppo variants.
- At least two supported API levels plus latest target API.
- Battery saver, app standby, reboot, force-stop, permission revocation, timezone changes, VPN conflict and low storage.

iOS:
- Entitlement-enabled test build.
- Entitlement-denied build.
- Personal authorization and guardian authorization.
- DeviceActivity extension lifecycle.
- FamilyActivityPicker selection changes.
- Shield configuration/action.
- App Group data migration.

## 6. Definition of done per feature

A feature is done only when:
1. PRD requirement has implementation and acceptance test.
2. Native capability/permission state is surfaced.
3. Offline behaviour is defined.
4. Security/privacy review is complete.
5. Analytics do not leak sensitive data.
6. Accessibility and localization pass.
7. Device compatibility is documented.
8. User-facing copy accurately describes limitations.
9. Error, degraded and recovery states exist.
10. Feature flag and rollback path exist for high-risk native functionality.

## 7. AI coding-agent instructions

When using an AI coding agent:
- Read PRD, TRD, DRD, DATABASE and this implementation plan before editing.
- Do not create mock native modules that report success without actual OS enforcement.
- Build one vertical slice at a time: permission → native adapter → local persistence → UI → tests.
- Never use a JavaScript timer as source of truth for background usage or alarms.
- Never request every permission at onboarding.
- Never add `QUERY_ALL_PACKAGES`, Accessibility, VPN or exact-alarm permissions without documenting necessity and store-policy review.
- Do not scrape arbitrary UI content or notification bodies.
- Keep Android and iOS capability differences explicit.
- Add tests and update docs with every native integration.
- If platform API cannot support a requirement, stop and document the limitation rather than inventing a workaround.

## 8. Release gates and rollback

- Feature flags for app-specific feed detection, VPN and family sync.
- Remote configuration may disable a broken experimental feature, but must not silently change local user restrictions.
- Native schema migrations must be backward-compatible or include a recovery path.
- Staged Play/App Store release.
- Rollback procedure includes backend compatibility, policy version and local data migration handling.
- Incident response for leaked data, unauthorized family access or broken emergency exits.

## 9. Initial sprint backlog

1. Repo bootstrap and Expo development build.
2. Capability contract and permission center.
3. SQLite schema v1 and migration tests.
4. Android UsageStats native module.
5. Usage sessionizer and unit tests.
6. Wellbeing dashboard.
7. App timer policy engine.
8. Doomscroll rule evaluator.
9. Accessibility disclosure and service spike.
10. App intervention prototype.
11. Launcher role prototype.
12. Alarm receiver prototype.
13. iOS Family Controls entitlement request.
14. Privacy/data inventory and store-policy review.
"""

# Write markdown sources and convert to DOCX for a polished, editable document pack.
for filename, content in docs.items():
    md_path = out / filename
    md_path.write_text(content, encoding="utf-8")
    docx_path = out / filename.replace(".md", ".docx")
    pypandoc.convert_text(
        content,
        to="docx",
        format="md",
        outputfile=str(docx_path),
        extra_args=["--standalone"]
    )

readme = """# NeuronNinja Documentation Pack

This package contains five implementation-oriented product and engineering documents.

1. PRD.md / PRD.docx — product scope, requirements, personas, priorities and acceptance criteria.
2. TRD.md / TRD.docx — Expo/Kotlin/Swift architecture, native APIs, permission model, backend and security.
3. DRD.md / DRD.docx — visual direction, navigation, screen specifications, components and accessibility.
4. DATABASE.md / DATABASE.docx — local SQLite schema, MongoDB collections, indexes, sync and retention.
5. IMPLEMENTATION.md / IMPLEMENTATION.docx — phased roadmap, repository structure, test matrix, release gates and AI-agent rules.

## Architecture summary
- Expo React Native + TypeScript for shared UI.
- Kotlin native modules/services for Android capabilities.
- Swift + FamilyControls, ManagedSettings and DeviceActivity extensions for iOS-supported restrictions.
- SQLite local-first enforcement and MongoDB for opt-in sync, family and community features.
- Android is the flagship platform; iOS is capability-adapted.

## Important implementation caveat
The complete product scope is specified, but not every feature is equally available on every platform. In particular, arbitrary app interception, launcher replacement, notification filtering, exact feed-level Reels/Shorts measurement and system-wide restrictions have OS, entitlement, manufacturer and app-store-policy constraints. The documents require honest capability states and fallbacks.

## Official technical references reviewed
- Expo Modules API: https://docs.expo.dev/modules/overview/
- Expo custom native code: https://docs.expo.dev/workflow/customizing/
- Android package visibility: https://developer.android.com/training/package-visibility/declaring
- Google Play sensitive API policy: https://support.google.com/googleplay/android-developer/answer/16558241
- Apple Screen Time frameworks: https://developer.apple.com/documentation/screentimeapidocumentation
- Apple Family Controls entitlement: https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement

