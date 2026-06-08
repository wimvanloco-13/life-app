# Spec: Planning / Execution Redesign

**Feature ID:** `planning-execution-redesign`
**Status:** Spec drafted 2026-06-07
**Source document:** `scope.md`
**Last updated:** 2026-06-07

---

## Context

Four targeted improvements bundled because they share the same planning and execution surface of the app. No new database tables or columns.

- **Group A (navigation + weekly view):** Restructure sidebar into Planning vs Execution, add This Week page.
- **Group B (scheduler improvements):** Phase-aware date range scheduling, session sufficiency warnings in preferences dialog.

---

## Schema changes

None.

---

## API changes

### `POST /api/schedule/generate` — new `endDate` parameter

**New optional parameter:**

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `endDate` | string | No | last day of the calendar month derived from `month` | ISO `YYYY-MM-DD`. When provided, overrides the calendar-month ceiling. Must be `>= startDate`. No upper bound — can span multiple calendar months. |

**Behaviour when `endDate` is provided:**
- The working date range spans from `effectiveDates[0]` (the `startDate` floor, already in place) through `endDate` inclusive, regardless of calendar month boundaries.
- `scopeActivities` filter, `regenerate` cleanup, `dateRange` response, and `generateSchedule` start argument all use this explicit cross-month range.
- When `regenerate = true`, existing focus-goal activities are removed across the full `startDate`–`endDate` range (multi-month).

**Backwards compatibility:** omitting `endDate` is identical to today's behaviour.

**Validation:** `endDate` before `startDate` → `400 "endDate must be on or after startDate"`.

---

## User stories

**US-1 Weekly execution view**
As a user, I want a focused weekly view of my scheduled and completed activities so I can execute my plan day by day without being overwhelmed by the full monthly calendar.

**US-2 Navigation clarity**
As a user, I want the sidebar to clearly separate tools I use for planning from tools I use for day-to-day execution, so I always know where to go and why.

**US-3 Phase-aware scheduling**
As a user with an active training phase, I want the schedule generator to automatically propose a planning horizon that covers the full phase duration — not just the current calendar month — so I get a coherent multi-week training block in one generation.

**US-4 Adjustable scheduling horizon**
As a user, I want to be able to review and adjust the "schedule through" end date in the preferences dialog before generating, so I remain in control of the planning horizon even when a default is suggested.

**US-5 Session sufficiency warning**
As a user with a training plan, I want to be warned immediately if my sessions-per-week setting is too low to support a meaningful training/supplemental split, so I can fix it before generating a schedule that silently ignores the training structure.

**US-6 Completed activities visible in weekly view**
As a user, I want completed activities to remain visible in the weekly view — distinguished from upcoming ones — so I can see my progress and feel the momentum of work already done.

---

## Functional requirements

### FR-1 Navigation restructure

- FR-1.1 The "Daily Focus" sidebar group is removed and replaced with two new groups.
- FR-1.2 The first new group is labelled **Execution** and contains two items in order: Today (`/today`), This Week (`/this-week`).
- FR-1.3 The second new group is labelled **Planning** and contains one item: Monthly Plan (`/monthly-plan`).
- FR-1.4 The sidebar order from top to bottom is: Execution, Planning, Life Areas, Library, footer (Settings, Sign out). Life Areas and Library are unchanged.
- FR-1.5 The active page highlights correctly for all three routes (`/today`, `/this-week`, `/monthly-plan`).

### FR-2 This Week view — page and navigation

- FR-2.1 A new page exists at `/this-week`. It shows activities for the 7-day window from Monday through Sunday of the week that contains today's date.
- FR-2.2 The page header shows a week range label in the format "Mon D – Sun D Mon YYYY" (e.g., "Mon 2 – Sun 8 Jun 2026"). For weeks that span two calendar months, both month abbreviations are included: "Tue 30 Jun – Sun 6 Jul 2026". The year is always shown. It contains a "previous week" and "next week" navigation control. Navigating between weeks updates the displayed activities without a full page reload.
- FR-2.3 Seven day columns are rendered, Monday through Sunday, in order. Each column shows the day name and date. If a day has no activities, the column is present but empty — no placeholder text is needed.
- FR-2.4 Each activity is shown as a card. Clicking or tapping a card opens the Edit Activity dialog (same dialog as the monthly calendar).
- FR-2.5 Incomplete scheduled activities are displayed at full opacity with no special treatment.
- FR-2.6 Completed activities (`isCompleted = true`) are displayed with a visible checkmark and reduced opacity (or struck-through title). They are always shown — never hidden.
- FR-2.7 The page includes a "Generate Schedule" button. Clicking it opens the `SchedulePreferencesDialog` (same component as the monthly view). The generated schedule is applied to the `activities` table; the weekly view then shows the current week's slice of whatever was scheduled.
- FR-2.8 The page includes a secondary "View Monthly Plan" link that navigates to `/monthly-plan`.
- FR-2.9 The page displays the current count of focus goals. The focus goals list is sourced by calling `GET /api/weekly-plans` with `month={currentMonth}` — the same call the monthly view makes. The count label reads "N goals in focus this month". This gives the user an execution view that reflects the same planning context as the monthly calendar.
- FR-2.10 Habits are not shown in the weekly view. This is explicitly deferred.
- FR-2.11 When "Generate Schedule" is triggered from `/this-week`, `currentMonth` is derived from **today's date** (format `YYYY-MM`), regardless of which week the user is currently viewing. This is the month the user is executing in, and it determines the default `endDate` for non-training goals and the `month` parameter passed to the generate API. The start-date picker's `min` is today's date; there is no enforced `max` on the start-date picker when generating from `/this-week` (unlike `/monthly-plan`, which clamps to the selected calendar month). The `endDate` field behaves the same as on the monthly view.

### FR-3 Phase-aware scheduling — API

- FR-3.1 `POST /api/schedule/generate` accepts an optional `endDate: string (YYYY-MM-DD)` parameter.
- FR-3.2 When `endDate` is provided, the working date array spans from the effective start date through `endDate` inclusive, without regard to calendar month boundaries.
- FR-3.3 When `endDate` is provided and `regenerate = true`, the cleanup of existing scheduler-generated activities covers the full range from `startDate` through `endDate`, spanning multiple months if necessary.
- FR-3.4 When `endDate` is omitted, behaviour is identical to the current implementation.
- FR-3.5 If `endDate` is provided and is before `startDate` (or before the effective start after `startDate` clamping), the route returns `400` with `{ error: "endDate must be on or after startDate" }`.

### FR-4 Phase-aware scheduling — preferences dialog

- FR-4.1 `SchedulePreferencesDialog` gains a **"Schedule through"** date field (`endDate`) displayed immediately below the existing "Start date" field.
- FR-4.2 The `endDate` field has a `min` constraint equal to `startDate`. There is no enforced `max` — the user may schedule multiple months ahead.
- FR-4.3 Default value of `endDate` is computed once when the dialog opens:
  - For focus goals **with** an active training phase: `endDate` = `trainingPhase.startDate` + (`durationWeeks` × 7) days, where both values come from the goal's active `trainingPhases` row. This is the fixed end of the phase and is independent of the dialog's `startDate` field — a user 3 weeks into a 7-week phase will see the remaining horizon to the actual phase end, not 7 weeks from today.
  - For focus goals **without** a training plan: `endDate` = last day of `currentMonth`.
  - When multiple focus goals suggest different end dates: the dialog uses the **latest** of all suggested end dates as the default.
- FR-4.4 Changing `startDate` does **not** automatically recalculate `endDate`. The two fields are independent once the dialog is open.
- FR-4.5 If `endDate` < `startDate` at the time the user clicks "Generate & Apply", the button is disabled and an inline message is shown: "End date must be on or after the start date."
- FR-4.6 The `endDate` value is included in the body of the `POST /api/schedule/generate` call alongside `startDate`.
- FR-4.7 Each goal card with an active training phase displays a read-only informational label: "Active: [Phase name] — Week N of M", where N = current week number within the phase (1-indexed, based on today's date and the phase `startDate`), and M = `durationWeeks`. This label is always read-only — it cannot be edited from within this dialog.
- FR-4.8 The phase active label is only shown if the goal has an active `trainingPhases` row (`status = 'active'`). Goals with no training plan or no active phase show no label.
- FR-4.9 **Mid-phase regeneration behaviour (explicit acceptance criterion):** When the user confirms "Generate & Apply" while a training phase is active, existing scheduled (non-completed, non-log-created) activities for that goal within the `startDate`–`endDate` range are deleted and replaced with a fresh schedule. The user is starting the scheduling block from scratch from `startDate`. Completed activities are never removed — they are a permanent record of work done. This means a user in Week 3 of a 7-week phase who generates from today will have their remaining scheduled weeks replaced; work already marked complete is unaffected. The phase active label (FR-4.7) is informational only — it does not prevent regeneration.

### FR-5 Session sufficiency warning

- FR-5.1 For each goal card in `SchedulePreferencesDialog`, if the goal has a training plan and the displayed `sessionsPerWeek` value is below the training plan's required minimum, an inline warning is shown immediately below the sessions-per-week input on that card.
- FR-5.2 The required minimum is determined as follows:
  - If the training plan has explicit `trainingSessionsPerWeek` and `supplementalSessionsPerWeek` values: minimum = `trainingSessionsPerWeek + supplementalSessionsPerWeek`.
  - If the plan has no explicit split (null values — uses default split): minimum = 3.
- FR-5.3 Warning messages by tier:
  - `sessionsPerWeek === 1`: "1 session/week is too low for structured training. Increase to at least 3 for a full split, or schedule this goal without a training plan."
  - `sessionsPerWeek === 2`: "With 2 sessions/week, no supplemental sessions will be scheduled. Increase to 3+ for a complete training split."
- FR-5.4 The warning is advisory only. The user can click "Generate & Apply" regardless of whether a warning is shown. Nothing is blocked.
- FR-5.5 The warning re-evaluates in real time as the user changes the sessions-per-week value on that card. Increasing sessions-per-week to ≥ minimum dismisses the warning immediately.
- FR-5.6 Goals without a training plan never show a session sufficiency warning, regardless of their `sessionsPerWeek` value.
- FR-5.7 `WeeklyPlanView` (and the new `ThisWeekView`) loads `trainingPlans` data as part of its initial data fetch at page mount — alongside goals, activities, and roles. From this, it derives a `trainingPlanMinimums: Record<number, number>` map (goal ID → minimum sessions) and passes it to `SchedulePreferencesDialog` as a prop. The data must be available synchronously when the dialog first opens — it cannot be deferred to the moment the user clicks "Generate Schedule".

---

## Non-functional requirements

- NFR-1 The `/this-week` page reuses the existing `DayColumn` component without modification. No new activity-card or day-display primitives are introduced.
- NFR-2 The `endDate` addition to `POST /api/schedule/generate` is fully backwards compatible. All existing callers (monthly view, any direct API use) continue to work unchanged.
- NFR-3 The `endDate` default is computed once when the dialog opens — the same initialisation pattern as `startDate`. It is not recalculated on subsequent renders unless the dialog is closed and reopened.
- NFR-4 The phase-aware end date default (`startDate + durationWeeks × 7`) is pure client-side arithmetic. No network request is made to compute it.
- NFR-5 The session sufficiency warning is computed entirely from props already in the dialog. No network request is made.
- NFR-6 The weekly view's "Generate Schedule" produces the same result regardless of whether it is triggered from `/this-week` or `/monthly-plan` — both open the same `SchedulePreferencesDialog` with the same logic.

---

## Out of scope (confirmed)

- Habits in the weekly view
- Yearly planning view (future Planning section item)
- Drag-and-drop rescheduling in the weekly view
- Removing or disabling a training plan from within the preferences dialog
- Automatic phase progression (detecting completion and suggesting the next phase)
- "Resume mid-phase" or partial-phase regeneration
- Any new database table or column
- Any change to the Goals, Activities, Budget, or Habits pages
