# Review: Planning / Execution Redesign

**Reviewer:** Agent
**Date:** 2026-06-07
**Documents reviewed:** `scope.md`, `spec.md`
**Verdict:** Mostly solid. Two genuine specification bugs need fixing before planning. Three important gaps need decisions. The rest is well-reasoned and ready to build.

---

## Overall assessment

The strategic framing is correct and hard to vary. The monthly calendar is a *planning* tool — it has too much information to execute from day to day. Separating the surfaces is the right call. The problem statement for each of the four items is specific enough to criticise and test, which is a good sign.

The no-schema-change constraint is excellent discipline. It forces reuse of what's already built (DayColumn, SchedulePreferencesDialog, trainingPhases data) rather than adding complexity. The phase-aware scheduling addition and session sufficiency warning are straightforward extensions of existing structure, not new abstractions.

The two issues below are genuine bugs in the spec logic that would produce wrong behaviour if built as written. Fix them before planning.

---

## Blocking issues

### B1 — endDate default formula uses the wrong startDate

**Location:** `spec.md` FR-4.3, `scope.md` §3b

The spec says:
> `endDate` = `startDate` + (`durationWeeks` × 7) days, where `durationWeeks` comes from the goal's active `trainingPhases` row.

Here, `startDate` refers to the *dialog's* start date — today by default. This is wrong.

**Why it matters:** If a user is 3 weeks into a 7-week Strength phase and opens the dialog today, the formula produces `today + 49 days`. But the phase ends `phase.startDate + 49 days` — which is only 28 days from today. Building the formula on the dialog's `startDate` generates a 7-week block from today, not a block that finishes the active phase. The user ends up scheduling 4 weeks into the *next* phase.

**The correct formula:** `endDate` = `trainingPhase.startDate` + (`durationWeeks` × 7) days.

This is independent of the dialog's `startDate`. It represents the actual phase end date. The user can still shorten it (FR-4.4 says the fields are independent once the dialog opens).

**Side effect on FR-4.7:** "Week N of M" labels the current week of the active phase (N = weeks since `phase.startDate`). If the endDate default is fixed to use `phase.startDate`, the label and the horizon are now consistent — both reference the same origin. Under the current broken formula, "Week 3 of 7" in the label contradicts an endDate that schedules 7 more weeks from today.

**Fix:**
```
endDate default = trainingPhase.startDate + (durationWeeks × 7) days
```
where `trainingPhase.startDate` is the `start_date` column on the active `trainingPhases` row.

---

### B2 — WeeklyPlanView training plan data is not loaded at page mount

**Location:** `spec.md` FR-5.7, `scope.md` §4

FR-5.7 states:
> `WeeklyPlanView` derives a `trainingPlanMinimums: Record<number, number>` map from training plan data **already loaded** during the generate flow, and passes it to `SchedulePreferencesDialog` as a prop.

"Already loaded during the generate flow" is misleading. The generate flow is triggered when the user clicks "Generate Schedule" — but the dialog opens *immediately* on that click, before any API call. If `trainingPlanMinimums` depends on data fetched during generation, it will not be available when the dialog first renders, so all warning logic will be absent on first open.

Looking at the existing `WeeklyPlanView`: its `fetchAll` function loads activities, goals, recurring activities, and roles. It does not load `trainingPlans`.

**Fix:** `WeeklyPlanView` (and the new `ThisWeekView`) must fetch `trainingPlans` as part of their initial data load — alongside goals — so `trainingPlanMinimums` is available synchronously when the dialog opens.

The prop-based approach (no new API request) is correct; the problem is just the data needing to be loaded at mount, not lazily at generate time.

---

## Important issues

### I1 — `currentMonth` prop is ambiguous when Generate is triggered from `/this-week`

**Location:** `spec.md` FR-2.7, FR-4.3, `scope.md` §2

`SchedulePreferencesDialog` takes a `currentMonth: string` prop. It uses this prop for:
1. Clamping the start-date picker's `min`/`max` values.
2. Computing the default `endDate` for non-training goals (`last day of currentMonth`).
3. Passing `month` to the generate API call.

The `monthly-plan` page has a clear `currentMonth` — the user has selected it. The `/this-week` page has no such concept. Questions the spec doesn't answer:

- If today is June 30 and the user is viewing the Jun 30 – Jul 6 week, is `currentMonth` "2026-06" or "2026-07"?
- If the user navigates `/this-week` to a future week (e.g. Jul 7–13), should `currentMonth` follow?
- The `min`/`max` clamping on the start-date picker would restrict the user to a single calendar month, which contradicts the phase-aware endDate that can span multiple months.

**Suggested resolution:** When Generate is triggered from `/this-week`, `currentMonth` should be derived from today's date (the month the user is executing in), not the displayed week. The start-date picker's `max` constraint should be relaxed (or removed entirely) for the `/this-week` trigger, since the phase-aware endDate already establishes the outer horizon.

This decision belongs in the spec before plan/tasks are written.

---

### I2 — FR-2.9 focus goals count: data source is unspecified for `/this-week`

**Location:** `spec.md` FR-2.9

> The page displays the current count of focus goals ("N goals in focus this month"), sourced the same way as the monthly view.

The monthly view sources focus goals from `GET /api/weekly-plans` (the weekly focus plans). "Sourced the same way" is vague enough to be ambiguous in implementation. Concretely: does `/this-week` call `GET /api/weekly-plans` for the current week, for the current month, or does it call a different endpoint?

Given that the weekly view is an *execution* surface, "goals in focus this month" is the right framing (you're executing the month's plan). The cleanest resolution: `/this-week` uses `GET /api/weekly-plans` with `month={currentMonth}` — the same call the monthly view makes — and shows the same focus goal list.

---

### I3 — "no resume mid-phase" philosophy needs explicit wording in the spec

**Location:** `scope.md` §3b, `spec.md` FR-4.7

The scope says:
> There is no 'resume mid-phase' concept. When the user generates a schedule, they are committing to starting the phase now.

But FR-4.7 shows "Active: Strength — Week 3 of 7" — a label that clearly shows the user *is* mid-phase. The label exists for information; the scheduler commits to starting from `startDate` regardless. This is fine, but the tension creates a real UX question the spec doesn't resolve: if the user is in Week 3 of a 7-week phase and generates from today, `regenerate = true` will delete existing scheduled activities across the `startDate`–`endDate` range. That includes weeks 3–7 of the currently scheduled phase. The user sees "Week 3 of 7" and may not expect clicking "Generate & Apply" to delete what's already on their calendar.

This is not a bug — it is a deliberate design choice — but it should be stated explicitly in the spec as an acceptance criterion. Suggested wording:
> When the user confirms from within an active phase, existing scheduled (non-completed) activities for that goal within the `startDate`–`endDate` range are replaced. The user is starting the scheduling block fresh from `startDate`. Completed activities are never removed.

---

## Minor issues

### M1 — Week header format breaks for cross-month weeks

**Location:** `spec.md` FR-2.2

The format example given is `"Mon 2 – Sun 8 Jun 2026"` — a single month name at the end. For a week that spans two months (e.g. Jun 30 – Jul 6), this format is ambiguous. The spec should define the cross-month format explicitly, e.g.: `"Tue 30 Jun – Sun 6 Jul 2026"`.

---

### M2 — Scope summary table is missing the new page

**Location:** `scope.md`, "Summary of changes per file" table

The table lists `src/components/monthly-plan/this-week-view.tsx` but not `src/app/this-week/page.tsx`. The page file is in the description text (§2) but was omitted from the summary table. Minor, but worth correcting before planning to avoid the table being used as the authoritative file list.

---

## What is strong

**Planning vs Execution split:** The core structural argument — monthly = planning, weekly = execution — is a good explanation. It is hard to vary: you can't swap out the reasoning and reach the same conclusion. The claim is testable (overwhelm is real and measurable) and the fix is proportionate (a new view, not a new paradigm).

**No schema changes:** A clean self-imposed constraint. Every feature in this scope works from data that already exists. This is the right level of leverage — extending what's there rather than adding weight.

**Advisory-only session warning:** Correct. The user retains agency. Blocking on a warning destroys the feedback loop — the user can't proceed to discover whether the warning matters for their situation. Advisory keeps the error correction open.

**Backwards compatibility for `endDate`:** Explicit and testable. Existing callers continue working unchanged. The new parameter is purely additive.

**NFR-1 (DayColumn reuse without modification):** This is the right constraint. Any feature that requires you to modify a core display primitive to make it work in a new context is a signal the abstraction is wrong. If DayColumn needs changes, that's a smell to be investigated, not assumed away.

**`trainingPlanMinimums` as a prop, no new API:** Good judgment call. The data is already loaded; deriving a minimal computed prop is the right pattern.

---

## Summary

| ID | Severity | Description |
|----|----------|-------------|
| B1 | **Blocking** | endDate default uses dialog.startDate instead of phase.startDate — produces wrong horizon mid-phase |
| B2 | **Blocking** | trainingPlans not loaded at WeeklyPlanView/ThisWeekView mount — warnings absent on first dialog open |
| I1 | **Important** | currentMonth prop is ambiguous when Generate triggered from /this-week |
| I2 | **Important** | Focus goals data source for /this-week is underspecified |
| I3 | **Important** | "no resume mid-phase" behaviour needs explicit wording as acceptance criterion |
| M1 | Minor | Week header format undefined for cross-month weeks |
| M2 | Minor | scope.md summary table missing `src/app/this-week/page.tsx` |
