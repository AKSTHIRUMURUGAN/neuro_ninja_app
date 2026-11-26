# NeuronNinja Gamification, Kingdom Building & Friend Battles
**Document:** GAMIFICATION_AND_CASTLE_BATTLES.md  
**Version:** 1.0  
**Product:** NeuronNinja  
**Platform target:** Expo React Native + TypeScript, Android-first, iOS capability-adapted  
**Status:** Product and implementation blueprint

---

## 1. Product vision

NeuronNinja should turn the user's real-world progress into a living Ninja Kingdom.

The game is not a separate distraction. It is the visual reward layer for using the actual product:

- Completing habits and routines earns progress.
- Completing meaningful tasks earns resources and experience.
- Completing focus sessions powers construction and training.
- Respecting app limits and reducing doomscrolling strengthens the kingdom.
- Using app blocking as configured earns consistency rewards.
- Friends can visit, challenge, defend and cooperate.
- Daily and weekly villains create short, understandable goals.
- Castle upgrades, weapons, armour, profile levels and chests make progress visible.

**Core promise:** Build a stronger kingdom by building better real-life habits.

### Design principles

1. Real-world behaviour is the source of rewards; tapping game buttons alone must not mint meaningful rewards.
2. The game should encourage the user to leave the phone and complete real activities.
3. No punishment spiral: a missed day should not destroy the castle, delete progress or shame the user.
4. Competitive play should be fair, opt-in and based on comparable activity.
5. Social features must be safe: private by default, block/report controls, no public exposure of app usage.
6. The castle should be strategically interesting but simple enough for a productivity app.
7. Use original art, original characters and original game terminology. Do not reproduce Clash of Clans assets, UI, maps, character designs or proprietary systems.

---

## 2. Competitor benchmark and product decisions

This is a feature-pattern benchmark, not a claim that every competitor feature is available on every plan.

| Product | Observed pattern | Lesson for NeuronNinja |
|---|---|---|
| Clash of Clans | Village layout, resource buildings, upgrades, troop/defence progression, clan wars, friendly challenges and battle replays | Use a readable base grid, building levels, asynchronous attacks, defence layouts and replayable battle logs |
| Habitica | Habits, Dailies and To-Dos connect to XP, gold, equipment, quests, parties and challenges | Reward real task completion; add co-op boss encounters and shared challenges |
| Forest | Focus sessions visibly grow trees; group focus and progress history make attention tangible | Let focus minutes become construction energy and cooperative progress |
| Regain | Focus timer, app blocking, strict mode, study mode and group focus | Connect focus and blocker compliance to the reward engine |
| one sec | Mindful pause before opening distracting apps and a re-intervention for long sessions | Reward intentional pauses and successful exits from distraction loops |
| Finch | Small self-care goals give energy to a companion that grows and explores | Add a friendly Ninja companion that celebrates small wins without requiring long game sessions |

References:
- Habitica features: https://habitica.com/static/features
- Habitica task and stat FAQ: https://habitica.com/static/faq
- Clash of Clans Friendly Challenges: https://sc-clashofclans.zendesk.com/hc/en-us/articles/49529122407835-Friendly-Challenges
- Clash of Clans Clan Wars: https://sc-clashofclans.zendesk.com/hc/en-us/articles/49529139330203-Intro-to-Clan-Wars
- Forest: https://www.forestapp.cc/
- Regain: https://regainapp.ai/
- one sec: https://one-sec.app/
- Finch: https://finchcare.com/about-finch

### Product differentiation

NeuronNinja combines these ideas into one loop:

`Habit / Task / Focus / App-limit success -> verified activity event -> XP + resources -> build / train / craft -> castle defence or friend challenge`

A normal game often rewards time spent in the game. NeuronNinja should reward useful activity outside the game.

---

## 3. Core game loop

### 3.1 Daily loop

1. User opens the dashboard and sees today's missions.
2. User completes a habit, task, focus session or digital-wellbeing goal.
3. NeuronNinja records an eligible event.
4. Reward engine calculates XP, coins, wood, stone or energy.
5. User chooses whether to claim rewards now or later.
6. User spends resources on a building, weapon, wall or training queue.
7. A daily villain appears with a limited, achievable team or solo objective.
8. User sees a short progress recap and can leave the app.

### 3.2 Weekly loop

1. A weekly villain appears with a larger health pool and multiple phases.
2. Daily activity contributes a capped amount of damage/energy.
3. Friends or a small team can contribute to the same boss.
4. The weekly boss ends at a fixed localised reset time.
5. All eligible participants receive participation rewards; higher contribution may unlock cosmetics, not exclusive core productivity advantages.
6. A new weekly chapter starts with a new villain theme and story.

### 3.3 Progression loop

`Complete real activity -> earn XP -> level up profile -> unlock building tiers / weapon blueprints / cosmetic chests -> improve castle -> take part in friendly battles -> return to real-life goals`

The game should never require a user to spend 20 minutes in the castle to claim a reward. Most interactions should take 10–60 seconds.

---

## 4. Game identity and world

### Suggested theme

**World name:** The Focus Realm  
**Player identity:** Ninja Guardian  
**Home base:** Personal Ninja Castle  
**Companion:** Small Ninja spirit / pet  
**Enemy faction:** The Distraction Legion  
**Daily villain:** A rotating distraction creature  
**Weekly villain:** A larger boss with phases  
**Friend group:** Dojo / Alliance  
**Season:** Realm Chapter

Use an original visual language: warm parchment UI, modern neon accents, friendly ninja silhouettes, small readable isometric structures and expressive enemy designs. Avoid copying the exact Clash of Clans fantasy art style.

### Core screens

- Kingdom Home: castle, resource bar, player level, mission entry points.
- Profile: avatar, level, XP, title, equipment, badges and public/private controls.
- Missions: daily, weekly, seasonal and friend challenges.
- Inventory: weapons, armour, shields, building skins and chests.
- Building: construction queue, upgrade requirements and level previews.
- Battle: target castle, scouting, army selection, battle result and replay.
- Dojo: friend list, groups, team boss and challenge invitations.
- Battle Log: incoming attacks, outgoing attacks, defence result and replay.
- Settings: sound, reduced motion, social privacy, notifications and accessibility.

---

## 5. Connect every productivity feature to the game

All reward inputs must come from the actual NeuronNinja feature services. Do not let the game UI award arbitrary XP.

| NeuronNinja feature | Eligible event | Game result |
|---|---|---|
| Habit tracker | Habit completed within its schedule | XP + small coins |
| Daily routine | Routine completed | XP + energy |
| Task manager | Task completed; weighted by estimated effort and verified duration where possible | XP + wood/stone |
| Focus timer | Valid focus session completed | XP + construction energy |
| Pomodoro | Completed focus interval | XP; bonus for completed full cycle |
| App blocker | User-configured block session completed without bypass | XP + shield charge |
| App limits | Daily app budget respected | Consistency bonus |
| Doomscroll guard | Long session interrupted / intentional exit | Small mindful-action reward |
| Mindful opening | User completes breathing/purpose prompt | Small XP |
| Website guardian | Valid focus allowlist session completed | Focus energy |
| Sleep/routine | User completes chosen wind-down routine | Rest bonus; never infer sleep quality |
| Alarm mission | Alarm challenge completed | Routine XP |
| Brain game | Daily short challenge completed | Skill token; capped |
| Calendar/time block | Planned block completed | XP |
| Friend focus room | Valid shared session completed | Team energy |

### Important event rules

- Do not reward simply opening the app, repeatedly tapping a button or leaving the castle screen open.
- Do not reward raw screen time.
- Do not treat an app crash or missing telemetry as a user failure.
- App usage detection is approximate on some platforms. Use clear labels such as "estimated focus session" when necessary.
- Do not penalise the user for emergency calls, accessibility tools, navigation, work apps or allowlisted exceptions.
- Reward the user's selected goals, not a universal definition of productivity.

---

## 6. Daily missions, weekly villains and seasonal events

### 6.1 Daily missions

Generate 3–5 optional missions per day. Keep them achievable and personalised.

Examples:
- Complete 2 selected habits.
- Finish one priority task.
- Complete one 25-minute focus session.
- Stay within the user's chosen social-app budget.
- Complete a bedtime wind-down routine.
- Complete a mindful pause before opening a selected app.

Each mission has:
- `missionId`
- title and short description
- category
- difficulty
- target metric
- progress
- reward bundle
- start/end time
- completion status
- eligibility rules
- source event IDs

Daily mission design:
- 1 easy mission, 1 medium mission and 1 optional stretch mission.
- User can replace a mission a limited number of times.
- Avoid demanding every category every day.
- No streak reset punishment.
- Provide a "rest day" or reduced mission option.

### 6.2 Daily villain

A daily villain is a small boss with a health bar and a short narrative.

Examples:
- Scroll Hydra: defeated by mindful exits and respecting app budgets.
- Procrastination Slime: defeated by completing priority tasks.
- Distraction Wisp: defeated by focus sessions.
- Snooze Goblin: defeated by completing a chosen morning routine.
- Clutter Golem: defeated by finishing small tasks and organising the day.

Mechanic:
- The user does not need to perform a separate repetitive battle.
- Eligible real-life events generate boss damage.
- A short attack animation plays when the event is confirmed.
- Daily villain HP is scaled to the user's selected activity level.
- Boss can be defeated solo or with a friend group.
- If not defeated, it escapes at reset; no lost resources or broken streak.

### 6.3 Weekly villain

Weekly villains should have 3 phases:
1. Armour phase: requires a mix of habits and tasks.
2. Shield phase: requires focus sessions or app-limit success.
3. Final phase: team contributions and a weekly goal.

Example weekly boss:
- **The Infinite Scroller**
  - Phase 1: Complete 5 mindful pauses.
  - Phase 2: Complete 3 focus sessions.
  - Phase 3: Keep within the selected app budget on 3 days.
- **The Chaos Titan**
  - Phase 1: Finish 3 priority tasks.
  - Phase 2: Complete 2 routines.
  - Phase 3: Finish one weekly review.

Avoid making one behaviour the only route to victory. Offer alternate objectives for users whose goals differ.

### 6.4 Weekly reset

- Use server-authoritative UTC timestamps with a user's IANA time zone for display and local reset boundaries.
- Store season and challenge start/end timestamps.
- Prevent double rewards around daylight-saving changes and offline sync.
- Do not erase unclaimed permanent rewards.
- Grace period: allow a user to claim completed rewards for a short period after reset.

---

## 7. Player profile, XP and level-up logic

### 7.1 Profile attributes

- Player level
- Current XP
- Lifetime XP
- Rank/title
- Avatar and cosmetic skin
- Selected weapon and armour
- Castle level
- Achievement badges
- Streak indicators (optional and non-punitive)
- Dojo membership
- Privacy settings

### 7.2 XP model

Use a simple, explainable reward system first. Tune it with real usage data.

Suggested starting values:

| Activity | Base XP |
|---|---:|
| Small habit | 5 |
| Medium habit | 10 |
| Difficult habit | 15 |
| Small task | 8 |
| Medium task | 15 |
| Large task | 25 |
| Completed 15-minute focus session | 10 |
| Completed 25-minute focus session | 18 |
| Completed 50-minute focus session | 32 |
| Daily mission completion | 10–25 |
| Weekly mission completion | 30–60 |
| Friend/team contribution | 5–15 |

Rules:
- XP should be awarded once per source event.
- A task's difficulty is selected by the user or configured by task template, not inferred from task title.
- Focus XP is capped per day to prevent idle timers or farming.
- Habit repeats have per-habit limits.
- Reversing a task completion should create a compensating ledger entry; do not silently delete history.
- Add diminishing returns for repetitive micro-events.
- XP should not depend on money spent.

### 7.3 Level curve

Suggested starting curve:

`XP required for next level = round(100 + 25 * currentLevel + 5 * currentLevel^1.35)`

This creates a gradually increasing requirement without making early progress too slow. Tune using retention and completion data.

Keep:
- `totalXpEarned` as lifetime earned XP.
- `currentLevel` derived from lifetime XP or updated atomically.
- `xpIntoCurrentLevel` and `xpToNextLevel` for display.
- Level thresholds versioned so future balancing changes do not corrupt old profiles.

### 7.4 Level-up rewards

Every level:
- XP level-up animation
- small coin reward
- title or profile progress indicator at milestones

Milestone levels:
- unlock a new building tier
- unlock a weapon blueprint
- unlock a castle decoration set
- unlock a profile frame or avatar cosmetic
- unlock a new villain chapter

Do not give permanent combat advantages only to users who pay. Paid cosmetics can be offered, but core progression must remain fair.

---

## 8. Resource economy

Start with four resources:

| Resource | Earned from | Spent on |
|---|---|---|
| Gold | Tasks, habits, missions | Building upgrades, cosmetic shop |
| Wood | Focus sessions, routines | Walls, training structures |
| Stone | Weekly missions, larger tasks | Defensive structures, castle upgrades |
| Energy | Focus and team activities | Boss attacks, training and special actions |

Optional later:
- **Ninja Tokens:** earned from milestones; used for rare blueprints/cosmetics.
- **Essence:** seasonal currency; expires only if clearly disclosed and not purchasable.

Economy rules:
- Resource caps prevent unlimited farming.
- No loot boxes purchased with real money in the MVP.
- Chests earned through progress should show possible contents and drop rates.
- Duplicate cosmetics convert to a clearly disclosed cosmetic currency.
- Keep resource balances server-authoritative after account sync.
- Every balance change must have an immutable ledger record.

### Chest types

- Daily Mission Chest: common resources and a small chance of a cosmetic.
- Weekly Boss Chest: higher cosmetic/blueprint chance.
- Level-Up Chest: guaranteed milestone reward.
- Friend Challenge Chest: participation-based reward.
- Seasonal Chest: cosmetic collection.

Use transparent reward tables. Do not use manipulative near-miss effects or paid randomised rewards.

---

## 9. Castle building system

### 9.1 MVP map

Use a small 2D/isometric tile grid rather than full 3D.

Recommended MVP:
- 9 x 9 or 10 x 10 tile board.
- Fixed building footprints.
- Tap building to view details.
- Drag-and-drop placement can be added after basic placement is stable.
- Snap-to-grid placement.
- No pathfinding requirement in the first release.
- Castle scene should render as a static scene with small animated elements (flags, fire, water, clouds).

### 9.2 Buildings and functions

| Building | Purpose | Upgrade effect |
|---|---|---|
| Ninja Keep | Main castle and level gate | Unlocks building tiers and map size |
| Focus Dojo | Converts focus milestones into training capacity | More training slots / cosmetic dojo themes |
| Habit Shrine | Tracks habit milestones | Extra mission slot or small resource capacity |
| Task Workshop | Task completion progression | Crafting queue and blueprint access |
| Watchtower | Defence and scouting | Better battle information |
| Archer Tower | Defensive damage | Adds defensive attack points |
| Wall | Protects buildings | Adds durability and layout strategy |
| Resource Store | Holds gold/wood/stone | Raises resource cap |
| Training Yard | Trains defensive/attack units | Unlocks unit types |
| Library | Weekly boss and learning missions | Mission variety and lore |
| Pet Sanctuary | Companion cosmetics | Companion animations |
| Healing Garden | Recovery and rest theme | Cosmetic/rest bonus; no punishment recovery loop |

### 9.3 Building upgrade requirements

Each building upgrade requires:
- Current building level
- Required keep/castle level
- Resource cost
- Optional mission milestone
- Upgrade duration (keep short in the MVP; avoid real-time waiting as a paywall)

Example cost curve:
`cost(level) = baseCost * 1.55^(level - 1)`

Do not make the economy grindy. A user should see meaningful progress from ordinary daily use.

### 9.4 Construction state machine

`locked -> available -> queued -> upgrading -> completed`

Rules:
- Server validates cost and level requirements.
- Deduct resources in one transaction.
- Idempotency key prevents double-spend.
- On completion, update building level exactly once.
- Offline completion is reconciled with server time.
- If upgrade duration is used, it must not require the user to open the game repeatedly.
- Use a local optimistic progress display, but the server is authoritative.

### 9.5 Castle customisation

- Wall patterns
- Roof styles
- Banners
- Garden decorations
- Seasonal decorations
- Castle background / biome
- Companion placement
- Player nameplate

Cosmetics should be the primary monetisation path, not pay-to-win stats.

---

## 10. Weapons, armour and training

### 10.1 Equipment categories

Weapons:
- Wooden Katana
- Focus Blade
- Wind Kunai
- Stone Hammer
- Shadow Bow
- Light Staff

Armour:
- Starter Gi
- Focus Robe
- Guardian Armour
- Stoneplate
- Wind Cloak

Defence items:
- Shield
- Trap
- Barrier
- Healing Totem

These are original placeholder names. Final names and art need a brand/IP review.

### 10.2 Stats

Keep the first system simple:
- Attack Power
- Defence Power
- Durability / HP
- Speed (optional)
- Special Ability (one per item)

Equipment should mostly add small tactical variety. It must not overpower real-life activity or create a pay-to-win system.

### 10.3 Crafting

1. User earns a blueprint from a mission, boss or level milestone.
2. User spends resources to craft.
3. Server validates the recipe and inventory.
4. Item is added once to inventory.
5. User equips it.
6. Equipment stats are snapshotted at battle start.

### 10.4 Training

Training units can be abstract and lightweight:
- Scout
- Guardian
- Archer
- Shield Bearer
- Healer

Units are not real-time troops that require long waiting. Train them using earned resources and mission progress. Keep a small army capacity tied to castle level.

---

## 11. Two-castle friend battles

This is the signature social feature.

### 11.1 Friend castle model

Each player owns one castle. A friend can:
- Visit the castle.
- Send a friendly challenge.
- Scout the public defence layout.
- Choose an attack squad.
- Launch an asynchronous attack.
- Watch a generated battle replay.
- Send a rematch.
- Give a non-monetary reaction or encouragement.

Default privacy:
- Castle is private until the user enables friend visibility.
- Show player level and castle layout only if permitted.
- Never expose detailed app usage, installed apps, blocked apps, task titles, health data or screen-time history to friends.
- Friend requests require acceptance.
- Users can block/report and leave a dojo.

### 11.2 Friendly challenge

Friendly challenge should be the first battle mode:
- No permanent resource theft.
- No profile XP loss.
- No damaging real castle buildings permanently.
- Results are for fun, skill rating and small capped participation rewards.
- Defender can set a challenge expiry and choose a saved layout.
- Attacker can scout before selecting a squad.
- Both players receive the result and replay.

This follows the useful pattern in Clash of Clans Friendly Challenges: the defender initiates a challenge, the attacker scouts and attacks, and the result can be watched/replayed. NeuronNinja should simplify this and avoid resource loss. Reference: https://sc-clashofclans.zendesk.com/hc/en-us/articles/49529122407835-Friendly-Challenges

### 11.3 Battle modes

**Mode A — Friendly Duel (MVP)**
- Asynchronous attack against a saved defence snapshot.
- No permanent loss.
- One attack per challenge.
- Battle report and replay.

**Mode B — Weekly Dojo War (Phase 2)**
- Small teams compete in a 24–48 hour event.
- Members opt in.
- Each member gets limited attempts.
- Score by objective completion and battle stars.
- Rewards for participation and team effort.

**Mode C — Ranked Castle Arena (Phase 3)**
- Optional skill rating.
- Match similar castle levels and defence strength.
- Use a seasonal rating reset.
- No ranking based on screen time or raw number of app opens.

### 11.4 Battle scoring

Use a deterministic server-side simulation rather than real-time peer-to-peer combat.

Example battle result:
- 1 star: reach the main keep / complete the primary objective.
- 2 stars: destroy or disable 50% of defensive structures.
- 3 stars: complete the full objective or reach 75% destruction with the keep secured.

Tune the exact thresholds after playtesting.

The server stores:
- Attacker loadout snapshot
- Defender layout snapshot
- Ruleset version
- Random seed
- Action/event sequence
- Damage and destruction results
- Final score
- Replay version

This makes results reproducible and prevents the client from claiming a win.

### 11.5 Combat resolution logic

For each battle tick:
1. Load the immutable defender layout snapshot.
2. Load the attacker's approved squad snapshot.
3. Validate unit capacity and equipment.
4. Determine target priorities.
5. Resolve movement/target selection deterministically.
6. Apply attack cooldown and damage.
7. Apply defence damage and special effects.
8. Record each event.
9. Stop when time, objective or unit conditions are met.
10. Calculate stars and rewards on the server.

Simplified damage:
`damage = max(1, attackerPower * skillMultiplier - defenderArmour)`

Use a seeded pseudo-random generator for bounded variation, not client-provided randomness. Record the seed and ruleset version.

### 11.6 Anti-cheat

- Client sends player intent, not final score.
- Server owns XP, resource balances, equipment stats, battle outcome and reward claims.
- Validate event source IDs and idempotency.
- Rate-limit battle creation and reward claims.
- Detect impossible event frequency.
- Prevent repeated reward farming with daily caps.
- Use a battle ruleset version so old replays remain valid.
- Keep audit records for resource changes and moderation actions.

### 11.7 Battle replay

A replay is a sequence of compact events:
- `unit_spawned`
- `unit_moved`
- `target_selected`
- `attack_started`
- `damage_applied`
- `building_destroyed`
- `special_ability`
- `battle_finished`

The client animates these events. Do not store a full video for every battle in the MVP.

---

## 12. Villain and castle attack logic

### 12.1 Boss data

Each villain definition contains:
- id
- name
- art/sprite reference
- narrative
- difficulty tier
- max HP
- phases
- eligible event categories
- reward table
- start/end schedule
- ruleset version

### 12.2 Convert activity into boss damage

Example:
- Complete a focus session: 10 damage.
- Complete a selected habit: 5 damage.
- Finish a priority task: 12 damage.
- Complete a mindful pause: 3 damage.
- Respect a daily app budget: 8 damage.

Use a per-day contribution cap and per-source idempotency. Do not expose a user's detailed app activity to teammates.

### 12.3 Team boss fairness

- Every participant gets a contribution target appropriate to their chosen goals.
- Reward participation even if the boss is not defeated.
- Give cosmetic bonus tiers for higher contributions.
- Do not shame users or damage their profile for missing a day.
- Provide accessible alternatives for users with different schedules and abilities.

---

## 13. Animation system: how to create level-ups, attacks and building effects

### 13.1 Recommended technology

For Expo React Native:
- **React Native Reanimated:** transitions, progress bars, button feedback, screen choreography and gesture-driven UI.
- **React Native Skia:** 2D canvas, sprites, particles, hit flashes, simple projectile paths and castle scene rendering.
- **Rive:** interactive character/companion state machines where designer-authored animation is valuable; check runtime and asset licensing for the chosen plan.
- **Lottie:** lightweight one-shot effects such as level-up bursts, reward reveal and badge celebration.
- **expo-audio:** sound playback and audio controls; verify the Expo SDK version used by the project.

Official references:
- Expo animation guide: https://docs.expo.dev/develop/user-interface/animation/
- Reanimated: https://docs.swmansion.com/react-native-reanimated/
- React Native Skia: https://shopify.github.io/react-native-skia/
- Rive: https://rive.app/
- Lottie React Native: https://github.com/lottie-react-native/lottie-react-native
- Expo Audio: https://docs.expo.dev/versions/latest/sdk/audio/

### 13.2 Architecture recommendation

Use a hybrid animation architecture:
- Reanimated for UI.
- Skia for the castle and battle canvas.
- Rive for the Ninja companion and boss idle/attack states.
- Lottie only for small authored celebration sequences.
- Do not build the entire game in a heavyweight game engine for the first release.

### 13.3 Level-up animation sequence

Suggested 2.5–3.5 second sequence:
1. Freeze reward panel interaction briefly.
2. Dim background with a subtle overlay.
3. Player badge scales from 0.85 to 1.0.
4. XP ring completes with a glow.
5. Particle burst and short sound cue.
6. Level number flips/morphs.
7. New reward chest appears if a milestone is reached.
8. Show "Continue" / "View reward".
9. Respect reduced-motion settings: replace particles and zoom with a simple fade and text update.

Animation is cosmetic. The server must award the level before the animation begins. Never make a reward depend on the animation finishing.

### 13.4 Attack animation sequence

For a 2D battle:
1. Show castle and defender layout.
2. Spawn attacker units from an entry point.
3. Move units along deterministic waypoint paths.
4. Highlight the selected target.
5. Play attack wind-up.
6. Spawn projectile / slash effect.
7. Play impact particles and hit flash.
8. Update building HP bar.
9. Play destruction animation when HP reaches zero.
10. Show star/result banner.

Use short animation durations and cap particles on lower-end Android devices.

### 13.5 Building upgrade animation

1. Show building selected.
2. Play small construction dust effect.
3. Overlay scaffold/upgrade progress.
4. On completion, transition old sprite to new sprite.
5. Play a small sparkle and completion sound.
6. Update building level label.

### 13.6 Animation asset pipeline

- Keep source art in layered SVG/PSD/Krita files where possible.
- Export sprite sheets in consistent cell dimensions.
- Use transparent PNG/WebP for sprites.
- Use vector assets for UI icons.
- Use JSON/Lottie or Rive source files for animation.
- Keep a manifest linking each asset to its source, author, licence and checksum.
- Use texture atlases for related sprites to reduce draw calls.
- Create light and dark theme variants only when necessary.
- Test animation at 60 FPS on mid-range Android and under battery saver.
- Add a global reduced-motion option.

### 13.7 Suggested first animation inventory

| Animation | MVP? | Implementation |
|---|---|---|
| Button tap / resource collect | Yes | Reanimated |
| XP progress fill | Yes | Reanimated |
| Level-up burst | Yes | Lottie or Skia |
| Chest opening | Yes | Rive or Lottie |
| Ninja companion idle | Yes | Rive |
| Building upgrade | Yes | Skia sprite transition |
| Basic attack / hit | Yes | Skia |
| Projectile trail | Yes | Skia |
| Boss intro | Later | Rive/Lottie |
| Full cinematic battle | No | Avoid in MVP |

---

## 14. Free and open-licensed art, sound and animation assets

"Free download" does not automatically mean open source or commercially reusable. Review the licence for each downloaded file and keep proof of the licence.

### 14.1 Recommended asset sources

| Source | Best for | Licence / caution | Link |
|---|---|---|---|
| Kenney | UI, 2D/3D packs, RPG sprites, interface sounds, impact sounds, music jingles | Many packs are CC0; verify the included licence for each pack | https://kenney.nl/assets |
| OpenGameArt | Pixel art, tilesets, characters, backgrounds, music and SFX | Mixed licences; check every asset. Avoid non-commercial assets for a commercial app | https://opengameart.org/ |
| Freesound | Specific sound effects and ambience | Per-file licence; use CC0 or CC-BY only if attribution is acceptable. Avoid NC assets | https://freesound.org/ |
| Sonniss GDC Audio | Large professional sound-effect libraries | Check the current bundle's licence and restrictions; do not redistribute the raw library as an asset pack | https://sonniss.com/gameaudiogdc |
| Pixabay Sound Effects | General UI and environment sounds | Custom Pixabay licence; review terms for app redistribution and standalone asset use | https://pixabay.com/sound-effects/ |
| Mixkit | Short effects and music | Custom licence; verify allowed use for mobile apps and redistribution | https://mixkit.co/free-sound-effects/ |
| Rive Community | Interactive character and UI animations | Asset-level licence and account terms apply; do not assume every community file is open source | https://rive.app/community/ |
| LottieFiles | Reward bursts, transitions, icons and celebration animations | Check each animation's licence; attribution or paid licence may be required | https://lottiefiles.com/ |
| Game-icons.net | Weapons, shields, castles and UI icon concepts | Check the site's CC BY 3.0 attribution requirements | https://game-icons.net/ |
| itch.io game assets | Pixel-art packs, tilesets and UI | Each creator sets a licence; inspect before use | https://itch.io/game-assets/free |

### 14.2 Suggested starter packs

Start with Kenney packs for:
- Interface Sounds
- UI Audio
- RPG Audio
- Impact Sounds
- Roguelike/RPG Pack
- Tiny Town
- UI Pack

Kenney's catalogue is a strong first stop because many packs use CC0. Still retain the exact downloaded pack's `License.txt` or licence page evidence.

### 14.3 Audio design map

| Event | Sound |
|---|---|
| Button press | Soft click |
| Resource collect | Short coin/wood pickup |
| XP gain | Warm rising chime |
| Level up | Short triumphant sting |
| Chest open | Latch + sparkle |
| Building upgrade | Hammer / construction cue |
| Weapon swing | Short whoosh |
| Hit | Soft impact |
| Building destroyed | Controlled crumble |
| Boss intro | Low short impact + theme sting |
| Boss defeated | Positive victory sting |
| Battle loss | Gentle neutral cue; never humiliating |
| Notification | Quiet optional tone |

Audio rules:
- Sound is off or conservative by default until user chooses.
- Provide separate music and effects volume controls.
- Avoid loud surprise sounds.
- Never autoplay long music after the user leaves a focus session.
- Respect device silent mode where platform behaviour allows.
- Preload only small critical sounds.
- Use compressed OGG/Opus/AAC as supported by the selected runtime and platform.
- Keep sound assets local for low latency.
- Add a mute button on every game screen.

### 14.4 Asset licence governance

Create `assets/game/ASSET_LICENSES.md` and `assets/game/manifest.json`.

Each asset record should include:
- local file path
- asset name
- source URL
- author
- licence identifier / terms URL
- date downloaded
- attribution text if required
- checksum
- commercial-use status
- modification permission
- redistribution restrictions

Reject:
- CC BY-NC for commercial product assets.
- Assets with unclear ownership.
- Random images found in search results.
- ripped Clash of Clans / other game sprites, sounds, maps or UI.
- AI-generated assets that imitate a protected character or recognisable game's exact art.

---

## 15. Technical architecture

### 15.1 Client architecture

Suggested feature modules:

```text
apps/mobile/src/features/game/
  kingdom/
  profile/
  progression/
  missions/
  villains/
  inventory/
  buildings/
  castle-layout/
  equipment/
  battle/
  replay/
  friends/
  dojo/
  leaderboard/
  audio/
  animation/
  assets/
  services/
  state/
  types/
```

Use shared UI components and feature-level state. Keep game calculations in a pure domain package that can be unit tested.

### 15.2 Backend services

```text
services/api/src/modules/game/
  profile/
  reward-engine/
  xp/
  economy/
  inventory/
  missions/
  villains/
  castle/
  buildings/
  battles/
  replays/
  friends/
  dojo/
  leaderboard/
  anti-cheat/
  audit/
```

The reward engine consumes verified product events. It should not accept arbitrary `awardXp` requests from the mobile client.

### 15.3 Event pipeline

```text
Habit / Task / Focus / Blocker / Routine service
                 |
                 v
          Product event outbox
                 |
                 v
          Game event consumer
                 |
        eligibility + dedupe
                 |
                 v
         Reward calculation
                 |
      XP / resource ledger write
                 |
                 v
          Profile + missions
                 |
                 v
        Local UI animation event
```

Use an outbox or reliable event queue so a completed task is not lost if the game service is temporarily unavailable.

### 15.4 Suggested MongoDB collections

| Collection | Purpose |
|---|---|
| `gameProfiles` | Player level, XP, selected cosmetics and preferences |
| `gameWallets` | Current resource balances |
| `gameLedger` | Immutable XP/resource transactions |
| `gameEvents` | Source product events consumed by the reward engine |
| `gameMissions` | Daily/weekly/seasonal mission instances |
| `villainInstances` | Active boss and phase progress |
| `villainContributions` | Per-player boss contributions |
| `castles` | Castle owner, layout version and visibility |
| `castleBuildings` | Building instances, levels and positions |
| `buildingUpgrades` | Upgrade queue/state |
| `inventoryItems` | Weapons, armour, cosmetics and blueprints |
| `equipmentDefinitions` | Versioned item templates and stats |
| `battleChallenges` | Challenge invitations and status |
| `battleSnapshots` | Immutable attacker/defender snapshots |
| `battleResults` | Server-calculated result |
| `battleReplayEvents` | Replay sequence |
| `friendships` | Accepted friend relationships |
| `dojoGroups` | Group membership and settings |
| `gameSeasons` | Seasonal rules and reward definitions |
| `assetManifest` | Source and licence metadata |
| `gameAuditLogs` | Sensitive reward/economy/moderation events |

### 15.5 Important indexes

- Unique `(userId)` on `gameProfiles`.
- Unique `(userId, sourceEventId, rewardType)` on reward dedupe.
- `(userId, createdAt)` on `gameLedger`.
- `(status, endsAt)` on active missions and villains.
- `(ownerId, updatedAt)` on castles.
- `(challengeId, createdAt)` on battle events.
- Unique friendship pair after normalising user IDs.
- TTL only for ephemeral invitations or short-lived cache documents; never TTL-delete the financial/economy ledger.

### 15.6 Transaction requirements

Use MongoDB transactions for:
- spending resources and creating an upgrade;
- crafting an item and deducting its recipe cost;
- claiming a chest and writing its contents;
- awarding XP/resources and marking a source event as processed;
- finalising battle rewards.

If transactions are unavailable in the chosen deployment, design an idempotent saga with compensating entries. Do not rely on multiple unrelated writes being atomic.

---

## 16. API outline

All endpoints require authentication, input validation and server-side ownership checks.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/game/profile` | Get player profile |
| GET | `/game/kingdom` | Get castle, buildings and resources |
| GET | `/game/missions/today` | Get daily missions |
| POST | `/game/missions/:id/claim` | Claim completed mission |
| GET | `/game/villains/active` | Get active daily/weekly bosses |
| GET | `/game/inventory` | Get equipment and cosmetics |
| POST | `/game/equipment/equip` | Equip owned item |
| POST | `/game/buildings/:id/upgrade` | Start upgrade |
| POST | `/game/castle/layout` | Save a castle layout version |
| POST | `/game/friends/invite` | Send friend invite |
| POST | `/game/challenges` | Create friendly challenge |
| POST | `/game/challenges/:id/attack` | Submit attack intent/loadout |
| GET | `/game/battles/:id/replay` | Fetch replay event sequence |
| GET | `/game/battle-log` | Get incoming/outgoing battles |
| POST | `/game/dojo/join` | Join a dojo with invite |
| GET | `/game/leaderboards/:period` | Get opt-in leaderboard |

The client must never submit final XP, resource balances, item ownership, building level, battle stars or damage totals as trusted values.

---

## 17. Privacy, safety and ethical gamification

- Friends must not see which apps a user has installed or blocked.
- Friends must not see private task titles, screen-time breakdowns or sleep details.
- Leaderboards should show game points or focus-session totals only when the user opts in.
- Avoid public rankings by total screen time or number of app launches.
- Allow private mode, mute, block and report.
- Use age-appropriate defaults; consider a restricted social mode for younger users.
- Do not create public chat in the MVP. Use preset reactions and safe challenge messages first.
- No loot boxes sold for real money in the MVP.
- No paid power advantage.
- No loss of permanent resources when a user misses a habit.
- No punishment for turning off app blocking or taking a rest day.
- Never use guilt-based copy such as "you failed your team" or "your castle is dying because of you".
- Add quiet hours and notification controls.
- Add reduced motion and sound controls.
- Explain what data contributes to a reward and how it is verified.
- Allow users to delete their social/game profile separately from core productivity records, subject to legal retention requirements.

---

## 18. Analytics and balancing

Measure:
- Percentage of eligible real-life events that produce a reward.
- Reward event deduplication rate.
- Average time to first level-up.
- Mission completion distribution.
- Resource inflation and spending.
- Building upgrade completion rate.
- Friendly challenge acceptance rate.
- Battle completion and replay views.
- Weekly boss participation.
- Friend invite acceptance.
- Crash rate and animation frame rate.
- User-reported pressure or notification fatigue.

Do not optimise solely for game session duration. A successful user may spend less time inside NeuronNinja because they are completing their work.

Balancing guardrails:
- First level-up should arrive quickly enough to explain the loop.
- Early castle upgrades should be achievable within a few days of normal use.
- No resource should become permanently blocked by a missed week.
- Daily caps should prevent abuse without punishing genuine high productivity.
- Test economy simulations before changing reward values.

---

## 19. Development roadmap

### Phase 0 — Game foundation (1–2 weeks)
- Define original art direction and naming.
- Create reward event schema and ledger.
- Create game profile and XP calculator.
- Add asset licence manifest.
- Build static castle screen mock.
- Add reduced-motion/audio settings.

### Phase 1 — MVP progression (2–4 weeks)
- XP and level-up.
- Gold/wood/stone/energy wallet.
- Daily missions.
- Daily villain.
- Profile, level badges and reward chest.
- Connect habits, tasks and focus timer.
- Add basic sounds and animations.

### Phase 2 — Castle building (3–5 weeks)
- Grid-based castle.
- Keep, Dojo, Workshop, Watchtower, walls.
- Building placement.
- Upgrade costs and state machine.
- Inventory and equipment.
- Construction animation.

### Phase 3 — Battle simulation (3–5 weeks)
- Training yard and small squad.
- Defender layout snapshot.
- Deterministic server battle engine.
- Friendly challenge invitation.
- Attack result and battle replay.
- Battle log and rematch.

### Phase 4 — Social and weekly events (3–5 weeks)
- Friend requests and privacy controls.
- Dojo groups.
- Weekly villain co-op.
- Weekly castle challenge.
- Opt-in leaderboard.
- Moderation and reporting.

### Phase 5 — Polish and expansion
- Seasonal chapters.
- Additional castle skins and building tiers.
- Advanced boss phases.
- Better companion animation.
- Ranked arena only after fair matchmaking data exists.
- Optional community-created challenges with moderation.

**Recommended order:** do not build live multiplayer or real-time PvP first. An asynchronous, server-resolved battle is cheaper, easier to test, easier to replay and more reliable on mobile networks.

---

## 20. MVP acceptance criteria

The first public gamification release is ready when:

- [ ] Habit completion produces exactly one reward.
- [ ] Task completion produces exactly one reward.
- [ ] Focus session produces reward only after valid completion.
- [ ] XP, level and resource balances are server-authoritative.
- [ ] Reward ledger is immutable and auditable.
- [ ] Daily missions reset correctly in the user's time zone.
- [ ] Daily villain progress is derived from eligible events.
- [ ] User can level up and open an earned chest.
- [ ] User can upgrade at least three building types.
- [ ] User can equip at least one weapon and one armour item.
- [ ] Castle layout is saved and restored after reinstall/login.
- [ ] Animation works on a mid-range Android device.
- [ ] Reduced-motion and mute settings work.
- [ ] No reward can be claimed twice through retries.
- [ ] Private app usage and task details are never shown to friends.
- [ ] Battle results are calculated on the server.
- [ ] A friendly challenge can be accepted, attacked and replayed.
- [ ] Asset licences and attributions are recorded.
- [ ] No copyrighted competitor assets are present.

---

## 21. Final implementation recommendation

Build the game as a **2D asynchronous castle strategy layer**, not a full Clash of Clans clone and not a real-time 3D game.

The first release should prove one complete loop:

`Complete a real habit or focus session -> earn XP/resources -> level up -> upgrade a building -> fight a daily villain`

Then add:

`Build castle -> invite friend -> challenge friend -> server resolves attack -> watch replay`

This sequence keeps the product achievable, ties the game to NeuronNinja's actual purpose and gives you a distinctive feature competitors in the app-blocking space do not usually combine into one system.
NeuronNinja – Gamification & Castle Battle System
I would make this a game layer across the entire NeuronNinja app, not a separate mini-game. Habits, completed tasks, focus sessions, reduced scrolling, app-lock compliance and routines should all contribute to a player's progression.

The central concept:

Your real-life actions power your Ninja Kingdom. Complete habits and tasks to earn resources, build your castle, train weapons, defeat villains, level up and challenge friends.

The castle-building system can take inspiration from Clash of Clans, but NeuronNinja should have its own mechanics, art direction and progression system. The goal is to reward healthy digital behaviour—not encourage users to spend more time inside the app.
1. Competitor lessons: what to borrow and what to improve
Competitor	Their core mechanic	NeuronNinja opportunity
Clash of Clans	Build a village, upgrade defenses, train troops, attack bases, join clans and use friendly challenges	Two-player castle building, asynchronous attacks, defensive layouts and battle replays
Habitica	Habits, daily tasks and to-dos award XP, gold, equipment and quests; friends can fight bosses together	Make real habits and app-control achievements generate castle resources and team attacks
Forest	Focus sessions grow trees; friends can focus together and build shared progress	Turn completed focus sessions into visible castle construction and cooperative missions
Regain	App blocking, focus timers, strict mode, study mode and multiplayer focus groups	Connect distraction-free time and app-lock compliance directly to game progression
one sec	Adds a mindful pause before opening distracting apps and interrupts doomscrolling	Reward intentional app exits, reduced reopens and successful mindful pauses

Habitica is especially relevant because it connects task completion to XP, gold, equipment and cooperative boss quests. 
Gamify Your Life+2
 Forest demonstrates how a focus session can become a visual growth experience, including group focus. 
Apps on Google Play+1
 Regain and one sec show how blocking and mindful friction can become part of the core product rather than an unrelated utility. 
Study Timer for Focus+1


My recommendation: use Clash of Clans as the inspiration for the castle and battle loop, Habitica for the productivity-to-reward connection, and Forest/Regain for focus accountability. Do not copy their art, names, maps, characters, interfaces or proprietary assets.
2. Recommended game mechanics










Personal Ninja Kingdom

Each player owns a castle, upgrades buildings, collects weapons, customises their layout and develops their profile.













Daily and weekly villains

Daily bosses reward small actions. Weekly bosses have multiple phases and can be defeated with friends.













Castle building and attacks

Build defensive structures, train units, challenge a friend's castle, attack and watch the replay.













Profile, weapons and chests

Earn XP, level up, unlock equipment, receive milestone chests and collect original cosmetics.



3. How the game should work technically
I recommend starting with 2D isometric castle graphics and asynchronous battles, rather than attempting a complete real-time Clash of Clans-style game immediately.
- Reanimated: UI transitions, XP bars, button interactions.
- React Native Skia: castle rendering, projectiles, hit effects and battle animations.
- Rive: animated Ninja companion, villains and interactive characters.
- Lottie: level-up and chest-opening celebrations.
- Expo Audio: sound effects and background music.
For assets, start with Kenney packs. They provide useful UI, RPG, impact and audio resources, with many packs under CC0. OpenGameArt and Freesound have mixed licences, so check each asset individually. 
GitHub+2
