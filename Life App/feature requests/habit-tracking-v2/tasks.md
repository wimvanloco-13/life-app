# Tasks: Habit Tracking V2

**Feature ID:** `habit-tracking-v2`
**Status:** Tasks generated 2026-06-05
**Source:** `plan.md`, `spec.md`
**Last updated:** 2026-06-05

---

## Phase 1 — Foundation (feat/habit-v2-foundation)

_Commit the feature request docs first, then work data-layer up. No UI._

- [ ] T001 Commit feature request docs (`scope.md`, `clarifications.md`, `spec.md`, `plan.md`, `tasks.md`) in `Life App/feature requests/habit-tracking-v2/`
- [ ] T002 Add three ALTER TABLE statements to `alterStatements` array in `Life App/apply-schema.js`: `ALTER TABLE habits ADD COLUMN reward TEXT`, `ALTER TABLE habits ADD COLUMN cue_type TEXT`, `ALTER TABLE habits ADD COLUMN is_keystone INTEGER NOT NULL DEFAULT 0`
- [ ] T003 Add `reward text("reward")`, `cueType text("cue_type")`, `isKeystone integer("is_keystone", { mode: "boolean" }).notNull().default(false)` columns to the `habits` table definition in `Life App/src/db/schema.ts`
- [ ] T004 Add `reward: string | null`, `cueType: string | null`, `isKeystone: boolean` fields to the `Habit` interface in `Life App/src/types/index.ts`
- [ ] T005 Add `reward?: string | null`, `cueType?: string | null`, `isKeystone?: boolean` fields to the `HabitDraft` interface in `Life App/src/types/index.ts`
- [ ] T006 Export `CUE_TYPE_LABELS` constant and `CueType` type from `Life App/src/types/index.ts` (authoritative mapping: `location → "Location"`, `time → "Time"`, `emotional_state → "Feeling"`, `other_people → "Person"`, `preceding_action → "Preceding action"`)
- [ ] T007 Create `Life App/src/lib/habit-v2-helpers.ts` with exported `buildImplementationIntention(habit)` pure function implementing spec FR-3.2 construction rules and hiding rule (cue text empty → return null)
- [ ] T008 Add exported `shouldShowNeverMissTwice(recentLogDates, today)` pure function to `Life App/src/lib/habit-v2-helpers.ts` implementing spec FR-5.1 trigger logic
- [ ] T009 Create `Life App/src/lib/__tests__/habit-v2-helpers.test.ts` with all fixtures from plan §4.1.5 for both `buildImplementationIntention` (8 cases) and `shouldShowNeverMissTwice` (7 cases)
- [ ] T010 Extend POST handler in `Life App/src/app/api/habits/route.ts` to read, validate, and persist `reward`, `cueType` (enum check), and `isKeystone` from request body
- [ ] T011 Extend PATCH handler in `Life App/src/app/api/habits/[id]/route.ts` to accept and persist `reward`, `cueType`, and `isKeystone` as optional patch fields with the same validation as T010
- [ ] T012 Run `npx tsc --noEmit`, `npx vitest run`, and `node apply-schema.js` twice; confirm all 15 new tests pass, TypeScript is clean, and `PRAGMA table_info(habits)` shows 14 columns

---

## Phase 2 — UI (feat/habit-v2-ui)

_Rebase onto master after Phase 1 merges. Work component by component._

### Cue type dropdown (US-3)

- [ ] T013 [P] [US3] Import `CUE_TYPE_LABELS` and shadcn `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` into `Life App/src/components/habits/habit-form.tsx`; add cue type dropdown above the cue text input in the quick-add modal
- [ ] T014 [P] [US3] Add cue type dropdown above the cue text input in walkthrough step 3 (cue step) in `Life App/src/components/habits/habit-form.tsx`
- [ ] T015 [P] [US3] Add cue type dropdown above the cue text input in the edit modal section of `Life App/src/components/habits/habit-form.tsx`
- [ ] T016 [US3] Update `draft` reset and `initial` hydration in `Life App/src/components/habits/habit-form.tsx` to include `cueType: initial?.cueType ?? null`

### Reward field — walkthrough (US-1)

- [ ] T017 [US1] Add `reward` entry to `WALKTHROUGH_STEPS` array in `Life App/src/components/habits/habit-form.tsx` (after `minimumVersion`, before review); label "What's your reward?", subtitle per spec FR-1.2, not required
- [ ] T018 [US1] Add `<ReviewRow label="Reward" ...>` (conditional on `draft.reward` being truthy) to the review step block in `Life App/src/components/habits/habit-form.tsx`

### Reward field — edit modal (US-2)

- [ ] T019 [US2] Add reward `<Input>` field (max 200 chars) below minimum version in the edit modal block of `Life App/src/components/habits/habit-form.tsx`; initialise from `initial.reward` when editing

### Keystone flag (US-5)

- [ ] T020 [P] [US5] Add keystone checkbox with helper text (spec FR-4.2) below minimum version in the quick-add modal block of `Life App/src/components/habits/habit-form.tsx`
- [ ] T021 [P] [US5] Add keystone checkbox with helper text below the color picker in the walkthrough review step of `Life App/src/components/habits/habit-form.tsx`
- [ ] T022 [P] [US5] Add keystone checkbox with helper text below the reward field in the edit modal block of `Life App/src/components/habits/habit-form.tsx`
- [ ] T023 [US5] Update `draft` reset and `initial` hydration in `Life App/src/components/habits/habit-form.tsx` to include `isKeystone: initial?.isKeystone ?? false`

### Implementation intention sentence + Gem icon (US-4)

- [ ] T024 [P] [US4] Import `buildImplementationIntention` from `@/lib/habit-v2-helpers` and `Gem` from `lucide-react` in `Life App/src/components/habits/habit-row.tsx`
- [ ] T025 [US4] Render implementation intention sentence (small muted italic, truncated) directly below the habit name subtitle in `Life App/src/components/habits/habit-row.tsx`; hide when `buildImplementationIntention` returns null
- [ ] T026 [US5] Wrap the existing heading `<p>` element (which renders `{habit.identity || habit.name}` and carries archived line-through styling) in a flex div alongside `<Gem className="w-3.5 h-3.5 text-muted-foreground shrink-0" title="Keystone habit." />` when `habit.isKeystone`; do not replace the `<p>` or break its existing class names in `Life App/src/components/habits/habit-row.tsx`

### Never-miss-twice nudge (US-6)

- [ ] T027 [US6] Import `shouldShowNeverMissTwice` from `@/lib/habit-v2-helpers` in `Life App/src/components/habits/habit-row.tsx`
- [ ] T028 [US6] Extend the inline-feedback block in `Life App/src/components/habits/habit-row.tsx` to render nudge text ("Yesterday was a miss. Today is the one that counts.") when `shouldShowNeverMissTwice(logDates, today)` is true and `affirmation` is falsy; affirmation takes priority when both would show; nudge disappears automatically once today is logged (shouldShowNeverMissTwice returns false)

### Expanded collapsible editorial (US-7)

- [ ] T029 [US7] Add two new entries (blocks 4 and 5, verbatim from spec FR-6.1) to the `PRINCIPLES` array in `Life App/src/components/habits/habit-principles.tsx`
- [ ] T030 [US7] Add `userId: string` prop to `HabitPrinciplesProps` in `Life App/src/components/habits/habit-principles.tsx`; implement collapse state with `useState` initialised from `localStorage` key `habit-principles-collapsed-${userId}`, using `typeof window` guard for SSR safety
- [ ] T031 [US7] Render a section header with `ChevronDown`/`ChevronUp` Lucide icon that toggles collapsed state in all three rendering modes of `Life App/src/components/habits/habit-principles.tsx`; persist collapse to `localStorage` on toggle
- [ ] T032 [US7] Thread `userId` from `Life App/src/app/habits/page.tsx` (server component — get it via `const session = await auth()` from `@/lib/auth`, not `useSession()`) down as a prop to `HabitList` and then to every `<HabitPrinciples>` usage

### Final verification

- [ ] T033 Run `npx tsc --noEmit` and `npx vitest run`; confirm clean
- [ ] T034 Manual smoke: create habit via walkthrough with cue type (Time), cue text, reward, keystone checked → row shows intention sentence and Gem icon
- [ ] T035 Manual smoke: simulate missed yesterday (DB: log 2 days ago, no log yesterday, no log today) → nudge visible; toggle today → nudge disappears
- [ ] T036 Manual smoke: collapse editorial section → state persists after hard refresh; existing V1 habits render without visual regressions

---

## Dependencies

```
T001
 └── T002 → T003 → T004 → T005 → T006
      └── T007 → T008 → T009 (tests)
      └── T010 (API POST)
      └── T011 (API PATCH)
           └── T012 (gate check — Phase 1 PR)
                └── [rebase onto master]
                     ├── T013–T016 (cue type dropdown)
                     ├── T017–T018 (reward walkthrough) — depends on T013–T016
                     ├── T019 (reward edit) — depends on T013–T016
                     ├── T020–T023 (keystone) — parallel with T017–T019
                     ├── T024–T026 (row sentence + gem) — independent of form tasks
                     ├── T027–T028 (nudge) — independent of form tasks
                     └── T029–T032 (editorial) — independent of form + row tasks
                          └── T033–T036 (gates + smoke — Phase 2 PR)
```

---

## Parallel opportunities

Within Phase 2, once T013–T016 (cue dropdown) are done, the following groups can be worked independently of each other:

- **Group A** — form additions: T017–T023 (reward fields + keystone toggles across the three form surfaces)
- **Group B** — habit row: T024–T026 (intention sentence + Gem icon)
- **Group C** — nudge: T027–T028 (never-miss-twice)
- **Group D** — editorial: T029–T032 (new blocks + collapsible)

Groups B, C, and D touch different files and have no shared state dependencies.
