# Tasks: Life App

> Last updated: 2026-05-16. Tracks completed work across all features.

---

## Completed Work

### Phase 1: Setup

- [x] Initialize Next.js project with TypeScript, Tailwind CSS, App Router, src/ directory
- [x] Install runtime dependencies: drizzle-orm, better-sqlite3, recharts, date-fns
- [x] Install dev dependencies: drizzle-kit, @types/better-sqlite3
- [x] Initialize shadcn/ui with New York style, Slate base color, CSS variables
- [x] Add shadcn/ui components: button, card, dialog, form, input, label, textarea, select, dropdown-menu, tooltip, separator, badge, tabs, sheet, checkbox
- [x] Create Drizzle ORM configuration in `drizzle.config.ts`
- [x] Create shared TypeScript types in `src/types/index.ts`
- [x] Create date utility helpers in `src/lib/dates.ts`
- [x] Create quadrant helpers in `src/lib/quadrants.ts` (including `deriveQuadrant()`)
- [x] Create role color utility in `src/lib/colors.ts`

### Phase 2: Foundation

- [x] Define database schema in `src/db/schema.ts` (roles, goals, goalRoles, weeklyFocusGoals, weeklyPlans, activities, recurringActivities, schedulerSettings, missionStatements, missionStatementVersions, plus feature tables)
- [x] Create database connection singleton in `src/db/index.ts`
- [x] Run schema push via `npx drizzle-kit push`
- [x] Create daily auto-backup logic in `src/db/backup.ts`
- [x] Create root layout with sidebar navigation
- [x] Create sidebar navigation component (`src/components/layout/app-sidebar.tsx`)
- [x] Create home page redirect to `/today`

### Phase 3: Roles

- [x] Roles API: GET/POST (`src/app/api/roles/route.ts`)
- [x] Roles API: PATCH (`src/app/api/roles/[id]/route.ts`)
- [x] Roles reorder API: PUT (`src/app/api/roles/reorder/route.ts`)
- [x] Role list component (`src/components/roles/role-list.tsx`) with drag-to-reorder
- [x] Role form component (`src/components/roles/role-form.tsx`) with scheduling constraints (work role toggle, max weekly occurrences, min rest days)
- [x] Role badge component (`src/components/roles/role-badge.tsx`)
- [x] Roles page (`src/app/roles/page.tsx`)
- [x] Default Covey role seeding (Professional, Athlete, Partner, Learner, Friend, Individual)

### Phase 4: Mission Statement

- [x] Mission API: GET/POST (`src/app/api/mission/route.ts`)
- [x] Mission statement editor component
- [x] Mission statement history component
- [x] Mission statement page (`src/app/mission/page.tsx`)
- [x] Compass overlay accessible from sidebar

### Phase 5: Goals (refactored architecture)

- [x] Standalone goals API: GET/POST (`src/app/api/goals/route.ts`)
- [x] Goals API: PATCH/DELETE (`src/app/api/goals/[id]/route.ts`)
- [x] Multi-role support via `goalRoles` junction table
- [x] Dynamic quadrant derivation from `targetDate`
- [x] Sessions-per-week field (1-7, default 3)
- [x] Goal form standalone (`src/components/goals/goal-form-standalone.tsx`) with multi-role checkboxes, target date, sessions per week
- [x] Goals page (`src/app/goals/page.tsx`) with filter by status, grouped by role
- [x] Goals sidebar navigation link

### Phase 6: Weekly Planning & Calendar

- [x] Weekly plans API: GET/PATCH (`src/app/api/weekly-plans/route.ts`)
- [x] Weekly focus goals API: GET/POST/DELETE (`src/app/api/weekly-plans/[weekStartDate]/goals/route.ts`)
- [x] Activities API: GET/POST (`src/app/api/activities/route.ts`)
- [x] Activities API: PATCH/DELETE (`src/app/api/activities/[id]/route.ts`)
- [x] Recurring activities API: CRUD (`src/app/api/recurring-activities/`)
- [x] Monthly plan view (`src/components/monthly-plan/weekly-plan-view.tsx`) -- month-only view (week toggle removed in v2)
- [x] Day column component (`src/components/monthly-plan/day-column.tsx`)
- [x] Activity form (`src/components/monthly-plan/activity-form.tsx`)
- [x] Month navigator (inline prev/next buttons)
- [x] Focus picker dialog (`src/components/monthly-plan/focus-picker.tsx`)
- [x] Recurring activity manager (`src/components/monthly-plan/recurring-manager.tsx`)

### Phase 7: Auto-Scheduler

- [x] Scheduler algorithm (`src/lib/scheduler.ts`) with 5-phase approach:
  1. Classify days (work/weekend with time windows)
  2. Calculate sessions needed per goal
  3. Sort by urgency/deadline
  4. Round-robin placement with constraints (work/personal windows, rest days, max weekly occurrences, no same-day repeats)
  5. Generate summary and warnings
- [x] Schedule generate API: POST (`src/app/api/schedule/generate/route.ts`) with week/month scope
- [x] Schedule apply API: POST (`src/app/api/schedule/apply/route.ts`)
- [x] Schedule preview component (`src/components/weekly-plan/schedule-preview.tsx`)
- [x] Scheduler settings API: GET/PATCH (`src/app/api/scheduler-settings/route.ts`)
- [x] Scheduler settings table in database

### Phase 8: Sharpen the Saw (removed in v2 overhaul)

- [x] ~~Sharpen the Saw~~ -- removed: too complex to track, added little value. All files deleted.

### Phase 9: Analytics

- [x] Analytics API: GET (`src/app/api/analytics/route.ts`) with time by role, quadrant, completion rate
- [x] Analytics page (`src/app/analytics/page.tsx`) with charts

### Phase 10: Feature 1 Polish

- [x] Today page: carry-forward for incomplete activities, daily summary card
- [x] Trend analytics API (`/api/analytics/trends`) and multi-week trend charts
- [x] ~~Sharpen the Saw radar chart~~ -- removed in v2 overhaul
- [x] Scheduler settings UI (dialog accessible from weekly plan toolbar)
- [x] Loading skeletons across all pages (shadcn Skeleton component)
- [x] Keyboard shortcuts (N for new activity, G for generate schedule on weekly plan)
- [x] Responsive layout optimization for 1024px screens
- [x] Vitest setup with React Testing Library, tests for quadrants, scheduler, dates, role form

---

## Feature 2: Fitness Tracking (Activity Types & Activity Logs)

*Originally built as "sports" and "workouts"; renamed to activity types and activity logs in Unified Activity Integration.*

### Completed Work

#### Phase 1: Schema & Types (originally: sports, workouts)

- [x] Add `sports` table to schema with: name, type, icon, isTracked, defaultCalories, defaultSteps, metricsConfig (JSON), variants (JSON), gradeSystem
- [x] Add `workouts` table to schema with: sportId FK, activityId FK (nullable), date, durationMinutes, calories, steps, variant, metrics (JSON), notes
- [x] Add `bodyMetrics` table to schema with: date, metricType, value, unit
- [x] Add TypeScript types: `Sport`, `MetricField`, `SportVariant`, `Workout`, `BodyMetric`, `SportType`, `BodyMetricType`
- [x] French climbing grades utility (`src/lib/grades.ts`)
- [x] Delete and recreate database with new schema

#### Phase 2: API Routes (originally: /api/sports, /api/workouts)

- [x] Sports CRUD: GET/POST `/api/sports`, PATCH/DELETE `/api/sports/[id]`
- [x] Workouts CRUD: GET/POST `/api/workouts` (filterable by sportId, date range), PATCH/DELETE `/api/workouts/[id]`
- [x] Body metrics: GET/POST `/api/body-metrics` (filterable by type, date range)
- [x] Fitness summary: GET `/api/fitness/summary` (weekly volume, streaks, latest body metrics, recent workouts)

#### Phase 3: UI Components (originally: Sports page, workout log)

- [x] Sidebar updated with "Activities" and "Activity Types" nav items (renamed from Fitness/Sports in v2)
- [x] Activity Types page (`/activity-types`): card grid, edit/delete dropdown, form dialog (name, icon picker, type, tracked toggle, default calories/steps, metrics config builder, variants builder, French grade system selector), "Start with Defaults" button
- [x] Activities page (`/activities`) with tabs: Dashboard, Log Activity, Body Metrics
- [x] Activity log: type selector, variant picker, duration (hours+minutes), calories/steps auto-fill, dynamic metric fields from type config, French grade dropdown for climbing, notes
- [x] Body metrics: weight/VO2max/resting HR stat cards with trend arrows and sparkline charts, line chart per metric type, log measurement form
- [x] Activities dashboard: total activities/hours/calories stat cards, stacked bar chart of weekly activity volume by type, consistency streaks, prominent body metrics section, recent activities

---

## Unified Activity Integration (completed)

- [x] Renamed `sports` table to `activity_types`
- [x] Renamed `workouts` table to `activity_logs`, added `goalId` field
- [x] Added target fields to `goals` table: `activityTypeId`, `targetMetric`, `targetValue`, `targetPeriod`
- [x] Added `isLogEntry` flag to `activities` table (calendar entries)
- [x] Removed `sharpen_the_saw_entries` table
- [x] Updated all TypeScript types (Sport->ActivityType, Workout->ActivityLog, etc.)
- [x] Created `/api/activity-types` routes (replacing `/api/sports`)
- [x] Created `/api/activity-logs` routes with auto-calendar-link, goal-linking, and date filter on POST/GET
- [x] Created `/api/goals/[id]/progress` endpoint for metric-based goal progress
- [x] Updated goals API to handle target fields and activity type references
- [x] Updated analytics and activities summary APIs for new table names
- [x] Activity Types page: expanded defaults (Running, Hiking, Tennis, Climbing, Reading, Meditation, Journaling, Social Event)
- [x] Activity log form: renamed labels, added Goal selector with auto-select
- [x] Goal form: added Activity Type picker, Target Metric, Target Value, Target Period
- [x] Goals page: progress bars for metric-based goals
- [x] Calendar day column: log entries styled with "logged" badge
- [x] Sidebar: renamed Sports -> Activity Types, route /sports -> /activity-types
- [x] Deleted old /api/sports, /api/workouts routes and /sports page

---

## Feature 3: Budget Management (completed)

- [x] Budget settings API: GET/PATCH (`src/app/api/budget-settings/route.ts`)
- [x] Income CRUD: GET/POST `/api/income`, PATCH/DELETE `/api/income/[id]`
- [x] Fixed costs CRUD: GET/POST `/api/fixed-costs`, PATCH/DELETE `/api/fixed-costs/[id]`
- [x] Spending categories CRUD: GET/POST `/api/spending-categories`, PATCH/DELETE `/api/spending-categories/[id]`
- [x] Spending entries CRUD: GET/POST `/api/spending`, PATCH/DELETE `/api/spending/[id]`
- [x] Budget summary API: GET `/api/budget/summary` with month filter, savings goal calculation, planned expenses
- [x] Planned expenses CRUD: GET/POST `/api/planned-expenses`, PATCH/DELETE `/api/planned-expenses/[id]`
- [x] Budget page (`/budget`) with tabs: Dashboard, Income, Fixed Costs, Spending, Categories, Budget Goals
- [x] Budget dashboard: summary cards, pie chart, category breakdown, monthly overview bar chart (Jan-Dec), yearly summary table
- [x] Budget goals: savings goal with progress bar, planned expenses list with add/edit/delete

## Feature 4: Dockerization (completed)

- [x] Multi-stage Dockerfile (deps, builder, runner)
- [x] docker-compose.yml with named volume for data persistence
- [x] Programmatic Drizzle ORM migrations at startup (`src/db/index.ts`)
- [x] Environment variables for DB_PATH and BACKUP_DIR
- [x] .dockerignore for build optimization

## v2 Overhaul (completed)

- [x] Removed Sharpen the Saw (route, component, API, sidebar, all sawDimension references)
- [x] Removed Overview section (route, components, API, sidebar)
- [x] Renamed Fitness -> Activities (routes, components, API, sidebar)
- [x] Renamed Weekly Plan -> Monthly Plan (routes, components, sidebar, month-only view)
- [x] Enhanced Activities Dashboard (body metrics sparklines, weekly activity volume)
- [x] Added `plannedExpenses` table, CRUD API, Budget Goals tab
- [x] Bidirectional activity logging (activityTypeId on activities, auto-complete, log-and-complete)
- [x] Home page redirects to `/today`
- [x] Old routes (`/fitness`, `/weekly-plan`) redirect to new routes

---

## Goals V2: Hierarchy, Dashboard & Flexible Tracking

**Spec**: `.specify/specs/goals-v2/spec.md`
**Status**: Built (all phases complete)

---

### Phase 1: Schema & Types

> Objective: Add new columns to `goals`, create `goal_tallies` table, push schema, update TypeScript types. No UI changes. All existing data preserved.

- [ ] Add four nullable columns to `goals` table in `src/db/schema.ts`:
  - `horizon`: `text("horizon")` -- values: `'yearly'` | `'monthly'` | null
  - `parentGoalId`: `integer("parent_goal_id").references(() => goals.id, { onDelete: "cascade" })`
  - `month`: `text("month")` -- YYYY-MM format, for monthly goals
  - `targetUnit`: `text("target_unit")` -- free-text display label (e.g., "books", "km", "entries")
- [ ] Create `goalTallies` table in `src/db/schema.ts` with: `id`, `goalId` (FK → goals, CASCADE DELETE), `date`, `count` (default 1), `notes`, `createdAt`
- [ ] Run `npx drizzle-kit push` to apply schema changes
- [ ] Update `Goal` interface in `src/types/index.ts`: add `horizon`, `parentGoalId`, `month`, `targetUnit` fields
- [ ] Add `GoalTally` interface to `src/types/index.ts`
- [ ] Verify existing goals display correctly after schema push (no data lost)

---

### Phase 2: API Layer

> Objective: Update existing goals endpoints to support new fields, add children and tally endpoints, update the progress endpoint to aggregate child goals and tallies.

#### Goals endpoint updates

- [ ] `GET /api/goals` -- add support for `?horizon=`, `?parentId=`, `?month=` query params in `src/app/api/goals/route.ts`
- [ ] `POST /api/goals` -- accept `horizon`, `parentGoalId`, `month`, `targetUnit` in request body
- [ ] `PATCH /api/goals/:id` -- accept `horizon`, `parentGoalId`, `month`, `targetUnit` in `src/app/api/goals/[id]/route.ts`

#### Progress endpoint update

- [ ] `GET /api/goals/:id/progress` -- update `src/app/api/goals/[id]/progress/route.ts` to:
  - For yearly goals: sum activity logs and tallies from ALL child monthly sub-goals + direct logs + direct tallies
  - For tally-based goals (no `activityTypeId`): sum `goal_tallies.count` for the period
  - For yearly horizon: use year-to-date range (Jan 1 → today), return `paceStatus` ('ahead' | 'on_track' | 'behind' | 'no_data') based on elapsed% vs achieved%

#### New: Children endpoint

- [ ] Create `src/app/api/goals/[id]/children/route.ts`:
  - `GET`: return all monthly sub-goals for a yearly goal (goals where `parentGoalId = :id`), each with inline progress

#### New: Tally endpoints

- [ ] Create `src/app/api/goal-tallies/route.ts`:
  - `GET`: list tally entries, support `?goalId=`, `?from=`, `?to=` filters
  - `POST`: create a tally entry (`goalId`, `date`, `count`, `notes`)
- [ ] Create `src/app/api/goal-tallies/[id]/route.ts`:
  - `DELETE`: delete a tally entry by id

---

### Phase 3: Goal Form Updates

> Objective: Update the goal creation/edit form to support horizon selection, monthly linking, auto-generate benchmarks, and tally mode.

- [ ] Add **Horizon selector** at the top of `GoalFormStandalone` in `src/components/goals/goal-form-standalone.tsx`:
  - Three options: "Yearly Goal" | "Monthly Goal" | "Standalone" (default: Standalone to preserve existing behavior)
  - Only show yearly/monthly-specific fields when the relevant horizon is selected
- [ ] For **Yearly horizon**:
  - Show target value field with a unit/label field (e.g., "12 books", "500 km")
  - Show "Auto-generate monthly benchmarks" toggle (creates 12 monthly sub-goals on save)
  - Keep `sessionsPerWeek` as the yearly default
- [ ] For **Monthly horizon**:
  - Show month picker (YYYY-MM) defaulting to current month
  - Show optional "Link to yearly goal" dropdown (list of active yearly goals)
  - Show `sessionsPerWeek` specific to this month
  - Show target value field
- [ ] Handle `POST /api/goals` auto-generate: after creating a yearly goal with the toggle on, POST 12 monthly sub-goals (Jan–Dec of the goal's target year) with `targetValue = yearlyTarget / 12`
- [ ] Validate: monthly goals require a `month` value; yearly goals require a `targetValue` if tally-tracked

---

### Phase 4: Goals Dashboard UI

> Objective: Replace the flat list with a visual dashboard. This is the most significant UI change.

#### Dashboard layout

- [ ] Redesign `src/components/goals/goals-page.tsx` with three sections:
  1. **Yearly Goals grid** -- cards for all active yearly goals
  2. **This Month section** -- monthly goals for the current calendar month
  3. **Standalone Goals** -- compact list of goals with no horizon (unchanged behavior)
- [ ] Add a summary bar at the top: "X of Y yearly goals on track" (count goals with pace status = 'ahead' or 'on_track')
- [ ] The existing flat-list filter bar (Active / Completed / Archived / All) moves to a secondary "View All Goals" toggle that expands the full list below the dashboard sections

#### Yearly Goal Card component

- [ ] Create `src/components/goals/yearly-goal-card.tsx`:
  - Title, role badge(s), target display ("12 books / year")
  - Circular progress ring: current/target percentage using a simple SVG ring (no extra library needed)
  - Pace status badge: color-coded pill (green = Ahead/On Track, amber = Behind, gray = No Data)
  - Current month sub-goal inline: "March: 2 / 1" if a benchmark exists
  - "Log Progress" button (tally) always visible when no activity type is linked
  - Expand/collapse to show full monthly breakdown

#### Monthly Goal Card component

- [ ] Create `src/components/goals/monthly-goal-card.tsx`:
  - Compact card with horizontal progress bar, month label, target value, current count
  - Status badge: "On Track" / "Not Met" / "Achieved"
  - "Log Progress" button

#### Tally Logger component

- [ ] Create `src/components/goals/tally-logger.tsx`:
  - Mini-dialog: date picker (default today), count input (default 1, min 1), notes textarea
  - Confirms on save, shows a brief "Logged!" toast
  - List of past tallies (date, count, note) with delete button per entry

#### Monthly Breakdown component

- [ ] Create `src/components/goals/monthly-breakdown.tsx`:
  - Shown when a yearly goal is expanded
  - 12-month grid or list: each month shows benchmark target, actual progress, status dot
  - "Add Benchmark" button per empty month, "Edit" on existing ones

#### Loading & empty states

- [ ] Add loading skeletons for the dashboard (3 card placeholders per section)
- [ ] Empty state for the yearly goals section: prompt to create first yearly goal
- [ ] Empty state for the "This Month" section if no monthly goals exist for this month

---

### Phase 5: Scheduler Integration

> Objective: Make the monthly auto-scheduler aware of monthly benchmarks so it plans sessions based on what is needed this month, not the yearly default.

- [ ] In `src/app/api/schedule/generate/route.ts`:
  - After loading focus goals, for each goal query `GET /api/goals/:id/children?month=YYYY-MM` (current month)
  - If a matching monthly sub-goal exists, use its `sessionsPerWeek` value for scheduling that goal
  - Calculate remaining sessions: `monthlySessions = monthlySubGoal.sessionsPerWeek * weeksInMonth`, subtract already-completed sessions this month, spread remainder across remaining weeks
- [ ] Update `src/lib/scheduler.ts`:
  - Accept an optional `monthlyOverrides` map: `{ [goalId]: { sessionsPerWeek, remainingSessions } }`
  - When this map is provided, use it instead of the goal's base `sessionsPerWeek`
- [ ] Add a note to the schedule preview that indicates which goals are using a monthly benchmark override (e.g., "Using March benchmark: 5 sessions/week")

---

### Phase 6: Documentation Update

- [ ] Update `specs/master/data-model.md` with new `goals` columns and `goal_tallies` table
- [ ] Update `specs/master/contracts/api-routes.md` with new and modified endpoints
- [ ] Update `AGENT-ONBOARDING.md` to reflect Goals V2 in the "What's Built" table
- [ ] Update `specs/master/tasks.md` -- mark completed tasks as the build progresses

---

## Scheduler Rules System (completed)

- [x] Phase 1: Added `enforceWeeklySpread` and `maxActivitiesPerDay` to `scheduler_settings` schema
- [x] Phase 1: Created `scheduler_blackout_dates` table with date, label, and recurring flag
- [x] Phase 1: Rewrote scheduler to use week-by-week placement loop, respecting `maxActivitiesPerDay`, skipping blackout dates, and using randomized tiebreaking
- [x] Phase 1: Created API endpoints for scheduler blackout dates (`GET/POST/DELETE /api/scheduler-blackout-dates`)
- [x] Phase 1: Updated scheduler settings API to handle new fields
- [x] Phase 1: Added "Scheduler" tab to Settings with global rules UI and blackout date management
- [x] Phase 2: Added `preferredDays` and `preferredTimeSlot` columns to `goals` table
- [x] Phase 2: Updated scheduler to apply preferred days scoring bias and preferred time slot narrowing
- [x] Phase 2: Updated goals API and goal form with preferred days multi-select and time slot dropdown
- [x] Phase 3: Created `goal_session_patterns` table with position, label, and restDaysAfter
- [x] Phase 3: Updated scheduler to cycle through session patterns with per-session rest days
- [x] Phase 3: Created session patterns API (`GET/POST /api/goals/:id/session-patterns`, `DELETE /api/goal-session-patterns/:id`)
- [x] Phase 3: Added collapsible session pattern editor to goal form
- [x] Updated ROADMAP.md, data model, and API contracts with Scheduler Rules System documentation

## Schedule Regeneration & Reset (completed)

- [x] Added `regenerate` flag to `POST /api/schedule/generate` -- ignores existing scheduler-generated activities for focus goals
- [x] Added `month` parameter to `POST /api/schedule/generate` -- fixes month scoping bug where scheduler targeted wrong month when 1st falls on a Sunday
- [x] Updated `POST /api/schedule/apply` to delete old scheduler-generated activities (non-logged, non-completed) for focus goals before inserting new ones
- [x] Created `POST /api/schedule/reset` endpoint -- deletes all non-logged, non-completed activities in a date range
- [x] Added "Reset" button to Monthly Plan toolbar with confirmation dialog
- [x] Generate Schedule button now always produces a fresh schedule (regenerate mode)
- [x] Apply button text changes to "Replace with X Activities" when regenerating

---

## First-Time Onboarding Wizard (removed)

**Spec**: `.specify/specs/onboarding-wizard/spec.md`
**Status**: Built and then removed after user review

- [x] Was fully built (all 7 phases) and then removed
- [x] Removed: `OnboardingGate`, `OnboardingWizard`, 4 step components, `hasCompletedOnboarding` column, migration file, "Run Setup Wizard" button
- [x] Kept: `src/lib/defaults.ts` (shared default definitions, still used by Settings pages)

---

## UI Design Overhaul (completed)

- [x] Typography: Replaced Geist fonts with Plus Jakarta Sans (body), Fraunces (display headings), JetBrains Mono (code)
- [x] Color palette: Shifted all neutral oklch hues from cool blue (~247) to warm amber (~50) for light and dark modes
- [x] Border radius: Reduced from `1rem` to `0.625rem`
- [x] App shell: Removed desktop header bar, replaced emoji sidebar icons with Lucide icons, applied Fraunces branding
- [x] Motion system: Added `fade-up` and `fade-in` keyframes, stagger utilities, easing variables, reduced-motion fallbacks
- [x] Page consistency: Applied `px-6 py-8 animate-fade-up` and display font headings across all pages (Today, Goals, Activities, Budget, Settings, sub-pages)
- [x] Goal card redesign: Replaced `ProgressRing` with `ProgressBar`, hover-only kebab menu, inline activity type icon, `border-t` separator for training plan section
- [x] Activity graph: Replaced heatmap with Recharts `BarChart` showing activities per type for current month, added `activityByType` to `/api/activities/summary`
- [x] Scheduler settings polish: Widened sheet, styled button toggles for day selection, section headings
- [x] Drag-and-drop fix: Changed `DndContext` collision detection to `pointerWithin`, fixed border layout shift with consistent `border-2`
- [x] Training plan in goal creation: Added "Create Training Plan" checkbox to goal form, opens `TrainingPlanDialog` post-creation
- [x] Cascade delete: `DELETE /api/goals/:id` now deletes linked monthly sub-goals and their role associations
- [x] Today tab cleanup: Removed Quick Add and Daily Summary sections
- [x] Ad-hoc activities: Restored compact "+" button on day columns in monthly plan calendar

---

## Running Training Periodization V1 (completed)

- [x] Task 1: Types & Running Periodization Engine — Added `RunnerLevel`, `RunningGoalDistance`, `RunningPhaseType`, `RunningLimitation`, `RunningSportProfile`, `RunningPeriodizationModel` types. Updated `TrainingSport`, `PeriodizationModel`, `PhaseType`, `SportProfile` unions. Implemented `assessRunningLevel()`, `generateRunningPhases()`, `buildRunningPhaseDescription()`, `buildRunningLimitationNotes()`, `getRunningPhaseDisplayName()`. Full three-layered phase content for all levels and goal distances.
- [x] Task 2: API Route Updates — Added `"running"` branch to POST `/api/training-plans`, GET/POST `/api/training-plans/assess-level`, POST `/api/training-plans/:id/restart`.
- [x] Task 3: Scheduler Integration — Running phase display names added to `getPhaseDisplayName()`. Rest phase detection already handles `"rest"`. No algorithm changes needed.
- [x] Task 4: UI — Running Training Plan Dialog — New `RunningTrainingPlanDialog` with runs/week, years, continuous run check, race history, goal distance, longest recent run, limitation checkboxes, start date, live assessment preview. Updated `detectSport()` to return `null` for unrecognized sports.
- [x] Task 5: Training Plan Section Updates — Running phase colors (green/amber/orange/violet/gray), goal distance badge, running limitation badges, limitation notes rendering.
- [x] Task 6: Documentation — Updated ROADMAP.md, data-model.md, tasks.md.

---

## Training vs Supplemental Session Split — Phases 1–6 (2026-05-11)

**Spec**: `Life App/feature requests/training-supplemental-split/spec.md`

- [x] Schema: `training_plans` split + dual preferred-day JSON columns; `training_phases` three content layers; `activities.session_type` — `apply-schema.js` idempotent alters + split backfill.
- [x] Types & helpers: `SessionType`, `TrainingPlanSplit`, `defaultSplit` / `isValidSplit` / `weeklySessionTargets` / `allocateSplitTotals` in `src/lib/training/split.ts`.
- [x] Climbing: `buildClimbingPhaseContent`, phase insert/restart/refresh-descriptions write layers; `POST`/`PATCH` training plans for split + preferred days.
- [x] Scheduler + generate route: split map, layered notes, `ProposedActivity.sessionType`; apply route persists `session_type`.
- [x] UI: climbing `TrainingPlanDialog` (split, weekday chips, create/edit, reconcile banner); Goals page + `TrainingPlanSection` **Edit plan**; regression test in `training-supplemental-split.test.ts` (restart split preservation); scheduler test for session tagging.

**Not done yet** (see feature `tasks.md`): full Phase 7 test matrix; any remaining doc polish (T035c-style entries). **Done:** Phases 5–6 — calendar/badge styling for supplemental rows; activity form session-type control; `sessionType` on `GET`/`POST`/`PATCH` activities.

---

## Training vs Supplemental Split — Phase 7 unit tests (2026-05-12)

**Spec**: `Life App/feature requests/training-supplemental-split/spec.md`

- [x] T031 — Unit tests for `src/lib/training/split.ts` covering `defaultSplit`, `isValidSplit`, `weeklySessionTargets`, `allocateSplitTotals` (boundary, sum, and invalid-input cases). PR #2.
- [x] T032 — Scheduler tests covering split allocation across goals (training-then-supplemental order per ISO week, preferred-day bias from dual day arrays, layered note assembly with `description` fallback). PR #3.

**Manual tasks owned by the user** (per feature `tasks.md`): T033 integration walkthrough, T034 regression sweep.

---

## Activities Refactoring V1 — Phases 1–6 (2026-05-13)

**Spec**: `Life App/feature requests/activities-refactoring/spec.md`

Bridges the long-standing disconnect between scheduled `activities` and logged `activity_logs` without merging the two tables. Six small additive PRs against `master`, all merged.

- [x] **Phase 1 — Schema and renaming** (PR #4): Renamed `activities.is_log_entry` → `created_from_log` (idempotent `PRAGMA`-guarded `ALTER TABLE RENAME COLUMN` in `apply-schema.js`). Added `activity_types.default_duration_minutes` (NOT NULL DEFAULT 60). Updated Drizzle schema, `Activity` / `ActivityType` TypeScript types, and grep-and-replaced all `isLogEntry` call sites across API routes, scheduler, scheduler tests, and the day-column UI.
- [x] **Phase 2 — Server bridges** (PR #5): Extracted bridge logic into a pure, Drizzle-typed module `src/lib/activities-bridge.ts` with `applyCheckOffBridge`, `applyUnCheckBridge`, `applyDeleteBridge`, `parseBridgedLogAction`. Wired into `PATCH /api/activities/[id]` (check-off inserts a log idempotently using `default_duration_minutes`; un-check applies `bridgedLogAction` `delete` / `unlink` unconditionally) and `DELETE /api/activities/[id]` (returns `409 { linkedLogId }` when a linked log exists and no action is supplied, otherwise honors `?bridgedLogAction=`). `GET /api/activities` LEFT-JOINs `activity_logs` (user-scoped) to project the derived `linkedLogId` field; POST returns `linkedLogId: null` for shape parity. 23 unit tests in `src/lib/__tests__/activities-bridge.test.ts` covering insert, idempotency, unlink, delete, user-scope isolation, and the `bridgedLogAction` parser.
- [x] **Phase 3 — Calendar un-check dialog** (PR #6): New `src/components/activities/linked-log-action-dialog.tsx` (dual `mode: "uncheck" | "delete"` component, stacked option buttons + cancel). Wired un-check handler in `weekly-plan-view.tsx` and `daily-view.tsx` so the client opens the dialog purely off the `linkedLogId` it already has from GET (optimistic flow, no extra fetch). `daily-view.tsx` re-fetches `activityLogs` after a bridged un-check so workout history reflects the user's choice immediately.
- [x] **Phase 4 — WorkoutLog goal picker** (PR #7): Added an "(optional) Goal" select to the manual Log Activity tab (`src/components/activities/workout-log.tsx`), populated from `GET /api/goals?status=active`, hidden when the user has no active goals. The selected `goalId` is sent verbatim on `POST /api/activity-logs`.
- [x] **Phase 5 — Calendar Schedule Activity gate removal + role auto-fill** (PR #8): Removed the role-based goal filter in `src/components/monthly-plan/activity-form.tsx` so the goal picker is no longer hidden when the role select is empty. Picking a goal now auto-fills the role select with the goal's first linked role when role is currently unset, removing a common silent UX dead-end.
- [x] **Phase 6 — Activity-type editor default duration** (PR #9): Added a "Default Duration (minutes)" number input (always visible, helper text explaining the bridge use) to `src/components/activities/sport-form.tsx` with client-side positive-integer validation. Wired `defaultDurationMinutes` through `POST` and `PATCH /api/activity-types`.

**Verification across all phases**: `npx tsc --noEmit` clean, 228 passing tests with no regressions, `npm run lint` baseline (41 errors / 12 warnings, all pre-existing) unchanged.

**Manual tasks owned by the user** (per feature `tasks.md`): T018 climbing-happy-path integration walkthrough, T019 regression sweep (tennis/running existing plans, generic activity without type, `goal_tallies` untouched).

**Deferred**: A V2 "table unification" candidate (collapsing `activities` and `activity_logs` into one schema) was considered and deferred — the surgical V1 bridge model preserves the existing semantic split (scheduled time blocks vs logged workouts) and was sufficient for every user-visible disconnect we identified.

---

## Scheduler & Goal Form Fixes (completed)

- [x] Training plan availability extended to standalone goals (was yearly-only). Updated condition in `goal-form-standalone.tsx` and save payload.
- [x] Bug fix: Scheduled activities now inherit `activityTypeId` from their linked goal. Added `activityTypeId` field to `ProposedActivity` interface in `scheduler.ts`, populated it in `commitSession()` from `goal.activityTypeId`.
- [x] Bug fix: `POST /api/schedule/generate` was not fetching `activityTypeId` from the goals table. Added it to the SQL select and mapped goal objects.
- [x] Bug fix: `POST /api/schedule/apply` was not persisting `activityTypeId` when inserting activities. Added it to the insert values.
- [x] Auto-seeding of defaults: Roles, activity types, and spending categories are now auto-seeded when their respective tables are empty (on first API GET call). Added `seedDefaultRoles()`, `seedDefaultActivityTypes()`, `seedDefaultCategories()` to API route handlers.
- [x] Spending category defaults extracted to `src/lib/defaults.ts` (`DEFAULT_SPENDING_CATEGORIES`).
- [x] Default goal horizon changed from "Standalone" to "Yearly" in `goal-form-standalone.tsx`, with auto-filled target date (Dec 31 of current year).

---

## Architecture Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-03 | Initial build | MVP of all Feature 1 user stories |
| 2026-03-03 | Goals Architecture Refactor | Goals changed from weekly-scoped to standalone with `targetDate`, `status`, and `weeklyFocusGoals` junction table |
| 2026-03-03 | Multi-role goals | Added `goalRoles` junction table for many-to-many goals ↔ roles. Removed explicit quadrant input (now derived from target date) |
| 2026-03-03 | Sharpen the Saw improvements | Added hours input, goal linking via `goalId` |
| 2026-03-03 | Calendar view improvements | Removed confusing Focus tab, added month view toggle, added recurring activity manager |
| 2026-03-03 | Smarter Scheduler Algorithm | Work/personal time windows, rest-day constraints, per-goal session counts, weekend first-class, month-scope generation |
| 2026-03-04 | Max weekly occurrences | Replaced `maxConsecutiveDays` with simpler `maxWeeklyOccurrences` on roles |
| 2026-03-04 | Default role seeding | Added Covey-inspired default roles with one-click seeding |
| 2026-03-04 | Feature 2: Fitness Tracking | Sports definitions, workout logging with sport-specific metrics, body metrics tracking, fitness dashboard |
| 2026-03-04 | Feature 1 Polish | Carry-forward, trends, radar chart, skeletons, keyboard shortcuts, responsive layout, Vitest tests, scheduler settings UI |
| 2026-03-05 | Unified Activity Integration | Sports->ActivityTypes, Workouts->ActivityLogs, SharpenTheSawEntries removed, Goals get target metrics, auto-calendar from logs |
| 2026-03-10 | Feature 3: Budget Management | Income, fixed costs, spending categories, spending entries, budget settings, budget dashboard with charts and yearly overview |
| 2026-03-10 | Feature 4: Dockerization | Multi-stage Dockerfile, docker-compose with named volume, programmatic migrations at startup, DB backups |
| 2026-03-11 | v2 Overhaul | Removed Sharpen the Saw and Overview. Renamed Fitness->Activities, Weekly Plan->Monthly Plan. Added planned expenses, budget goals with savings tracking, bidirectional activity logging, body metrics sparklines. Home redirects to /today |
| 2026-03-11 | Budget fixes | Fixed costs apply to all months (ongoing), savings goal uses actual income-expense data, yearly overview starts in January |
| 2026-03-12 | Goals V2 | Two-level goal hierarchy (yearly → monthly), dashboard with progress rings, tally logging, auto-generate monthly benchmarks, scheduler integration |
| 2026-03-12 | UI Refactoring V1 | Sidebar cleanup, empty states, breathing room, dark mode foundation, visual consistency (EmojiIcon, palette utility) |
| 2026-03-14 | Scheduler Rules System | Weekly spread enforcement, max activities per day, blackout dates, preferred days/time per goal, session patterns with per-step rest days |
| 2026-03-14 | Schedule regeneration & reset | Generate always produces fresh schedule, apply replaces old activities, new reset endpoint and button, month scoping fix |
| 2026-03-19 | First-Time Onboarding Wizard | Built and then removed after review. Defaults extraction to shared module kept. |
| 2026-03-20 | UI Design Overhaul | Typography (Plus Jakarta Sans + Fraunces + JetBrains Mono), warm amber color palette, Lucide sidebar icons, motion system, goal card redesign, activity bar chart, DnD fix, training plan in goal creation, cascade delete, Today tab cleanup |
| 2026-03-20 | Running Training Periodization V1 | Running periodization engine (3-phase beginner, 4-phase intermediate/advanced), 5 goal distance modifiers, 6 physical limitation modifiers, three-layered phase descriptions, RunningTrainingPlanDialog, detectSport() updated, phase colors, 0 schema changes |
| 2026-03-21 | Scheduler & Goal Form Fixes | Training plans extended to standalone goals, activityTypeId propagation fix (scheduler → apply route), auto-seeding defaults (roles, activity types, spending categories), default goal horizon changed to "Yearly" |
| 2026-05-11 | Training vs Supplemental Session Split (V1, partial) | Schema + climbing layer columns + split-aware scheduler + apply `session_type` + climbing training-plan dialog (split / preferred days / edit). ROADMAP, `data-model.md`, `api-routes.md` updated. Phases 5–7 pending — see `feature requests/training-supplemental-split/tasks.md`. |
| 2026-05-12 | Training vs Supplemental Split — Phase 7 unit tests | T031 split-helper tests and T032 scheduler tests (training-then-supplemental ordering, dual preferred-day bias, layered note fallback). Manual T033 / T034 deferred to the user. |
| 2026-05-13 | Activities Refactoring V1 | Renamed `activities.is_log_entry` → `created_from_log`; added `activity_types.default_duration_minutes`. New schedule-to-log bridge in `activities-bridge.ts` wired into `PATCH /api/activities/:id` (check-off inserts an idempotent log; un-check honors `bridgedLogAction`) and `DELETE /api/activities/:id` (409 + `linkedLogId` when a linked log exists and no `bridgedLogAction` is supplied). `GET /api/activities` projects derived `linkedLogId`. New `LinkedLogActionDialog` drives optimistic un-check / delete prompts. WorkoutLog goal picker, calendar Schedule Activity goal-picker gate removal with role auto-fill, and activity-type editor default-duration input. Six PRs (#4–#9) on master. |
| 2026-05-15 | Role Scheduling Rules Removal | Dropped `roles.max_weekly_occurrences` and `roles.min_rest_days` columns (idempotent migration in `apply-schema.js`), schema/types/defaults/seed cleaned, role form's "max times per week" and "min rest days" inputs removed, and the `violatesRestConstraints` function plus its two call sites in `scheduler.ts` deleted. Goal-level `sessionsPerWeek` and `schedulerSettings.maxActivitiesPerDay` now own scheduling caps. Added server-side `[1, 7]` clamp on `POST` and `PATCH /api/goals` via new `clampSessionsPerWeek` helper (the form already enforces the same bounds). Two obsolete scheduler tests removed; two new tests cover SC-001 (sessionsPerWeek=7 places 7) and Acceptance 1.3 (consecutive-day placement allowed). New `goal-validation` test file covers the clamp (12 cases). |
| 2026-05-15 | Habit Tracking Phase 1 (foundation) | New `habits` table (11 cols) and `habit_logs` table (5 cols) in `apply-schema.js` and Drizzle schema. Unique index `habit_logs_habit_date_unique` on `(habit_id, date)` enforces at-most-one log per day. TypeScript types: `Habit`, `HabitLog`, `HabitWithRecentLogs`, `HabitDraft`. New `formatDateForDisplay(iso)` helper converts ISO `YYYY-MM-DD` to user-facing `DD-MM-YYYY`. New `computeStreaks(dates, today)` helper in `src/lib/habit-streaks.ts` computes `{ current, best }` client-side -- server returns raw `recentLogDates` (last 30 days) and never decides what today is. API: `GET`/`POST /api/habits`, `PATCH`/`DELETE /api/habits/:id`, `PUT /api/habits/reorder`, `POST`/`DELETE /api/habit-logs` (both idempotent -- POST always 201, DELETE always 204). 17 new unit tests. PR #17. Phases 2-4 (UI, manage, polish) pending. |
| 2026-05-15 | Habit Tracking Phases 2-4 (UI + manage + polish) | Phase 2: sidebar nav, /habits page, HabitList client component, HabitRow, 14-day HabitStrip (DD-MM-YYYY tooltip, per-cell in-flight guard), optimistic toggle with inline affirmation, HabitForm (quick + 5-step walkthrough state machine). Phase 3: kebab menu per row, edit flow (PATCH + archive button in form), archive/restore (optimistic), hard delete with HabitDeleteDialog, drag-to-reorder via @dnd-kit/sortable (PointerSensor + KeyboardSensor, PUT /api/habits/reorder). Phase 4: HabitEmptyState editorial block (three house-voice principles, CTA inversion). 12 new walkthrough state-machine tests. PRs #19, #20, #21. Feature complete. |
| 2026-05-15 | Small UX fixes batch (PRs #11–#15) | (1) Activity-type-filtered goal picker: goal dropdown in WorkoutLog and Schedule Activity now only shows goals whose `activityTypeId` matches the selected activity type; resets to null when type changes. (2) Activity type edit form: fixed stale/empty form bug by adding `key={editingType?.id}` to force React remount on each distinct type. (3) Goal-progress sessions fix (hotfix PR #15): yearly and monthly goals with `targetMetric: null` were not counting `activity_logs`; fixed the progress query to include logs regardless of metric. (4) Goals delete: removed the non-functional "Delete" option from the goals kebab menu; archive is the correct action. (5) Body-metric sparkline RangeError: guarded the sparkline calculation against empty arrays to prevent crashes on the Activities dashboard. |
| 2026-05-15 | Habits UI — empty state redesign (PR #22) | Removed redundant "Habits" h1 and top-right button from the empty state. New `HabitEmptyState` owns the full page: centered title, subtitle, primary "Walk me through it" CTA, secondary "Add a habit" text link, and editorial principles below. |
| 2026-05-16 | Habits UI — 3-week HabitCalendar + full-width rows (PRs #23–#25) | New `HabitCalendar` component: shows last/this/next calendar week (Mon–Sun) with week labels, day labels, 44px cells, today ring, future dates muted. HabitRow redesigned as a full-width row (no card border): identity block (Fraunces, w-60) on the left, 3-week calendar filling remaining width on the right. Rows separated by thin dividers. HabitPrinciples gains `horizontal` prop (grid-cols-3 below the list, full width). `HabitCalendar` extracted from `HabitStrip`. Always-visible pencil icon replaces hidden kebab edit. |
| 2026-05-16 | Habits UI — page padding and typography polish (PR #26) | Added `px-6 py-8` outer padding to HabitList (matches Goals page benchmark). Identity text bumped to 17px; name subtitle to text-sm (14px); streak, day labels, week labels all increased. Left column widened to w-60; row gap to gap-12; row padding to py-8. Icons from w-3.5 to w-4. Skeleton updated to match. |
| 2026-05-16 | Goal archive cascade + user reset script (PR #27) | Bug fix: `PATCH /api/goals/:id` now cascades `status` to monthly children when value is `"archived"` or `"active"` (restore). Completing a yearly goal does NOT cascade. New `scripts/reset-user-data.js`: Node.js utility (uses better-sqlite3) that deletes all data for a given username in FK-safe order while keeping the user account intact. |
