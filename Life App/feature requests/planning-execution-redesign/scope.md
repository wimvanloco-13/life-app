# Scope: Planning / Execution Redesign

**Feature ID:** `planning-execution-redesign`
**Status:** Scope drafted 2026-06-07
**Builds on:** Monthly Schedule Refactoring (PRs #62, #63), Goals V2, Training Periodization
**Last updated:** 2026-06-07

---

## Why

Three friction points surfaced through real usage after the monthly scheduling work shipped:

**1. The monthly calendar causes overwhelm during execution.**
The monthly calendar is the right tool for *planning* — generating a schedule, seeing the shape of a period, adjusting goals. It is the wrong tool for *execution* — deciding what to do today and this week. Thirty days of activities on screen creates cognitive load that undermines motivation. A weekly view contains exactly the right amount of information for day-to-day follow-through.

**2. The scheduler ignores training phase boundaries.**
When a climbing (or any sport) goal has an active training phase — say, a 7-week Strength phase — "Generate Schedule" currently plans for the calendar month only. If the phase starts mid-June, the user must generate twice (once for June, once for July) and manually stitch together a coherent block. The scheduler already knows about phases; it just does not use them to determine the planning horizon.

**3. No feedback when sessions per week are too low for a training split.**
If a user sets 1 or 2 sessions per week for a goal that has a training plan, the scheduler cannot produce a meaningful training/supplemental split. It silently schedules what it can, giving the user no signal that the training structure is being ignored.

Additionally, a bug was identified and hot-fixed (2026-06-07): `PATCH /api/goals/:id` was returning 500 when the new `SchedulePreferencesDialog` sent `preferredDays` as a JavaScript array — the handler stored it directly into a SQLite TEXT column without serializing it to JSON. The fix is already committed to master.

---

## What's in scope

### 1. Navigation restructure — Planning vs Execution

**Problem:** "Daily Focus" as a sidebar section groups Today (execution) with Monthly Plan (planning). This conflation obscures the difference between what you're doing and what you're planning.

**Fix:** Replace the "Daily Focus" sidebar group with two named groups:

**Execution** (what you work from day to day):
- Today → `/today` (existing, unchanged)
- This Week → `/this-week` (new)

**Planning** (where you generate and review schedules):
- Monthly Plan → `/monthly-plan` (existing, unchanged)

The "Life Areas" group (Activities, Budget, Goals, Habits) and Library are unchanged.

**Schema change:** None.

---

### 2. This Week view — new page at `/this-week`

**Problem:** There is no weekly execution view. Users must navigate to the full monthly calendar to see their schedule for the current week.

**Fix:** A new page at `/this-week` that shows a focused 7-day view of the current week (Monday through Sunday). It reads from the same `activities` table as the monthly calendar — it is a viewport, not a separate data model.

**What the page contains:**

- **Week header:** Week range label (e.g., "Mon 2 – Sun 8 Jun"), prev/next week navigation arrows.
- **Day columns:** One column per day (Monday → Sunday), using the same `DayColumn` component as the monthly calendar. Each column shows the day label, date, and all activities for that day.
- **Scheduled activities:** Shown as normal activity cards. Tapping/clicking opens the Edit Activity dialog (same as monthly view).
- **Completed activities:** Shown with a visual distinction — checked icon, reduced opacity or strikethrough title — but always visible. They represent real work done and should be celebrated, not hidden.
- **Empty day:** If a day has no activities, the column is empty (no placeholder text needed; the column's presence confirms the day exists).
- **Generate Schedule button:** Accessible directly from the weekly view — clicking it opens the `SchedulePreferencesDialog` (same flow as monthly view). The generated schedule populates the monthly calendar across the relevant months; the weekly view then shows the current week's slice automatically.
- **"View Monthly Plan" link:** A secondary link/button that navigates to `/monthly-plan` for users who want to see the full picture.
- **Focus goals indicator:** Same "N goals in focus this month" label as the monthly view.

**What the weekly view does NOT include (explicitly out of scope):**
- Habits. Merging habit tracking into the weekly execution view is a meaningful task that deserves its own scope. Explicitly deferred.
- Recurring activities management (accessible via Monthly Plan).
- Scheduler settings (accessible via Monthly Plan).
- Drag-and-drop rescheduling (could be added later; not in this scope).

**Schema change:** None.

---

### 3. Phase-aware scheduling — date range scope

**Problem:** `POST /api/schedule/generate` operates on a calendar month. Training phases (and meaningful planning blocks in general) do not align with calendar months. A 7-week phase starting June 3 ends July 21 — generating "June" gives 4 weeks, generating "July" gives 3. Neither is coherent.

**Fix:** The scheduler gains an explicit `endDate` parameter that replaces the calendar-month ceiling when provided. The scheduling horizon is now a date range (`startDate` → `endDate`) rather than a calendar month.

#### 3a. Changes to `POST /api/schedule/generate`

**New optional parameter:**

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `endDate` | string | No | last day of the month derived from `month` | ISO `YYYY-MM-DD`. When provided, overrides the month-end ceiling. Must be ≥ `startDate`. No upper bound — can span multiple calendar months. |

**Behaviour when `endDate` is provided:**
- The full date range is computed from `effectiveDates[0]` (the `startDate` floor, already implemented) through `endDate` inclusive, regardless of calendar month boundaries.
- The `getMonthDateRange` function is used only to derive the base month context (for monthly-override logic). The actual date array used for scheduling is built from the explicit start/end range.
- All downstream logic (`scopeActivities` filter, `regenerate` cleanup, `dateRange` response, `generateSchedule` start argument) uses this explicit range.
- `regenerate = true` cleanup removes existing focus-goal activities within the full `startDate`–`endDate` range, spanning multiple months if necessary.

**Backwards compatibility:** if `endDate` is omitted, behaviour is identical to today (month-end is the ceiling).

#### 3b. Changes to `SchedulePreferencesDialog`

The dialog gains a **"Schedule through"** date field alongside the existing "Start date" field.

**Default value for `endDate` in the dialog:**

- **For each focus goal with an active training phase:**
  - `endDate` = `startDate` + (`durationWeeks` × 7) days.
  - `durationWeeks` comes from the active `trainingPhases` row for that goal's training plan.
  - Example: startDate = Jun 7, durationWeeks = 7 → endDate = Jul 25.
  - The phase card shows: "Active phase: Strength (7 weeks) — schedules through Jul 25."
- **For focus goals with no training plan:**
  - `endDate` = last day of `currentMonth` (same as current behaviour).
- **When multiple focus goals have different suggested end dates:**
  - The dialog defaults to the **latest** suggested `endDate` across all goals. This ensures every goal's phase is fully covered in one generation.
  - The user can shorten the range manually.

**Phase always starts from `startDate` (today by default):**
- There is no "resume mid-phase" concept. When the user generates a schedule, they are committing to starting the phase now (or from the adjusted `startDate`).
- If the user wants to start next week, they adjust `startDate` in the dialog.
- There is no "regenerate within active phase" flow — a phase runs its course, and the next schedule generation starts a new block.

**Editable "Schedule through" field:**
- `<Input type="date">` with no enforced `max` (the user may plan multiple months ahead).
- `min` = `startDate`.
- Adjusting `startDate` does NOT automatically recalculate `endDate` — the user controls both independently. If `endDate` would end up before `startDate`, the "Generate & Apply" button is disabled with an inline validation message.

**Active phase display on goal cards:**
- If a goal has an active training phase, its card in the dialog shows a small badge or label: "Active: [Phase name] — Week N of M" (calculated from phase `startDate` and `durationWeeks`). Read-only, informational only.

**Schema change:** None. `trainingPhases.start_date` and `trainingPhases.duration_weeks` already exist.

---

### 4. Session sufficiency warning in preferences dialog

**Problem:** If a user has 1 or 2 sessions per week set for a goal with a training plan, the training/supplemental split cannot be delivered. The scheduler schedules what it can without signalling the issue. The user may not notice until they look at the calendar and find no supplemental sessions.

**Fix:** An inline warning appears on each goal card in `SchedulePreferencesDialog` when the sessions-per-week value is below the minimum required for the training plan's split.

**Warning rule:**

The minimum required sessions is:
- If the training plan has explicit `trainingSessionsPerWeek` and `supplementalSessionsPerWeek` set: minimum = `trainingSessionsPerWeek + supplementalSessionsPerWeek`.
- If the plan uses the default split (values are null): minimum = 3 (the lowest value at which `defaultSplit` produces at least 1 supplemental session).

**Two warning tiers:**

| Condition | Warning message |
|---|---|
| `sessionsPerWeek === 1` | "1 session/week is too low for structured training. Increase to at least 3 for a full split, or schedule this goal without a training plan." |
| `sessionsPerWeek === 2` | "With 2 sessions/week, no supplemental sessions can be scheduled. Increase to 3+ for a complete training split." |

The warning is **advisory only** — the user can proceed with "Generate & Apply" regardless. Nothing is blocked.

The sessions-per-week input is on the same card, immediately above the warning — the user can fix it in one step.

**No "remove training plan" action in this dialog** — out of scope. The warning message mentions "schedule without a training plan" as guidance, but the actual removal of the training plan happens on the Goals page (where the training plan dialog already exists).

**Schema change:** None. All required data (`trainingSessionsPerWeek`, `supplementalSessionsPerWeek`) already exists on `trainingPlans`.

**Data the dialog needs:** The `focusGoals` prop passed to `SchedulePreferencesDialog` from `WeeklyPlanView` does not currently include training plan data. **Decided (Option A):** `WeeklyPlanView` derives a `trainingPlanMinimums: Record<number, number>` prop (goalId → minimum sessions) from already-loaded training plan data and passes it to the dialog. No new API endpoint required.

---

## What is explicitly out of scope

- Habits in the weekly view (meaningful integration, deferred to a dedicated scope)
- Yearly planning view (mentioned as future Planning section item; not in this scope)
- Drag-and-drop rescheduling in the weekly view
- Removing or disabling a training plan from within the preferences dialog
- Any change to the Goals page, Activities page, or Budget page
- Any new database table or column
- Recurring activities management in the weekly view
- A "resume mid-phase" or "partial phase regeneration" flow
- Automatic phase progression (detecting phase completion and suggesting the next phase)

---

## Hotfix already shipped

`PATCH /api/goals/:id` — `preferredDays` serialization bug fixed 2026-06-07. The handler now detects when `body.preferredDays` is a JavaScript array (sent by `SchedulePreferencesDialog`) and calls `JSON.stringify()` before writing to the SQLite TEXT column. Previously this caused a 500 on any generate-and-apply that modified preferred days.

---

## Summary of changes per file

| File | Change |
|------|--------|
| `src/components/layout/app-sidebar.tsx` | Rename "Daily Focus" → "Execution"; add "This Week" item (`/this-week`); add "Planning" group with Monthly Plan |
| `src/app/this-week/page.tsx` | New page — server component, fetches current week's activities, renders `ThisWeekView` |
| `src/app/this-week/page.tsx` | New Next.js page file — thin server component that renders `ThisWeekView` |
| `src/components/monthly-plan/this-week-view.tsx` | New client component — week navigation, DayColumn per day, Generate Schedule button, View Monthly Plan link |
| `src/app/api/schedule/generate/route.ts` | Accept optional `endDate`; build date range from `effectiveDates[0]` → `endDate` when provided; handle multi-month spans |
| `src/components/monthly-plan/schedule-preferences-dialog.tsx` | Add "Schedule through" date field; add active phase display on goal cards; add session sufficiency warning; accept `trainingPlanMinimums` prop |
| `src/components/monthly-plan/weekly-plan-view.tsx` | Derive `trainingPlanMinimums` from loaded training plan data; pass to `SchedulePreferencesDialog`; pass `endDate` to generate call |

---

## Dependencies

- Monthly Schedule Refactoring Phase A (PR #62) — merged
- Monthly Schedule Refactoring Phase B (PR #63) — merged
- Training Periodization (training plans + phases) — built
- Goals V2 (`preferredDays`, `preferredTimeSlot`, `sessionsPerWeek`) — built
- Activities Refactoring V1 (`isCompleted`, `createdFromLog`) — built
- `DayColumn` component — built (reused as-is)
- `SchedulePreferencesDialog` component — built (extended in this scope)
