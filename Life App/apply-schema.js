const Database = require("better-sqlite3");
const path = require("path");
const dbPath = process.env.DB_PATH || "/data/life-app.db";
console.log("apply-schema: using database at", dbPath);
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Helper: run each statement, skip if already exists ─────────────────────

function run(sql) {
  try {
    db.exec(sql);
    console.log("OK:", sql.trim().substring(0, 80));
  } catch (e) {
    if (
      e.message.includes("duplicate column") ||
      e.message.includes("already exists") ||
      e.message.includes("UNIQUE constraint")
    ) {
      console.log("SKIP:", sql.trim().substring(0, 80));
    } else {
      console.error("ERROR:", e.message, "\n  SQL:", sql.trim().substring(0, 120));
    }
  }
}

// ─── 1. Create all tables (safe on fresh DB and existing DB) ─────────────────

const createStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    is_work_role INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    week_start_date TEXT NOT NULL,
    planning_notes TEXT,
    is_planned INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    sessions_per_week INTEGER NOT NULL DEFAULT 3,
    activity_type_id INTEGER,
    target_metric TEXT,
    target_value REAL,
    target_period TEXT,
    target_unit TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    is_completed INTEGER NOT NULL DEFAULT 0,
    horizon TEXT,
    parent_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    month TEXT,
    preferred_days TEXT,
    preferred_time_slot TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS goal_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS goal_tallies (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS goal_session_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    label TEXT NOT NULL,
    rest_days_after INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS weekly_focus_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    weekly_plan_id INTEGER NOT NULL REFERENCES weekly_plans(id),
    goal_id INTEGER NOT NULL REFERENCES goals(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS activity_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cardio',
    icon TEXT NOT NULL DEFAULT '🏃',
    is_tracked INTEGER NOT NULL DEFAULT 0,
    default_calories INTEGER,
    default_steps INTEGER,
    metrics_config TEXT NOT NULL DEFAULT '[]',
    variants TEXT,
    grade_system TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS recurring_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    title TEXT NOT NULL,
    quadrant TEXT NOT NULL DEFAULT 'Q2',
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_paused INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER REFERENCES goals(id),
    role_id INTEGER REFERENCES roles(id),
    recurring_activity_id INTEGER REFERENCES recurring_activities(id),
    activity_type_id INTEGER REFERENCES activity_types(id),
    title TEXT NOT NULL,
    quadrant TEXT NOT NULL DEFAULT 'Q2',
    activity_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    is_log_entry INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    carry_forward_from TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    activity_type_id INTEGER NOT NULL REFERENCES activity_types(id),
    activity_id INTEGER REFERENCES activities(id),
    goal_id INTEGER REFERENCES goals(id),
    date TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    calories INTEGER,
    steps INTEGER,
    variant TEXT,
    metrics TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    date TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS scheduler_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    work_start_time TEXT NOT NULL DEFAULT '09:00',
    work_end_time TEXT NOT NULL DEFAULT '17:00',
    work_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
    enforce_weekly_spread INTEGER NOT NULL DEFAULT 1,
    max_activities_per_day INTEGER NOT NULL DEFAULT 4,
    user_id TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS scheduler_blackout_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    date TEXT NOT NULL,
    label TEXT,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS budget_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    monthly_savings_target REAL NOT NULL DEFAULT 0,
    savings_goal_total REAL,
    savings_goal_target_date TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS income_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    source TEXT NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS fixed_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    start_month TEXT NOT NULL,
    end_month TEXT,
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS spending_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    is_itemized INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS spending_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📦',
    color TEXT NOT NULL DEFAULT '#6B7280',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS planned_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    category_id INTEGER REFERENCES spending_categories(id),
    notes TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS training_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    goal_id INTEGER NOT NULL UNIQUE REFERENCES goals(id) ON DELETE CASCADE,
    sport TEXT NOT NULL DEFAULT 'climbing',
    periodization_model TEXT NOT NULL,
    player_level TEXT NOT NULL,
    years_experience INTEGER NOT NULL,
    sport_profile TEXT NOT NULL DEFAULT '{}',
    start_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    user_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS training_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    training_plan_id INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    phase_type TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    duration_weeks INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    description TEXT NOT NULL,
    limitation_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    identity TEXT NOT NULL,
    name TEXT NOT NULL,
    cue TEXT,
    minimum_version TEXT,
    color TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_habit_date_unique ON habit_logs (habit_id, date)`,

  // ─── Library ───────────────────────────────────────────────────────────────
  // Content tables are global (no user_id). Only library_bookmarks is per-user.

  `CREATE TABLE IF NOT EXISTS moment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES spending_categories(id),
    spending_entry_id INTEGER REFERENCES spending_entries(id),
    scorecard_answer TEXT,
    utility_status_answer TEXT,
    six_month_answer TEXT,
    decision TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS library_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS library_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    topic_id INTEGER NOT NULL REFERENCES library_topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS library_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES library_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('protocol','exercise','tip','concept')),
    what TEXT NOT NULL,
    why TEXT NOT NULL,
    how TEXT NOT NULL,
    duration_or_reps TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS library_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, item_id)
  )`,
];

for (const sql of createStatements) {
  run(sql);
}

// ─── 2. Add columns to existing tables (migration — safe to re-run) ──────────
// These are no-ops if columns already exist (SQLite throws "duplicate column").

const alterStatements = [
  `ALTER TABLE goals ADD COLUMN target_unit TEXT`,
  `ALTER TABLE goals ADD COLUMN horizon TEXT`,
  `ALTER TABLE goals ADD COLUMN parent_goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE`,
  `ALTER TABLE goals ADD COLUMN month TEXT`,
  `ALTER TABLE goals ADD COLUMN preferred_days TEXT`,
  `ALTER TABLE goals ADD COLUMN preferred_time_slot TEXT`,
  `ALTER TABLE budget_settings ADD COLUMN savings_starting_balance REAL DEFAULT 0`,
  `ALTER TABLE budget_settings ADD COLUMN bucket_targets TEXT`,
  `ALTER TABLE budget_settings ADD COLUMN moment_threshold REAL DEFAULT 200`,
  `ALTER TABLE budget_settings ADD COLUMN target_annual_spending REAL`,
  `ALTER TABLE budget_settings ADD COLUMN state_pension_annual_amount REAL`,
  `ALTER TABLE spending_categories ADD COLUMN bucket TEXT`,
  `ALTER TABLE training_plans ADD COLUMN training_sessions_per_week INTEGER`,
  `ALTER TABLE training_plans ADD COLUMN supplemental_sessions_per_week INTEGER`,
  `ALTER TABLE training_plans ADD COLUMN training_preferred_days TEXT DEFAULT '[]'`,
  `ALTER TABLE training_plans ADD COLUMN supplemental_preferred_days TEXT DEFAULT '[]'`,
  `ALTER TABLE training_phases ADD COLUMN sport_focus_content TEXT`,
  `ALTER TABLE training_phases ADD COLUMN supplemental_content TEXT`,
  `ALTER TABLE training_phases ADD COLUMN mental_game_content TEXT`,
  `ALTER TABLE activities ADD COLUMN session_type TEXT NOT NULL DEFAULT 'training'`,
  `ALTER TABLE activity_types ADD COLUMN default_duration_minutes INTEGER NOT NULL DEFAULT 60`,
];

for (const sql of alterStatements) {
  run(sql);
}

// ─── 2a. Rename activities.is_log_entry → activities.created_from_log ─────────
// Guarded by PRAGMA table_info so it's idempotent. SQLite 3.25+ supports
// ALTER TABLE ... RENAME COLUMN; better-sqlite3 ships with 3.43+.

try {
  const activitiesCols = db.prepare(`PRAGMA table_info(activities)`).all();
  const hasOldName = activitiesCols.some((c) => c.name === "is_log_entry");
  const hasNewName = activitiesCols.some((c) => c.name === "created_from_log");
  if (hasOldName && !hasNewName) {
    db.exec(`ALTER TABLE activities RENAME COLUMN is_log_entry TO created_from_log`);
    console.log("OK: ALTER TABLE activities RENAME COLUMN is_log_entry TO created_from_log");
  } else if (hasNewName) {
    console.log("SKIP: activities.created_from_log already exists");
  } else {
    console.log("SKIP: activities table missing is_log_entry column (fresh schema?)");
  }
} catch (e) {
  console.error("ERROR renaming activities.is_log_entry:", e.message);
}

// ─── 2b. Backfill training_plans split for existing rows (training-supplemental-split V1) ─
// Default formula: supplemental = min(2, max(0, sessions_per_week - 2)); training = sessions_per_week - supplemental.
// Gated by `IS NULL` so user-edited values are never overwritten. Safe to re-run.

try {
  db.exec(`
    UPDATE training_plans
    SET
      training_sessions_per_week = (
        SELECT g.sessions_per_week - MIN(2, MAX(0, g.sessions_per_week - 2))
        FROM goals g WHERE g.id = training_plans.goal_id
      ),
      supplemental_sessions_per_week = (
        SELECT MIN(2, MAX(0, g.sessions_per_week - 2))
        FROM goals g WHERE g.id = training_plans.goal_id
      )
    WHERE training_sessions_per_week IS NULL
       OR supplemental_sessions_per_week IS NULL
  `);
  console.log("apply-schema: training_plans split backfill applied (idempotent).");
} catch (e) {
  console.error("apply-schema: training_plans split backfill FAILED:", e.message);
}

// ─── 2c. Drop role-level scheduling columns (role-scheduling-rules-removal) ──
// Removes roles.max_weekly_occurrences and roles.min_rest_days. These two
// columns originally gated scheduler placement at the role level, but
// goal.sessionsPerWeek and schedulerSettings.maxActivitiesPerDay now own that
// concern at a more useful granularity. SQLite 3.35+ supports ALTER TABLE ...
// DROP COLUMN; better-sqlite3 ships 3.43+. Guarded by PRAGMA table_info so
// repeat runs are no-ops. Note: existing user values in these columns are
// destroyed by the drop; this is intentional and accepted at scope time.

try {
  const rolesCols = db.prepare(`PRAGMA table_info(roles)`).all();
  const hasMaxWeekly = rolesCols.some((c) => c.name === "max_weekly_occurrences");
  const hasMinRest = rolesCols.some((c) => c.name === "min_rest_days");

  if (hasMaxWeekly) {
    db.exec(`ALTER TABLE roles DROP COLUMN max_weekly_occurrences`);
    console.log("OK: ALTER TABLE roles DROP COLUMN max_weekly_occurrences");
  } else {
    console.log("SKIP: roles.max_weekly_occurrences already dropped");
  }

  if (hasMinRest) {
    db.exec(`ALTER TABLE roles DROP COLUMN min_rest_days`);
    console.log("OK: ALTER TABLE roles DROP COLUMN min_rest_days");
  } else {
    console.log("SKIP: roles.min_rest_days already dropped");
  }
} catch (e) {
  console.error("ERROR dropping role-scheduling columns:", e.message);
}

// ─── 3. Seed new default spending categories for existing users ──────────────
// Idempotent — checks before inserting, safe to re-run on every deploy.

const INVESTING_LADDER_NAMES = [
  'pensioensparen',
  'langetermijnsparen',
  'etf_investment',
  'employer_pension',
  '2nd_pillar',
  'consumer_credit',
  'credit_card_debt',
];

const categoryUsers = db.prepare("SELECT DISTINCT user_id FROM spending_categories").all();
for (const { user_id } of categoryUsers) {
  const existing = db.prepare(
    "SELECT name FROM spending_categories WHERE user_id = ? AND name IN ('Savings','Savings Withdrawal')"
  ).all(user_id).map(r => r.name);
  if (!existing.includes('Savings')) {
    db.prepare("INSERT INTO spending_categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)")
      .run('Savings', 'piggy-bank', '#10B981', user_id);
    console.log("apply-schema: seeded 'Savings' category for user", user_id);
  }
  if (!existing.includes('Savings Withdrawal')) {
    db.prepare("INSERT INTO spending_categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)")
      .run('Savings Withdrawal', 'arrow-up-from-line', '#F59E0B', user_id);
    console.log("apply-schema: seeded 'Savings Withdrawal' category for user", user_id);
  }

  // Seed investing-ladder categories (hidden by default; users can assign bucket later)
  const existingLadder = db.prepare(
    `SELECT name FROM spending_categories WHERE user_id = ? AND name IN (${INVESTING_LADDER_NAMES.map(() => '?').join(',')})`
  ).all(user_id, ...INVESTING_LADDER_NAMES).map(r => r.name);

  for (const ladderName of INVESTING_LADDER_NAMES) {
    if (!existingLadder.includes(ladderName)) {
      db.prepare("INSERT INTO spending_categories (name, icon, color, bucket, user_id) VALUES (?, ?, ?, ?, ?)")
        .run(ladderName, 'trending-up', '#6366F1', 'invest', user_id);
      console.log("apply-schema: seeded investing ladder category", ladderName, "for user", user_id);
    }
  }
}

// ─── 4. Migrate emoji icons → Lucide icon names ──────────────────────────────
// These UPDATE statements are idempotent: the AND icon = 'emoji' guard means
// they are no-ops once already migrated or if the row doesn't exist yet.
// The Savings / Savings Withdrawal rows depend on savings-redesign seeding;
// they will silently no-op until that feature ships and then activate on the
// next container restart.

db.exec(`UPDATE spending_categories SET icon = 'utensils' WHERE name = 'Food' AND icon = '🍕'`);
db.exec(`UPDATE spending_categories SET icon = 'home' WHERE name = 'Rent' AND icon = '🏠'`);
db.exec(`UPDATE spending_categories SET icon = 'zap' WHERE name = 'Utilities' AND icon = '⚡'`);
db.exec(`UPDATE spending_categories SET icon = 'shopping-cart' WHERE name = 'Groceries' AND icon = '🛒'`);
db.exec(`UPDATE spending_categories SET icon = 'popcorn' WHERE name = 'Amusement' AND icon = '🎭'`);
db.exec(`UPDATE spending_categories SET icon = 'shirt' WHERE name = 'Clothes' AND icon = '👕'`);
db.exec(`UPDATE spending_categories SET icon = 'car' WHERE name = 'Transport' AND icon = '🚗'`);
db.exec(`UPDATE spending_categories SET icon = 'piggy-bank' WHERE name = 'Savings' AND icon = '🏦'`);
db.exec(`UPDATE spending_categories SET icon = 'arrow-up-from-line' WHERE name = 'Savings Withdrawal' AND icon = '💸'`);
db.exec(`UPDATE spending_categories SET icon = 'package' WHERE name = 'Other' AND icon = '📦'`);

db.exec(`UPDATE activity_types SET icon = 'footprints' WHERE name = 'Running' AND icon = '🏃'`);
db.exec(`UPDATE activity_types SET icon = 'mountain' WHERE name = 'Hiking' AND icon = '🥾'`);
db.exec(`UPDATE activity_types SET icon = 'circle-dot' WHERE name = 'Tennis' AND icon = '🎾'`);
db.exec(`UPDATE activity_types SET icon = 'dumbbell' WHERE name = 'Climbing (Gym)' AND icon = '🧗'`);
db.exec(`UPDATE activity_types SET icon = 'mountain-snow' WHERE name = 'Climbing (Outdoor)' AND icon = '⛰️'`);
db.exec(`UPDATE activity_types SET icon = 'book-open' WHERE name = 'Reading' AND icon = '📖'`);
db.exec(`UPDATE activity_types SET icon = 'wind' WHERE name = 'Meditation' AND icon = '🧘'`);
db.exec(`UPDATE activity_types SET icon = 'pen-line' WHERE name = 'Journaling' AND icon = '📝'`);
db.exec(`UPDATE activity_types SET icon = 'users' WHERE name = 'Social Event' AND icon = '🤝'`);

console.log("apply-schema: emoji → Lucide icon migration applied.");

// ─── 5. Bootstrap admin account from env vars (first boot only) ──────────────
// If ADMIN_USERNAME and ADMIN_PASSWORD are set and no users exist, create the
// admin account automatically. Safe to leave set after first boot — the check
// `WHERE 1` count prevents duplicate creation.

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

if (adminUsername && adminPassword) {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (userCount.count === 0) {
    console.log("apply-schema: no users found, creating admin account...");
    // bcryptjs is available in node_modules from the app build
    const bcrypt = require("bcryptjs");
    const { randomUUID } = require("crypto");
    const hash = bcrypt.hashSync(adminPassword, 12);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id, username, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', 1)"
    ).run(id, adminUsername, hash);
    console.log("apply-schema: admin account created for username:", adminUsername);
  } else {
    console.log("apply-schema: users already exist, skipping admin bootstrap.");
  }
} else {
  console.log("apply-schema: ADMIN_USERNAME/ADMIN_PASSWORD not set, skipping bootstrap.");
}

// ─── 6. User data reset ───────────────────────────────────────────────────────
// Option A: set RESET_USER_DATA_USERNAME on Railway, redeploy once, then remove the variable.
// Option B: one-shot ops log entry (production only, runs once per database).

const { resetUserDataByUsername } = require("./scripts/reset-user-data-lib.cjs");

db.exec(`CREATE TABLE IF NOT EXISTS _ops_log (
  key TEXT PRIMARY KEY NOT NULL,
  ran_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

function runUserDataReset(username, reason) {
  console.log(`apply-schema: user data reset (${reason}) for:`, username);
  const outcome = resetUserDataByUsername(db, username, { confirm: true });
  if (!outcome.ok) {
    console.error("apply-schema: reset failed:", outcome.error);
    return false;
  }
  console.log("apply-schema: reset deleted", outcome.total, "row(s) for", username);
  for (const { label, n } of outcome.results) {
    if (n > 0) console.log("  ", label + ":", n);
  }
  return true;
}

const resetUsername = process.env.RESET_USER_DATA_USERNAME;
if (resetUsername) {
  runUserDataReset(resetUsername, "RESET_USER_DATA_USERNAME");
}

const oneShotKey = "reset-user-data:wvanloco@gmail.com";
const oneShotPending = !db.prepare("SELECT 1 FROM _ops_log WHERE key = ?").get(oneShotKey);
if (oneShotPending && process.env.NODE_ENV === "production") {
  if (runUserDataReset("wvanloco@gmail.com", "one-shot ops log")) {
    db.prepare("INSERT INTO _ops_log (key) VALUES (?)").run(oneShotKey);
  }
}

// ─── 7. Seed library content ─────────────────────────────────────────────────
// Idempotent — safe to call on every deploy. Only inserts rows that are absent.

const { seedLibrary } = require("./scripts/seed-library-lib.cjs");
try {
  const { topicsAdded, categoriesAdded, itemsAdded } = seedLibrary(db);
  if (topicsAdded === 0 && categoriesAdded === 0 && itemsAdded === 0) {
    console.log("apply-schema: library seed — nothing to add, all content present.");
  } else {
    console.log(
      `apply-schema: library seed — ${topicsAdded} topic(s), ${categoriesAdded} category(ies), ${itemsAdded} item(s) added.`
    );
  }
} catch (err) {
  console.error("apply-schema: library seed failed (non-fatal, will retry on next deploy):", err.message);
}

db.close();
console.log("\napply-schema: done.");
