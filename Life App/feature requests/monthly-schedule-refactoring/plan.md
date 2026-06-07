# Plan: Monthly Schedule Refactoring

**Feature ID:** `monthly-schedule-refactoring`
**Status:** Plan drafted 2026-06-07
**Spec:** `spec.md`
**Last updated:** 2026-06-07

---

## 1. Strategy

All five changes touch only existing files except one (the new `SchedulePreferencesDialog` component). No schema or test infrastructure changes. The natural split is two phases matching the two groups in the spec:

| Phase | Changes | Risk |
|---|---|---|
| Phase A — Simple fixes | Goal DELETE cascade, FocusPicker flat list, Notes field position | Low. Each is a small targeted edit to an existing component or handler. |
| Phase B — Scheduler preferences | `startDate` in generate route, new preferences dialog, wire into weekly-plan-view | Medium. Involves a new component and a multi-step async flow. |

Each phase has its own branch and PR. Phase B rebases onto master after Phase A merges.

---

## 2. Verification gates

Both phases pass all four gates before opening a PR.

| Gate | Command | Pass criterion |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Exit 0, no errors |
| Tests | `npx vitest run` | All existing tests pass |
| Lint | `npx eslint <files touched>` | No new issues vs master |
| Manual smoke | Start dev server, exercise each changed flow | All five acceptance scenarios pass (see §5) |

---

## 3. Branching strategy

```
master
 └── feat/monthly-schedule-fixes       (Phase A, ~3 commits)
      └── feat/monthly-schedule-prefs  (Phase B, ~4 commits)
```

Feature docs (`scope.md`, `spec.md`, `plan.md`, `tasks.md`) are committed in Phase A's first commit.

---

## 4. Implementation steps per phase

### Phase A — Simple fixes

#### 4.A.1 Goal DELETE cascade (`src/app/api/goals/[id]/route.ts`)

The DELETE handler already collects `childGoalIds` before deleting children. We add three new cleanup blocks after that collection and before the existing goal-row deletions.

**Add to imports:**
```ts
import { activities, weeklyFocusGoals, trainingPlans } from "@/db/schema";
import { inArray } from "drizzle-orm";
```
(Check which are already imported — the file currently imports `goals`, `goalRoles`. `weeklyPlans` is no longer needed per I1 fix.)

**New logic — insert after `const childGoals = ...` and `const childGoalIds = childGoals.map(c => c.id)`:**

```ts
const allGoalIds = [goalId, ...childGoalIds];

// 1. Delete uncompleted, non-log-created scheduled activities
if (allGoalIds.length > 0) {
  await db.delete(activities).where(
    and(
      inArray(activities.goalId, allGoalIds),
      eq(activities.isCompleted, false),
      eq(activities.createdFromLog, false),
      eq(activities.userId, userId)
    )
  );
}

// 2. Remove from weekly focus lists (goalId already ownership-verified above)
if (allGoalIds.length > 0) {
  await db.delete(weeklyFocusGoals).where(
    inArray(weeklyFocusGoals.goalId, allGoalIds)
  );
}

// 3. Delete training plans (training phases cascade via FK in apply-schema)
if (allGoalIds.length > 0) {
  await db.delete(trainingPlans).where(
    and(
      inArray(trainingPlans.goalId, allGoalIds),
      eq(trainingPlans.userId, userId)
    )
  );
}
```

The existing `for (const child of childGoals)` loop (goalRoles + child goal deletion) follows immediately after.

**Important:** `activities` uses `userId` as a safety net even though `goalId` already scopes it, to prevent any cross-user edge case.

---

#### 4.A.2 FocusPicker flat list (`src/components/monthly-plan/focus-picker.tsx`)

**Remove:** the `goalsByRole` computation (lines 85–90) and the JSX that maps over it (lines 118–184).

**Add:** a sorted flat list of `visibleGoals`:

```ts
const sortedGoals = [...visibleGoals].sort((a, b) => {
  const aSelected = selected.has(a.id) ? 0 : 1;
  const bSelected = selected.has(b.id) ? 0 : 1;
  if (aSelected !== bSelected) return aSelected - bSelected;
  return a.title.localeCompare(b.title);
});
```

Replace the role-grouped JSX with a simple `sortedGoals.map(...)` using the same goal card markup (checkbox, title, role badges, quadrant badge, target date badge). Role badges stay — they are context, not grouping.

The `roles` prop signature is kept to avoid changing the call site in `weekly-plan-view.tsx`.

---

#### 4.A.3 Notes field position (`src/components/monthly-plan/activity-form.tsx`)

**Current order:** Title → Date/Start/End → Role → Activity Type → Linked Goal → Session Type → Notes

**New order:** Title → Date/Start/End → Notes → Role → Activity Type → Linked Goal → Session Type

Move the Notes `<div>` block (currently lines 392–402) to immediately after the Date/Start/End grid block (currently lines 238–280). No other changes to the Notes field — same label, same placeholder, same `rows={4}`.

---

### Phase B — Scheduler preferences

#### 4.B.1 Generate route: `startDate` parameter (`src/app/api/schedule/generate/route.ts`)

**Destructure `startDate` from body:**
```ts
const { weekStartDate, scope = "week", regenerate = false, month, startDate } = body;
```

**After `dates` is computed from `getMonthDateRange` or `getDateRange`, apply the floor:**
```ts
const effectiveDates = startDate
  ? dates.filter((d) => d >= startDate)
  : dates;
```

Use `effectiveDates` everywhere `dates` is currently used:
- `scopeActivities` filter: `effectiveDates.includes(a.activityDate)`
- `regenerate` filter: only removes activities where date ∈ `effectiveDates`
- Pass `effectiveDates[0]` / `effectiveDates[effectiveDates.length - 1]` into `dateRange` in the response

Also update the `generateSchedule` call (line 254 in the route). Currently it passes `monthFirstDay` as the start, which the scheduler uses to build its own internal date range — so the `effectiveDates` filter alone is not enough:

```ts
// Before:
scope === "month" ? monthFirstDay : weekStartDate

// After:
scope === "month" ? (effectiveDates[0] ?? monthFirstDay) : weekStartDate
```

Without this change the scheduler would still propose activities from day 1 of the month even when `startDate` is provided.

---

#### 4.B.2 New component: `SchedulePreferencesDialog` (`src/components/monthly-plan/schedule-preferences-dialog.tsx`)

A new "use client" dialog component. Full type and prop signature:

```ts
interface GoalPref {
  sessionsPerWeek: number;
  preferredDays: number[]; // 1=Mon … 7=Sun
  preferredTimeSlot: string | null; // 'morning' | 'afternoon' | 'evening' | null
}

interface Props {
  open: boolean;
  onClose: () => void;
  focusGoals: Goal[];
  currentMonth: string; // "YYYY-MM"
  onConfirm: (
    startDate: string,
    patches: { id: number; prefs: Partial<GoalPref> }[]
  ) => Promise<void>;
  confirming: boolean; // disables button while parent is running generate+apply
}
```

**State:**
- `startDate: string` — initialised on open: if today (`new Date().toISOString().slice(0, 10)`) is within `currentMonth`, use today; otherwise use `${currentMonth}-01`.
- `prefs: Record<number, GoalPref>` — initialised on open from each `focusGoal.sessionsPerWeek`, `focusGoal.preferredDays` (parsed from JSON string), `focusGoal.preferredTimeSlot`.

**Layout:**
```
[Dialog title: "Schedule preferences"]
[Description: "Review your goals' scheduling settings, set a start date, then generate."]

[Start date: <Input type="date" min={currentMonth-01} max={currentMonth-lastDay}> ]

--- per goal card ---
[Goal title]
[Sessions per week: <Input type="number" min=1 max=7>]
[Preferred days: Mon Tue Wed Thu Fri Sat Sun — toggle buttons]
[Time of day: Morning | Afternoon | Evening | No preference — 4 toggle buttons]
--- end card ---

[error message if any]
[Cancel] [Generate & Apply — disabled + spinner when confirming]
```

**Day toggle buttons:** Use `Button variant="outline"` with `size="sm"`, toggled to `variant="default"` when selected. Days: `[{label: "Mo", value: 1}, {label: "Tu", value: 2}, ...]`.

**Time slot buttons:** `Morning`, `Afternoon`, `Evening`, `Any` (maps to null).

**On "Generate & Apply":**
- Compute `patches`: for each goal, compare current prefs vs initial prefs; only include changed fields.
- Call `onConfirm(startDate, patches)`.

**Error display:** `error` prop from parent (or local state) shown in red above the footer.

---

#### 4.B.3 Wire preferences dialog into weekly-plan-view (`src/components/monthly-plan/weekly-plan-view.tsx`)

**New state:**
```ts
const [prefsDialogOpen, setPrefsDialogOpen] = useState(false);
const [confirming, setConfirming] = useState(false);
const [prefsError, setPrefsError] = useState<string | null>(null);
```

**Replace `handleGenerateSchedule` logic:**

```ts
async function handleGenerateSchedule() {
  if (focusGoals.length === 0) {
    setFocusPickerOpen(true);
    return;
  }
  setPrefsError(null);          // clear any previous error before opening
  setPrefsDialogOpen(true);
}
```

**New `handleConfirmGenerate` function:**

```ts
async function handleConfirmGenerate(
  startDate: string,
  patches: { id: number; prefs: Partial<GoalPref> }[]
) {
  setConfirming(true);
  try {
    // 1. Patch modified goals
    await Promise.all(
      patches.map(({ id, prefs }) =>
        fetch(`/api/goals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        })
      )
    );

    // 2. Generate
    const ws = getWeekStartDate(new Date(currentMonth + "-01T00:00:00"));
    const genRes = await fetch("/api/schedule/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStartDate: ws,
        scope: "month",
        regenerate: true,
        month: currentMonth,
        startDate,
      }),
    });
    if (!genRes.ok) throw new Error("Generate failed");
    const data = await genRes.json();
    const { focusGoalIds, dateRange, regenerate, ...proposal } = data;

    // 3. Apply
    const applyRes = await fetch("/api/schedule/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activities: proposal.activities,
        regenerate: true,
        focusGoalIds,
        dateRange,
      }),
    });
    if (!applyRes.ok) throw new Error("Apply failed");

    // 4. Refresh + close
    setPrefsDialogOpen(false);
    await fetchAll();
    fetchMonthActivities();
    // 5. Success banner: set successMessage state (see T028)
  } catch (err) {
    setPrefsError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
  } finally {
    setConfirming(false);
  }
}
```

**Toast:** The app uses `alert()` for errors today. For the success notification, add a simple `toast` call — check if the project already has `sonner` or `shadcn/ui` `useToast` wired up. If not, a brief in-page banner state in `weekly-plan-view` is sufficient for this phase.

**Remove:** `SchedulePreview` import and JSX, `previewOpen` / `scheduleProposal` / `regenerateMetadata` / `applying` state variables, `handleApplySchedule` function — all are replaced by the new flow.

**Add** `SchedulePreferencesDialog` JSX alongside the other dialogs at the bottom of the return, passing `error={prefsError ?? undefined}`.

---

## 5. Manual acceptance scenarios

| # | Scenario | Pass |
|---|---|---|
| S1 | Delete a yearly goal → its scheduled activities disappear from the calendar, its monthly children's activities disappear, it no longer appears in "Select Focus Goals" | ✓ |
| S2 | Open "Generate Schedule" on Jun 7 → start date defaults to Jun 7, not Jun 1. Change to Jun 10 → only dates Jun 10–30 receive proposed activities. | ✓ |
| S3 | Open "Generate Schedule" → preferences dialog shows correct sessions/week and preferred days for each focus goal → change a value → Generate & Apply → activities appear on calendar, goal's preferredDays updated on Goals page | ✓ |
| S4 | Open "Select Focus Goals" → goals appear as a flat list; a goal linked to two roles appears only once; a goal with no role is visible | ✓ |
| S5 | Open any activity via the calendar → Notes field is immediately visible below the date/time row, before the dropdown fields | ✓ |

---

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `inArray` with empty array throws in Drizzle | Guard with `if (allGoalIds.length > 0)` before each delete (shown in §4.A.1) |
| Phase B patches goals sequentially before generate — a failed PATCH leaves partial state | Each PATCH is independent; on error the dialog surfaces the failure and stays open; the user can retry. No rollback needed since the goal fields are directly user-editable anyway. |
| `preferredDays` is stored as a JSON string in the DB (e.g. `"[1,3,5]"`) | Parse with `JSON.parse` before initialising dialog state; serialise back to JSON string before PATCHing. The PATCH handler at `api/goals/[id]/route.ts` already writes `body.preferredDays` directly — confirm it accepts an array (it does, Drizzle serialises to JSON). |
| Removing `SchedulePreview` from the flow but leaving the file breaks no tests | Confirmed: no test file imports or renders `SchedulePreview`. |
