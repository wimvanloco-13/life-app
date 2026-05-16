# Life App -- Feature Roadmap

> Last updated: 2026-05-16.

## Product Vision

A personal life management app that helps the user live intentionally across all dimensions: time, health, finances, and personal growth. Grounded in the principles of *The 7 Habits of Highly Effective People*, it uses visual feedback and AI assistance to turn goals into daily action.

## Feature Roadmap

Each feature below becomes a separate spec-kit specification. Features are ordered by dependency and daily-use value.

---

### Feature 1: Calendar Management (7 Habits)

**Spec ID**: `001-calendar-management`
**Status**: Built (complete with polish)

**What it does**: A weekly and monthly planning system based on Covey's fourth-generation time management. The user defines life roles (Athlete, Professional, Partner, etc.), sets long-term goals with target dates, selects goals to focus on each week, and uses an auto-scheduler to plan activities across their calendar. Includes a personal mission statement, recurring events, and weekly analytics.

**What has been built**:
- Roles with work role flag and display order (per-role scheduling constraints removed — see Role Scheduling Rules Removal)
- Default Covey-inspired role seeding (Professional, Athlete, Partner, Learner, Friend, Individual)
- Standalone goals with multi-role support, target dates, and per-goal sessions-per-week
- Dynamic urgency derivation from target date (no manual quadrant selection)
- Weekly focus goal picker (select existing goals for this week)
- Week and month calendar views with day columns
- Recurring activity management (create, pause, delete)
- Auto-scheduler with work/personal time windows, rest-day constraints, weekly occurrence caps, and month-scope generation
- Schedule preview and apply workflow
- Mission statement with version history and compass overlay
- Weekly analytics (time by role, by quadrant, goal completion)
- Sidebar navigation with all sections
- SQLite database with Drizzle ORM, daily auto-backup
- Today page with carry-forward and daily summary
- Multi-week trend analytics (4/8/12 week trends)
- Scheduler settings UI
- Loading skeletons
- Keyboard shortcuts
- Responsive layout
- Vitest test suite

**Architectural iterations**:
1. Initial build with weekly-scoped goals and single role per goal
2. Goals Architecture Refactor: standalone goals, weekly focus junction table, dedicated Goals page
3. Multi-role goals, dynamic quadrant derivation, quadrant dropdown removal
4. Smarter Scheduler Algorithm: work/personal windows, rest days, weekend first-class, month scope, per-goal session counts
5. Max weekly occurrences (replaced max consecutive days), default role seeding

**Dependencies**: None.

---

### Feature 2: Fitness Tracking & Training Goals

**Spec ID**: `002-fitness-tracking`
**Status**: Built (fully integrated)

**What it does**: Define activity types with custom metrics (Running, Tennis, Climbing with French grades, Hiking). Log activity entries with activity-specific fields (distance, pace, heart rate, elevation, grades), automatic goal linking, and calendar entry creation. Track body metrics manually (weight, VO2max, resting HR). Goals support measurable targets (activityTypeId, targetMetric, targetValue, targetPeriod) with progress tracking. Default activity types include non-physical activities (Reading, Meditation, Journaling, Social Event). View an activities dashboard with training volume charts, consistency streaks, and trend data.

**What has been built**:
- Activity types (renamed from sports) with custom metrics configuration
- Activity logs (renamed from workouts) with automatic goal linking and calendar entry creation
- Goals support measurable targets (activityTypeId, targetMetric, targetValue, targetPeriod) with progress tracking
- Default activity types include non-physical activities (Reading, Meditation, Journaling, Social Event)
- Schema refactor (sports→activityTypes, workouts→activityLogs), auto-calendar linking, goal progress API, expanded defaults
- Activity type definitions with type (cardio/strength/mixed/wellness/cognitive), icon, tracked toggle, default calories/steps, custom metrics config, variants (e.g., singles/doubles for tennis), French grade system for climbing
- Body metrics tracking (weight in kg, VO2max in ml/kg/min, resting HR in bpm) with trend line charts
- Fitness dashboard with stacked bar chart (weekly training volume by activity type), consistency streaks, latest body metrics with trend arrows, recent activity logs

**Tables changed**: old `sports` → `activity_types`, old `workouts` → `activity_logs`, `sharpen_the_saw_entries` removed

**Routes changed**: `/api/sports` → `/api/activity-types`, `/api/workouts` → `/api/activity-logs`, new `/api/goals/[id]/progress`

**Architectural iterations**:
1. Initial build as standalone fitness module (sports, workouts, body metrics)
2. Unified Activity Integration: renamed tables, added goal targets, auto-calendar linking

**Dependencies**: Feature 1 (calendar) for scheduling training goals.

---

### Feature 3: Budget Management

**Spec ID**: `003-budget-management`
**Status**: Built (complete)

**What it does**: A month-based financial tracker with income, fixed costs, daily spending, and savings goals. All metrics adjust in real time: remaining spending budget, daily allowance, savings progress, and yearly overview. Visual indicators warn when the budget is tight.

**What has been built**:
- Budget settings with currency (EUR), monthly savings target, long-term savings goal with target date
- Income entries with recurring flag (auto-included in future months)
- Fixed costs with category, date range (start/end month), and active/inactive toggle
- Spending log with quick-add form, category select, "category total" mode for lump sums, grouped-by-date list
- Spending categories with icon (emoji), color, display order, archive support, and default seeding (Food, Rent, Utilities, Groceries, Amusement, Clothes, Transport, Other)
- Budget dashboard with 4 summary cards (Income, Fixed Costs, Savings Target, Spending Budget)
- Remaining budget card with color-coded status (green >50%, amber 20–50%, red <20%), days left, daily allowance
- Savings goal progress bar with target amount and date
- Charts (Recharts): spending-by-category donut, category breakdown horizontal bar, 12-month stacked bar (Income, Fixed, Spending, Savings)
- Yearly summary table with monthly breakdown and totals row
- Budget settings dialog (sheet) for savings targets
- Tabbed layout: Dashboard, Log Spending, Income, Fixed Costs, Categories
- Month navigation with "This month" shortcut
- Full CRUD for spending, income, fixed costs, and categories
- Budget summary API aggregating income, fixed costs, spending, savings, daily allowance, and category breakdowns

**Tables added**: `budget_settings`, `income_entries`, `fixed_costs`, `spending_entries`, `spending_categories`

**Routes added**: `/api/budget-settings`, `/api/budget/summary`, `/api/spending`, `/api/spending/[id]`, `/api/spending-categories`, `/api/spending-categories/[id]`, `/api/fixed-costs`, `/api/fixed-costs/[id]`, `/api/income`, `/api/income/[id]`

**Dependencies**: None.

---

### Lucide Icon System Refactor

**Spec ID**: `lucide-icon-refactor`
**Status**: Planned

**What it does**: Replaces the emoji icon system used in spending categories and activity types with named Lucide icons. Currently, both `spending_categories.icon` and `activity_types.icon` store arbitrary emoji strings rendered via a custom `EmojiIcon` component. This conflicts with the design system's core rule — Lucide for all UI icons — and produces inconsistent rendering across platforms and sizes.

The refactor introduces three new shared UI primitives (icon registry, `LucideIcon` rendering component, `IconPicker` grid), updates all default icon values, migrates existing database records in `apply-schema.js`, and replaces every `EmojiIcon` usage across 12 component files. The `icon TEXT` column is unchanged — Lucide icon names are strings and slot directly into the existing schema.

**What will be built**:
- `src/lib/icons.ts` — curated icon sets for categories (`CATEGORY_ICONS`) and activity types (`ACTIVITY_TYPE_ICONS`), plus `getLucideIcon(name)` lookup function
- `src/components/ui/lucide-icon.tsx` — drop-in replacement for `EmojiIcon`; renders Lucide icon by name string with emoji fallback for legacy values
- `src/components/ui/icon-picker.tsx` — reusable grid picker component used in both category and activity type forms
- Updated defaults in `src/lib/defaults.ts` — emoji strings replaced with Lucide names
- Data migration in `apply-schema.js` — UPDATE statements for all default-seeded categories and activity types
- Updated forms: `categories-page.tsx` and `sport-form.tsx` — emoji picker replaced with `IconPicker`
- Updated rendering in 12 component files — `EmojiIcon` replaced with `LucideIcon` throughout
- `emoji-icon.tsx` — deleted once all usages are replaced

**Schema changes**: None. The `icon TEXT` column is unchanged.

**Routes modified**: None. Icon values are a client-side and default-seeding concern only.

**Dependencies**: None (pure UI and data refactor).

---

### Savings Redesign

**Spec ID**: `savings-redesign`
**Status**: Planned

**What it does**: Replaces the broken "leftover money = savings" calculation with an explicit model. Savings are only what you deliberately log. A "Savings" spending category tracks contributions. A "Savings Withdrawal" category tracks dips. A starting balance captures what you already had before tracking began. The savings goal progress on the Dashboard reflects reality.

**What will be built**:
- "Savings" and "Savings Withdrawal" default spending categories (added to `defaults.ts` + seeded for existing users)
- `savingsStartingBalance` column on `budget_settings` (one migration)
- New savings calculation: `starting balance + SUM(Savings entries) − SUM(Savings Withdrawal entries)`
- Starting balance field in Budget Settings dialog
- Savings goal progress card promoted to the Dashboard tab (currently only in Budget Goals tab)

**Schema changes**: Add `savings_starting_balance` to `budget_settings`. No other table changes.

**Routes modified**: `GET/PATCH /api/budget-settings`, `GET /api/budget/summary` (savings calculation rewrite)

**Dependencies**: Feature 3 (Budget Management — built).

---

### Feature 4: Overview Dashboard (Body Visualization)

**Spec ID**: `004-overview-dashboard`
**Status**: Built (complete)

**What it does**: A visual overview of the user's life across all dimensions. Centered on an interactive human body SVG with 7 zones that update with status colors based on real data from calendar, fitness, budget, and personal growth tracking. Shows goal and role streaks to encourage consistency.

**What has been built**:
- Interactive body SVG (200×400 viewBox) with 7 clickable/hoverable zones
- Zone status colors: green (on track), yellow (needs attention), red (falling behind), gray (no data)
- Health score: "X/Y zones on track" summary
- Zone details panel with summary text and bullet-point details on hover/click
- Interactive zone legend with status dots
- Zone-to-data mapping:
  - **Brain** (Learning & Growth): mental activity duration (green ≥2h)
  - **Heart** (Cardio Health): cardio activity session count (green ≥2)
  - **Muscles** (Strength & Training): strength/mixed session count (green ≥2)
  - **Core** (Overall Wellness): weight trend from body metrics (green = stable/decreasing)
  - **Legs** (Athletic Foundation): total athletic session count (green ≥3)
  - **Pocket** (Financial Health): budget remaining percentage (green >50%)
  - **Shoulders** (Social & Emotional): social/emotional activity duration (green ≥1h)
- Goal streaks: consecutive weeks meeting sessionsPerWeek target (12-week lookback)
- Role streaks: consecutive weeks with at least one completed activity (12-week lookback)
- Streak cards with flame icons color-coded by streak length (amber <4, orange 4–7, red ≥8)
- Two-column layout: body + legend on left, zone details + streaks on right
- Overview API aggregating activity logs, body metrics, budget, goals, and roles

**Routes added**: `/api/overview`

**Dependencies**: Features 1, 2, and 3 for data.

---

### Goals V2: Hierarchy, Dashboard & Flexible Tracking

**Spec ID**: `goals-v2`
**Status**: Built (complete)

**What it does**: A full redesign of the Goals section based on real usage feedback. Introduces a two-level goal hierarchy (Yearly → Monthly benchmarks), a visual dashboard with progress rings and pace indicators, simple tally logging for non-athletic goals (books, journal entries, podcasts), and integration with the monthly scheduling wizard so that monthly benchmarks drive weekly session planning.

**What has been built**:
- Two-level goal hierarchy: yearly goals with optional monthly sub-goals (parentGoalId with CASCADE DELETE)
- Goals Dashboard as the default view: yearly goal cards with SVG progress rings, "This Month" section, pace status (Ahead / On Track / Behind / No Data)
- "Incomplete" section for past monthly goals that did not meet their target
- Dashboard/List view toggle for switching between dashboard and flat list views
- Simple tally logging: a "Log Progress" button on any goal, tally count in the same unit as targetUnit
- Auto-generate monthly benchmarks: "Plan for whole year" (12 months) or "Plan from now" (remaining months) toggle
- Target unit support: free-text label (books, km, entries) for display ("4 / 12 books")
- Cumulative pace tracking: progress vs. fraction of year elapsed (±5% threshold), not strict per-month quotas
- Scheduler integration: monthly benchmark `sessionsPerWeek` overrides yearly goal default for that month
- Goal form updated with horizon selector (Yearly / Monthly / Standalone, defaults to Yearly), month picker, yearly parent linking
- Full backward compatibility: existing standalone goals unchanged

**Schema changes**: Add `horizon`, `parent_goal_id`, `month`, `target_unit` to `goals` table (additive). New `goal_tallies` table.

**Routes modified**: `GET/POST/PATCH /api/goals`, `GET /api/goals/:id/progress`, `POST /api/schedule/generate`

**Routes added**: `GET /api/goals/:id/children`, `GET/POST /api/goal-tallies`, `DELETE /api/goal-tallies/:id`

**Dependencies**: Feature 1 (uses existing goals, roles, scheduler).

---

### Scheduler Rules System

**Spec ID**: `scheduler-rules`
**Status**: Built (complete)

**What it does**: A comprehensive rules system for the auto-scheduler that fixes session distribution and adds configurable constraints. Based on real usage where the scheduler was front-loading all sessions into the first week instead of spreading them evenly.

**What has been built**:
- **Weekly spread enforcement**: when enabled (default), caps each goal at its `sessionsPerWeek` per actual ISO week, preventing front-loading
- **Max activities per day**: global cap on how many activities can be scheduled on any single day (default 4)
- **Blackout dates**: days where nothing should be scheduled (holidays, birthdays), with optional yearly recurrence
- **Preferred days per goal**: multi-select day preference (e.g., Running on Tue/Thu/Sat), used as scoring bias with fallback to any day
- **Preferred time slot per goal**: morning (6-12), afternoon (12-17), or evening (17-22) preference
- **Session patterns**: repeating intensity cycle with per-step rest days (e.g., 4km short run → 1 rest day, 4km → 1 rest day, 12km long run → 2 rest days, repeat)
- **Activity type propagation**: scheduled activities inherit `activityTypeId` from their linked goal, enabling correct matching with activity logs and display in the Edit Activity form
- **Randomized tiebreaking**: equal-score days are shuffled to prevent deterministic front-loading
- **Settings UI**: new "Scheduler" tab in Settings with work hours, distribution rules, and blackout date management
- **Schedule regeneration**: "Generate Schedule" always produces a fresh schedule by ignoring existing scheduler-generated activities for focus goals. Old scheduled activities (non-logged, non-completed) are replaced when the new schedule is applied.
- **Schedule reset**: dedicated "Reset" button clears all scheduled (non-logged, non-completed) activities for the month, allowing a clean slate before regenerating.
- **Correct month scoping**: generate endpoint accepts an explicit `month` parameter so the scheduler targets the correct calendar month regardless of which day-of-week the month starts on.

**Schema changes**: Add `enforceWeeklySpread`, `maxActivitiesPerDay` to `scheduler_settings`. Add `preferredDays`, `preferredTimeSlot` to `goals`. New tables: `scheduler_blackout_dates`, `goal_session_patterns`.

**Routes added**: `GET/POST/DELETE /api/scheduler-blackout-dates`, `GET/POST /api/goals/:id/session-patterns`, `DELETE /api/goal-session-patterns/:id`, `POST /api/schedule/reset`

**Routes modified**: `GET/PATCH /api/scheduler-settings`, `POST/PATCH /api/goals`, `POST /api/schedule/generate` (fetches and passes `activityTypeId` from goals), `POST /api/schedule/apply` (persists `activityTypeId` on created activities)

**Dependencies**: Feature 1 (scheduler), Goals V2 (goal form).

---

### Climbing Training Periodization V1

**Spec ID**: `climbing-periodization-v1`
**Status**: Built (complete)

**What it does**: Adds periodization plans to climbing goals. The user enters their climbing profile (max grades, experience), and the app derives their level (beginner/intermediate/advanced) and generates a phase schedule using established periodization models (4-1, 4-3-2-1, or 3-2-1 cycles). The scheduler then produces phase-aware activity titles (e.g., "Climbing — Max Strength & Power (Week 2/3)") instead of generic "Climbing" entries. Manual phase transitions, cycle restart.

**What has been built**:
- Level assessment from grade + experience (conservative of the two)
- 3 periodization models with bouldering/sport modifiers
- Auto-generated phases with date ranges and training focus descriptions
- Phase-aware scheduler titles (title + week number, no algorithm changes)
- Rest phase skips scheduling for the goal
- Phase timeline visualization on goal detail
- Manual phase transition and cycle restart
- Single-form plan creation (no wizard)

**Schema changes**: 2 new tables: `training_plans` (1-to-1 with goals, stores sport profile), `training_phases` (ordered phases with type, dates, status, description). Schema is consolidated for multi-sport support (shared with Tennis V1 via `sport` discriminator and `sport_profile` JSON column).

**Routes added**: `POST /api/training-plans/assess-level`, `GET/POST/DELETE /api/training-plans`, `POST /api/training-phases/:id/transition`, `POST /api/training-plans/:id/restart`

**Follow-up**: Phase descriptions were originally short generic paragraphs. The `climbing-phase-content-upgrade` spec (now built) replaced them with three-layered content (climbing focus, supplemental training, mental training) differentiated by discipline and level, plus a 5-category physical limitation system.

**Dependencies**: Feature 1 (scheduler), Feature 2 (activity types), Goals V2 (goal detail).

---

### Tennis Training Periodization V1

**Spec ID**: `tennis-periodization-v1`
**Status**: Built (complete)

**What it does**: Adds periodization plans to tennis conditioning goals (supplemental training -- not match play). The user enters their self-rated ability, years of play, playing style (baseliner/all-court/serve & volley), and any physical limitations. The app derives their level and generates a phase schedule with tennis-specific periodization models (3-1, 3-3-2-1, or 3-2-1 cycles). Playing style modifiers adjust phase durations. Physical limitation modifiers enrich phase descriptions with sport-specific precautions.

**What has been built**:
- Level assessment from self-rating + years of play (conservative of the two)
- 3 periodization models with playing style duration modifiers
- 6 physical limitation modifiers (shoulder, back, knee, elbow, ankle, adductor) that enrich phase descriptions
- Tennis-specific phase types: Foundation & Prehab, Strength & Power, Tennis-Specific Endurance, Performance, Recovery
- Phase-aware scheduler titles (e.g., "Tennis — Strength & Power (Week 2/3)")
- Recovery phases skip scheduling for the goal
- Tennis-specific plan creation dialog (self-rating, playing style, limitation checkboxes)
- Limitation notes displayed on phase detail
- Consolidated multi-sport schema (shared `training_plans` and `training_phases` tables with `sport` discriminator and `sport_profile` JSON)
- 29+ unit tests covering level assessment, phase generation, limitation notes, style modifiers

**Schema changes**: Reuses consolidated `training_plans` and `training_phases` tables (0 new tables). Added `sport`, `sport_profile` columns to `training_plans`, `limitation_notes` to `training_phases`, renamed `climber_level` → `player_level`, moved climbing-specific columns to `sport_profile` JSON.

**Routes modified**: Existing training plan routes extended with `sport` discriminator. Assess-level endpoint accepts `sport` parameter.

**Follow-up**: Phase descriptions were originally conditioning-only. The `tennis-schedule-refactoring` spec (now built) replaced them with three-layered content (on-court, supplemental, mental game) differentiated by playing style and level.

**Dependencies**: Climbing Periodization V1 (shared schema), Feature 1 (scheduler), Feature 2 (activity types), Goals V2 (goal detail).

---

### Tennis Training Schedule Refactoring

**Spec ID**: `tennis-schedule-refactoring`
**Status**: Built (complete)

**What it does**: Replaces the flat gym-only phase descriptions with three-layered content: on-court focus (differentiated by playing style), supplemental training, and mental game (Inner Game concentration techniques + Winning Ugly tactical concepts in every phase). Makes the training plan actually useful for improving at tennis, not just at planks.

**What has been built**:
- Replaced flat `PHASE_DESCRIPTIONS` with structured `PHASE_CONTENT` object containing three layers per phase
- `buildPhaseDescription()` function assembles descriptions from content, playing style, and level
- Playing-style-specific on-court focus (baseliner vs serve-volley vs all-court) for all 5 phases
- Beginner-specific simplified descriptions for foundation-prehab (on-court + supplemental)
- Inner Game techniques in every phase (nonjudgmental awareness → seam-watching → bounce-hit → breathing between points → effortless effort)
- Winning Ugly tactical concepts in every phase (Know Thyself → Combination to the Lock → Who's Doing What → Pre-Match Checklist → Tournament Tough)
- 37 unit tests covering description structure, style differentiation, beginner overrides, and mental game content

**Schema changes**: None. Descriptions are stored as text in existing `training_phases.description` column.

**Routes modified**: None. Descriptions are generated server-side during plan creation.

**Dependencies**: Tennis Periodization V1 (built).

---

### Climbing Phase Content Upgrade

**Spec ID**: `climbing-phase-content-upgrade`
**Status**: Built (complete)

**What it does**: Mirrors the tennis schedule refactoring for climbing. Replaces flat one-paragraph phase descriptions with structured three-layer content: climbing focus (discipline-specific), supplemental training, and mental training (Hörst's Mental Wings framework). Adds a physical limitation system for climbing-specific injury prevention.

**What has been built**:
- Replaced flat `PHASE_DESCRIPTIONS` with structured `PHASE_CONTENT` object containing three layers per phase
- `buildClimbingPhaseDescription()` function assembles descriptions from content, discipline, and level
- Discipline-specific climbing focus (bouldering vs sport) for all 4 phases
- Beginner-specific overrides for skill-stamina and max-strength-power phases (on-wall + supplemental)
- Mental training grounded in Hörst's Mental Wings framework (ANSWER sequence, pre-climb ritual, tension control, positive self-talk, confidence building, process review)
- 5 climbing-specific physical limitations (fingers/pulleys, shoulder, elbow, back, wrist) with per-phase injury prevention notes
- `buildClimbingLimitationNotes()` function for assembling limitation notes
- Physical limitation toggles added to climbing training plan dialog
- `physicalLimitations` stored in existing `sportProfile` JSON (no schema migration)
- 36 unit tests covering description structure, discipline differentiation, beginner overrides, limitation notes, and all 5 limitation types

**Schema changes**: None. `physicalLimitations` stored in existing `sport_profile` JSON column. `ClimbingLimitation` type and `physicalLimitations` field added to `ClimbingSportProfile` interface.

**Routes modified**: `POST /api/training-plans` and `POST /api/training-plans/:id/restart` updated to pass limitations to phase generation.

**Dependencies**: Climbing Periodization V1 (built), Tennis Periodization V1 (used as reference implementation).

---

### Training vs Supplemental Session Split (V1)

**Spec / working docs**: `Life App/feature requests/training-supplemental-split/` (`scope.md`, `spec.md`, `plan.md`, `tasks.md`)
**Status**: In progress - **Phases 1-6 shipped** (schema through activity edit form). Phase 7 (automated test matrix) not yet started.

**What it does**: Separates **on-wall / sport training** from **gym supplemental** sessions for goals with a training plan. The user configures how many sessions per week are training vs supplemental (must sum to the goal's `sessionsPerWeek`). The scheduler tags each proposed activity with `sessionType` (`training` | `supplemental`), attaches phase notes from the correct content layer, and persists `session_type` when applying the schedule. Climbing is the first sport with **three persisted phase columns** plus split-aware UI; tennis/running reuse existing single `description` until later rollout.

**What has been built**:
- **Schema**: `training_plans` - `training_sessions_per_week`, `supplemental_sessions_per_week`, `training_preferred_days`, `supplemental_preferred_days` (JSON arrays of weekday 1-7). `training_phases` - `sport_focus_content`, `supplemental_content`, `mental_game_content`. `activities` - `session_type` (default `training`). Idempotent `ALTER` + split backfill in `apply-schema.js`.
- **Types & helpers**: `SessionType`, `defaultSplit` / `isValidSplit`, `weeklySessionTargets`, `allocateSplitTotals`, `TrainingPlanSplit` in `src/lib/training/split.ts`.
- **Climbing content**: `buildClimbingPhaseContent()` + phase generation writes three layers; legacy `description` kept; `POST`/`restart`/`refresh-descriptions` populate layers for climbing. Beginner supplemental copy is self-contained (no ambiguous `same exercises` reference).
- **API**: `GET /api/training-plans?goalId=` returns parsed preferred-day arrays; `POST` accepts split + preferred days; `PATCH /api/training-plans/:id` edits split and preferred days; restart preserves split columns. `GET`/`POST`/`PATCH /api/activities` all accept and return `sessionType`.
- **Scheduler**: Dual preferred-day scoring, training placed before supplemental per ISO week, `ProposedActivity.sessionType`, notes from layers with fallback to `description`.
- **Apply**: `POST /api/schedule/apply` persists `sessionType` on new activities.
- **UI (climbing only)**: `TrainingPlanDialog` - split inputs, weekday chips for training vs supplemental preferred days, create vs edit (PATCH), reconcile banner when stored split != goal `sessionsPerWeek`, hint when goal is 2x/wk. Goals page + `TrainingPlanSection` - **Edit plan** entry point.
- **Calendar visual treatment** (Phase 5): Shared helper `src/lib/session-type-styles.ts`. Supplemental sessions render with muted background + Supplemental badge across `day-column.tsx`, `weekly-plan-view.tsx` (incl. `DragOverlay`), `schedule-preview.tsx`, and `daily-view.tsx`. Drag-and-drop preserves the visual treatment.
- **Activity edit form** (Phase 6): `ActivityForm` shows a **Session type** select (Training / Supplemental) when the linked goal has a training plan; hidden otherwise. Backed by `PATCH /api/activities/:id` with optional `sessionType`.

**Follow-up (see `tasks.md`)**: Phase 7 automated test matrix (T031-T034); tennis/running parity deferred by spec. T031 (split helpers) and T032 (scheduler) shipped 2026-05-12; T033 / T034 are manual user tasks.

**Dependencies**: Climbing phase content upgrade (three-layer source content), Feature 1 (scheduler / apply).

---

### Activities Refactoring V1

**Spec / working docs**: `Life App/feature requests/activities-refactoring/` (`scope.md`, `spec.md`, `plan.md`, `tasks.md`)
**Status**: Built (complete, six PRs merged 2026-05-13)

**What it does**: Bridges the long-standing disconnect between scheduled `activities` (calendar slots) and logged `activity_logs` (workout history) without merging the two tables. Checking off a scheduled activity now auto-inserts a corresponding log row (idempotently, using a per-type default duration). Un-checking or deleting a scheduled activity that has a linked log prompts the user once — keep the log untouched, unlink it from the activity but preserve the workout history, or delete it outright — and the client makes that decision optimistically off a `linkedLogId` it already received with the activity GET, so there is no extra round-trip. Manual log entries from the Activity tracker gain an optional goal picker, and the calendar's Schedule Activity dialog no longer hides the goal picker behind a role gate. Activity types gain a `defaultDurationMinutes` field that the bridge uses on check-off.

**What has been built**:
- **Schema**: `activities.is_log_entry` → `created_from_log` (idempotent `PRAGMA`-guarded rename in `apply-schema.js`). New `activity_types.default_duration_minutes INTEGER NOT NULL DEFAULT 60`. Drizzle schema + TypeScript types updated; full grep-and-replace across the codebase.
- **Bridge module**: `src/lib/activities-bridge.ts` exposes `applyCheckOffBridge`, `applyUnCheckBridge`, `applyDeleteBridge`, `parseBridgedLogAction`. Pure functions over a Drizzle DB handle so they are unit-testable on in-memory SQLite (23 tests in `src/lib/__tests__/activities-bridge.test.ts`).
- **API**: `PATCH /api/activities/:id` triggers the bridge on `isCompleted` transitions using the same boolean coercion as the update (handles `1`, `"true"`, etc.). `DELETE /api/activities/:id` returns `409 { linkedLogId }` when a linked log exists and no `bridgedLogAction` is supplied; otherwise it honors `?bridgedLogAction=delete|unlink`. `GET /api/activities` LEFT-JOINs `activity_logs` (user-scoped) to project `linkedLogId`. `POST` returns `linkedLogId: null` for shape parity. `POST /api/activity-types` and `PATCH /api/activity-types/:id` validate `defaultDurationMinutes` as a positive integer (server default 60). `POST /api/activity-logs` was already `goalId`-aware; documenting that the WorkoutLog UI now sets it explicitly.
- **UI**: New `LinkedLogActionDialog` (`mode: "uncheck" | "delete"`) wired into `weekly-plan-view.tsx` and `daily-view.tsx` — optimistic flow off `linkedLogId`. WorkoutLog tab grew an "(optional) Goal" picker. Calendar's `ActivityForm` no longer hides the goal picker behind a role filter; picking a goal now auto-fills the role select with the goal's first linked role when role is unset. Activity-type editor (`sport-form.tsx`) grew a "Default Duration (minutes)" input with client-side positive-integer validation.

**Forward-only**: The bridge fires from check-off forward. Historical scheduled activities that were already ticked off before this release are not retroactively populated into `activity_logs`. Users who relied on the previous "untick to re-tick" workaround to inflate counters will see honest progress now — covered explicitly in the user-facing release notes.

**Schema changes**: `activities.is_log_entry` → `created_from_log`; new `activity_types.default_duration_minutes` column. No new tables, no data loss.

**Routes modified**: `GET / POST / PATCH / DELETE /api/activities`; `GET / POST / PATCH /api/activity-types`; `POST /api/activity-logs` (documentation only — goal picker now feeds it from the WorkoutLog UI).

**Files changed**: `apply-schema.js`, `src/db/schema.ts`, `src/types/index.ts`, `src/lib/activities-bridge.ts` (new), `src/lib/__tests__/activities-bridge.test.ts` (new), `src/app/api/activities/route.ts`, `src/app/api/activities/[id]/route.ts`, `src/app/api/activity-logs/route.ts`, `src/app/api/activity-types/route.ts`, `src/app/api/activity-types/[id]/route.ts`, `src/app/api/schedule/{apply,generate,reset}/route.ts`, `src/components/activities/linked-log-action-dialog.tsx` (new), `src/components/activities/workout-log.tsx`, `src/components/activities/sport-form.tsx`, `src/components/monthly-plan/{weekly-plan-view,day-column,activity-form}.tsx`, `src/components/daily/daily-view.tsx`, `src/lib/__tests__/scheduler.test.ts`.

**Follow-up — V2 "table unification" (deferred)**: A larger refactor that collapses `activities` and `activity_logs` into a single time-block table was scoped and deferred. The surgical V1 bridge model preserves the existing semantic split between scheduled time blocks and logged workouts (which still makes sense for non-trackable activities like Reading or Meditation), and resolved every user-visible disconnect we identified. Revisit only if a future feature has a requirement V1 cannot serve.

**Dependencies**: Feature 1 (calendar / activities), Feature 2 (activity logs / activity types), Goals V2 (goal picker source data).

---

### UI Refinements March

**Spec ID**: `ui-refinements-march`
**Status**: Built (complete)

**What it does**: A multi-phase UI cleanup addressing clutter, unused features, and visual polish. Trims dead features, redesigns the goals form, replaces charts with simpler visualizations, adds drag-and-drop scheduling, and applies a visual polish pass.

**What has been built**:
- **Phase 1 -- Trimming**: Removed `/mission` and `/analytics` routes, pages, API endpoints, sidebar links, and schema tables
- **Phase 2 -- Goals Form Redesign**: Expanded goal form to `max-w-4xl`, reorganized into responsive two-column grid (core details left, scheduling right)
- **Phase 3 -- Activities by Role**: Replaced stacked bar chart with horizontal bar chart showing total scheduled activities per role, with role-colored bars
- **Phase 4 -- Drag-and-Drop**: Added `@dnd-kit/core` drag-and-drop to monthly plan. Activities are draggable between days with optimistic updates and API PATCH
- **Phase 5 -- UI Polish**: Off-white background (`oklch(0.985 0.002 247)`), softer borders, increased radius (`0.75rem`), stat cards with colored icon circles, body metric trend pills (green/red/gray), colored streak badges (amber/orange/red by length), softer role badges (20% opacity tint), `shadow-sm` on all cards
- **Phase 6 -- Training Phase Display**: Scheduler attaches phase descriptions and limitation notes to generated activity notes. Existing training plan phases refreshed with new rich content via `/api/training-plans/refresh-descriptions`. Goal description used as fallback notes for non-training-plan activities.

**Schema changes**: Removed `missionStatements` and `missionStatementVersions` tables.

**Routes removed**: `/api/mission`, `/api/analytics`

**Dependencies**: Feature 1 (calendar), Feature 2 (activities), Goals V2.

---

### First-Time Onboarding Wizard

**Spec ID**: `onboarding-wizard`
**Status**: Removed (built and then removed after review)

**What happened**: A guided 4-step wizard was built and then removed after user review. The feature was deemed unnecessary — users can configure roles, activity types, and scheduler settings directly from the Settings page without needing a wizard walkthrough.

**What was removed**: `OnboardingGate` wrapper, `OnboardingWizard` shell, 4 step components, `hasCompletedOnboarding` column from `scheduler_settings`, "Run Setup Wizard" button from Settings page, migration file.

**What was kept**: `src/lib/defaults.ts` (shared default roles, activity types, and spending categories). Default values are now auto-seeded when the respective database tables are empty (triggered on first API GET call), replacing the manual "Start with Defaults" approach.

---

### UI Design Overhaul

**Spec ID**: `ui-design-overhaul`
**Status**: Built (complete)

**What it does**: A comprehensive visual refactoring of the entire application, shifting the design from a generic dashboard aesthetic to a calm, warm, premium personal life-management tool. Applies the "Impeccable" design skill guidelines and a defined brand personality: calm, warm, grounded, quietly confident.

**What has been built**:
- **Typography overhaul**: Replaced Geist fonts with Plus Jakarta Sans (body), Fraunces (display headings), JetBrains Mono (code). Applied display font to all page titles, card headers, and sidebar branding.
- **Color palette shift**: Changed all neutral `oklch` hues from cool blue (~247) to warm amber (~50) for both light and dark modes. Reduced border radius from `1rem` to `0.625rem`.
- **App shell**: Removed desktop header bar (mobile-only `SidebarTrigger` retained). Replaced emoji sidebar icons with Lucide icons (Sun, CalendarDays, Activity, Wallet, Mountain). Applied Fraunces to "Life App" branding.
- **Motion system**: Added CSS animation keyframes (`fade-up`, `fade-in`), stagger utilities, easing variables (`--ease-out-quart`, `--ease-out-expo`), and `prefers-reduced-motion` fallbacks.
- **Page consistency**: Applied `px-6 py-8 animate-fade-up` padding/animation to all main page wrappers. Applied display font headings across Today, Goals, Activities, Budget, Settings, and all settings sub-pages.
- **Goal card redesign**: Replaced `ProgressRing` with `ProgressBar`. Moved activity type icon inline with title. Hover-only kebab menu. Visual separation with `border-t` for training plan section.
- **Activity graph**: Replaced activity history heatmap with a Recharts `BarChart` showing activities per activity type for the current month. Added `activityByType` data to `/api/activities/summary` response.
- **Scheduler settings polish**: Widened `SheetContent` to `sm:max-w-md`. Replaced checkbox day selectors with styled button toggles in a `grid grid-cols-4`. Added section headings.
- **Drag-and-drop fix**: Changed `DndContext` collision detection from `rectIntersection` to `pointerWithin`. Fixed border layout shift by using consistent `border-2` with transparent/visible color states.
- **Training plan integration**: Added "Create Training Plan" checkbox to goal creation form for new yearly or standalone goals with an activity type. Opens `TrainingPlanDialog` after goal is successfully created.
- **Cascade delete**: `DELETE /api/goals/:id` now cascades to delete linked monthly sub-goals and their role associations.
- **Today tab cleanup**: Removed Quick Add and Daily Summary sections.
- **Ad-hoc activities**: Restored compact "+" button on day columns for creating activities on specific days.

**Schema changes**: None (all changes are UI-only or leverage existing schema).

**Routes modified**: `DELETE /api/goals/:id` (cascading child deletion), `GET /api/activities/summary` (added `activityByType` field).

**Dependencies**: All prior features (UI-only overhaul).

---

### v2 Overhaul: Simplification & Enhanced Integration

**Spec ID**: `v2-overhaul`
**Status**: Complete

**What it does**: Eight changes based on real usage feedback:

1. **Remove Sharpen the Saw** -- feature was too complex and confusing. All UI, API, and `sawDimension` references removed.
2. **Remove Overview Dashboard** -- body visualization added little value. Home page changed to Today tab.
3. **Rename Fitness → Activities** -- broader label that encompasses non-physical activities (Reading, Meditation, etc.).
4. **Body Metrics on Activities Dashboard** -- prominent display with sparklines instead of buried in a sub-tab.
5. **Weekly Activity Volume rename** -- "Training" → "Activity" to match broader scope.
6. **Monthly Plan (replace Weekly Plan)** -- month-only grid view, month navigator showing month names.
7. **Budget Goals & Planned Expenses** -- new `plannedExpenses` table for one-off future costs, savings goal management, yearly overview integration.
8. **Bidirectional Activity Logging** -- log from Activities tab → appears in Today view (auto-completes matching scheduled activity). Log from Today tab → appears in Activities tracker. New `activityTypeId` on `activities` table for matching.

**Tables changed**: `activity_types` (drop `saw_dimension`), `activities` (add `activity_type_id`)
**Tables added**: `planned_expenses`
**Routes removed**: `/api/sharpen-the-saw`, `/api/overview`
**Routes renamed**: `/api/fitness/summary` → `/api/activities/summary`, `/fitness` → `/activities`, `/weekly-plan` → `/monthly-plan`
**Routes added**: `/api/planned-expenses`, `/api/planned-expenses/[id]`

**Data safety**: No database reset required. All existing data preserved. Only destructive change is dropping `saw_dimension` column (feature being removed).

**Dependencies**: Features 1, 2, 3, 4.

---

### Running Training Periodization V1

**Spec ID**: `running-periodization-v1`
**Status**: Built (complete)

**What it does**: Adds periodization plans to running goals. The user enters their running profile (frequency, experience, continuous run capability, race history, goal distance, physical limitations), and the app derives their level (beginner/intermediate/advanced) and generates a phase schedule using established running periodization frameworks. Beginners get a 3-phase model (Base Building → Development → Race Prep + Rest), while intermediate and advanced runners get a 4-phase model (Base & Injury Prevention → Strength & Endurance → Speed & Specificity → Taper & Race + Rest) with goal distance modifiers. The scheduler produces phase-aware activity titles (e.g., "Running — Speed & Specificity (Week 2/4)").

**What has been built**:
- Level assessment from running frequency + years + continuous run capability + race history
- 2 periodization models: 3-phase (beginner), 4-phase (intermediate/advanced)
- 5 goal distance modifiers (5K, 10K, Half Marathon, Marathon, General Fitness) adjusting phase durations
- 6 running-specific physical limitation modifiers (Achilles, Knee, Shin Splints, Plantar Fascia, Back/Scheuermann's, Hip/Adductor) with per-phase precaution notes
- Three-layered phase descriptions (Running Focus, Supplemental Training, Mental Training) differentiated by level and goal distance
- Full phase content for all levels: beginner (3 phases), intermediate (4 phases), advanced (4 phases), plus shared rest phase
- Phase-aware scheduler titles (e.g., "Running — Base Building (Week 3/8)")
- Rest phase skips scheduling for the goal
- Running-specific plan creation dialog (runs/week, years experience, 30-min continuous check, race history, goal distance, longest recent run, limitation checkboxes, start date, live assessment preview)
- Goal distance badge and limitation badges on training plan section
- Running-specific phase color scheme (green/amber/orange/violet/gray)
- `detectSport()` updated to return `null` for unrecognized activity types (prevents fallback to climbing)

**Schema changes**: None (0 new tables, 0 new columns). Reuses consolidated `training_plans` and `training_phases` tables with `sport: "running"` discriminator and `sport_profile` JSON.

**Routes modified**: Existing training plan routes extended with `"running"` branch. Assess-level endpoint accepts `sport: "running"` with running-specific parameters.

**Source material**: Synthesized running science knowledge base (`Running/Running Training - Complete Guide.md`) grounded in Daniels, Lydiard, Maffetone, Seiler (80/20), and Pfitzinger.

**Dependencies**: Climbing Periodization V1 + Tennis Periodization V1 (shared schema), Feature 1 (scheduler), Feature 2 (activity types), Goals V2 (goal detail).

---

---

### Friend Release (Multi-User & Hosted Deployment)

**Spec ID**: `friend-release`
**Status**: Complete
**Completed**: 2026-03-21
**Production URL**: `https://life-app-production-938a.up.railway.app`

**What it does**: Extends the app from single-user local tool to a private, invite-only multi-user application accessible to a small group of friends via a real URL. Each user has their own account, their own isolated data, and the same full app experience. The developer acts as admin and manages all accounts manually.

**Constitutional note**: Requires and is covered by Constitution Amendment v1.1.0 (2026-03-21).

**What was built**:
- Authentication via NextAuth.js v5 with username/password login (no OAuth), JWT sessions, HTTP-only cookie
- `users` table with hashed passwords (bcryptjs, 12 rounds), role (`admin` / `user`), and active flag
- `user_id TEXT NOT NULL` added to all 17 data tables via `apply-schema.js` migration + backfill script
- Removed `.unique()` constraint from `weeklyPlans.weekStartDate` to support multiple users per week
- All ~45 API routes scoped to the authenticated user's ID — unauthenticated requests return 401
- Per-user default seeding on first login via `src/lib/seed-user-defaults.ts` (idempotent)
- Admin-only `/admin/users` page: create accounts, toggle active status, prevent last-admin deactivation
- Conditional sidebar: `LayoutWrapper` component uses `usePathname()` to hide sidebar on `/login`
- "Log out" button and admin link in sidebar (admin link shown only when `role === "admin"`)
- Rate limiting on login: max 5 failed attempts per IP per minute, in-memory counter
- Password change UI in Settings + `PATCH /api/user/password` API route
- Production deployment on Railway: Dockerfile (3-stage Alpine build), `railway.toml` healthcheck at `/api/health` (120s timeout), persistent SQLite volume at `/data`
- Admin bootstrap via env vars: `apply-schema.js` creates admin on first boot if `ADMIN_USERNAME` + `ADMIN_PASSWORD` are set and no users exist
- Container security: starts as root to `chown /data`, then drops to unprivileged `nextjs` user (UID 1001) via `su-exec` before running app code
- `AUTH_TRUST_HOST=true` required in production for NextAuth v5 behind Railway's proxy
- Error logs removed from git history; `Error logs/` added to `.gitignore`

**Tables added**: `users`
**Columns added**: `user_id TEXT NOT NULL` on all 17 data tables (see tasks.md for full list)
**Routes added**: `GET/POST /api/admin/users`, `PATCH /api/admin/users/[id]`, `PATCH /api/user/password`
**Routes modified**: All existing API routes — auth check + user scoping added
**New files**: `src/lib/auth.ts`, `src/lib/seed-user-defaults.ts`, `src/lib/rate-limit.ts`, `src/components/layout/layout-wrapper.tsx`, `src/middleware.ts`, `apply-schema.js`, `Dockerfile`, `railway.toml`

**Dependencies**: All prior features (this is a cross-cutting change).

---

### Role Scheduling Rules Removal

**Spec ID**: `role-scheduling-rules-removal`
**Status**: Built (complete)
**Completed**: 2026-05-15

**What it does**: Removes the per-role scheduling constraint fields (`max_weekly_occurrences`, `min_rest_days`) that were added in Phase 3 but proved confusing in practice. Scheduling caps are now owned entirely by the goal's `sessionsPerWeek` field and the global `schedulerSettings.maxActivitiesPerDay` — there is no per-role cap. A server-side `[1, 7]` clamp on goal `sessionsPerWeek` (POST and PATCH) ensures the field always holds a valid value.

**What was removed**:
- `roles.max_weekly_occurrences` and `roles.min_rest_days` columns (idempotent `ALTER TABLE DROP COLUMN` in `apply-schema.js`)
- `violatesRestConstraints()` function and its two call sites in `scheduler.ts`
- "Max times per week" and "Min rest days" inputs from the role form UI
- Corresponding Drizzle schema fields, TypeScript types, and default-seeding values

**What was added**:
- `clampSessionsPerWeek(value)` helper in `src/lib/goal-validation.ts`
- Server-side clamp applied in `POST /api/goals` and `PATCH /api/goals/:id`
- 12 new unit tests for the clamp helper

**Schema changes**: Dropped `roles.max_weekly_occurrences` and `roles.min_rest_days`.

**Routes modified**: `POST /api/goals`, `PATCH /api/goals/:id` (clamp added). No new routes.

**Dependencies**: Feature 1 (scheduler), Scheduler Rules System.

---

### Habit Tracking

**Spec ID**: `habit-tracking`
**Status**: Built (complete)
**Completed**: 2026-05-16

**What it does**: A dedicated habit-tracking section grounded in the identity-based framework from *Atomic Habits*. Each habit is framed around who the user is becoming (identity) rather than what they are doing (behaviour). The user logs daily completions on a 3-week calendar strip, builds streaks, and is nudged by three editorial principles on every screen. Habits are created through a quick form or a 5-step walkthrough that fills in identity, cue, and minimum version fields progressively.

**What has been built**:
- **Schema**: `habits` table (11 cols: `id`, `user_id`, `identity`, `name`, `cue`, `minimum_version`, `color`, `display_order`, `is_archived`, `created_at`, `updated_at`) and `habit_logs` table (5 cols: `id`, `user_id`, `habit_id`, `date`, `created_at`). Unique index `habit_logs_habit_date_unique` on `(habit_id, date)` enforces at-most-one log per day.
- **Streak logic**: `computeStreaks(dates, today)` in `src/lib/habit-streaks.ts` — pure client-side, no server clock. Returns `{ current, best }` from an array of ISO date strings. 11 unit tests.
- **Date helper**: `formatDateForDisplay(iso)` in `src/lib/dates.ts` converts `YYYY-MM-DD` to `DD-MM-YYYY` for all display. 6 new unit tests.
- **API**: `GET/POST /api/habits` (list with `recentLogDates` last 30 days, create with `displayOrder`), `PATCH/DELETE /api/habits/:id` (update fields + `isArchived`, hard delete), `PUT /api/habits/reorder` (accepts `order: number[]`), `POST/DELETE /api/habit-logs` (both idempotent — POST always 201, DELETE always 204).
- **UI — empty state**: Full-page centered layout: `HabitEmptyState` with "Habits" title (Fraunces), subtitle, primary "Walk me through it" CTA, secondary "Add a habit" text link, editorial principles below.
- **UI — populated view**: Full-width rows (`px-6 py-8` outer padding). Each row: identity block on the left (w-60, Fraunces 17px, name subtitle, streak count, edit/kebab controls), `HabitCalendar` component filling the remaining width on the right. Rows separated by `divide-y`.
- **HabitCalendar**: 3-week calendar grid (last / this / next calendar week, Mon–Sun aligned). Week labels on left, day labels across top, 44px cells with date number. Today gets a ring, future dates are muted and non-interactive.
- **HabitForm**: Quick mode (name + color) and 5-step walkthrough (identity → name/cue → minimum version → color → review). Reused for edit (PATCH) with archive button in footer. 12 state-machine unit tests.
- **HabitPrinciples**: Three editorial house-voice principles. Renders compact in sidebar or horizontal 3-column below the habit list.
- **Management**: Archive/restore (optimistic), hard delete with `HabitDeleteDialog`, drag-to-reorder via `@dnd-kit/sortable` (PointerSensor + KeyboardSensor, wired to `PUT /api/habits/reorder`).
- **Sidebar nav**: "Habits" entry with `Repeat` icon linking to `/habits`.

**Tables added**: `habits`, `habit_logs`

**Routes added**: `GET/POST /api/habits`, `PATCH/DELETE /api/habits/:id`, `PUT /api/habits/reorder`, `POST/DELETE /api/habit-logs`

**Dependencies**: Friend Release (auth + per-user scoping).

---

### Goal Archive Cascade

**Status**: Built (complete)
**Completed**: 2026-05-16

**What was fixed**: Archiving a yearly goal left all its monthly children with `status = "active"`. The `PATCH /api/goals/:id` handler only updated the parent row. Added a second UPDATE after the parent update that cascades `status` to all rows where `parentGoalId = goalId`. Cascade applies to `"archived"` and `"active"` (restore) only — completing a yearly goal does not force-complete its monthly children. The `DELETE` handler already handled children correctly.

**Schema changes**: None.

**Routes modified**: `PATCH /api/goals/:id`.

---

### Activity Form & Type UX Fixes

**Status**: Complete
**Completed**: 2026-04-26

**What was fixed**:
- **Quadrant field removed from Schedule Activity form**: The Quadrant selector was removed from the `ActivityForm` dialog. The value is still stored in the database (defaulting to Q2 for new activities, preserved on edit) but is no longer exposed to the user — it added conceptual overhead without practical value at the individual activity level. Quadrant assignment for goals remains derived from target date as before.
- **Edit activity double-click bug**: Editing an existing activity opened a stale or empty form on the first click, requiring a second click to see correct data. Fixed by adding `key={editingActivity?.id ?? "new"}` to `ActivityForm` in both `weekly-plan-view.tsx` and `daily-view.tsx`, forcing React to mount a fresh form instance for each distinct activity.
- **Activity type categories expanded**: Added `wellness` and `cognitive` to the `ActivityCategory` type enum (previously only `cardio`, `strength`, `mixed`). Default activity types corrected: Meditation and Social Event → `wellness`; Reading and Journaling → `cognitive`.
- **Savings fixed cost future-month inflation**: The savings calculation was incorrectly counting recurring fixed-cost savings contributions for months that hadn't occurred yet when navigating to a future month in the budget view. Fixed by capping the loop upper bound at the current calendar month regardless of which month is being viewed.

**Schema changes**: None.
**Routes modified**: `GET /api/budget/summary` (savings fixed cost calculation).
**Files changed**: `activity-form.tsx`, `weekly-plan-view.tsx`, `daily-view.tsx`, `sport-form.tsx`, `types/index.ts`, `defaults.ts`, `budget/summary/route.ts`.

---

## Roadmap Principles

1. **One feature at a time**: We spec, plan, build, and validate one feature before starting the next. No parallel feature development.
2. **Each feature is usable alone**: Even with only Feature 1 built, the app delivers real daily value. Each subsequent feature adds a new dimension.
3. **Scope is additive, not revisionary**: We don't rewrite earlier features when adding new ones. We extend through well-defined interfaces.
4. **Priorities can shift**: If a later feature becomes urgent, the order can change -- but the spec-driven process remains the same regardless of order.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.x (App Router, Turbopack) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS v4 (oklch theme variables) |
| Components | shadcn/ui |
| Typography | Plus Jakarta Sans (body), Fraunces (display), JetBrains Mono (code) |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| Charts | Recharts |
| Drag & Drop | @dnd-kit/core |
| Date utils | date-fns |
| Theming | next-themes (light/dark) |
| Testing | Vitest + React Testing Library |
