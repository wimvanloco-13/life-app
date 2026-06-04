# System Overview: Life App

> **Purpose**: Single authoritative reference for how the Life App works end-to-end — what pages exist, which components power them, which API routes they call, and which database tables back those routes. Use this alongside `data-model.md` (table schemas) and `contracts/api-routes.md` (route contracts) for a complete picture.
> **Last updated**: 2026-06-04. Reflects all features through Body Metrics Guidance (PRs #52–#56).

---

## What the App Is

A private personal development app for one person (with invite-only multi-user support). It covers four life areas: calendar / scheduling, activities and fitness tracking, budget management, and goals. A Library provides curated reference material for the sports and topics the user trains in. Everything runs locally or on Railway (SQLite on a persistent volume); there is no cloud sync, no public API, and no mobile app.

---

## Navigation Structure

The sidebar is always visible. Sections:

| Group | Page | Route |
|---|---|---|
| Daily Focus | Today | `/today` |
| Daily Focus | Monthly Plan | `/monthly-plan` |
| Life Areas | Activities | `/activities` |
| Life Areas | Budget | `/budget` |
| Life Areas | Goals | `/goals` |
| Life Areas | Habits | `/habits` |
| Library | Tennis | `/library/tennis` |
| Library | Climbing | `/library/climbing` |
| Library | Running | `/library/running` |
| Library | Habit Design | `/library/habit-design` |
| Library | Breathing | `/library/breathing` |
| Library | Budget | `/library/budget` |
| Library | Bookmarks | `/library/bookmarks` |
| Footer | Settings | `/settings` |
| Footer (admin only) | Users | `/admin/users` |

A **"Log big purchase"** icon (shopping bag) lives in the sidebar header. It opens a modal that logs a moment-log entry without leaving any page.

---

## Feature Map

Each entry shows: what the user sees → the primary components → the API routes → the database tables.

---

### Today Dashboard (`/today`)

**What it does**: Shows the user's scheduled activities for today, tracks which are done, and displays weekly goal progress and a habit completion strip.

**Primary components**:
- `src/components/today/today-view.tsx` — main container
- Delegates to activity cards, weekly goal summary, habit strip

**API routes used**:
- `GET /api/activities` — today's scheduled blocks
- `GET /api/weekly-plan` — current week's plan
- `GET /api/weekly-focus-goals` — which goals are in focus this week
- `GET /api/habits` — habits with recent log dates (for strip)
- `POST /api/habit-logs` — mark a habit done
- `DELETE /api/habit-logs` — unmark a habit
- `GET /api/activities/summary` — header stats

**Tables**:
- `activities`, `weeklyPlans`, `weeklyFocusGoals`, `goals`, `habits`, `habitLogs`

---

### Monthly Plan (`/monthly-plan`)

**What it does**: Shows a calendar-style view of the month with scheduled activities. Allows the user to run the scheduler to regenerate upcoming weeks.

**Primary components**:
- `src/components/monthly-plan/monthly-plan-view.tsx`

**API routes used**:
- `GET /api/activities` — all activities in the month range
- `PATCH /api/activities/:id` — check off / uncheck a scheduled activity (triggers the activity-log bridge)
- `DELETE /api/activities/:id` — delete a scheduled activity (accepts optional `bridgedLogAction` query param to handle linked log entries)
- `POST /api/scheduler` — regenerate schedule
- `GET/PATCH /api/scheduler-settings` — scheduler configuration (rest days, horizon)
- `GET/POST/DELETE /api/blackout-dates` — dates to skip scheduling

**Tables**:
- `activities`, `schedulerSettings`, `schedulerBlackoutDates`, `goals`, `goalSessionPatterns`, `recurringActivities`

---

### Activities (`/activities`)

The Activities page has multiple tabs. Each tab is its own major feature.

#### Activities tab (default)

**What it does**: Logs sessions for each activity type (climbing, tennis, running, etc.). Shows a history of logged sessions with custom metrics (duration, calories, sets, distance, etc.).

**Primary components**:
- `src/components/activities/activities-view.tsx`

**API routes used**:
- `GET /api/activity-types` — list of configured activity types
- `GET /api/activity-logs` — session history
- `POST /api/activity-logs` — log a new session
- `DELETE /api/activity-logs/:id` — delete a session
- `GET/POST/PATCH/DELETE /api/activity-types` / `api/activity-types/:id` — manage types

**Tables**:
- `activityTypes`, `activityLogs`, `activities` (for the schedule-to-log bridge)

#### Body Metrics tab

**What it does**: Logs three numeric metrics (Weight in kg, VO2max in ml/kg/min, Resting HR in bpm). Shows trend charts, a 7-day rolling interpretation of each metric against age/sex/height reference standards, and a log history with inline edit and delete.

**Primary components**:
- `src/components/activities/body-metrics-view.tsx` — fetch orchestration, metric tabs, log form, About you card, LogHistoryCard
- `src/components/activities/body-metrics-feedback.tsx` — three interpreted feedback cards (Weight, VO2max, Resting HR) with progressive disclosure
- `src/lib/body-metrics-guidance.ts` — pure interpretation library (no I/O); exports `interpretWeight`, `interpretVo2max`, `interpretRestingHr`

**API routes used**:
- `GET /api/body-metrics` — all logged measurements for the current user
- `POST /api/body-metrics` — log a new measurement
- `PATCH /api/body-metrics/:id` — edit a logged entry (value and/or date)
- `DELETE /api/body-metrics/:id` — delete a logged entry
- `GET /api/body-profile` — user's demographic profile (DOB, sex, height, waist)
- `PATCH /api/body-profile` — upsert profile attributes

**Tables**:
- `bodyMetrics` — time-series measurements
- `userBodyProfiles` — static demographic attributes (one row per user, all nullable)

**Note**: Interpretation is entirely client-side. The server stores and returns raw values; `body-metrics-guidance.ts` computes BMI, WHtR, percentile, and category in the browser.

---

### Budget (`/budget`)

**What it does**: Tracks monthly spending against a budget. Users log transactions to spending categories (fixed costs, variable spending, savings). Shows remaining budget, category breakdown, yearly overview, and a "Moment Log" for large purchase decisions.

**Primary components**:
- `src/components/budget/budget-dashboard.tsx`
- `src/components/budget/budget-targets-panel.tsx`
- `src/components/budget/budget-buckets-panel.tsx`
- `src/components/budget/log-big-purchase-dialog.tsx` (accessible from sidebar)

**API routes used**:
- `GET /api/budget/summary` — monthly overview (income, fixed costs, spent, remaining)
- `GET/PATCH /api/budget-settings` — global budget config (income, currency, savings goal, moment threshold)
- `GET/POST /api/spending-categories` — category list
- `PATCH/DELETE /api/spending-categories/:id` — manage individual categories
- `GET/POST /api/planned-expenses` — one-off future expenses
- `DELETE /api/planned-expenses/:id`
- `GET/POST /api/moment-logs` — big purchase decision records (Housel filter)
- `DELETE /api/moment-logs/:id`

**Tables**:
- `spendingCategories`, `budgetSettings`, `plannedExpenses`, `momentLogs`

---

### Goals (`/goals`)

**What it does**: Long-term goal management. Goals are standalone, optionally linked to one or more roles (life areas). A "weekly focus" mechanism lets the user pick which goals to work on each week. Goals can have tally-based or session-based progress tracking, and can have an attached training plan (periodization).

**Primary components**:
- `src/components/goals/goals-view.tsx` — goal list (Eisenhower matrix quadrants)
- `src/components/goals/goal-detail.tsx` — per-goal detail with progress, sessions, tallies
- `src/components/goals/training-plan-view.tsx` — phase-based periodization

**API routes used**:
- `GET/POST /api/goals` — goal list and creation
- `GET/PATCH/DELETE /api/goals/:id` — individual goal management
- `GET/POST /api/roles` — life area roles
- `PATCH/DELETE /api/roles/:id`
- `POST/DELETE /api/goal-roles` — link/unlink goals and roles
- `GET/POST /api/goal-tallies` — increment/manage tally-based progress
- `DELETE /api/goal-tallies/:id`
- `GET /api/weekly-focus-goals` — which goals are focused this week
- `POST/DELETE /api/weekly-focus-goals/:goalId`
- `GET/POST/PATCH /api/training-plans` — periodization plan for a goal
- `GET/POST/PATCH/DELETE /api/training-phases`

**Tables**:
- `goals`, `roles`, `goalRoles`, `weeklyPlans`, `weeklyFocusGoals`, `goalTallies`, `goalSessionPatterns`, `trainingPlans`, `trainingPhases`

---

### Habits (`/habits`)

**What it does**: Lightweight daily habit tracking using an identity-first frame from Atomic Habits. Each habit has an identity ("I am someone who…"), a name, an optional cue, and an optional minimum version. A 7-day strip shows recent completion. Habits can be reordered by drag-and-drop and archived.

**Primary components**:
- `src/components/habits/habits-view.tsx` — main list with strip and log actions
- `src/components/habits/habit-walkthrough-dialog.tsx` — guided creation flow
- `src/components/habits/habit-quick-add-dialog.tsx` — one-step creation for returning users

**API routes used**:
- `GET /api/habits` — list of habits with recent log dates
- `POST /api/habits` — create habit
- `PATCH /api/habits/:id` — edit, reorder, or archive habit
- `DELETE /api/habits/:id` — delete habit
- `POST /api/habit-logs` — mark a habit done for a date
- `DELETE /api/habit-logs` — unmark (idempotent)

**Tables**:
- `habits`, `habitLogs`

---

### Library (`/library/*`)

**What it does**: Read-only curated content organized by topic (Tennis, Climbing, Running, Habit Design, Breathing, Budget). Users can bookmark individual items. Admin can add, edit, and delete items via the admin panel.

**Primary components**:
- `src/components/library/library-view.tsx` — topic content with bookmark toggle
- `src/components/library/bookmarks-view.tsx` — all bookmarked items across topics

**API routes used**:
- `GET /api/library` — all library items (optionally filtered by topic)
- `GET/POST/PATCH/DELETE /api/library/:id` — admin CRUD
- `GET /api/library/bookmarks` — user's bookmarked items
- `POST /api/library/bookmarks` — add bookmark
- `DELETE /api/library/bookmarks/:id` — remove bookmark

**Tables**:
- `library_topics`, `library_categories`, `library_items` — content tables (no `user_id`; shared across users)
- `library_bookmarks` — per-user bookmarks (`user_id` scoped)

---

### Settings (`/settings`)

**What it does**: User-level settings hub. The main page has a password-change form and links to three sub-sections: Roles (`/settings/roles`), Activity Types (`/settings/activity-types`), and Scheduler (`/settings/scheduler`).

**Primary components**:
- `src/components/settings/settings-page.tsx` — password change + sub-section links
- `src/components/settings/scheduler-rules-page.tsx` — scheduler sub-section

**API routes used**:
- `PATCH /api/user/password` — change the current user's password
- `GET/POST /api/roles`, `PATCH/DELETE /api/roles/:id` — via the Roles sub-section
- `GET/POST/PATCH/DELETE /api/activity-types`, `/api/activity-types/:id` — via Activity Types sub-section
- `GET/PATCH /api/scheduler-settings`, `GET/POST/DELETE /api/blackout-dates` — via Scheduler sub-section

**Tables**:
- `users` (password update), `roles`, `activityTypes`, `schedulerSettings`, `schedulerBlackoutDates`

---

### Admin (`/admin/users`)

**What it does**: Admin-only user management. Create new users, toggle active/inactive. Accessible only when `session.user.role === "admin"`.

**Primary components**:
- `src/components/admin/users-view.tsx`

**API routes used**:
- `GET/POST /api/admin/users`
- `PATCH /api/admin/users/:id`

**Tables**:
- `users`

---

## Cross-Feature Interactions

These are the places where features share data or behaviour:

| Interaction | How it works |
|---|---|
| **Goals ↔ Scheduler** | The scheduler reads `goals`, `goalSessionPatterns`, and `schedulerSettings` to generate `activities`. Changing a goal's `sessionsPerWeek` immediately affects the next scheduler run. |
| **Goals ↔ Weekly Plan** | `weeklyFocusGoals` links goals to the current `weeklyPlan`. The Today view uses this to show which goals are "in focus" this week. |
| **Goals ↔ Activities (session logging)** | `activityLogs.goalId` optionally links a logged session to a goal. This is how activity volume counts toward goal progress. |
| **Goals ↔ Roles** | `goalRoles` is a many-to-many join. The Eisenhower quadrant on the Goals page groups goals by their primary role. |
| **Budget ↔ Sidebar** | The sidebar header fetches `GET /api/budget-settings` on every mount to read `momentThreshold`. This determines when the "Log big purchase" icon triggers the moment log prompt. |
| **Habits ↔ Today** | The Today view renders a habit completion strip using the same `GET /api/habits` response (which includes recent log dates). Checking a habit on Today calls `POST /api/habit-logs`. |
| **Body Metrics ↔ Body Profile** | `body-metrics-feedback.tsx` reads both `allMetrics` and `profile` together. Without a profile (DOB, sex, height), the feedback cards show prompt state instead of computed values. |
| **Activities ↔ Schedule Bridge** | When a user checks off a scheduled activity on the Today page, the app optionally creates a corresponding `activityLog` entry, linking the two systems via `activityLogs.linkedActivityId`. |

---

## Architectural Patterns

These patterns apply consistently across all features. Deviations are bugs, not style.

| Pattern | Rule |
|---|---|
| **Auth** | Every API route calls `auth()` first. No session → 401. |
| **User scoping** | Every query includes `WHERE user_id = session.user.id`. Use `assertOwnership()` for batch ID validation. |
| **Date ownership** | The client computes "today" from browser local time and sends ISO `YYYY-MM-DD` strings. The server trusts what it receives and never synthesises the user's today. |
| **Upserts** | Use Drizzle `insert().onConflictDoUpdate()` for true atomic upserts (e.g. body-profile, budget-settings). SELECT-then-write is a race condition. |
| **Schema migrations** | All changes go through `apply-schema.js` using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS`. Never run `drizzle-kit migrate` in production. |
| **Loading state** | Skeleton layouts that mirror the final layout. `setLoading(true)` at start, `setLoading(false)` in a `finally` block. |
| **Error handling** | Check `res.ok` after every fetch. Show inline errors near the failing field. Never silently swallow API failures. |
| **Parallel fetches** | Use `Promise.all([...])` when a component needs multiple endpoints. |
| **Pure business logic** | Algorithms with no I/O (scheduler, periodization, streak computation, body metric interpretation) live in `src/lib/` as pure functions with Vitest test coverage. |
| **Client-side today for streaks** | `computeStreaks(dates, today)` and `interpretWeight(..., today, ...)` receive `today` as a parameter computed client-side via `new Date().toLocaleDateString("sv-SE")`. |
