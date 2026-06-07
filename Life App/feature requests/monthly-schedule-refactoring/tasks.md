# Tasks: Monthly Schedule Refactoring

**Feature ID:** `monthly-schedule-refactoring`
**Status:** Tasks generated 2026-06-07
**Source:** `plan.md`, `spec.md`
**Last updated:** 2026-06-07

---

## Phase A — Simple fixes (feat/monthly-schedule-fixes)

_Commit feature docs first. Three independent targeted edits — each can be verified in isolation._

- [ ] **T001** Commit feature request docs (`scope.md`, `spec.md`, `plan.md`, `tasks.md`) to `Life App/feature requests/monthly-schedule-refactoring/`

### Goal deletion cascade (FR-1)

- [ ] **T002** In `Life App/src/app/api/goals/[id]/route.ts`: add `activities`, `weeklyFocusGoals`, `trainingPlans` to the Drizzle imports (not `weeklyPlans` — no longer needed); add `inArray` to the `drizzle-orm` import
- [ ] **T003** In the `DELETE` handler, after collecting `childGoalIds`, build `allGoalIds = [goalId, ...childGoalIds]`; add the three cleanup blocks from plan §4.A.1 in order: (a) delete uncompleted non-log-created activities, (b) delete weeklyFocusGoals with direct `inArray(weeklyFocusGoals.goalId, allGoalIds)` — no intermediate SELECT needed, (c) delete trainingPlans
- [ ] **T004** Manual smoke: create a goal with scheduled activities + focus entry, delete it, confirm the activities and focus entries are gone; also confirm a *completed* activity for that goal is kept

### FocusPicker flat list (FR-4)

- [ ] **T005** In `Life App/src/components/monthly-plan/focus-picker.tsx`: remove the `goalsByRole` computation (and its `roles` filter + map)
- [ ] **T006** Add a `sortedGoals` computation: selected goals first (alphabetical), then unselected (alphabetical), using `selected` state and `title.localeCompare`
- [ ] **T007** Replace the role-grouped JSX (the outer `goalsByRole.map` with role header divs) with a single `sortedGoals.map(...)` using the same goal card markup; remove the `pl-5` indent that was under the role header; keep all role badges on the card
- [ ] **T008** Manual smoke: open Focus Picker — goals appear as a flat list; a multi-role goal appears only once; a goal with no role is visible

### Notes field position (FR-5)

- [ ] **T009** In `Life App/src/components/monthly-plan/activity-form.tsx`: move the Notes `<div>` block (label + textarea) to immediately after the Date/Start/End `<div className="grid grid-cols-3 ...">` block, before the Role select
- [ ] **T010** Manual smoke: open Edit Activity — Notes textarea is visible without scrolling, above the Role/Type/Goal dropdowns; saving still works correctly

### Phase A gate check

- [ ] **T011** Run `npx tsc --noEmit` — exit 0
- [ ] **T012** Run `npx vitest run` — all tests pass
- [ ] **T013** Open PR from `feat/monthly-schedule-fixes` → `master`; merge after review

---

## Phase B — Scheduler preferences (feat/monthly-schedule-prefs)

_Rebase onto master after Phase A merges. Build generate-route change first (smallest, safest), then the dialog, then wire it in._

### Generate route: startDate (FR-2)

- [ ] **T014** In `Life App/src/app/api/schedule/generate/route.ts`: destructure `startDate` from the request body alongside the existing parameters
- [ ] **T015** After `dates` is computed by `getMonthDateRange` (or `getDateRange` for week scope), derive `effectiveDates`: if `startDate` is provided, filter `dates` to only include values `>= startDate`; otherwise `effectiveDates = dates`
- [ ] **T016** Replace all uses of `dates` in the handler body with `effectiveDates`: the `scopeActivities` filter, the `regenerate` activity-removal filter, and the `dateRange` values in the response. **Also** update the 5th argument to `generateSchedule` from `scope === "month" ? monthFirstDay : weekStartDate` to `scope === "month" ? (effectiveDates[0] ?? monthFirstDay) : weekStartDate` — without this, the scheduler still generates from day 1 even when `startDate` is set
- [ ] **T017** Manual smoke: generate schedule mid-month with `startDate` set to today via REST client (Postman or `fetch` in browser console) — confirm no activities are proposed before today

### SchedulePreferencesDialog component (FR-3)

- [ ] **T018** Create `Life App/src/components/monthly-plan/schedule-preferences-dialog.tsx` — "use client", export `SchedulePreferencesDialog`, define `GoalPref` and `Props` interfaces per plan §4.B.2
- [ ] **T019** Implement dialog open state initialisation: `startDate` defaults to today if today is in `currentMonth`, else `${currentMonth}-01`; `prefs` record initialised from each focus goal's `sessionsPerWeek`, parsed `preferredDays` (JSON string → number array), `preferredTimeSlot`
- [ ] **T020** Implement start date picker: `<Input type="date">` with `min` = first day of month, `max` = last day of month, bound to `startDate` state
- [ ] **T021** Implement per-goal cards: goal title heading; Sessions per week `<Input type="number" min=1 max=7>`; day toggle buttons Mo–Su (`Button variant="outline"` / `variant="default"` when selected, value 1–7); time slot buttons Morning / Afternoon / Evening / Any (maps to null)
- [ ] **T022** Implement "Generate & Apply" button: disabled when `confirming` prop is true, shows spinner; computes `patches` array (only goals with changed fields), calls `onConfirm(startDate, patches)`
- [ ] **T023** Implement inline error display: accept an `error?: string` prop; render in red above the footer when present
- [ ] **T024** Manual smoke: open the dialog (by temporarily wiring a button); verify default start date, verify goal cards display correct initial values, verify day toggles and time slot buttons update local state

### Wire into weekly-plan-view (FR-3 continued)

- [ ] **T025** In `Life App/src/components/monthly-plan/weekly-plan-view.tsx`: add `SchedulePreferencesDialog` to imports; add `prefsDialogOpen`, `confirming`, and `prefsError` (`string | null`, init `null`) state variables
- [ ] **T026** Replace the body of `handleGenerateSchedule` so that when `focusGoals.length > 0` it opens the preferences dialog (`setPrefsDialogOpen(true)`) instead of calling the generate API directly
- [ ] **T027** Add `handleConfirmGenerate(startDate, patches)` function per plan §4.B.3: `Promise.all` patch modified goals → generate (with `startDate`) → apply → close dialog + refresh; on any error call `setPrefsError(err.message)` so the dialog surfaces it instead of silently swallowing the failure
- [ ] **T028** Add `successMessage: string | null` state to `weekly-plan-view.tsx`; after a successful apply set it to `"Scheduled N activities"` (N = `proposal.activities.length`); render it as a brief inline banner in the calendar header area; auto-clear after 4 s (via `setTimeout`) or when the preferences dialog is re-opened; clear it at the start of `handleGenerateSchedule` alongside `prefsError` (no external toast library needed)
- [ ] **T029** Remove the now-unused state variables and functions from `weekly-plan-view.tsx`: `previewOpen`, `scheduleProposal`, `regenerateMetadata`, `applying`, `handleApplySchedule`; remove `SchedulePreview` import and JSX
- [ ] **T030** Add `<SchedulePreferencesDialog>` JSX in the return, alongside the other dialogs (FocusPicker, ActivityForm, etc.), passing `focusGoals`, `currentMonth`, `onConfirm={handleConfirmGenerate}`, `confirming`, `error={prefsError ?? undefined}`

### Phase B gate check

- [ ] **T031** Run `npx tsc --noEmit` — exit 0
- [ ] **T032** Run `npx vitest run` — all existing tests pass
- [ ] **T033** Run all five manual acceptance scenarios from plan §5 (S1–S5)
- [ ] **T034** Open PR from `feat/monthly-schedule-prefs` → `master`; merge after review
