# Implementation Plan: Planning / Execution Redesign

**Date:** 2026-06-07 | **Spec:** `feature requests/planning-execution-redesign/spec.md`

---

## Summary

Four targeted improvements to the planning and execution surface. No database changes. Existing
`DayColumn`, `ActivityForm`, `SchedulePreferencesDialog`, and `WeeklyPlanView` are extended or
reused; no display primitives are introduced. The work groups naturally into four independent
delivery units — API extension, dialog enhancements, new weekly view, and sidebar navigation.

---

## Technical Context

**Language/Version:** TypeScript, Next.js 16 App Router  
**Primary Dependencies:** shadcn/ui, Tailwind CSS v4, date-fns, Drizzle ORM  
**Storage:** SQLite via better-sqlite3, Drizzle ORM — no schema changes  
**Target Platform:** Next.js web app (desktop browser)  
**Project Type:** Web application — single codebase, App Router  
**Performance Goals:** No new API calls on the critical rendering path; `trainingPlanMinimums` derived at mount alongside existing fetches  
**Constraints:** `DayColumn` must not be modified (NFR-1). `endDate` addition must be fully backwards compatible (NFR-2). All warning/default computation is pure client-side (NFR-4, NFR-5).

---

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I — Effectiveness Over Busyness | ✅ Separating planning from execution surfaces directly reduces overwhelm. Advisory warning keeps the user in control. |
| II — Private-First | ✅ No new auth touch points. All existing `userId` isolation continues unchanged. |
| III — AI as Advisor | ✅ Session warning is advisory only (FR-5.4). Nothing blocks user action. Phase label is read-only information. |
| IV — Visual Feedback | ✅ Phase active label and session warning are inline, contextual signals. Completed activities remain visible with checkmark. |
| V — Simplicity | ✅ No new abstractions. `DayColumn` reused unchanged. `SchedulePreferencesDialog` extended with two fields. `ThisWeekView` mirrors `WeeklyPlanView` structure. |
| VI — Modular Feature Design | ✅ `ThisWeekView` is a standalone component. Navigation change is contained to `app-sidebar.tsx`. API change is additive and isolated. |

No constitution violations.

---

## Project Structure

### New files

```
src/app/this-week/page.tsx                            — Next.js route (thin server component)
src/components/monthly-plan/this-week-view.tsx        — client component for weekly execution view
```

### Modified files

```
src/components/layout/app-sidebar.tsx                 — NAV_GROUPS restructure
src/app/api/schedule/generate/route.ts                — add endDate parameter
src/components/monthly-plan/schedule-preferences-dialog.tsx   — endDate field, phase label, session warning
src/components/monthly-plan/weekly-plan-view.tsx       — fetch trainingPlans at mount, pass trainingPlanMinimums
```

### No changes

```
src/components/monthly-plan/day-column.tsx            — reused as-is (NFR-1)
src/app/api/schedule/apply/route.ts                   — unchanged
src/db/schema.ts                                      — no schema changes
```

---

## Architecture Notes

### Delivery units

**Unit 1 — Generate API (`endDate`):**  
`POST /api/schedule/generate` receives an optional `endDate` string. When present, replace the
end-of-month ceiling with `endDate` in: `effectiveDates` computation, `regenerate` cleanup,
`dateRange` response, and `generateSchedule` first-argument. When absent, behaviour is identical
to today. Validation: `endDate < startDate` → 400.

**Unit 2 — WeeklyPlanView data loading:**  
After `focusGoals` are resolved from `fetchAll`, fan-out to
`GET /api/training-plans?goalId=N` for each focus goal in parallel. Derive
`trainingPlanMinimums: Record<number, number>` map — goal ID → minimum sessions (explicit split
sum, or 3 if no split). Store in state and pass as a prop to `SchedulePreferencesDialog`.
Same fetch pattern added to `ThisWeekView.fetchAll`.

**Unit 3 — SchedulePreferencesDialog enhancements:**  
Three additions to the existing component, all independent of each other:
1. **`endDate` field** — new `useState` initialised once when the dialog opens (NFR-3). Default
   derived from `trainingPlanMinimums` prop context using the phase data from a new
   `trainingPhases` prop. `onConfirm` signature extended to `(startDate, endDate, patches)`.
2. **Phase active label** — read-only badge on each goal card where an active phase exists.
3. **Session sufficiency warning** — inline message below sessions-per-week input, reactive to
   input changes.

New props added to the existing `Props` interface:
```ts
trainingPlanMinimums: Record<number, number>;  // goal ID → required minimum
trainingPhaseInfo: Record<number, { phaseName: string; weekN: number; weekM: number; phaseStartDate: string; durationWeeks: number }>;
```

**Unit 4 — ThisWeekView:**  
Mirrors `WeeklyPlanView` structure. Minimal state: `currentWeek` (ISO Monday date, derived from
today). Fetches activities for the 7-day window using existing `GET /api/activities?weekStart=`.
Fetches focus goals via `GET /api/weekly-plans?week=` + `GET /api/weekly-plans/{ws}/goals`. Also
fetches training plans per focus goal (same as Unit 2 above). Renders 7 `DayColumn` components.
Completed activities displayed with opacity reduction (CSS class). Includes "Generate Schedule"
button that opens `SchedulePreferencesDialog` with `currentMonth` derived from today. Includes
"View Monthly Plan" link. Week navigation updates `currentWeek` state without page reload.

**Unit 5 — Sidebar navigation:**  
`NAV_GROUPS` constant replaced:
```ts
const NAV_GROUPS = [
  { label: "Execution", items: [Today, This Week] },
  { label: "Planning",  items: [Monthly Plan] },
  { label: "Life Areas", items: [...unchanged] },
];
```
No other changes to `AppSidebar`.

### Date arithmetic helpers

New pure helper (inline in `ThisWeekView`):
```ts
function getMondayOfWeek(date: Date): Date  // returns Monday of the week containing date
function formatWeekHeader(monday: Date): string  // "Mon 2 – Sun 8 Jun 2026" / cross-month variant
```
Both are pure functions with no side effects.

### onConfirm signature change

The `onConfirm` prop on `SchedulePreferencesDialog` changes from:
```ts
(startDate: string, patches: GoalPatch[]) => Promise<void>
```
to:
```ts
(startDate: string, endDate: string, patches: GoalPatch[]) => Promise<void>
```
Both `WeeklyPlanView.handleConfirmGenerate` and `ThisWeekView.handleConfirmGenerate` are updated to
accept and pass `endDate` to `POST /api/schedule/generate`.

---

## Delivery order (recommended PR sequence)

| PR | Units | Can merge independently |
|----|-------|------------------------|
| PR A | Unit 1 (generate API endDate) | ✅ Yes — purely additive |
| PR B | Unit 2 (trainingPlans fetch) + Unit 3 (dialog enhancements) | After PR A |
| PR C | Unit 4 (ThisWeekView page) + Unit 5 (sidebar) | After PR B |

PR A can merge before B and C are ready. PR C can be reviewed in parallel with PR B.
