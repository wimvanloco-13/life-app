# Spec: Monthly Schedule Refactoring

**Feature ID:** `monthly-schedule-refactoring`
**Status:** Spec drafted 2026-06-07
**Source document:** `scope.md`
**Last updated:** 2026-06-07

---

## Context

Five targeted improvements to the Monthly Plan view, based on real usage. No new database tables, no new columns. The changes fall into two natural groups:

- **Group A (simple fixes):** goal deletion cascade, flat focus picker, notes at top of edit activity form.
- **Group B (scheduler preferences):** start date for generate, pre-generate preferences dialog replacing the current scroll-and-approve preview.

---

## Schema changes

None.

---

## API changes

### `DELETE /api/goals/:id` — extended cleanup

**Current behaviour:** deletes the goal row, its `goalRoles`, and its monthly child goals (and their `goalRoles`). Orphans `activities` and `weeklyFocusGoals`.

**New behaviour:** before deleting the goal rows, also delete:

1. All `activities` rows where `goalId` is in the set `{goalId} ∪ {childGoalIds}` AND `isCompleted = false` AND `createdFromLog = false`. Completed activities are kept as history. Log-created activities are kept (they represent real workouts).
2. All `weeklyFocusGoals` rows where `goalId` is in the same set.
3. All `trainingPlans` (and their `trainingPhases` via FK cascade in apply-schema) where `goalId` is in the same set and `userId` matches.

**Order of operations (within the existing DELETE handler):**

```
1. Verify goal exists and belongs to user  (already done)
2. Collect childGoalIds                   (already done)
3. [NEW] Delete activities (uncompleted, non-log-created) for parent + children
4. [NEW] Delete weeklyFocusGoals for parent + children
5. [NEW] Delete trainingPlans for parent + children
6. Delete goalRoles for children          (already done)
7. Delete child goal rows                 (already done)
8. Delete goalRoles for parent            (already done)
9. Delete parent goal row                 (already done)
```

**Response:** unchanged (`{ success: true }`, status 200).

---

### `POST /api/schedule/generate` — new `startDate` parameter

**New optional parameter:**

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `startDate` | string | No | none | ISO `YYYY-MM-DD`. If provided, must be within the same calendar month as `month`. Out-of-month values are silently clamped to the first day of the month. |

**Behaviour when `startDate` is provided:**

- The full month date range is computed as before (`getMonthDateRange`).
- Dates before `startDate` are then filtered out of the working range before the scheduler runs.
- When `regenerate = true`, the "remove existing focus-goal activities" step is also filtered to only affect dates ≥ `startDate` (activities before `startDate` are left untouched).

**Backwards compatibility:** if `startDate` is omitted, behaviour is identical to today.

---

## User stories

**US-1 Goal deletion cleanup**
As a user who deletes a goal, I want all its scheduled activities removed from the calendar so the monthly view does not show ghost entries that can no longer be edited or linked to anything.

**US-2 Schedule start date**
As a user generating a schedule mid-month, I want to set a start date so the scheduler does not propose activities in the past.

**US-3 Pre-generate preferences dialog**
As a user clicking "Generate Schedule", I want to review and adjust my goal scheduling preferences (sessions per week, preferred days, time of day) and set a start date before committing, so I can control the output without wading through a list of proposed activities afterward.

**US-4 Focus goals flat list**
As a user opening "Select Focus Goals", I want to see all my goals in a single flat list rather than grouped by role, so multi-role goals appear only once and goals without a role are not hidden.

**US-5 Notes at top of Edit Activity**
As a user opening the Edit Activity dialog, I want to see the Notes field immediately — before the Role, Activity Type, and Linked Goal dropdowns — because the notes contain the phase description I'm looking for.

---

## Functional requirements

### FR-1 Goal deletion cascade

- FR-1.1 When `DELETE /api/goals/:id` is called, all `activities` rows where `goalId ∈ {goalId} ∪ {childGoalIds}` AND `isCompleted = false` AND `createdFromLog = false` are deleted before the goal rows are removed.
- FR-1.2 All `weeklyFocusGoals` rows where `goalId ∈ {goalId} ∪ {childGoalIds}` are deleted.
- FR-1.3 All `trainingPlans` rows where `goalId ∈ {goalId} ∪ {childGoalIds}` AND `userId = session.user.id` are deleted. `trainingPhases` are deleted by the existing FK cascade in `apply-schema.js`.
- FR-1.4 Completed activities (`isCompleted = true`) and log-created activities (`createdFromLog = true`) are NOT deleted — they are historical records.
- FR-1.5 The response (`{ success: true }`) and HTTP status (200) are unchanged.

### FR-2 Schedule generator start date

- FR-2.1 `POST /api/schedule/generate` accepts an optional `startDate: string (YYYY-MM-DD)`.
- FR-2.2 When `startDate` is provided, the working date range excludes all dates before `startDate`. Dates within the calendar month but before `startDate` are not passed to the scheduler and will not receive proposed activities.
- FR-2.3 When `startDate` is provided and `regenerate = true`, the cleanup of existing scheduler-generated activities is also bounded: only activities on or after `startDate` are removed.
- FR-2.4 If `startDate` falls before the first day of the target month, it is treated as the first day of the month (no effect). If it falls after the last day, the working range is empty and the scheduler returns zero proposals.
- FR-2.5 If `startDate` is omitted, behaviour is identical to the current implementation.

### FR-3 Pre-generate preferences dialog

- FR-3.1 Clicking "Generate Schedule" opens a new `SchedulePreferencesDialog` instead of directly calling the generate API.
- FR-3.2 The dialog contains:
  - A **start date** date picker, defaulting to: today's date if today falls in the current calendar month, otherwise the first day of the month.
  - One **goal card** per focus goal, showing:
    - Goal title
    - Sessions per week: numeric input, range 1–7, initial value from `goal.sessionsPerWeek`
    - Preferred days: seven toggle buttons (Mon–Sun), initial state from `goal.preferredDays` (stored as JSON array of weekday integers 1–7)
    - Preferred time slot: four options — Morning (6–12), Afternoon (12–17), Evening (17–22), No preference — initial value from `goal.preferredTimeSlot` (null → "No preference")
  - A **"Generate & Apply"** primary button
  - A **Cancel** button
- FR-3.3 Goal preference inputs are editable. Only goals with changes are patched.
- FR-3.4 On "Generate & Apply":
  1. For each goal with modified preferences, call `PATCH /api/goals/:id` with the updated `sessionsPerWeek`, `preferredDays`, and/or `preferredTimeSlot`.
  2. Call `POST /api/schedule/generate` with `{ weekStartDate, scope: "month", regenerate: true, month, startDate }`.
  3. Call `POST /api/schedule/apply` with the returned proposal.
  4. Refresh the calendar view.
  5. Show a success notification: "Scheduled N activities" (where N is the count from the proposal).
  6. Close the dialog.
- FR-3.5 Errors at any step (PATCH, generate, apply) show an inline error message in the dialog; the dialog stays open.
- FR-3.6 The "Generate & Apply" button is disabled while the async operations are in progress. A spinner or loading label is shown.
- FR-3.7 If the user has no focus goals when clicking "Generate Schedule", the existing behaviour is preserved: the Focus Picker opens instead.
- FR-3.8 The existing `SchedulePreview` component is no longer invoked from the generate flow. The component file is kept but not used (not deleted).

### FR-4 Focus goals flat list

- FR-4.1 The `FocusPicker` dialog removes the role-grouped layout. All `visibleGoals` are rendered in a single flat list.
- FR-4.2 Goals are sorted: currently-selected (checked) goals appear first, then unselected goals, both groups sorted alphabetically by `title`.
- FR-4.3 Goals with no roles are visible in the flat list (they were previously hidden because they did not appear under any role heading).
- FR-4.4 Role badges remain on each goal card — they are useful context but no longer act as section headers.
- FR-4.5 The `roles` prop is kept on `FocusPicker` to avoid breaking the call site, but the role data is no longer used for grouping.

### FR-5 Notes at top of Edit Activity

- FR-5.1 In `activity-form.tsx`, the Notes textarea is moved to position 3: after Activity (title), after Date/Start/End, and before Role, Activity Type, Linked Goal, and Session Type.
- FR-5.2 No other fields change position or behaviour.
- FR-5.3 This applies to both the "Schedule Activity" (create) and "Edit Activity" (edit) modes — it is the same component.

---

## Non-functional requirements

- NFR-1 The `DELETE /api/goals/:id` cleanup runs in a single database transaction sequence. If any step fails, the entire request returns 500.
- NFR-2 The generate API change is backwards compatible. No callers break if `startDate` is omitted.
- NFR-3 PATCH calls for modified goals may run in parallel (`Promise.all`). `generate` must run after all PATCHes complete; `apply` must run after `generate` completes.
- NFR-4 The preference dialog does not re-fetch goals from the API; it uses the `focusGoals` array passed as props (already loaded in `weekly-plan-view.tsx`).
- NFR-5 Drizzle `inArray` is used for the multi-ID deletes in FR-1 (not a loop of individual deletes), for correctness and efficiency.

---

## Out of scope (confirmed)

- Editing training plan split (training vs supplemental sessions/week) from within the preferences dialog
- Editing blackout dates or global scheduler settings from within the preferences dialog
- Deleting completed activities when a goal is deleted
- Any new database table or column
- Any change to the Goals page, Activities tab, or any other page
- Deleting the `SchedulePreview` component file
