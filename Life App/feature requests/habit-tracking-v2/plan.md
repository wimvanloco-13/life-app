# Plan: Habit Tracking V2

**Feature ID:** `habit-tracking-v2`
**Status:** Plan drafted 2026-06-05
**Builds on:** `habit-tracking` V1 (fully shipped)
**Spec:** `spec.md` (reviewed, all blocking issues resolved)
**Last updated:** 2026-06-05

---

## 1. Strategy

V2 is entirely additive — three new columns on `habits`, extensions to four existing UI components, two new pure helper functions, and two new editorial blocks. No new page, no new route, no new top-level component. The natural split is two phases:

| Phase | What ships | User-visible after merge |
|---|---|---|
| Phase 1 | Schema migration, types, pure helpers + tests, API extensions. No UI. | Nothing yet. Foundation is solid. |
| Phase 2 | Form changes (quick-add, walkthrough, edit), habit row (intention sentence + Gem icon), never-miss-twice nudge, collapsible editorial. | Full V2 feature live on `/habits`. |

Each phase has its own branch and PR. Phase 2 rebases onto master after Phase 1 merges.

Total estimated lines changed: ~500–700 across both phases.

---

## 2. Verification gates

Every phase passes all four gates before opening its PR.

| Gate | Command | Pass criterion |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Exit 0, no errors. |
| Tests | `npx vitest run` | All existing tests pass; phase-specific new tests present. |
| Lint | `npx eslint <each file touched>` | No new issues compared to master. |
| Migration idempotency | `node apply-schema.js` run twice | Both runs clean; second run logs SKIP for the new ALTER TABLE statements. |

---

## 3. Branching strategy

```
master
 └── feat/habit-v2-foundation   (Phase 1, ~5–7 commits, ~200–300 LoC)
      └── feat/habit-v2-ui      (Phase 2, ~6–8 commits, ~300–400 LoC)
```

Phase 2 is stacked on Phase 1. When Phase 1 merges, Phase 2 rebases onto master and opens its PR. Feature request docs (`scope.md`, `clarifications.md`, `spec.md`, `plan.md`) are committed in Phase 1's first commit.

---

## 4. Implementation steps per phase

### Phase 1: Foundation (schema, types, helpers, API)

**Goal:** all data-layer changes are in, tested, and correct before any UI lands.

#### 4.1.1 Migration (`apply-schema.js`)

Add three entries to the existing `alterStatements` array, after the current last entry (`ALTER TABLE activity_types ADD COLUMN default_duration_minutes ...`):

```js
`ALTER TABLE habits ADD COLUMN reward TEXT`,
`ALTER TABLE habits ADD COLUMN cue_type TEXT`,
`ALTER TABLE habits ADD COLUMN is_keystone INTEGER NOT NULL DEFAULT 0`,
```

These are idempotent — `apply-schema.js` already wraps each alter in a `try/catch` that swallows `duplicate column` errors (as seen in the existing run logic).

#### 4.1.2 Drizzle schema (`src/db/schema.ts`)

Locate the `habits` table definition and add three new columns after `isArchived`:

```ts
reward: text("reward"),
cueType: text("cue_type"),
isKeystone: integer("is_keystone", { mode: "boolean" }).notNull().default(false),
```

#### 4.1.3 TypeScript types (`src/types/index.ts`)

**`Habit` interface** — add three fields after `isArchived`:

```ts
reward: string | null;
cueType: string | null;
isKeystone: boolean;
```

**`HabitDraft` interface** — add three optional fields:

```ts
reward?: string | null;
cueType?: string | null;
isKeystone?: boolean;
```

**New `CUE_TYPE_LABELS` constant** — export near the Habit section. This is the single authoritative source referenced in spec FR-3.2:

```ts
export const CUE_TYPE_LABELS: Record<string, string> = {
  location: "Location",
  time: "Time",
  emotional_state: "Feeling",
  other_people: "Person",
  preceding_action: "Preceding action",
};

export type CueType = keyof typeof CUE_TYPE_LABELS;
```

Both `buildImplementationIntention()` (Phase 1) and the dropdown options (Phase 2) derive their labels from this constant.

#### 4.1.4 Pure helpers (`src/lib/habit-v2-helpers.ts`, new file)

Two pure functions, fully testable with no side effects.

**`buildImplementationIntention(habit: Pick<Habit, 'cue' | 'cueType' | 'name' | 'reward'>): string | null`**

Construction logic (mirrors spec FR-3.2 exactly):

1. If `cue` is null or empty string → return `null` (hidden entirely).
2. Build the cue segment:
   - If `cueType` is set and exists in `CUE_TYPE_LABELS`: `"${CUE_TYPE_LABELS[cueType]}: ${cue}"`
   - Otherwise: `cue`
3. Build the sentence:
   - With reward: `"When ${cueSegment}, I'll ${habit.name}, to feel ${reward}."`
   - Without reward: `"When ${cueSegment}, I'll ${habit.name}."`

**`shouldShowNeverMissTwice(recentLogDates: string[], today: string): boolean`**

Logic (mirrors spec FR-5.1 exactly):

1. Today has a log → return `false` (already logged).
2. Yesterday has a log → return `false` (no miss yet).
3. Any log exists in `recentLogDates` within the last 14 days from `today` → return `true`.
4. Otherwise → return `false` (brand new habit or inactive too long).

Date arithmetic: use `new Date(iso + "T00:00:00").getTime()` divided by `86400000`, consistent with the existing `computeStreaks` helper in `src/lib/habit-streaks.ts`.

#### 4.1.5 Unit tests (`src/lib/__tests__/habit-v2-helpers.test.ts`, new file)

**`buildImplementationIntention` fixtures (covers NFR-2):**

| Case | cue | cueType | reward | Expected output |
|---|---|---|---|---|
| No cue | null | null | null | null |
| No cue (empty string) | "" | null | null | null |
| cue only | "gym" | null | null | `"When gym, I'll Run."` |
| cue + type | "gym" | `"location"` | null | `"When Location: gym, I'll Run."` |
| cue + type + reward | "gym" | `"location"` | "strong" | `"When Location: gym, I'll Run, to feel strong."` |
| cue + reward (no type) | "morning" | null | "clear" | `"When morning, I'll Run, to feel clear."` |
| cue type only, no text | "" | `"time"` | null | null (cue text empty → hidden) |
| Unknown cue type | "park" | `"unknown"` | null | `"When park, I'll Run."` (falls back to plain cue) |

**`shouldShowNeverMissTwice` fixtures (covers NFR-3):**

| Case | recentLogDates | today | Expected |
|---|---|---|---|
| Logged today | `["2026-06-05"]` | `"2026-06-05"` | `false` |
| Logged yesterday | `["2026-06-04"]` | `"2026-06-05"` | `false` |
| Missed yesterday, log 2 days ago | `["2026-06-03"]` | `"2026-06-05"` | `true` |
| Missed yesterday, log 10 days ago | `["2026-05-26"]` | `"2026-06-05"` | `true` |
| Missed yesterday, log 15 days ago (outside window) | `["2026-05-21"]` | `"2026-06-05"` | `false` |
| Empty log (brand new habit) | `[]` | `"2026-06-05"` | `false` |
| Missed yesterday + logged today | `["2026-06-03", "2026-06-05"]` | `"2026-06-05"` | `false` |

#### 4.1.6 API route extensions

**`src/app/api/habits/route.ts` (POST handler)**

After the existing validation block, read and validate the three new optional fields:

```ts
const reward = typeof body.reward === "string" ? body.reward.trim() || null : null;
const cueType = body.cueType ?? null;
const isKeystone = body.isKeystone === true ? 1 : 0;

const VALID_CUE_TYPES = ["location", "time", "emotional_state", "other_people", "preceding_action"];
if (cueType !== null && !VALID_CUE_TYPES.includes(cueType)) {
  return NextResponse.json({ error: "Invalid cue type." }, { status: 400 });
}
if (reward !== null && reward.length > 200) {
  return NextResponse.json({ error: "Reward must be 200 characters or fewer." }, { status: 400 });
}
```

Include `reward`, `cue_type`, and `is_keystone` in the Drizzle insert payload.

**`src/app/api/habits/[id]/route.ts` (PATCH handler)**

Same validation as POST. Accept the three new fields as optional patch fields. Only update columns that are present in the request body (match the existing partial-update pattern in the route).

#### 4.1.7 Verification before opening Phase 1 PR

- `npx tsc --noEmit`: clean.
- `npx vitest run`: all tests pass, including `habit-v2-helpers.test.ts` (15 new test cases).
- Per-file lint on every touched file: no new issues.
- `node apply-schema.js` twice: both runs clean. `PRAGMA table_info(habits)` on the second run shows 14 columns (original 11 + 3 new).
- Curl smoke: `POST /api/habits` with `{ ..., reward: "calm, energised", cueType: "time", isKeystone: true }` returns 201 with all three fields in the response body. `PATCH /api/habits/:id` with `{ isKeystone: false }` returns 200 with updated row.

---

### Phase 2: UI (forms, habit row, nudge, editorial)

**Goal:** wire all V2 fields into the UI. After this phase, the full V2 feature is live.

#### 4.2.1 Types — `HabitDraft` form state

`habit-form.tsx` uses `HabitDraft` for its `draft` state. The three new fields are now in the type (added in Phase 1). No change needed to the type, but update the `reset()` initial state to include `isKeystone: false` and leave `reward` and `cueType` as undefined.

#### 4.2.2 Cue type dropdown — all creation and edit surfaces

In `habit-form.tsx`, wherever the `cue` text input is rendered (quick-add, walkthrough step 3, edit modal), add a `<Select>` from shadcn/ui above it:

```tsx
<Select
  value={draft.cueType ?? ""}
  onValueChange={(v) => patch("cueType", v || null)}
>
  <SelectTrigger className="w-full text-sm h-8">
    <SelectValue placeholder="Category (optional)" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">None</SelectItem>
    {Object.entries(CUE_TYPE_LABELS).map(([value, label]) => (
      <SelectItem key={value} value={value}>{label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

`CUE_TYPE_LABELS` is imported from `@/types` (defined in Phase 1). The dropdown appears for all three surfaces: quick-add (above cue text), walkthrough step 3, and edit modal. Selecting "None" stores `null`.

#### 4.2.3 Walkthrough — new Step 5 (reward)

In `WALKTHROUGH_STEPS`, add a new entry after `minimumVersion`:

```ts
{
  id: "reward" as const,
  label: "What's your reward?",
  subtitle: "Define the reward your brain learns to crave. Leave it blank if you're not sure yet.",
  placeholder: "calm, clear-headed, energised",
  field: "reward" as keyof HabitDraft,
  required: false,
  multiline: false,
},
```

Update `WalkthroughStep` type to include `"reward"`. Update `totalSteps` from `WALKTHROUGH_STEPS.length + 1` to the new count (5 + 1 = 6 steps total, with review as step 6).

The step naturally gets a "Skip" button because `required: false`. No other changes needed — the generic step rendering already handles it.

#### 4.2.4 Walkthrough review step — add reward row + keystone toggle

In the `{isReview && ...}` block, add a `<ReviewRow>` for reward (shown if `draft.reward` is truthy), and below the color picker add the keystone checkbox:

```tsx
{draft.reward && (
  <ReviewRow
    label="Reward"
    value={draft.reward}
    onEdit={() => setWalkthroughStep("reward")}
  />
)}

<div className="flex items-center gap-2 pt-1">
  <input
    id="wt-keystone"
    type="checkbox"
    checked={draft.isKeystone ?? false}
    onChange={(e) => patch("isKeystone", e.target.checked)}
    className="h-4 w-4 rounded border-input"
  />
  <div>
    <label htmlFor="wt-keystone" className="text-sm font-medium">
      This is a keystone habit
    </label>
    <p className="text-xs text-muted-foreground leading-snug">
      Keystone habits tend to pull other positive changes along with them.
    </p>
  </div>
</div>
```

#### 4.2.5 Quick-add modal — keystone toggle

Add the same keystone checkbox (same markup as 4.2.4) below the minimum version field. Reward field is intentionally absent (C1).

#### 4.2.6 Edit modal — reward field + keystone toggle

Add a reward text input below the minimum version field:

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="q-reward">Reward (optional)</Label>
  <Input
    id="q-reward"
    placeholder="What do you feel or get after doing this?"
    value={draft.reward ?? ""}
    onChange={(e) => patch("reward", e.target.value)}
    maxLength={200}
  />
</div>
```

Below reward, add the keystone checkbox (same markup as 4.2.4).

When `isEditing`, initialise `draft` with `reward: initial.reward ?? undefined` and `isKeystone: initial.isKeystone ?? false`.

#### 4.2.7 Habit row (`habit-row.tsx`) — intention sentence + Gem icon

**Intention sentence:** Import `buildImplementationIntention` from `@/lib/habit-v2-helpers` and `CUE_TYPE_LABELS` from `@/types`. After the habit name subtitle (or directly below it), render:

```tsx
{(() => {
  const sentence = buildImplementationIntention(habit);
  return sentence ? (
    <p className="text-[11px] text-muted-foreground italic truncate mt-0.5">
      {sentence}
    </p>
  ) : null;
})()}
```

**Gem icon:** Import `Gem` from `lucide-react`. Wrap the existing heading `<p>` element (which already uses `{habit.identity || habit.name}` and carries archived line-through styling) in a flex div alongside the icon — do not replace the `<p>` with a `<span>`:

```tsx
<div className="flex items-center gap-1.5">
  <p className={`font-display text-[17px] font-semibold leading-snug ${isArchived ? "line-through" : ""}`}>
    {habit.identity || habit.name}
  </p>
  {habit.isKeystone && (
    <Gem className="w-3.5 h-3.5 text-muted-foreground shrink-0" title="Keystone habit." />
  )}
</div>
```

Preserve the exact class names (including the archived variant) from the existing element at the point of edit.

#### 4.2.8 Never-miss-twice nudge (`habit-row.tsx`)

The inline feedback slot (affirmation + error) lives in `habit-row.tsx`, not in `habit-strip.tsx`. `HabitRow` already receives `logDates` and `today` as props, so `shouldShowNeverMissTwice` is called directly inside it.

Import `shouldShowNeverMissTwice` from `@/lib/habit-v2-helpers`. Extend the existing inline-feedback block:

```tsx
const showNudge = !habit.isArchived && shouldShowNeverMissTwice(logDates, today);

{/* Affirmation takes priority for its 2-second window */}
{!habit.isArchived && affirmation && (
  <p className="pl-6 mt-2 text-xs text-muted-foreground animate-fade-in leading-snug">
    {affirmation}
  </p>
)}
{/* Nudge shows when there is no active affirmation */}
{!habit.isArchived && !affirmation && showNudge && (
  <p className="pl-6 mt-2 text-xs text-muted-foreground leading-snug">
    Yesterday was a miss. Today is the one that counts.
  </p>
)}
{!habit.isArchived && !affirmation && !showNudge && error && (
  <p className="pl-6 mt-2 text-xs text-destructive leading-snug">{error}</p>
)}
```

`shouldShowNeverMissTwice` already returns false when today has a log (step 1 of its logic), so the nudge is naturally suppressed the moment today is toggled — no separate `justLoggedToday` guard is needed.

#### 4.2.9 Editorial section (`habit-principles.tsx`) — two new blocks + collapsible

Two additions:

**1. New blocks constant**

Append two new entries to the `PRINCIPLES` array:

```ts
{
  heading: "Habits run on a loop, not willpower.",
  body: "Every habit has three parts: the trigger that starts it, the behaviour itself, and the reward that tells the brain to repeat it. Define all three, and the habit becomes editable. Leave the reward undefined, and willpower has to fill the gap — which it reliably cannot.",
},
{
  heading: "You don't break habits. You replace them.",
  body: "The trigger and the reward are encoded in the brain and do not disappear. What you can change is the behaviour in between. Keep the same cue, keep the same reward, and substitute a new routine. That is the mechanism. The rest is execution.",
},
```

**2. Collapsible wrapper**

`HabitPrinciples` gains a collapse state, persisted to `localStorage`. The component receives a `userId` prop so the key is scoped:

```tsx
const storageKey = `habit-principles-collapsed-${userId}`;
const [collapsed, setCollapsed] = useState(() => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(storageKey) === "true";
});

function toggle() {
  const next = !collapsed;
  setCollapsed(next);
  localStorage.setItem(storageKey, String(next));
}
```

Render a section header with a `ChevronDown` / `ChevronUp` Lucide icon that wraps the blocks. When `collapsed`, the blocks are hidden via `hidden` class or `display: none`. Header text: "Principles" in a small muted label.

This wrapper is applied in all three rendering modes (`horizontal`, `compact`, default). The `userId` prop must be threaded through from the page component. `habits/page.tsx` is a Next.js server component — it gets `userId` via `const session = await auth()` from `@/lib/auth`, then passes `session.user.id` down as a prop. Do not use `useSession()` in the page file.

#### 4.2.10 Verification before opening Phase 2 PR

All gates from section 2, plus:

- Manual: create a habit via walkthrough, fill in cue type (Time), cue text ("morning"), reward ("calm, energised"), check keystone → habit row shows `"When Time: morning, I'll [name], to feel calm, energised."` and a Gem icon.
- Manual: create a habit with no cue → intention sentence absent from the row.
- Manual: create a habit with cue type set but no cue text → intention sentence absent.
- Manual: in edit modal, add reward and toggle keystone → saves correctly.
- Manual: simulate a missed yesterday (set a log for 2 days ago, no log for yesterday, no log for today in the DB) → nudge appears on that habit row. Toggle today → nudge disappears.
- Manual: collapse the principles section → collapsed state survives a hard refresh.
- Console: zero warnings on `/habits` in empty and populated state.

---

## 5. Risk

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `alter-statements` already-existing column error causes a crash (not a graceful skip). | Low. All existing ALTER TABLE entries in `apply-schema.js` are wrapped by the `run()` helper which swallows `duplicate column`. New entries use the same wrapper. | Low. Recoverable. | Verify by running `node apply-schema.js` twice in CI before opening the Phase 1 PR. |
| `buildImplementationIntention` sentence looks awkward for certain reward phrasings (e.g. "feel feel good" if user writes "feel good" as reward). | Medium. Sentence is generated literally. | Low. Cosmetic. | Document in the helper's JSDoc that `reward` is expected to be a noun phrase or adjective, not a full sentence. The placeholder copy guides this. |
| `habit-principles.tsx` `localStorage` access in SSR causes a hydration mismatch. | Medium. `typeof window === "undefined"` guard handles the SSR pass; initial state defaults to expanded. | Low. At worst, a flash on first render. | Use the `typeof window` guard in the `useState` initialiser (shown in 4.2.9). This is the standard pattern in this codebase. |
| Collapsible wrapper requires `userId` prop to be passed down through the component tree from the page. | Medium. One more prop to thread. | Low. Mechanical change. | Phase 2 implementation order: update the page component first, then thread `userId` into `HabitPrinciples`. |
| `habit-form.tsx` walkthrough step count (`totalSteps`) is currently hardcoded as `WALKTHROUGH_STEPS.length + 1`. Adding a new step to `WALKTHROUGH_STEPS` automatically corrects the count — no manual update needed. | Low (handled by the array length). | None. | No action needed; note it for the implementer. |

---

## 6. Execution order

**Phase 1:** 4.1.1 migration → 4.1.2 schema → 4.1.3 types → 4.1.4 helpers → 4.1.5 tests → 4.1.6 API extensions → 4.1.7 verification.

**Phase 2:** 4.2.1 type init → 4.2.2 cue type dropdown → 4.2.3 walkthrough step 5 → 4.2.4 walkthrough review → 4.2.5 quick-add keystone → 4.2.6 edit modal → 4.2.7 habit row → 4.2.8 nudge → 4.2.9 editorial → 4.2.10 verification.

---

## 7. Definition of done

The feature is done when:

- All six FRs in `spec.md` are implemented and visually verified.
- Both phases have merged to master.
- `npx tsc --noEmit` and `npx vitest run` are clean on master.
- `PRAGMA table_info(habits)` shows 14 columns on a fresh DB.
- A user can: create a habit with reward + cue type + keystone via walkthrough; see the intention sentence and Gem icon on the row; receive the never-miss-twice nudge after a missed day; collapse and expand the five editorial blocks with state persisting across reload.
- Existing V1 habits (NULL / 0 for all new columns) render without any visual change beyond the new editorial blocks.
