# Tasks: Planning / Execution Redesign

**Input:** `plan.md`, `spec.md`
**Delivery:** Three PRs (A → B → C). PR A is purely additive and can merge independently.

---

## Phase 1: Foundational — no blocking prerequisites

No database migrations. No new shared infrastructure. All changes are additive or extend existing files.

---

## Phase 2: PR A — Phase-aware Generate API (US-3)

**Goal:** `POST /api/schedule/generate` accepts optional `endDate` and respects it across the full
scheduling pipeline. Existing callers continue to work unchanged.

**Independent test:** Call the endpoint with `endDate: "2026-08-15"` and `regenerate: true` for a
month-scope request. The response `dateRange.end` equals `"2026-08-15"`. Call without `endDate` —
response is identical to today's output.

- [ ] T001 [US3] Extend body destructuring in `src/app/api/schedule/generate/route.ts` to read `endDate?: string` alongside the existing `weekStartDate`, `scope`, `regenerate`, `month`, `startDate`
- [ ] T002 [US3] Add validation block in `src/app/api/schedule/generate/route.ts`: if `endDate` is provided and is before the effective start date after `startDate` clamping, return `400 { error: "endDate must be on or after startDate" }`
- [ ] T003 [US3] Replace `getMonthDateRange` usage in `src/app/api/schedule/generate/route.ts`: when `endDate` is provided and `scope === "month"`, compute the day count with UTC-noon arithmetic to avoid DST drift, then call `getDateRange`. When `endDate` is absent, behaviour is unchanged:
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
- [ ] T004 [US3] Update `dateRange` in the response object in `src/app/api/schedule/generate/route.ts`: `end` must be `endDate ?? (effectiveDates[effectiveDates.length - 1] ?? dates[dates.length - 1])` to reflect the actual scheduling horizon in the response.

**Checkpoint — PR A:** Generate API updated. All existing schedule generation flows work unchanged.

---

## Phase 3: PR B Part 1 — Training plan data loading (US-5 prerequisite)

**Goal:** `WeeklyPlanView` loads training plan data at page mount so `trainingPlanMinimums` is
available synchronously when `SchedulePreferencesDialog` first opens.

**Independent test:** Open the Monthly Plan page with at least one focus goal that has a training
plan. Open the Schedule Preferences dialog immediately on first click — the session sufficiency
warning (if applicable) must be visible without any delay or second open.

- [ ] T005 [US5] In `src/components/monthly-plan/weekly-plan-view.tsx`, add `trainingPlans` state: `useState<Record<number, { trainingSessionsPerWeek: number | null; supplementalSessionsPerWeek: number | null }>>({})`. Add fetch logic inside `fetchAll` that — after `focusData` is resolved — calls `GET /api/training-plans?goalId=N` for each focus goal ID in parallel using `Promise.all`. Store results keyed by goal ID.
- [ ] T005b [US5] In `src/components/monthly-plan/weekly-plan-view.tsx`, extract and store `trainingPhaseInfo` from the same training plan responses fetched in T005. `GET /api/training-plans?goalId=N` returns `{ ...plan, phases: [...] }` inline. For each response, find the phase where `status === "active"`. Build and store `trainingPhaseInfo: Record<number, { phaseName: string; phaseStartDate: string; durationWeeks: number }>` keyed by goal ID (omit a goal if it has no active phase). This state is passed to `SchedulePreferencesDialog` as the `trainingPhaseInfo` prop in T007.
- [ ] T006 [US5] In `src/components/monthly-plan/weekly-plan-view.tsx`, derive `trainingPlanMinimums: Record<number, number>` as a `useMemo` from the loaded training plans state. For each goal: if the plan has explicit `trainingSessionsPerWeek` and `supplementalSessionsPerWeek`, minimum = their sum; if the plan has null values (uses default split), minimum = 3; if no plan exists for the goal, omit the goal from the map.

**Checkpoint:** `trainingPlanMinimums` is available at render time before the dialog opens.

---

## Phase 4: PR B Part 2 — Dialog enhancements (US-4, US-5, US-3 UI)

**Goal:** `SchedulePreferencesDialog` shows the "Schedule through" end-date field, phase active
labels, and session sufficiency warnings. `onConfirm` passes `endDate` to the caller.

**Independent test (US-4):** Open the dialog for a goal with an active training phase. The "Schedule through" field is pre-filled with `trainingPhase.startDate + durationWeeks × 7` days (the actual phase end). Change start date — end date does not change. Set end date before start date — "Generate & Apply" is disabled.

**Independent test (US-5):** Set `sessionsPerWeek` to 1 on a goal with a training plan. The tier-1 warning appears immediately. Increase to 3 — warning disappears.

- [ ] T007 [P] [US4] Extend `Props` interface in `src/components/monthly-plan/schedule-preferences-dialog.tsx`: add `trainingPlanMinimums: Record<number, number>` and `trainingPhaseInfo: Record<number, { phaseName: string; weekN: number; weekM: number; phaseStartDate: string; durationWeeks: number }>`. Update `onConfirm` signature to `(startDate: string, endDate: string, patches: GoalPatch[]) => Promise<void>`.
- [ ] T008 [US4] Add `endDate` state in `src/components/monthly-plan/schedule-preferences-dialog.tsx`. Initialise in the `useEffect` that runs on `open`: for each focus goal, compute candidate end date (phase: `trainingPhaseInfo[id].phaseStartDate + durationWeeks × 7 days`; no phase: `getMonthLastDay(currentMonth)`). Set `endDate` to the latest of all candidates.
- [ ] T009 [US4] Add "Schedule through" `<Input type="date">` field in `src/components/monthly-plan/schedule-preferences-dialog.tsx` immediately below the "Start date" field. `min` = `startDate`. No `max`. Show inline error "End date must be on or after the start date." and disable the "Generate & Apply" button when `endDate < startDate`.
- [ ] T010 [US4] Remove `max` constraint from the existing "Start date" input **only when triggered from `/this-week`**. Implement via a new optional boolean prop `relaxStartDateMax?: boolean` on `SchedulePreferencesDialog`. When `true`, omit the `max` attribute. Default `false` (monthly view keeps existing clamping).
- [ ] T011 [US4] Update `handleConfirm` in `src/components/monthly-plan/schedule-preferences-dialog.tsx` to call `onConfirm(startDate, endDate, patches)`.
- [ ] T012 [P] [US4] Update `handleConfirmGenerate` in `src/components/monthly-plan/weekly-plan-view.tsx` to accept `(startDate, endDate, patches)` and include `endDate` in the `POST /api/schedule/generate` body.
- [ ] T013 [US5] Add phase active label to each goal card in `src/components/monthly-plan/schedule-preferences-dialog.tsx`: if `trainingPhaseInfo[goal.id]` exists, render read-only text "Active: {phaseName} — Week {weekN} of {weekM}" immediately below the goal title. Compute `weekN` with UTC-noon timestamp arithmetic to avoid DST drift, capped within `[1, weekM]`:
  ```ts
  const today = new Date().toISOString().slice(0, 10);
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
- [ ] T014 [US5] Add session sufficiency warning in `src/components/monthly-plan/schedule-preferences-dialog.tsx` inside each goal card, below the sessions-per-week input. Condition: goal exists in `trainingPlanMinimums`. `sessionsPerWeek === 1` → tier-1 message. `sessionsPerWeek === 2` → tier-2 message. `sessionsPerWeek >= minimum` → no message. Re-evaluated on each render (reactive to input changes, NFR-5).

**Checkpoint — PR B:** Dialog shows end-date, phase label, and session warning. Monthly Plan page is fully functional with all new dialog features.

---

## Phase 5: PR C Part 1 — This Week view (US-1, US-6)

**Goal:** `/this-week` shows a 7-day execution view reusing `DayColumn`. Completed activities are
visible at reduced opacity. Week navigation works without full page reload.

**Independent test:** Navigate to `/this-week`. Seven day columns appear for the current Mon–Sun.
Add an activity on any day — it appears in the correct column. Mark an activity complete — it stays
visible with a checkmark and reduced opacity. Use previous/next arrows to change weeks — columns update.

- [ ] T015 [US1] Create `src/app/this-week/page.tsx`: thin Next.js server component that imports and renders `ThisWeekView`. No props needed.
- [ ] T016 [US1] Create `src/components/monthly-plan/this-week-view.tsx`: "use client" component. State: `currentWeekMonday` (ISO date string, initialised to the Monday of the week containing today). Helpers `getMondayOfWeek(date: Date): Date` and `formatWeekHeader(monday: Date): string` (handles same-month and cross-month formats per FR-2.2). `fetchAll` loads: weekly plan, focus goals, activities for the week, roles, recurring activities, and training plans for each focus goal (same pattern as T005). Derives `trainingPlanMinimums` via same logic as T006.
- [ ] T017 [US1] Render 7 `DayColumn` components in `src/components/monthly-plan/this-week-view.tsx`, one per day Monday–Sunday. Pass `date`, `activities` (filtered to that day), `recurringActivities`, and `onAddActivity` / `onToggleActivity` / `onClickActivity` handlers. Do not pass `compact` prop — columns are full-width for execution context.
- [ ] T018 [US6] Verify completed-activity rendering in `src/components/monthly-plan/day-column.tsx`: confirm the component already applies 0.5 opacity, a checkmark icon, and line-through title for `isCompleted === true` activities (it does — no code change needed, NFR-1 satisfied). The weekly view inherits this behaviour for free by reusing `DayColumn` unchanged.
- [ ] T019 [US1] Add week navigation header in `src/components/monthly-plan/this-week-view.tsx`: `formatWeekHeader(monday)` label, Previous week button (`ChevronLeft`), Next week button (`ChevronRight`). Clicking either updates `currentWeekMonday` state and re-runs `fetchAll`.
- [ ] T020 [US1] Add "Generate Schedule" button and "View Monthly Plan" link in `src/components/monthly-plan/this-week-view.tsx`. "Generate Schedule" opens `SchedulePreferencesDialog` with `currentMonth` derived from today's date, `relaxStartDateMax={true}`, and `trainingPlanMinimums` / `trainingPhaseInfo` from local state. "View Monthly Plan" is a Next.js `<Link href="/monthly-plan">`.
- [ ] T021 [US1] Add `handleConfirmGenerate` in `src/components/monthly-plan/this-week-view.tsx`: mirrors the same three-step flow as `WeeklyPlanView` (PATCH goal prefs → POST generate → POST apply). Uses `weekStartDate = currentWeekMonday` and `scope = "month"`. Must include `month: format(parseISO(currentWeekMonday), "yyyy-MM")` in the generate body — this is what `generate/route.ts` uses to compute `monthFirstDay`; omitting it causes the route to fall back to `weekStartDate` as the month base, which is incorrect when the Monday falls in a different month than today. Pass `endDate` from dialog confirmation.
- [ ] T022 [US1] Add focus goals count label to the page header in `src/components/monthly-plan/this-week-view.tsx`: "N goals in focus this month". Sourced from `GET /api/weekly-plans?week={weekStartDate}` → then `GET /api/weekly-plans/{ws}/goals` count (same calls already in `fetchAll`).

**Checkpoint — PR C Part 1:** `/this-week` page exists and works end-to-end.

---

## Phase 6: PR C Part 2 — Sidebar navigation (US-2)

**Goal:** Sidebar has "Execution" and "Planning" groups. `/this-week` is visible and active-highlighted.

**Independent test:** Navigate to each of `/today`, `/this-week`, `/monthly-plan`. Confirm the
correct item highlights active. Confirm Life Areas and Library groups are unchanged.

- [ ] T023 [US2] Replace `NAV_GROUPS` constant in `src/components/layout/app-sidebar.tsx`: remove "Daily Focus" group. Add `{ label: "Execution", items: [Today (/today), This Week (/this-week)] }` and `{ label: "Planning", items: [Monthly Plan (/monthly-plan)] }`. Import `CalendarRange` from `lucide-react` (or another appropriate icon) for the "This Week" item. Preserve Life Areas group unchanged.

**Checkpoint — PR C:** Full feature complete. All six user stories testable end-to-end.

---

## Phase 7: Polish

- [ ] T024 [P] Update `specs/master/contracts/api-routes.md` to document the new `endDate` parameter on `POST /api/schedule/generate`
- [ ] T025 [P] Update `AGENT-ONBOARDING.md` and `specs/master/feature-specs.md` to mark Planning / Execution Redesign as "Built" after all PRs merge

---

## Dependencies & Execution Order

| Phase | Depends on | Parallel with |
|-------|-----------|---------------|
| Phase 2 (PR A — API) | Nothing | Phases 3–7 can be prepared in parallel |
| Phase 3 (trainingPlans fetch) | Nothing — `WeeklyPlanView` already exists | Can start immediately, parallel with PR A |
| Phase 4 (dialog enhancements) | Phase 3 complete AND PR A merged | — |
| Phase 5 (ThisWeekView) | Phase 4 (for dialog) | Phase 4 tasks can run in parallel |
| Phase 6 (sidebar) | Phase 5 (`/this-week` must exist before link added) | — |
| Phase 7 (docs) | All phases | All docs tasks are parallel |

### Within PR B (phases 3 + 4)

- T005–T006 (data loading) must complete before T007–T014 (dialog) can be fully wired
- T007 and T012 are [P] — they only touch the interface and the caller; can be written together

### Within PR C (phases 5 + 6)

- T015–T022 (ThisWeekView) are mostly sequential within the component
- T023 (sidebar) requires T015 to exist so the `/this-week` route resolves
- T018 should be verified after T017 — check if `DayColumn` already applies completed styling

---

## Implementation Strategy

### Recommended merge sequence

1. **PR A** (T001–T004) — merge first, no regressions possible
2. **PR B** (T005–T014) — merge after PR A; Monthly Plan page gains all new dialog features
3. **PR C** (T015–T025) — merge after PR B; adds `/this-week` and sidebar restructure

### MVP

PR A alone delivers US-3 (phase-aware API) to power users who know to call the endpoint.
PR B alone delivers US-4 (adjustable horizon) and US-5 (session warnings) in the existing monthly view.
PR C delivers US-1, US-2, US-6 (the new weekly execution surface).

---

## Notes

- `DayColumn` may already render completed activities with visual treatment — check before writing T018
- `trainingPhaseInfo` for the dialog is derived from the same training plans fetch in T005; no extra API call
- The `relaxStartDateMax` prop (T010) keeps the monthly view's existing `max` constraint intact and is additive
- Cross-month `endDate` scheduling works because `getDateRange(start, n)` is already implemented in the generate route and is not calendar-month-bound
