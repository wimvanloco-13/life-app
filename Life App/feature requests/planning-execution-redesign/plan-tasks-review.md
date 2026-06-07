# Review: Plan & Tasks — Planning / Execution Redesign

**Reviewer:** Agent
**Date:** 2026-06-07
**Documents reviewed:** `plan.md`, `tasks.md`
**Spec issues addressed?** Yes — B1 (endDate formula) fixed in T008; B2 (training plan data at mount) fixed in T005. I1 (currentMonth from /this-week) addressed via T010 (`relaxStartDateMax` prop) and T021 (`currentMonth` derived from today). I2 (focus goals source) addressed in T022. I3 (mid-phase re-generation behaviour) not yet in spec but doesn't block the plan.

**Verdict:** Two blocking issues need fixing before implementation starts. Two important gaps should be closed. The overall structure and PR sequence are sound.

---

## Blocking issues

### B1 — T003 references `daysBetween`, which does not exist

**Location:** `tasks.md` T003

The task says to call:
```ts
getDateRange(monthFirstDay, daysBetween(monthFirstDay, endDate) + 1)
```

`getDateRange` (defined inline in `generate/route.ts`) takes `(startDate: string, days: number)` — a start and a count. There is no `daysBetween` helper anywhere in the codebase (`src/lib/dates.ts` doesn't have one; the function doesn't appear in any imported module).

Passing an undefined function produces a runtime error; TypeScript would catch it at compile time, so the gate check would fail. Either way, implementation cannot proceed without a concrete formula.

**Fix:** Replace the `daysBetween` reference with inline arithmetic. Anchor to UTC noon to avoid DST drift, consistent with the established pattern in the codebase (see `habit-v2-helpers.ts`):

```ts
const days = Math.round(
  (new Date(endDate + "T12:00:00Z").getTime() -
    new Date(monthFirstDay + "T12:00:00Z").getTime()) /
    (24 * 60 * 60 * 1000)
) + 1;
const dates = scope === "month" && endDate
  ? getDateRange(monthFirstDay, days)
  : getMonthDateRange(monthFirstDay);
```

Update T003 accordingly.

---

### B2 — T021 omits `month` parameter from the generate API call

**Location:** `tasks.md` T021

The task says `handleConfirmGenerate` in `ThisWeekView` should use:
```
weekStartDate = currentWeekMonday, scope = "month"
```

In `generate/route.ts`, `monthFirstDay` is derived as:
```ts
const monthFirstDay = scope === "month" && month ? `${month}-01` : weekStartDate;
```

If `month` is not passed, `monthFirstDay` falls back to `weekStartDate` — i.e. the current Monday (e.g. `"2026-06-08"`). Passing `"2026-06-08"` to `getMonthDateRange` returns the days of June 2026 correctly (it only uses the year and month components), but `monthlyOverrides` lookup and the `generateSchedule` start argument would use the wrong base. More critically, if the Monday is in a different month than today (e.g. viewing a week that starts Jul 30 and the user generates for August), `monthFirstDay` would be `"2026-07-30"` and the whole month would be July, not August.

**Fix:** T021 must explicitly include `month: format(parseISO(currentWeekMonday), "yyyy-MM")` in the `POST /api/schedule/generate` body, matching what `WeeklyPlanView.handleConfirmGenerate` already does. Update T021 accordingly.

---

## Important issues

### I1 — T005/T007 gap: `trainingPhaseInfo` derivation is unassigned

**Location:** `tasks.md` T005, T007

T005 stores:
```ts
useState<Record<number, { trainingSessionsPerWeek: number | null; supplementalSessionsPerWeek: number | null }>>({})
```

T007 declares a `trainingPhaseInfo` prop on `SchedulePreferencesDialog`:
```ts
Record<number, { phaseName: string; weekN: number; weekM: number; phaseStartDate: string; durationWeeks: number }>
```

No task tells the implementer to extract this phase info from the API response and store it in state. The plan's notes section mentions "`trainingPhaseInfo` for the dialog is derived from the same training plans fetch in T005; no extra API call" — which is correct (confirmed: `GET /api/training-plans?goalId=N` returns `{ ...plan, phases: [...] }` inline, so the active phase is in the response). But there is no task that actually builds and stores `trainingPhaseInfo`.

**Fix:** Expand T005 or add a T005b that explicitly describes extracting the active phase from each training plan response:
- The active phase is the `trainingPhases` row where `status === "active"`.
- Store a second piece of state: `trainingPhaseInfo: Record<number, { phaseName: string; phaseStartDate: string; durationWeeks: number }>` keyed by goal ID.
- T006 (the `useMemo` for `trainingPlanMinimums`) can remain unchanged.
- T008 and T013 then consume this state from the caller as the `trainingPhaseInfo` prop.

Without this task, a developer following T005 → T006 → T007 would write a prop type that has no state backing it.

---

### I2 — Dependency table incorrectly gates Phase 3 on PR A

**Location:** `tasks.md`, "Dependencies & Execution Order" table

The table states:
> Phase 3 (trainingPlans fetch): Depends on PR A merged

T005 and T006 add training plan data loading to `WeeklyPlanView`. They have no dependency on the `endDate` API change in PR A. They only require that `WeeklyPlanView` exists — which it already does. These tasks could be written and reviewed immediately, in parallel with PR A.

The real dependency is: Phase 4 (dialog enhancements) depends on Phase 3 (data loading), because the new dialog props need populated state to be useful.

**Fix:** Update the dependency table:
```
Phase 3 (trainingPlans fetch) — Depends on: nothing. Parallel with: PR A, Phase 4 prep.
Phase 4 (dialog enhancements) — Depends on: Phase 3 complete, PR A merged.
```
This unlocks Phase 3 to start immediately and reduces the critical path.

---

## Minor issues

### M1 — T013 weekN formula performs arithmetic on strings

**Location:** `tasks.md` T013

The task writes:
```ts
weekN = Math.max(1, Math.ceil((today - phaseStartDate) / 7))
```

`today` and `phaseStartDate` are ISO date strings. Subtracting strings in JavaScript returns `NaN` — `Math.ceil(NaN / 7)` = `NaN`. The compile-time type is `string`, so TypeScript would not catch this.

**Fix:** Use proper timestamp arithmetic, anchored to UTC noon:
```ts
const weekN = Math.max(
  1,
  Math.min(
    weekM,
    Math.ceil(
      (new Date(today + "T12:00:00Z").getTime() -
        new Date(phaseStartDate + "T12:00:00Z").getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    )
  )
);
```
Update T013 accordingly.

---

### M2 — T018 is a verification task, not a build task

**Location:** `tasks.md` T018

The task says to "apply completed-activity visual treatment" and check whether `DayColumn` already handles it. It already does — confirmed in `day-column.tsx`:
- Line 60: `opacity: activity.isCompleted ? 0.5 : 1`
- Lines 95–96: `<CheckCircle2>` icon when completed
- Line 104: `line-through` class on title

`DayColumn` fully implements FR-2.6 out of the box. T018 requires no code change — it is a read-and-confirm step.

**Fix:** Rewrite T018 as: "Verify completed-activity rendering: confirm `DayColumn` already applies 0.5 opacity, checkmark icon, and line-through title for `isCompleted === true` activities (it does — no code change needed). No modification to `DayColumn` required (NFR-1)."

---

## What is strong

**API-first delivery (PR A standalone):** Delivering the `endDate` API extension independently is the right call. It is purely additive, backwards compatible, and lets the rest of the feature build on a stable contract.

**`trainingPhaseInfo` as a prop, derived at the caller:** Keeping computation in `WeeklyPlanView`/`ThisWeekView` and passing a pre-computed map to the dialog preserves the dialog's purity. No surprise fetches inside a dialog. This is the right pattern.

**T008 endDate default using `phaseStartDate + durationWeeks × 7`:** Correctly incorporates the B1 fix from the spec review (uses phase start date, not dialog start date). The "latest across all goals" default is unambiguous.

**`relaxStartDateMax` prop (T010):** A clean, minimal solution to the I1 issue from the spec review. Boolean prop, additive, defaults to `false` so the monthly view is unaffected.

**DayColumn reuse (NFR-1):** Now confirmed safe — the component already handles everything the weekly view needs for completed-activity rendering.

**PR sequence:** A → B → C delivers working value at each step. PR A alone upgrades the API. PR B alone makes the existing monthly view smarter. PR C adds the new surface. Clean MVP stacking.

---

## Summary

| ID | Severity | Location | Description |
|----|----------|----------|-------------|
| B1 | **Blocking** | T003 | `daysBetween` helper does not exist — provide inline UTC-noon arithmetic |
| B2 | **Blocking** | T021 | Missing `month` parameter in generate call — monthFirstDay falls back to Monday date |
| I1 | **Important** | T005/T007 | `trainingPhaseInfo` state is never built — expand T005 or add T005b |
| I2 | **Important** | Dep table | Phase 3 incorrectly gated on PR A — it has no dependency; parallelize it |
| M1 | Minor | T013 | weekN formula subtracts strings — use timestamp arithmetic with UTC noon |
| M2 | Minor | T018 | DayColumn already handles completed rendering — rewrite as verify-only step |
