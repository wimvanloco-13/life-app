# Feature Specifications Registry

> **Purpose**: A condensed, single-file reference for all implemented and in-progress features. For each feature: what it does, the key design decisions that were locked during scope review, and the technical footprint (tables and routes introduced or modified). Full user stories, acceptance scenarios, and implementation details live in the individual spec files linked from each section.
>
> **What this is NOT**: a concatenation of all specs. Aggregating 4,000+ lines of user stories here would make this file harder to navigate than reading the individual files. Keep heavy detail there; keep decisions here.
>
> **Last updated**: 2026-06-04. Covers all features through Body Metrics Guidance (PRs #52–#56).

---

## Table of Contents

1. [Calendar Management](#1-calendar-management)
2. [Activities & Fitness Tracking](#2-activities--fitness-tracking)
3. [Budget Management](#3-budget-management)
4. [Savings Redesign](#4-savings-redesign)
5. [Budget Expansion (Moment Logs & Planned Expenses)](#5-budget-expansion-moment-logs--planned-expenses)
6. [Overview Dashboard](#6-overview-dashboard)
7. [Goals V2](#7-goals-v2)
8. [Friend Release (Multi-User)](#8-friend-release-multi-user)
9. [Role Scheduling Rules Removal](#9-role-scheduling-rules-removal)
10. [Goal Progress Sessions Fix](#10-goal-progress-sessions-fix)
11. [Training / Supplemental Session Split](#11-training--supplemental-session-split)
12. [Habit Tracking](#12-habit-tracking)
13. [Body Metrics Guidance](#13-body-metrics-guidance)

---

## 1. Calendar Management

**Spec**: `.specify/specs/001-calendar-management/spec.md`
**Status**: Built (complete with polish)
**Feature ID**: `001-calendar-management`

A weekly and monthly planning system based on Covey's fourth-generation time management. The user defines life roles, sets long-term goals with target dates, selects goals to focus on each week, and uses an auto-scheduler to plan activities.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Goals are standalone (not nested inside weeks) | Stable quarterly/yearly planning; weekly focus is a view, not goal ownership |
| Dynamic urgency from target date | No manual quadrant selection; Q1 = overdue or within 7 days, Q2 = otherwise |
| Weekly focus is a junction table (`weekly_focus_goals`) | Users pick existing goals for each week without rewriting the goals |
| Scheduler scope = one month at a time | Predictable horizon; scheduler does not generate farther than the configured month |
| Work-role flag controls time-of-day window | Work-role activities → 9-5 slot; non-work → evenings/weekends |
| Rest days configurable globally in scheduler settings | Prevents scheduling on chosen weekdays |

### Technical Footprint

**Tables**: `roles`, `goals`, `goal_roles`, `weekly_plans`, `weekly_focus_goals`, `activities`, `recurring_activities`, `scheduler_settings`, `scheduler_blackout_dates`, `goal_session_patterns`

**Key routes**: `GET/POST /api/goals`, `GET/PATCH/DELETE /api/goals/:id`, `GET/POST /api/roles`, `PATCH/DELETE /api/roles/:id`, `POST /api/scheduler`, `GET/PATCH /api/scheduler-settings`, `GET/POST /api/weekly-plan`, `GET/POST/DELETE /api/weekly-focus-goals/:goalId`, `GET/POST/DELETE /api/blackout-dates`

**Key library**: `src/lib/scheduler.ts` (pure function, fully tested)

---

## 2. Activities & Fitness Tracking

**Spec**: `ROADMAP.md` — Feature 2
**Status**: Built (fully integrated)
**Feature ID**: `002-fitness-tracking`

Define activity types with custom metrics. Log sessions with activity-specific fields and automatic goal linking. Track body metrics (weight, VO2max, resting HR) with trend charts.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Tables renamed: `sports` → `activity_types`, `workouts` → `activity_logs` | More accurate naming; sports excluded non-athletic activities |
| `sharpen_the_saw_entries` table removed | Consolidated into the unified activity log |
| Activity log auto-creates a calendar entry when the user picks a schedule slot | Keeps calendar accurate with what was actually done |
| Body metrics stored in a separate `body_metrics` table (not in activity logs) | Different time-series nature; separate charting |
| Custom metrics per activity type stored as JSON config | Flexible without schema migrations for each new sport metric |
| French grade system for climbing (7a, 7a+, etc.) | User-specified requirement; stored as a string grade, not numeric |

### Technical Footprint

**Tables**: `activity_types`, `activity_logs`, `body_metrics`

**Key routes**: `GET/POST /api/activity-types`, `PATCH/DELETE /api/activity-types/:id`, `GET/POST /api/activity-logs`, `DELETE /api/activity-logs/:id`, `GET /api/activities/summary`, `GET/POST /api/body-metrics`, `PATCH/DELETE /api/body-metrics/:id`, `GET /api/goals/:id/progress`

---

## 3. Budget Management

**Spec**: `ROADMAP.md` — Feature 3
**Status**: Built (complete)
**Feature ID**: `003-budget-management`

Month-based financial tracker with income, fixed costs, daily spending, and savings goals. All summary metrics recalculate in real time.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Currency locked to EUR | Single-user app; no multi-currency complexity |
| Spending categories are user-managed (not predefined) | User controls their own budget taxonomy |
| "Category total" mode in spending log | Log a lump sum for a category at month-end without itemizing |
| Budget summary is a single aggregation API call | Client renders from one GET, no client-side aggregation |
| Month navigation on the Log Spending tab | View past months without changing the budget settings |
| Fixed costs have date ranges (start/end month) | Supports one-time and recurring fixed obligations |

### Technical Footprint

**Tables**: `budget_settings`, `income_entries`, `fixed_costs`, `spending_entries`, `spending_categories`

**Key routes**: `GET/PATCH /api/budget-settings`, `GET /api/budget/summary`, `GET/POST /api/spending`, `PATCH/DELETE /api/spending/:id`, `GET/POST /api/spending-categories`, `PATCH/DELETE /api/spending-categories/:id`, `GET/POST /api/fixed-costs`, `PATCH/DELETE /api/fixed-costs/:id`, `GET/POST /api/income`, `PATCH/DELETE /api/income/:id`

---

## 4. Savings Redesign

**Spec**: `.specify/specs/savings-redesign/spec.md`
**Status**: Built (complete)

Replaces implicit "leftover = savings" logic with an explicit model. Savings are only what the user deliberately logs. A `savingsStartingBalance` captures pre-tracking history.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| "Savings" and "Savings Withdrawal" are dedicated spending categories | Keeps the existing spending-entry model; no new table |
| `savings_starting_balance` on `budget_settings` | Captures what the user already had before tracking started |
| Savings calculation: `starting_balance + SUM(Savings entries) - SUM(Withdrawals)` | Exact, auditable; no inference |

### Technical Footprint

**Schema change**: `ALTER TABLE budget_settings ADD COLUMN savings_starting_balance`

**Routes modified**: `GET/PATCH /api/budget-settings`, `GET /api/budget/summary` (savings calculation rewrite)

---

## 5. Budget Expansion (Moment Logs & Planned Expenses)

**Spec**: `feature requests/budget-expansion/housel-framings.md` (reference material only; no full spec file)
**Status**: Built

Two additions to the budget system: planned one-off future expenses visible in the monthly overview, and "Moment Logs" for big purchase decisions using Morgan Housel's framing questions.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Moment Log triggered from sidebar header icon | Big purchases happen outside the budget flow; access from anywhere |
| Moment threshold configurable in budget settings | "Big purchase" threshold is personal; defaults to 200 EUR |
| Planned expenses are display-only in the current month summary | Shows future obligations without affecting spending totals |
| Housel filter (not financial advice) | The feature prompts reflection, not a decision engine |

### Technical Footprint

**Tables**: `planned_expenses`, `moment_logs`

**Key routes**: `GET/POST /api/planned-expenses`, `DELETE /api/planned-expenses/:id`, `GET/POST /api/moment-logs`, `DELETE /api/moment-logs/:id`

---

## 6. Overview Dashboard

**Spec**: `ROADMAP.md` — Feature 4
**Status**: Built (complete)
**Feature ID**: `004-overview-dashboard`

Visual overview of the user's life across four dimensions (health, fitness, budget, personal growth). Centers on an interactive human body SVG with 7 status zones.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Seven zones map to data domains (Brain, Heart, Muscles, Core, Legs, Pocket, Shoulders) | One zone per major tracked dimension |
| Zone status derived from last 7 days of data | Reflects recent reality, not historical averages |
| No `/api/overview/:zone` — one aggregation endpoint | Fewer round trips; zone logic on server |
| Streak cards beside body SVG | Secondary motivational layer; reuses existing activity log data |

### Technical Footprint

**Tables**: No new tables. Reads from `activity_logs`, `body_metrics`, `spending_entries`, `goals`, `roles`.

**Key routes**: `GET /api/overview`

---

## 7. Goals V2

**Spec**: `.specify/specs/goals-v2/spec.md`
**Status**: Built (complete)
**Feature ID**: `goals-v2`

Goal hierarchy overhaul. Adds tally-based progress tracking, goal session patterns (repeating intensity cycles), and a dedicated Goals dashboard.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Tally-based progress for non-athletic goals | No activity type to link; user manually increments |
| Session patterns are repeating cycles (e.g., hard/easy/medium) | Encodes periodization intent within a goal without a full training plan |
| Goals dashboard shows progress alongside quadrant view | Single page for goal overview + weekly action |

### Technical Footprint

**Tables added**: `goal_tallies`, `goal_session_patterns`

**Routes added**: `GET/POST /api/goal-tallies`, `DELETE /api/goal-tallies/:id`

---

## 8. Friend Release (Multi-User)

**Spec**: `.specify/specs/friend-release/spec.md`
**Status**: Built (complete)

Introduces full multi-user isolation, NextAuth v5 with Credentials provider, admin user management, and Railway deployment. Every table gains a `user_id` column. The admin creates accounts; there is no public signup.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| `user_id` on every data table | Complete row-level isolation; no shared data |
| `assertOwnership(userId, ids, table)` helper | Batch ownership check before bulk operations |
| Admin role only (no editor/viewer tiers) | Single admin; no ACL complexity needed |
| JWT sessions via NextAuth Credentials | No OAuth required; invite-only model |
| Container drops to UID 1001 (`nextjs` user) after `chown /data` | Principle of least privilege for the Railway-hosted SQLite volume |

### Technical Footprint

**Tables added**: `users` (with `role` column), `user_id` added to all existing tables

**Routes added**: `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id`

**Auth**: NextAuth v5 at `/api/auth/[...nextauth]`

---

## 9. Role Scheduling Rules Removal

**Spec**: `feature requests/role-scheduling-rules-removal/spec.md`
**Status**: Draft — pending user approval
**Feature ID**: `role-scheduling-rules-removal`

Removes `max_weekly_occurrences` and `min_rest_days` from the `roles` table. These fields silently override goal-level `sessionsPerWeek`, causing a traceable bug (Athlete role capping at 4 sessions/week even when the goal says 7). Goals become the single source of truth for scheduling frequency.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| `max_weekly_occurrences` and `min_rest_days` removed from `roles` | Goals own "how often"; roles own "what kind of life area" |
| `is_work_role` flag stays | Controls time-of-day window (work hours vs. evenings), not frequency |
| No data migration needed | The scheduler stops reading the columns; existing role rows are unaffected |
| `sessions_per_week` server-side clamp at 7 | Prevents pathological values from a misbehaving client |

### Technical Footprint

**Schema change**: Remove `max_weekly_occurrences` and `min_rest_days` from `roles`

**Routes modified**: `GET/POST /api/roles`, `PATCH /api/roles/:id` (remove scheduling fields from request/response)

**Library modified**: `src/lib/scheduler.ts` (remove role-level cap logic from scheduling loop)

---

## 10. Goal Progress Sessions Fix

**Spec**: `feature requests/goal-progress-sessions-fix/spec.md`
**Status**: Draft — pending user approval
**Feature ID**: `goal-progress-sessions-fix`

Hotfix. Yearly and monthly goals with `targetMetric = null` (the "Sessions" option) do not advance when the user logs activities via the activity tracker. The bug is in the gate condition at `src/app/api/goals/[id]/progress/route.ts` — it skips the log query when `targetMetric` is null. This spec extends the standalone goal's unconditional log-count behavior to yearly and monthly branches.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| No form change | Goals already in the database with `targetMetric = null` are fixed by the route change alone |
| Default metric = "count" when `targetMetric` is null | Consistent with standalone branch; counts linked activity logs |
| Bug traced to lines 138 and 192 in the progress route | Narrow, targeted fix; no architectural change |

### Technical Footprint

**No schema changes. No new routes.**

**Route modified**: `GET /api/goals/:id/progress` (remove null-metric gate)

---

## 11. Training / Supplemental Session Split

**Spec**: `feature requests/training-supplemental-split/spec.md`
**Status**: Phases 1–4 implemented; Phases 5–7 (calendar UI, activity edit, full test/doc sweep) outstanding
**Feature ID**: `training-supplemental-split`

Introduces a clean split between training sessions (sport itself) and supplemental sessions (gym/strength/prehab). The user configures how many of each per week in the training plan dialog. The scheduler distributes them tagged with type. Calendar cards show distinct visual treatment.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Split config lives on the training plan (not the goal) | Training plan already owns the periodization model |
| Sum of training + supplemental must equal goal's `sessionsPerWeek` | Single source of truth for weekly volume |
| Default split for N sessions/week: floor(N/2) supplemental, rest training | Sensible default; 3/week → 2 training + 1 supplemental |
| Activity type stays the same for supplemental sessions | Supplemental sessions still count toward the goal's activity-type progress |
| Existing sessions default to "training" type | Zero-migration: no changes to pre-feature rows |
| `session_type` column added to `activities` | `'training' | 'supplemental'` with default `'training'` |

### Technical Footprint

**Schema change**: `ALTER TABLE activities ADD COLUMN session_type TEXT DEFAULT 'training'`; `training_sessions_per_week` and `supplemental_sessions_per_week` added to `training_plans`

**Library modified**: `src/lib/scheduler.ts` (distribute sessions by type)

**UI modified**: Training plan create/edit dialog, monthly calendar card rendering

---

## 12. Habit Tracking

**Spec**: `feature requests/habit-tracking/spec.md`
**Status**: Built (complete)
**Feature ID**: `habit-tracking`

Lightweight daily habit tracking using an identity-first frame from *Atomic Habits*. Each habit has an identity statement, a name, an optional cue, and an optional minimum version. A 7-day completion strip shows recent history. Habits can be reordered by drag-and-drop and archived.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Client owns "today" for habit logs | Server receives `YYYY-MM-DD` and trusts it. Matches `activity_logs.date` precedent. |
| Display format is `DD-MM-YYYY` | ISO is wire format only; all rendered dates use this format via shared `formatDateForDisplay()` helper |
| `POST /api/habit-logs` always returns 201; `DELETE` always returns 204 | Idempotent endpoints; matches activities-bridge precedent |
| Streak computed client-side via pure `computeStreaks(dates, today)` | Server returns raw date strings; client holds "today" |
| Length caps: identity 200, name 50, cue 200, minimum_version 200 | Server enforces with 400; form enforces with `maxLength` |
| Inline affirmation (not a toast) on marking today done | No toast library installed; affirmation shows `minimum_version` text for 2 seconds |
| Archive toggle with "Show archived (N)" collapsible at bottom of list | Zero deletion of habits; matches roles precedent |
| `display_order` computed server-side on create as `max + 1` | Client does not supply it; matches roles precedent |
| Drag-to-reorder via `@dnd-kit/sortable` (new dependency) | Vertical list reorder; different from the 2D drag pattern in `weekly-plan-view.tsx` |
| Color from `getRolePalette()` / `getNextRoleColor()` in `src/lib/colors.ts` | Reuses existing palette; no new color source |
| Sidebar slot: "Habits" after "Goals" in Life Areas group. Icon: `Repeat` | Alphabetical; follows existing nav group structure |
| Empty-state CTA: walkthrough (first time), quick-add (subsequent) | Teaching surface for first habit; speed for subsequent ones |

### Technical Footprint

**Tables**: `habits`, `habit_logs`

**Key routes**: `GET/POST /api/habits`, `PATCH/DELETE /api/habits/:id`, `POST /api/habit-logs`, `DELETE /api/habit-logs`

**New dependency**: `@dnd-kit/sortable`

---

## 13. Body Metrics Guidance

**Spec**: `feature requests/body-metrics-guidance/spec.md`
**Status**: Built (PRs #52–#55 merged; PR #56 small UI reorder also merged)
**Feature ID**: `body-metrics-guidance`

Adds an interpretation layer to the existing Body Metrics tab. Two additions: an "About you" card for optional demographic inputs (DOB, sex, height, waist) and a feedback section with one interpreted card per metric (Weight/BMI/WHtR, VO2max, Resting HR). All interpretation runs client-side; no new interpretation endpoint.

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Guidance lives inside the existing Body Metrics tab (no new page or nav) | Additive; no navigation change |
| Profile attributes are all optional | Partial inputs unlock partial feedback; nothing is required |
| `user_body_profiles` is a separate table from `users` | Keeps the auth users table clean; all columns nullable |
| Waist is a static "About you" input, not a tracked metric | Powers WHtR only; no trend chart; stored as `waist_cm` on the profile |
| European reference standards throughout | WHO/European BMI bands; ESC/IDF waist thresholds; ACSM/Cooper Institute VO2max percentiles; standard RHR charts. No Asian BMI variant. |
| Waist thresholds: men 94/102 cm, women 80/88 cm (two tiers each) | ESC/IDF elevated-risk and high-risk cutoffs |
| `highHrNote` triggers at `value > 85 bpm` (not at "Poor" category) | Per FR-009 in spec; a specific clinical threshold, not a category label |
| `PATCH /api/body-profile` uses `onConflictDoUpdate` for atomic upsert | SELECT-then-write would be a race condition on the 1:1 row |
| `GET /api/body-profile` returns all-null default with 200 (not 404) | UI renders the About you card in empty state without special-casing the first visit |
| Feedback cards show prompt state when inputs are missing (never return null) | SC-001: three prompt-state cards + disclaimer must be visible even with no measurements |
| Feedback color tokens use CSS variables (`text-[var(--palette-green)]`) | Design system rule: no hardcoded Tailwind color classes |

### Technical Footprint

**Tables**: `user_body_profiles` (new), `body_metrics` (modified: PATCH/DELETE routes for `body_metrics/:id`)

**Key routes**: `GET/PATCH /api/body-profile` (new), `PATCH/DELETE /api/body-metrics/:id` (new)

**Key library**: `src/lib/body-metrics-guidance.ts` (new) — exports `interpretWeight`, `interpretVo2max`, `interpretRestingHr`

**Components**: `body-metrics-feedback.tsx` (new), `body-metrics-view.tsx` (modified)
