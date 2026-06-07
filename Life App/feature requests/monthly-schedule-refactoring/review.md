# Review: Monthly Schedule Refactoring

**Reviewed:** 2026-06-07
**Files reviewed:** `scope.md`, `spec.md`, `plan.md`, `tasks.md`
**Codebase cross-referenced:**
- `src/app/api/goals/[id]/route.ts` (DELETE handler)
- `src/app/api/schedule/generate/route.ts`
- `src/components/monthly-plan/weekly-plan-view.tsx`
- `apply-schema.js`
- `src/db/schema.ts`

**Overall:** The scope is well-defined and the five changes are genuinely independent. Phase A is low-risk. Phase B has one gap in the plan that needs filling before implementation and two smaller issues worth addressing.

---

## Blocking

### B1 — `handleConfirmGenerate` error state is never defined

**File:** `plan.md` §4.B.3 and `tasks.md` T027

The `catch` block in the plan is a comment placeholder:

```ts
} catch (err) {
  // surface error in dialog via local state
}
```

`SchedulePreferencesDialog` accepts an `error?: string` prop (T023) but neither the plan nor the task list names the state variable that feeds it, nor shows how it is wired from `weekly-plan-view.tsx` into the dialog. Without this, the dialog will silently absorb failures on PATCH, generate, or apply.

**Required addition (add to T027 or as a new T027a):**

```ts
// In weekly-plan-view.tsx
const [prefsError, setPrefsError] = useState<string | null>(null);

// In handleConfirmGenerate catch block:
} catch (err) {
  setPrefsError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
}

// Reset on open:
function handleGenerateSchedule() {
  if (focusGoals.length === 0) { setFocusPickerOpen(true); return; }
  setPrefsError(null);
  setPrefsDialogOpen(true);
}
```

Pass `error={prefsError ?? undefined}` to `<SchedulePreferencesDialog>`.

---

## Important

### I1 — `weeklyFocusGoals` cleanup uses an unnecessary intermediate SELECT

**File:** `plan.md` §4.A.1

The plan deletes `weeklyFocusGoals` by first selecting all `weeklyPlans.id` for the user, then using a double `inArray`:

```ts
const userPlanIds = await db.select({ id: weeklyPlans.id }).from(weeklyPlans)...
await db.delete(weeklyFocusGoals).where(
  and(
    inArray(weeklyFocusGoals.goalId, allGoalIds),
    inArray(weeklyFocusGoals.weeklyPlanId, userPlanIds.map(...))
  )
);
```

`allGoalIds` are already ownership-verified (the DELETE handler checks the goal belongs to the user before proceeding). Scoping the deletion through `weeklyPlanIds` adds an extra round-trip with no security benefit.

**Simpler approach:**

```ts
if (allGoalIds.length > 0) {
  await db.delete(weeklyFocusGoals).where(
    inArray(weeklyFocusGoals.goalId, allGoalIds)
  );
}
```

This is also consistent with how the plan cleans up `activities` and `trainingPlans` — both scope directly on `goalId` without a secondary join. The `weeklyPlans` import listed in T002 can be dropped if this simplification is adopted.

### I2 — The generate route change needs to update the `generateSchedule` call, not just `effectiveDates`

**File:** `plan.md` §4.B.1

The `generateSchedule` function currently receives `monthFirstDay` as its 5th argument (line 254 in the route):

```ts
const proposal = generateSchedule(
  ...
  scope === "month" ? monthFirstDay : weekStartDate,  // ← start date passed to scheduler
  ...
);
```

The scheduler generates its internal date range starting from this value. If `effectiveDates` correctly clips `scopeActivities` and the `regenerate` filter, but `monthFirstDay` is still passed here, the scheduler will still propose activities from day 1 of the month — ignoring `startDate` entirely.

The plan prose mentions this ("Pass `effectiveDates[0]`...as the start to `generateSchedule`") but T015 and T016 only say "derive `effectiveDates`" and "replace all uses of `dates` with `effectiveDates`." The `generateSchedule` call site is not technically a use of `dates` — it uses `monthFirstDay` — so it would likely be missed.

**T016 should be updated to explicitly include this change:**

```ts
// Before:
scope === "month" ? monthFirstDay : weekStartDate

// After:
scope === "month" ? (effectiveDates[0] ?? monthFirstDay) : weekStartDate
```

---

## Minor

### M1 — NFR-3 contradicts the plan's `Promise.all` for goal patches

**File:** `spec.md` NFR-3 and `plan.md` §4.B.3

NFR-3 says: "The `SchedulePreferencesDialog` patches goals and calls generate + apply sequentially."

The plan uses `Promise.all` for the PATCH calls (multiple goals patched in parallel), then sequentially calls generate, then apply. The patches are fully independent so running them in parallel is correct and faster.

NFR-3 should be updated to: "PATCH calls for modified goals may run in parallel; `generate` must run after all PATCHes complete; `apply` must run after `generate` completes."

### M2 — No toast library exists in the app; T028 should resolve upfront

**File:** `tasks.md` T028

T028 says "check if `sonner` or shadcn `useToast` is already wired in the app; if yes use it..." — neither is present (`src/app/layout.tsx` and the full `src/` tree have no `Toaster` or `sonner` imports). The conditional check in T028 is unnecessary.

Update T028 to: "Add a `successMessage: string | null` state to `weekly-plan-view.tsx`; set it to `Scheduled N activities` after a successful apply; render it as a brief inline banner in the calendar header (auto-dismiss after 4 s or on next generate); clear it when opening the preferences dialog."

### M3 — Scope §5 says Notes moves to "position 2" but spec FR-5.1 says "position 3"

**File:** `scope.md` §5 vs `spec.md` FR-5.1

Scope §5: "Move the Notes field to **position 2** in the form, immediately after the Activity (title) field."

Spec FR-5.1: "the Notes textarea is moved to **position 3**: after Activity (title), after Date/Start/End."

The plan (§4.A.3) correctly follows the spec: Notes goes after the Date/Start/End block, not directly after the title. Putting Notes immediately after the title (before the date/time row) would create an awkward form where you fill in notes before knowing when the activity is.

Scope §5 should be updated to match the spec wording: "immediately after the Date/Start/End row, before Role, Activity Type, Linked Goal, and Session Type."

---

## Confirmations (no action needed)

- **`trainingPhases` FK cascade is confirmed.** `apply-schema.js` defines `training_plan_id INTEGER NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE` — so deleting `trainingPlans` rows will automatically remove their `trainingPhases`. FR-1.3 is safe as written.
- **`createdFromLog` column exists** on the `activities` table (boolean, default `false`). The FR-1.1 filter condition `createdFromLog = false` is valid.
- **`weeklyFocusGoals` and `trainingPlans` are not currently cleaned up** in the DELETE handler — the existing code only deletes `goalRoles` rows and the goal rows themselves, confirming the need for FR-1.
- **`SchedulePreview` state variables confirmed.** `weekly-plan-view.tsx` has `previewOpen`, `scheduleProposal`, `regenerateMetadata`, `applying`, `handleApplySchedule`, and `SchedulePreview` import — all exactly as the plan describes for removal in Phase B (T029).
- **`PATCH /api/goals/:id` accepts `preferredDays` as an array.** Line 68 of the handler: `updates.preferredDays = body.preferredDays || null` — Drizzle serialises to JSON. The plan's note about parsing/serialising `preferredDays` is correct.

---

## Summary table

| ID | Severity | File | Description |
|----|----------|------|-------------|
| B1 | Blocking | `plan.md` §4.B.3 / T027 | Error state for `SchedulePreferencesDialog` is undefined; catch block is a placeholder with no implementation |
| I1 | Important | `plan.md` §4.A.1 | `weeklyFocusGoals` cleanup uses unnecessary intermediate SELECT; simplify to direct `inArray` on `goalId` |
| I2 | Important | `plan.md` §4.B.1 / T016 | `generateSchedule` call still passes `monthFirstDay`; must pass `effectiveDates[0] ?? monthFirstDay` instead |
| M1 | Minor | `spec.md` NFR-3 | NFR-3 language conflicts with `Promise.all` for patches; clarify that only generate→apply must be sequential |
| M2 | Minor | `tasks.md` T028 | No toast library in the app; T028 should specify inline banner state directly |
| M3 | Minor | `scope.md` §5 | "Position 2" in scope conflicts with "position 3" in spec FR-5.1; scope needs updating |
