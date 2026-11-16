import type * as SQLite from 'expo-sqlite';

export const CURRENT_DB_VERSION = 6;

const SCHEMA_V1 = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS task_lists (
  list_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10B981',
  icon TEXT NOT NULL DEFAULT 'format-list-bulleted',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inbox',
  priority TEXT NOT NULL DEFAULT 'normal',
  list_id TEXT,
  parent_task_id TEXT,
  due_at_utc TEXT,
  due_local TEXT,
  timezone_id TEXT,
  estimated_minutes INTEGER,
  completed_at TEXT,
  recurrence_json TEXT,
  show_countdown INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_at_utc);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL,
  PRIMARY KEY(task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS task_reminders (
  reminder_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  trigger_at_utc TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  native_notification_id TEXT,
  state TEXT NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS calendar_blocks (
  block_id TEXT PRIMARY KEY,
  task_id TEXT,
  title TEXT NOT NULL,
  notes TEXT,
  start_at_utc TEXT NOT NULL,
  end_at_utc TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10B981',
  source TEXT NOT NULL DEFAULT 'manual',
  external_event_ref TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
);
CREATE INDEX IF NOT EXISTS idx_blocks_range ON calendar_blocks(start_at_utc, end_at_utc);

CREATE TABLE IF NOT EXISTS routines (
  routine_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'morning',
  schedule_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_steps (
  step_id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines(routine_id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  duration_seconds INTEGER,
  linked_action_json TEXT,
  UNIQUE(routine_id, position)
);

CREATE TABLE IF NOT EXISTS routine_runs (
  run_id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines(routine_id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  current_step_id TEXT,
  status TEXT NOT NULL,
  progress_json TEXT
);

CREATE TABLE IF NOT EXISTS alarms (
  alarm_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  hour INTEGER NOT NULL,
  minute INTEGER NOT NULL,
  days_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sound_id TEXT NOT NULL DEFAULT 'zen_bell',
  vibrate INTEGER NOT NULL DEFAULT 1,
  snooze_limit INTEGER NOT NULL DEFAULT 3,
  snooze_interval_minutes INTEGER NOT NULL DEFAULT 5,
  wake_check_enabled INTEGER NOT NULL DEFAULT 1,
  wake_check_delay_minutes INTEGER NOT NULL DEFAULT 3,
  linked_routine_id TEXT,
  linked_habit_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alarm_missions (
  mission_id TEXT PRIMARY KEY,
  alarm_id TEXT NOT NULL REFERENCES alarms(alarm_id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL,
  config_json TEXT NOT NULL,
  fallback_type TEXT NOT NULL DEFAULT 'emergency',
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS alarm_occurrences (
  occurrence_id TEXT PRIMARY KEY,
  alarm_id TEXT NOT NULL REFERENCES alarms(alarm_id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  rang_at TEXT,
  dismissed_at TEXT,
  mission_status TEXT,
  fallback_used INTEGER NOT NULL DEFAULT 0,
  delivery_status TEXT NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS sleep_diary (
  entry_id TEXT PRIMARY KEY,
  sleep_start TEXT,
  wake_time TEXT,
  timezone_id TEXT NOT NULL,
  subjective_quality INTEGER,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits_v2 (
  habit_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  schedule_json TEXT,
  category TEXT NOT NULL DEFAULT 'mind',
  icon TEXT NOT NULL DEFAULT 'leaf-outline',
  color TEXT NOT NULL DEFAULT '#10B981',
  rest_days_json TEXT NOT NULL DEFAULT '[]',
  recovery_window_days INTEGER NOT NULL DEFAULT 1,
  challenge_target_days INTEGER NOT NULL DEFAULT 21,
  reward_points INTEGER NOT NULL DEFAULT 10,
  linked_alarm_id TEXT,
  linked_focus_minutes INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_checkins (
  checkin_id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits_v2(habit_id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(habit_id, date)
);

CREATE TABLE IF NOT EXISTS lifeos_state (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const SCHEMA_V2 = `
-- Neuro Journal Table
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'morning',
  date TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  mood_rating INTEGER,
  energy_rating INTEGER,
  tags_json TEXT NOT NULL DEFAULT '[]',
  morning_data_json TEXT,
  evening_data_json TEXT,
  rant_data_json TEXT,
  is_burned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_type ON journal_entries(type);

-- Neuro Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'General',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);

-- Neuro Finance Tables
CREATE TABLE IF NOT EXISTS finance_transactions (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT NOT NULL DEFAULT 'General',
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  date TEXT NOT NULL,
  description TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_finance_date ON finance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_finance_type ON finance_transactions(type);

CREATE TABLE IF NOT EXISTS finance_salaries (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  monthly_amount REAL NOT NULL,
  pay_date INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS finance_emis (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  due_day INTEGER NOT NULL DEFAULT 5,
  interest_rate REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS finance_investments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'stocks',
  invested_amount REAL NOT NULL,
  current_value REAL NOT NULL,
  returns_percent REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS finance_networth (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'asset',
  value REAL NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS finance_profile (
  id TEXT PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT '₹',
  monthly_budget REAL NOT NULL DEFAULT 25000,
  savings_goal REAL NOT NULL DEFAULT 100000,
  updated_at TEXT NOT NULL
);

-- Offline-First Outbox Queue (Notion / Linear Parity)
CREATE TABLE IF NOT EXISTS sync_outbox (
  outbox_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status, created_at);
`;

const SCHEMA_V3 = `
-- Verifiers table for Social / Parent / Friend accountability
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

-- Verification Requests (habits & tasks accountability inbox)
CREATE TABLE IF NOT EXISTS verification_requests (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  habit_id TEXT,
  date TEXT,
  user_id TEXT,
  verifier_id TEXT,
  verifier_email TEXT,
  type TEXT NOT NULL DEFAULT 'habit',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  proof_url TEXT,
  verifier_notes TEXT,
  created_at TEXT NOT NULL,
  responded_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_verif_req_status ON verification_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_verif_req_habit ON verification_requests(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_verif_req_task ON verification_requests(task_id);
`;

const SCHEMA_V4 = `
-- 1. Goals Table
CREATE TABLE IF NOT EXISTS goals (
  goal_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'short-term',
  category TEXT NOT NULL DEFAULT 'personal',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'in-progress',
  target_date TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 100,
  xp_reward INTEGER NOT NULL DEFAULT 250,
  linked_tasks_json TEXT,
  linked_habits_json TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category);

-- 2. Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  referral_id TEXT PRIMARY KEY,
  referee_name TEXT,
  referee_email TEXT,
  referrer_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  invited_at TEXT NOT NULL,
  qualified_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

-- 3. Store Catalog & Orders
CREATE TABLE IF NOT EXISTS store_items (
  item_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  coins_price INTEGER NOT NULL,
  xp_required INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  badge_text TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT -1,
  is_purchased INTEGER NOT NULL DEFAULT 0,
  impact_unit TEXT,
  impact_delivered INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS store_orders (
  order_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES store_items(item_id),
  item_title TEXT NOT NULL,
  coins_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  shipping_address_json TEXT,
  ordered_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

-- 4. Focus Wallet & Transactions
CREATE TABLE IF NOT EXISTS wallet_balance (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  coins INTEGER NOT NULL DEFAULT 500,
  karma_xp INTEGER NOT NULL DEFAULT 1200,
  escrow_coins INTEGER NOT NULL DEFAULT 0,
  streak_shields INTEGER NOT NULL DEFAULT 1,
  ninja_rank TEXT NOT NULL DEFAULT 'Green Belt',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  tx_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at DESC);

-- 5. Brain Game Scores & Leaderboards
CREATE TABLE IF NOT EXISTS brain_game_scores (
  score_id TEXT PRIMARY KEY,
  game_slug TEXT NOT NULL,
  score INTEGER NOT NULL,
  stars INTEGER NOT NULL DEFAULT 1,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  duration_seconds INTEGER NOT NULL,
  coins_earned INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  played_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_game_scores_slug ON brain_game_scores(game_slug, score DESC);

-- 6. Guardian Links & Subscriptions
CREATE TABLE IF NOT EXISTS guardian_links (
  link_id TEXT PRIMARY KEY,
  guardian_name TEXT NOT NULL,
  guardian_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent',
  status TEXT NOT NULL DEFAULT 'active',
  remote_lock_enabled INTEGER NOT NULL DEFAULT 1,
  daily_allowance_minutes INTEGER NOT NULL DEFAULT 120,
  screen_time_used_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT,
  auto_renew INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  amount_inr INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
`;

const SCHEMA_V5 = `
-- 1. Daily Villains Table
CREATE TABLE IF NOT EXISTS daily_villains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  avatar_symbol TEXT NOT NULL,
  theme_color TEXT NOT NULL,
  element TEXT NOT NULL,
  max_hp INTEGER NOT NULL,
  current_hp INTEGER NOT NULL,
  attack_power INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'active', 'defeated', 'escaped'
  day_date TEXT NOT NULL, -- YYYY-MM-DD
  coins_bounty INTEGER NOT NULL,
  xp_bounty INTEGER NOT NULL,
  loot_item_id TEXT,
  created_at TEXT NOT NULL
);

-- 2. Weekly Raid Boss Table
CREATE TABLE IF NOT EXISTS weekly_villains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  avatar_symbol TEXT NOT NULL,
  theme_color TEXT NOT NULL,
  element TEXT NOT NULL,
  max_hp INTEGER NOT NULL,
  current_hp INTEGER NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  week_id TEXT NOT NULL, -- e.g. '2026-W47'
  status TEXT NOT NULL, -- 'active', 'defeated', 'escaped'
  coins_bounty INTEGER NOT NULL,
  xp_bounty INTEGER NOT NULL,
  trophy_title TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 3. Combat Logs Table
CREATE TABLE IF NOT EXISTS villain_combat_logs (
  id TEXT PRIMARY KEY,
  villain_id TEXT NOT NULL,
  villain_type TEXT NOT NULL, -- 'daily', 'weekly'
  action_source TEXT NOT NULL, -- 'habit', 'task', 'pomodoro', 'brain_game', 'breach_penalty'
  damage_dealt INTEGER NOT NULL,
  counter_damage INTEGER NOT NULL,
  log_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 4. Challenges Catalog Table
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'detox', 'streak', 'focus', 'arena', 'zen'
  duration_days INTEGER NOT NULL,
  target_metric TEXT NOT NULL, -- 'screen_time_max', 'habits_completed', 'pomodoro_mins', 'arena_wins', 'zero_breaches'
  target_value INTEGER NOT NULL,
  coin_reward INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 5. User Enrolled Challenges Table
CREATE TABLE IF NOT EXISTS user_challenges (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'local_ninja',
  status TEXT NOT NULL, -- 'in_progress', 'completed', 'failed'
  current_progress INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  completed_at TEXT,
  reward_claimed INTEGER NOT NULL DEFAULT 0
);

-- 6. Verification Proofs Table
CREATE TABLE IF NOT EXISTS verification_proofs (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'habit', 'task'
  entity_id TEXT NOT NULL,
  verifier_id TEXT NOT NULL,
  photo_uri TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL, -- 'pending', 'verified', 'rejected'
  rejection_reason TEXT,
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  coins_awarded INTEGER NOT NULL DEFAULT 0
);

-- 7. Parental Controls Configuration
CREATE TABLE IF NOT EXISTS parental_controls (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pin_hash TEXT NOT NULL,
  curfew_enabled INTEGER NOT NULL DEFAULT 1,
  curfew_start_time TEXT NOT NULL DEFAULT '21:30',
  curfew_end_time TEXT NOT NULL DEFAULT '06:30',
  daily_total_quota_minutes INTEGER NOT NULL DEFAULT 120,
  strict_curfew_active INTEGER NOT NULL DEFAULT 1,
  emergency_contacts_json TEXT DEFAULT '[]',
  updated_at TEXT NOT NULL
);

-- 8. App Usage Quotas
CREATE TABLE IF NOT EXISTS app_quotas (
  package_name TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  daily_limit_minutes INTEGER NOT NULL,
  is_curfew_blocked INTEGER NOT NULL DEFAULT 1
);

-- 9. Parental Audit Logs
CREATE TABLE IF NOT EXISTS parental_audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'curfew_block', 'quota_exceeded', 'parent_override', 'settings_tamper_attempt'
  package_name TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);
`;

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(SCHEMA_V1);
    await db.execAsync('PRAGMA user_version = 1');
  }

  if (currentVersion < 2) {
    await db.execAsync(SCHEMA_V2);
    await db.execAsync('PRAGMA user_version = 2');
  }

  if (currentVersion < 3) {
    await db.execAsync(SCHEMA_V3);

    // Safely add missing columns to habits_v2
    const habitCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(habits_v2)");
    const habitColNames = new Set(habitCols.map(c => c.name));

    if (!habitColNames.has('description')) {
      await db.execAsync("ALTER TABLE habits_v2 ADD COLUMN description TEXT;");
    }
    if (!habitColNames.has('longest_streak')) {
      await db.execAsync("ALTER TABLE habits_v2 ADD COLUMN longest_streak INTEGER DEFAULT 0;");
    }
    if (!habitColNames.has('verifier_type')) {
      await db.execAsync("ALTER TABLE habits_v2 ADD COLUMN verifier_type TEXT DEFAULT 'self';");
    }
    if (!habitColNames.has('verifier_id')) {
      await db.execAsync("ALTER TABLE habits_v2 ADD COLUMN verifier_id TEXT;");
    }
    if (!habitColNames.has('verifier_email')) {
      await db.execAsync("ALTER TABLE habits_v2 ADD COLUMN verifier_email TEXT;");
    }
    if (!habitColNames.has('coin_reward')) {
      await db.execAsync("ALTER TABLE habits_v2 ADD COLUMN coin_reward INTEGER DEFAULT 5;");
    }
    if (!habitColNames.has('xp_reward')) {
      await db.execAsync("ALTER TABLE habits_v2 ADD COLUMN xp_reward INTEGER DEFAULT 25;");
    }
    if (!habitColNames.has('sync_status')) {
      await db.execAsync("ALTER TABLE habits_v2 ADD COLUMN sync_status TEXT DEFAULT 'synced';");
    }

    // Safely add missing columns to habit_checkins
    const checkinCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(habit_checkins)");
    const checkinColNames = new Set(checkinCols.map(c => c.name));

    if (!checkinColNames.has('verified_at')) {
      await db.execAsync("ALTER TABLE habit_checkins ADD COLUMN verified_at TEXT;");
    }
    if (!checkinColNames.has('verified_by')) {
      await db.execAsync("ALTER TABLE habit_checkins ADD COLUMN verified_by TEXT;");
    }
    if (!checkinColNames.has('sync_status')) {
      await db.execAsync("ALTER TABLE habit_checkins ADD COLUMN sync_status TEXT DEFAULT 'synced';");
    }

    // Safely add missing columns to tasks
    const taskCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(tasks)");
    const taskColNames = new Set(taskCols.map(c => c.name));

    if (!taskColNames.has('verifier_type')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN verifier_type TEXT DEFAULT 'self';");
    }
    if (!taskColNames.has('verifier_id')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN verifier_id TEXT;");
    }
    if (!taskColNames.has('verifier_email')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN verifier_email TEXT;");
    }
    if (!taskColNames.has('verification_status')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN verification_status TEXT DEFAULT 'none';");
    }
    if (!taskColNames.has('verified_at')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN verified_at TEXT;");
    }
    if (!taskColNames.has('verified_by')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN verified_by TEXT;");
    }
    if (!taskColNames.has('sync_status')) {
      await db.execAsync("ALTER TABLE tasks ADD COLUMN sync_status TEXT DEFAULT 'synced';");
    }

    await db.execAsync('PRAGMA user_version = 3');
  }

  if (currentVersion < 4) {
    await db.execAsync(SCHEMA_V4);

    // Seed initial wallet balance if row 1 is missing
    await db.execAsync(`
      INSERT OR IGNORE INTO wallet_balance (id, coins, karma_xp, escrow_coins, streak_shields, ninja_rank, updated_at)
      VALUES (1, 650, 1450, 0, 2, 'Shadow Ninja', datetime('now'));
    `);

    // Seed initial free subscription
    await db.execAsync(`
      INSERT OR IGNORE INTO subscriptions (id, tier, status, expires_at, auto_renew, billing_cycle, amount_inr, updated_at)
      VALUES (1, 'pro', 'active', datetime('now', '+30 days'), 1, 'monthly', 499, datetime('now'));
    `);

    // Seed default store catalog items
    await db.execAsync(`
      INSERT OR IGNORE INTO store_items (item_id, title, subtitle, description, category, sub_category, coins_price, xp_required, image_url, badge_text, stock_quantity, is_purchased, impact_unit, impact_delivered)
      VALUES
      ('theme_matrix', 'Neon Matrix Theme', 'Cyberpunk Green HUD', 'Complete visual theme revamp with animated terminal matrix glow', 'digital', 'themes', 250, 500, 'palette', 'POPULAR', -1, 0, NULL, 0),
      ('theme_crimson', 'Obsidian Crimson Theme', 'Deep Stealth Red', 'Sleek dark red high-contrast stealth theme for late-night focus', 'digital', 'themes', 350, 800, 'flame', 'NEW', -1, 0, NULL, 0),
      ('shield_freeze', 'Streak Freeze Shield', 'Protect Your Discipline', 'Preserves your 21-day challenge streak even if you miss a check-in day', 'digital', 'shields', 100, 200, 'shield', 'ESSENTIAL', 5, 0, NULL, 0),
      ('sound_tokyo', 'Tokyo Rain Lo-Fi Soundscape', 'Binaural 432Hz Audio', 'Ultra-high-definition Japanese rain ambience with subtle calming chimes', 'digital', 'soundscapes', 150, 300, 'headphones', 'ZEN', -1, 0, NULL, 0),
      ('impact_tree', 'Plant 1 Real Tree', 'Eden Reforestation Project', 'We fund planting 1 mangrove tree verified with GPS coordinates & certificate', 'impact', 'environment', 200, 400, 'leaf', 'EARTH #1', -1, 0, 'Trees Planted', 1420),
      ('impact_meal', 'Sponsor 1 Child Nutrition Meal', 'Global Hunger Relief', 'Provide a high-protein balanced school meal for an underprivileged child', 'impact', 'relief', 300, 600, 'heart', 'COMMUNITY', -1, 0, 'Meals Funded', 890),
      ('impact_ocean', 'Remove 1kg Ocean Plastic', 'Ocean Cleaners Alliance', 'Extracts and recycles 1 kilogram of plastic waste from river deltas', 'impact', 'environment', 250, 500, 'globe', 'ECO', -1, 0, 'KG Recovered', 610),
      ('merch_hoodie', 'NeuroNinja Oversized Focus Hoodie', '20% Coin Discount Voucher', 'Redeem 500 coins for a 20% discount code on the official heavy-cotton hoodie', 'goodies', 'apparel', 500, 1000, 'tag', 'EXCLUSIVE', 50, 0, NULL, 0);
    `);

    // Seed sample initial goal if none exists
    await db.execAsync(`
      INSERT OR IGNORE INTO goals (goal_id, title, description, type, category, priority, status, target_date, progress, coin_reward, xp_reward, linked_tasks_json, linked_habits_json, created_at, completed_at, sync_status)
      VALUES
      ('goal_master_focus', 'Master Deep Work & Beat Doomscrolling', 'Achieve 30 consecutive days of under 45 minutes social media screen time', 'long-term', 'personal', 'high', 'in-progress', date('now', '+30 days'), 35, 300, 750, '[]', '[]', datetime('now'), NULL, 'synced');
    `);

    await db.execAsync('PRAGMA user_version = 4');
  }

  if (currentVersion < 5) {
    await db.execAsync(SCHEMA_V5);

    // 1. Seed today's active daily villain
    await db.execAsync(`
      INSERT OR IGNORE INTO daily_villains (
        id, name, title, description, avatar_symbol, theme_color, element,
        max_hp, current_hp, attack_power, status, day_date, coins_bounty, xp_bounty, loot_item_id, created_at
      ) VALUES (
        'villain_daily_today',
        'Dopamine Demon',
        'Archon of Endless Feeds',
        'Feeds on fractured focus and infinite mindless scrolling. Weak to high-streak habits and mindful focus blocks.',
        'fire',
        '#EF4444',
        'focus',
        500,
        500,
        35,
        'active',
        date('now'),
        150,
        350,
        'shield_freeze',
        datetime('now')
      );
    `);

    // 2. Seed this week's epic raid titan
    await db.execAsync(`
      INSERT OR IGNORE INTO weekly_villains (
        id, name, title, description, avatar_symbol, theme_color, element,
        max_hp, current_hp, phase, week_id, status, coins_bounty, xp_bounty, trophy_title, created_at
      ) VALUES (
        'villain_weekly_current',
        'Chronos the Time Devourer',
        'Ancient Titan of Procrastination',
        'A towering temporal entity that siphons wasted hours into the abyss. Defeating him requires combined discipline across habits, tasks, and pomodoro focus.',
        'skull',
        '#8B5CF6',
        'discipline',
        5000,
        5000,
        1,
        strftime('%Y-W%W', 'now'),
        'active',
        1000,
        2500,
        'Titan Vanquisher Trophy',
        datetime('now')
      );
    `);

    // 3. Seed initial real challenges
    await db.execAsync(`
      INSERT OR IGNORE INTO challenges (
        id, title, description, badge_icon, category, duration_days, target_metric, target_value, coin_reward, xp_reward, is_active, created_at
      ) VALUES
      ('ch_detox_3d', '3-Day Dopamine Detox', 'Maintain total daily entertainment screen time under 120 minutes each day for 3 days', 'timer-sand', 'detox', 3, 'screen_time_max', 120, 250, 500, 1, datetime('now')),
      ('ch_iron_fortress', 'Iron Fortress 5-Day', 'Zero breaches of sealed apps for 5 consecutive days', 'shield-lock', 'streak', 5, 'zero_breaches', 5, 400, 800, 1, datetime('now')),
      ('ch_habit_streak', 'Habit Grandmaster', 'Complete at least 3 daily habits every single day for 7 days straight', 'fire', 'streak', 7, 'habits_completed', 21, 500, 1000, 1, datetime('now')),
      ('ch_deep_work', 'Deep Work Odyssey', 'Log 150 total minutes of deep Pomodoro focus sessions', 'brain', 'focus', 5, 'pomodoro_mins', 150, 350, 700, 1, datetime('now')),
      ('ch_arena_titan', 'Arena Mind Titan', 'Win 5 cognitive challenge matches in Neuro Arena', 'trophy', 'arena', 3, 'arena_wins', 5, 300, 600, 1, datetime('now'));
    `);

    // 4. Seed default parental controls configuration
    await db.execAsync(`
      INSERT OR IGNORE INTO parental_controls (
        id, pin_hash, curfew_enabled, curfew_start_time, curfew_end_time, daily_total_quota_minutes, strict_curfew_active, emergency_contacts_json, updated_at
      ) VALUES (
        1,
        '0000',
        1,
        '21:30',
        '06:30',
        120,
        1,
        '["100", "112", "Emergency Services"]',
        datetime('now')
      );
    `);

    // 5. Seed default app quotas
    await db.execAsync(`
      INSERT OR IGNORE INTO app_quotas (package_name, app_name, daily_limit_minutes, is_curfew_blocked)
      VALUES
      ('com.google.android.youtube', 'YouTube', 45, 1),
      ('com.instagram.android', 'Instagram', 30, 1),
      ('com.zhiliaoapp.musically', 'TikTok', 20, 1),
      ('com.reddit.frontpage', 'Reddit', 25, 1);
    `);

    await db.execAsync('PRAGMA user_version = 5');
  }

  if (currentVersion < 6) {
    await db.execAsync(`
      -- Shopping & Grocery
      CREATE TABLE IF NOT EXISTS shopping_lists (
        list_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced'
      );

      CREATE TABLE IF NOT EXISTS shopping_items (
        item_id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL REFERENCES shopping_lists(list_id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'pantry',
        quantity REAL NOT NULL DEFAULT 1,
        unit TEXT NOT NULL DEFAULT 'pcs',
        is_checked INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_items(list_id);

      -- NeuroStore Orders
      CREATE TABLE IF NOT EXISTS store_orders (
        order_id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        item_title TEXT NOT NULL,
        item_category TEXT NOT NULL,
        item_sub_category TEXT NOT NULL,
        item_image TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        coins_spent INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'processing',
        full_name TEXT,
        phone TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT DEFAULT 'India',
        selected_size TEXT,
        courier_name TEXT,
        tracking_number TEXT,
        certificate_id TEXT,
        ordered_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending'
      );

      -- NeuroBody Profiles & Logs
      CREATE TABLE IF NOT EXISTS body_profiles (
        user_id TEXT PRIMARY KEY,
        gender TEXT DEFAULT 'male',
        age INTEGER,
        height_cm REAL,
        target_weight_kg REAL,
        default_water_target_ml INTEGER DEFAULT 3000,
        preferred_fasting_protocol TEXT DEFAULT '16:8',
        calorie_goal INTEGER DEFAULT 2000,
        protein_goal INTEGER DEFAULT 140,
        carbs_goal INTEGER DEFAULT 200,
        fats_goal INTEGER DEFAULT 65,
        activity_level TEXT DEFAULT 'moderately_active',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS water_logs (
        log_id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        target_ml INTEGER NOT NULL,
        total_ml INTEGER NOT NULL DEFAULT 0,
        logs_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fasting_sessions (
        session_id TEXT PRIMARY KEY,
        protocol TEXT NOT NULL,
        target_hours REAL NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        mood TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meal_items (
        meal_id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        name TEXT NOT NULL,
        calories INTEGER NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fats REAL NOT NULL DEFAULT 0,
        ingredients_json TEXT DEFAULT '[]',
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_meal_items_date ON meal_items(date);

      CREATE TABLE IF NOT EXISTS body_metrics (
        metric_id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        weight_kg REAL NOT NULL,
        height_cm REAL,
        waist_cm REAL,
        chest_cm REAL,
        hips_cm REAL,
        body_fat_percentage REAL,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS womens_health_profiles (
        user_id TEXT PRIMARY KEY,
        mode TEXT NOT NULL DEFAULT 'cycle',
        average_cycle_length INTEGER DEFAULT 28,
        average_period_length INTEGER DEFAULT 5,
        last_period_start_date TEXT,
        is_irregular INTEGER DEFAULT 0,
        pregnancy_profile_json TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS womens_health_logs (
        log_id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        is_period_start INTEGER DEFAULT 0,
        is_period_end INTEGER DEFAULT 0,
        flow_level TEXT,
        symptoms_json TEXT DEFAULT '[]',
        moods_json TEXT DEFAULT '[]',
        bbt_celsius REAL,
        cervical_mucus TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      -- NeuroHealth Mental Health Logs
      CREATE TABLE IF NOT EXISTS mental_health_logs (
        log_id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        mood TEXT NOT NULL,
        mood_score INTEGER NOT NULL,
        stress INTEGER NOT NULL DEFAULT 5,
        anxiety INTEGER NOT NULL DEFAULT 5,
        energy INTEGER NOT NULL DEFAULT 5,
        motivation INTEGER NOT NULL DEFAULT 5,
        focus INTEGER NOT NULL DEFAULT 5,
        happiness INTEGER NOT NULL DEFAULT 5,
        tags_json TEXT DEFAULT '[]',
        journal_text TEXT,
        gratitude_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL
      );
    `);

    // Seed default starter shopping list with staples
    await db.execAsync(`
      INSERT OR IGNORE INTO shopping_lists (list_id, name, created_at, updated_at)
      VALUES ('list_default', 'Weekly Groceries & Nutrition', datetime('now'), datetime('now'));

      INSERT OR IGNORE INTO shopping_items (item_id, list_id, name, category, quantity, unit, is_checked, updated_at)
      VALUES
      ('item_1', 'list_default', 'Greek Yogurt', 'dairy', 2, 'pack', 0, datetime('now')),
      ('item_2', 'list_default', 'Rolled Oats', 'pantry', 1, 'kg', 0, datetime('now')),
      ('item_3', 'list_default', 'Eggs (Free Range)', 'protein', 12, 'pcs', 1, datetime('now')),
      ('item_4', 'list_default', 'Spinach & Greens', 'produce', 1, 'bunch', 0, datetime('now')),
      ('item_5', 'list_default', 'Blueberries', 'produce', 200, 'g', 0, datetime('now')),
      ('item_6', 'list_default', 'Almonds & Walnuts', 'pantry', 500, 'g', 0, datetime('now')),
      ('item_7', 'list_default', 'Electrolyte Hydration Salts', 'beverages', 1, 'pack', 0, datetime('now'));
    `);

    // Seed default body profile
    await db.execAsync(`
      INSERT OR IGNORE INTO body_profiles (
        user_id, gender, age, height_cm, target_weight_kg, default_water_target_ml, preferred_fasting_protocol, calorie_goal, protein_goal, carbs_goal, fats_goal, activity_level, updated_at
      ) VALUES (
        'user_primary', 'male', 26, 175, 70, 3000, '16:8', 2200, 150, 220, 65, 'moderately_active', datetime('now')
      );
    `);

    await db.execAsync('PRAGMA user_version = 6');
  }

  if (currentVersion < 7) {
    // V7: Pomodoro #1 Upgrade - Deep Work Sessions & Upper Circuit Engine
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS deep_work_sessions (
        id TEXT PRIMARY KEY,
        intent TEXT NOT NULL,
        preset_type TEXT NOT NULL,
        planned_seconds INTEGER NOT NULL,
        actual_seconds INTEGER NOT NULL,
        status TEXT NOT NULL,
        focus_depth INTEGER,
        intent_completed INTEGER,
        distractions_count INTEGER DEFAULT 0,
        distractions_json TEXT,
        staked_coins INTEGER DEFAULT 0,
        coins_rewarded INTEGER DEFAULT 0,
        xp_rewarded INTEGER DEFAULT 0,
        tree_species TEXT DEFAULT 'bonsai',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS upper_circuit_profile (
        id TEXT PRIMARY KEY DEFAULT 'current',
        ceiling_minutes INTEGER DEFAULT 50,
        sweet_spot_minutes INTEGER DEFAULT 38,
        weekly_pr_minutes INTEGER DEFAULT 50,
        total_flow_hours REAL DEFAULT 0,
        mindfulness_score REAL DEFAULT 85.0,
        zero_resistance_json TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    // Seed initial upper circuit profile
    await db.execAsync(`
      INSERT OR IGNORE INTO upper_circuit_profile (
        id, ceiling_minutes, sweet_spot_minutes, weekly_pr_minutes, total_flow_hours, mindfulness_score, zero_resistance_json, updated_at
      ) VALUES (
        'current', 50, 38, 50, 4.5, 92.0,
        '{"cleanDesk":true,"phoneDnd":true,"singleVictory":true,"hydrated":true}',
        datetime('now')
      );
    `);

    await db.execAsync('PRAGMA user_version = 7');
  }

  if (currentVersion < 8) {
    // V8: Focus Soundscapes & Gamified Audio Vault
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS audio_vault_tracks (
        track_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        frequency_hz TEXT,
        icon TEXT NOT NULL,
        description TEXT NOT NULL,
        asset_key TEXT NOT NULL,
        price_coins INTEGER NOT NULL DEFAULT 0,
        is_unlocked INTEGER NOT NULL DEFAULT 0,
        unlock_type TEXT NOT NULL DEFAULT 'coins',
        unlock_requirement TEXT,
        unlocked_at TEXT
      );
    `);

    // Seed Audio Vault tracks
    await db.execAsync(`
      INSERT OR IGNORE INTO audio_vault_tracks (
        track_id, title, category, frequency_hz, icon, description, asset_key, price_coins, is_unlocked, unlock_type, unlock_requirement, unlocked_at
      ) VALUES
      ('track_40hz_gamma', '40Hz Gamma Neural Lock', 'neural', '40Hz', 'brain', 'High-frequency synaptic phase lock for deep coding and complex logic', 'ambient_rain.wav', 0, 1, 'free', NULL, datetime('now')),
      ('track_kyoto_rain', 'Kyoto Cedar Bamboo Rain', 'nature', NULL, 'weather-rainy', 'Gentle binaural rainfall falling over temple cedar shingles', 'ambient_rain.wav', 0, 1, 'free', NULL, datetime('now')),
      ('track_adhd_brown', 'ADHD Brownian Deep Noise', 'noise', '100Hz', 'waveform', 'Heavy low-frequency roll-off dampening internal mental chatter', 'ambient_ocean.wav', 0, 1, 'free', NULL, datetime('now')),
      
      ('track_10hz_alpha', '10Hz Alpha Creative Flow', 'neural', '10Hz', 'wave', 'Occipital alpha wave entrainment for writing, design & lateral thinking', 'digital_pulse.wav', 100, 0, 'coins', '100 Focus Coins', NULL),
      ('track_6hz_theta', '6Hz Theta Deep Insight', 'neural', '6Hz', 'head-snowflake-outline', 'Hypnagogic twilight frequency for subconscious problem breakthroughs', 'digital_pulse.wav', 120, 0, 'coins', '120 Focus Coins', NULL),
      ('track_alpine_pine', 'Alpine Pine Forest & Birds', 'nature', NULL, 'pine-tree', 'Crisp mountain breeze rustling through evergreen needles', 'ambient_ocean.wav', 50, 0, 'coins', '50 Focus Coins', NULL),
      ('track_deep_ocean', 'Deep Ocean Abyssal Surf', 'nature', NULL, 'water', 'Rhythmic ocean swells masking open-space office noise', 'ambient_ocean.wav', 50, 0, 'coins', '50 Focus Coins', NULL),
      ('track_highland_thunder', 'Highland Thunder & Deluge', 'nature', NULL, 'weather-lightning', 'Distant rolling thunder and heavy atmospheric storm', 'ambient_rain.wav', 80, 0, 'coins', '80 Focus Coins', NULL),
      ('track_hearthfire', 'Cedar Hearthfire & Crackle', 'nature', NULL, 'fire', 'Warm cozy fireside warmth with soothing embers', 'digital_pulse.wav', 60, 0, 'coins', '60 Focus Coins', NULL),
      ('track_shinjuku_lofi', 'Cyber Shinjuku 3AM Chillhop', 'lofi', '72 BPM', 'headphones', 'Slow vintage vinyl chillhop beat with neo-Tokyo night ambience', 'zen_bell.wav', 75, 0, 'coins', '75 Focus Coins', NULL),
      ('track_neo_akihabara', 'Neo-Akihabara Neon Rain', 'lofi', '80 BPM', 'city-variant-outline', 'Warm analog synth tape loops with late-night drizzle', 'ambient_rain.wav', 100, 0, 'coins', '100 Focus Coins', NULL),
      ('track_calm_pink', 'Balanced 1/f Pink Noise', 'noise', '250Hz', 'radio-tower', 'Balanced spectral density for reading and memory retention', 'ambient_ocean.wav', 40, 0, 'coins', '40 Focus Coins', NULL),
      ('track_cosmic_drone', 'Deep Cosmic Zero-G Drone', 'noise', '40Hz', 'weather-night', 'Sub-bass interstellar hum creating an isolation pod', 'gentle_rise.wav', 60, 0, 'coins', '60 Focus Coins', NULL),
      
      ('track_432hz_sacred', '432Hz Sacred Harmonic Sine', 'neural', '432Hz', 'creation', 'Natural mathematical tuning frequency eliminating somatic stress', 'zen_bell.wav', 0, 0, 'streak', '7-Day Focus Streak', NULL),
      ('track_hyper_gamma', 'Overclocked 40Hz Super-Gamma', 'neural', '40Hz', 'flash', 'Max-intensity neural entrainment for ultra high-pressure sprints', 'digital_pulse.wav', 0, 0, 'rank', 'Blue Belt (4,000 XP)', NULL),
      ('track_boss_anthem', 'Cyberpunk Data Stream', 'lofi', '120 BPM', 'sword-cross', 'Matrix ambient synthesizer drone won by slaying the Villain', 'sensei_call.wav', 0, 0, 'boss', 'Defeat Active Villain', NULL);
    `);

    await db.execAsync('PRAGMA user_version = 8');
  }
}

