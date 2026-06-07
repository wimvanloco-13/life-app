# Scope: Monthly Schedule Refactoring

**Feature ID:** `monthly-schedule-refactoring`
**Status:** Scope drafted 2026-06-07
**Builds on:** Feature 1 (Calendar Management), Scheduler Rules System, Activities Refactoring V1
**Last updated:** 2026-06-07

---

## Why

Five real-use friction points have been identified in the Monthly Plan view. They are bundled into one spec because they share a single area of the app (the monthly calendar and its scheduling flow) and can be shipped together without risk of interdependence. None of them require new database tables.

---

## What's in scope

### 1. Goal deletion cascades to scheduled activities

**Problem:** Deleting a goal from the Goals page leaves its scheduled activities orphaned in the Monthly Plan. The activities remain visible (and schedulable) even though the goal no longer exists. When "Generate Schedule" is triggered again, the scheduler includes the deleted goal's activities in its conflict calculations.

**Fix:** The `DELETE /api/goals/:id` handler must also delete all `activities` rows where `goalId` matches the deleted goal (or any of its child goals) *and* `isCompleted = 0` (un-checked activities). Completed activities are kept — they represent real work done and should remain in the calendar as history.

Additionally, `weeklyFocusGoals` rows for the deleted goal must be removed so the goal is no longer considered "in focus" for any week or month.

**Schema change:** None. This is a handler-only change.

---

### 2. Schedule generator start date

**Problem:** When clicking "Generate Schedule" mid-month (or on any day past the 1st), the scheduler still proposes activities starting from day 1 of the month — placing activities in the past, which makes no sense.

**Fix:** The `POST /api/schedule/generate` route accepts a new optional `startDate` parameter (`YYYY-MM-DD`). When provided, the scheduler clips its proposed date range so no activity is placed before `startDate`. The month scope (first day to last day of the calendar month) otherwise remains unchanged — `startDate` only raises the floor, never the ceiling.

**Default behaviour:** If `startDate` is omitted, behaviour is unchanged (backwards compatible).

**Schema change:** None.

---

### 3. Replace the generated-schedule review dialog with a pre-generate preferences dialog

**Problem:** The current "Generated Schedule" preview dialog shows a scrollable list of every proposed activity. The user never reads or verifies this list before approving — it adds friction without adding value. The meaningful decision point is *before* generation, not after.

**Fix:** Replace the current generate → review → apply flow with a two-step flow:

1. **Pre-generate preferences dialog** (new): opens when "Generate Schedule" is clicked. Shows:
   - A **start date picker** (defaults to today's date if today is in the current month, otherwise the first day of the month)
   - A **card per focus goal** with editable scheduling preferences: sessions per week, preferred days (Mon–Sun toggles), preferred time slot (Morning / Afternoon / Evening / No preference)
   - A **"Generate & Apply"** confirmation button

2. **On confirm:** The dialog patches any modified goal preferences (`PATCH /api/goals/:id`), then calls generate (with `startDate`) and immediately applies the result — no intermediate review step. A success notification shows "Scheduled N activities" once complete.

The existing `SchedulePreview` component is retired from the generate flow. The generate → apply API calls remain unchanged; they are just chained automatically instead of requiring user interaction between them.

**What the preferences dialog does NOT include:**
- Training plan split settings (training vs supplemental sessions per week, split preferred days). These are managed via the dedicated training plan dialog on the Goals page and are a more complex concern. They are shown as read-only on the preference card if a training plan exists.
- Blackout dates or global scheduler settings. These remain in the Scheduler Settings sheet.

**Schema change:** None. `goals.sessionsPerWeek`, `goals.preferredDays`, and `goals.preferredTimeSlot` already exist.

---

### 4. Focus Goals dialog: flat goal list (no role grouping)

**Problem:** The "Select Focus Goals" dialog groups goals under their role header (Athlete, Friend, etc.). A goal linked to multiple roles appears in multiple sections, which is confusing. The role grouping adds noise without helping the user decide which goals to focus on.

**Fix:** Replace the role-grouped layout in `FocusPicker` with a flat list of goals, sorted alphabetically by name. Role badges remain visible on each goal card (they are useful context) but no longer act as section headers. Goals with no role appear alongside all others.

**Schema change:** None.

---

### 5. Edit Activity dialog: notes field moved to top

**Problem:** The Notes field in the Edit Activity dialog is the last item in a form of seven fields. When opening the dialog to read or update notes (the most common use case from real usage), the user must scroll past six other fields to reach it. Notes often contain the phase description generated by the scheduler — which is the first thing a user wants to read.

**Fix:** Move the Notes field to position 3 in the form, immediately after the Date/Start/End row, before Role, Activity Type, Linked Goal, and Session Type.

**Schema change:** None.

---

## What is explicitly out of scope

- Editing training plan split settings from within the preferences dialog (handled via the dedicated Training Plan dialog on the Goals page)
- Editing blackout dates or global scheduler settings from within the preferences dialog
- Deleting completed activities when a goal is deleted (completed activities are kept as historical records)
- Any new database table or column
- Any change to the Goals page or the Activities tab
- Any change to the `SchedulePreview` component beyond removing it from the active generate flow (it can remain in the codebase unused for now)

---

## Summary of changes per file

| File | Change |
|------|--------|
| `src/app/api/goals/[id]/route.ts` | DELETE handler: also delete uncompleted activities and weeklyFocusGoals for the goal and its children |
| `src/app/api/schedule/generate/route.ts` | Accept optional `startDate`; clip date range floor |
| `src/components/monthly-plan/focus-picker.tsx` | Replace role-grouped layout with flat alphabetical list |
| `src/components/monthly-plan/activity-form.tsx` | Move Notes field to position 3 |
| `src/components/monthly-plan/schedule-preferences-dialog.tsx` | New component: pre-generate dialog with start date + goal preference cards |
| `src/components/monthly-plan/weekly-plan-view.tsx` | Wire "Generate Schedule" to new preferences dialog; chain generate + apply automatically |

---

## Dependencies

- Feature 1 (Calendar Management) — built
- Scheduler Rules System — built
- Goals V2 (`preferredDays`, `preferredTimeSlot`, `sessionsPerWeek` on goals) — built
- Activities Refactoring V1 (`activities.goalId`, `activities.isCompleted`) — built
