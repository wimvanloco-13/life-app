# Plan: Body Metrics Guidance

**Feature ID:** `body-metrics-guidance`
**Status:** Plan. Spec locked 2026-06-02. Plan drafted 2026-06-02.
**Depends on:** No blocking features. Additive to the existing Body Metrics tab.
**Last updated:** 2026-06-02

---

## 1. Strategy

This is a focused, self-contained feature: one new table, two new API routes, a
pure interpretation module, and an extension to one existing component. There are
no new pages and no nav changes.

**Decision: three phased PRs.**

| Phase | What ships | User-visible after merge |
|---|---|---|
| Phase 1 | Schema, types, pure interpretation library, unit tests. No UI. | Nothing. CI proves the medical tables are correct before any UI ships. |
| Phase 2 | API routes (`GET`/`PATCH /api/body-profile`), UI extension to `body-metrics-view.tsx` (About you card + feedback section). | A user can enter their profile and see interpreted metric cards. Full feature. |
| Phase 3 | Master-docs sync, smoke checklist in PR body. | Docs current. Feature documented complete. |

Phases 1 and 3 are small. Phase 2 is the bulk of the work. The split keeps the
medical tables reviewable on their own in Phase 1 — if the reference data is
transcribed wrong, that's the cheapest phase to revisit.

Total expected lines changed: ~800 to 1,100.

---

## 2. Verification gates

Every phase passes all four gates before opening its PR.

| Gate | Command | Pass criterion |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | Exit 0, no errors. |
| Tests | `npx vitest run` | All tests pass. Phase-specific new tests present (see per-phase detail below). |
| Lint (per file) | `npx eslint <each file touched in this phase>` | No new issues introduced compared to master. Pre-existing issues in unrelated files are not gating. |
| Migration idempotency | `node apply-schema.js` run twice on a fresh DB | First run creates the table. Second run is a no-op (IF NOT EXISTS). No errors either run. `PRAGMA table_info(user_body_profiles)` returns the expected columns. |

---

## 3. Branching strategy

```
master
 └── feat/body-metrics-guidance-foundation   (Phase 1, ~4 to 6 commits, ~250 to 350 LoC)
      └── feat/body-metrics-guidance-ui       (Phase 2, ~8 to 10 commits, ~500 to 650 LoC)
           └── feat/body-metrics-guidance-docs (Phase 3, ~2 to 3 commits, ~100 to 150 LoC)
```

Each phase branches off the previous phase's branch (stacked). When Phase N
merges to master, Phase N+1 rebases onto master and opens its PR.

---

## 4. Implementation steps per phase

### Phase 1: Foundation (schema, types, interpretation library)

**Goal:** stand up the data model and prove the medical tables are correctly
transcribed. No server, no DOM. Pure functions only.

#### 4.1.1 Migration (`apply-schema.js`)

Add one `CREATE TABLE IF NOT EXISTS` statement to the `createStatements` array,
near the existing `budget_settings` block:

```js
`CREATE TABLE IF NOT EXISTS user_body_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  date_of_birth TEXT,
  biological_sex TEXT,
  height_cm REAL,
  waist_cm REAL,
  waist_cm_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`
```

No `ALTER TABLE` statements; this is a new table. Idempotent by `IF NOT EXISTS`.

#### 4.1.2 Drizzle schema (`src/db/schema.ts`)

Add the `userBodyProfiles` table definition matching the SQL above. Use existing
helpers: `sqliteTable`, `integer`, `text`, `real`, `timestamp()`, `updatedAt()`.

#### 4.1.3 TypeScript types (`src/types/index.ts`)

Export two interfaces:

```ts
export interface UserBodyProfile {
  id: number;
  userId: string;
  dateOfBirth: string | null;
  biologicalSex: 'male' | 'female' | null;
  heightCm: number | null;
  waistCm: number | null;
  waistCmUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserBodyProfileInput {
  dateOfBirth?: string | null;
  biologicalSex?: 'male' | 'female' | null;
  heightCm?: number | null;
  waistCm?: number | null;
}
```

#### 4.1.4 Interpretation library (`src/lib/body-metrics-guidance.ts`, new file)

Implement the three pure functions from FR-006 to FR-009. The file has no imports
beyond TypeScript built-ins. Structure:

1. **Reference tables** — inline constants at the top of the file. Transcribed
   directly from `reference-data.md`:
   - `VO2MAX_NORMS`: a record keyed by `'male' | 'female'`, then by age bracket
     string (`'20-29'`, `'30-39'`, ..., `'70-79'`), each containing the seven
     breakpoint values (5th, 10th, 25th, 50th, 75th, 90th, 95th).
   - `RHR_NORMS`: a record keyed by `'male' | 'female'`, then by age bracket
     string (`'18-25'`, `'26-35'`, ..., `'65+'`), each containing the ranges for
     each category (Athlete through Poor).

2. **`interpretWeight(params)`** — per FR-007. Rolling average from `today` over
   7-day window, BMI, WHO category, healthy range, optional WHtR and waist context.

3. **`interpretVo2max(value, ageYears, sex)`** — per FR-008. Age bracket clamping,
   linear interpolation between the 7 breakpoints, ACSM category from percentile.

4. **`interpretRestingHr(value, ageYears, sex)`** — per FR-009. Age bracket
   lookup, category from range tables, athlete and high-HR flags.

Keep the reference tables first in the file so they are easy to audit against
`reference-data.md` during code review.

#### 4.1.5 Unit tests (`src/lib/__tests__/body-metrics-guidance.test.ts`, new file)

All cases from FR-011. The tests are the primary verification that the transcribed
reference tables are correct — write them before the functions, reading the table
values out of `reference-data.md` directly.

Required test cases (implement as named `it()` blocks within describe groups):

**interpretWeight:**
- Height 170 cm, single weight 73 kg → BMI 25.3, category "Overweight", healthy
  range min 53.5 kg, max 72.0 kg.
- Height 175 cm, waist 82 cm → WHtR 0.469 (rounded 0.47), category "Healthy".
- Height 175 cm, waist 90 cm → WHtR 0.514 (rounded 0.51), category "Elevated
  central adiposity".
- Waist 90 cm, sex "male" → `absoluteWaistContext` references 94 cm elevated
  threshold.
- Waist 103 cm, sex "male" → `absoluteWaistContext` references 102 cm high-risk
  threshold.
- 0 readings in 7-day window, 1 older reading → uses that reading, note present.
- 3 readings in 7-day window → averages them, note "Based on your last 3 readings."
- 7 readings in 7-day window → averages all, no note.
- 10 readings, 7 within window → averages only the 7 within window, no note.
- BMI exactly 25.0 → "Overweight" (E6 upper-inclusive).
- WHtR exactly 0.5 → "Elevated central adiposity" (E6 upper-inclusive).

**interpretVo2max:**
- `(42.4, 35, 'male')` → `percentile: 50`, `category: 'Average'` (50th is in
  40–59 Average range; the 50th percentile data breakpoint is not a category edge).
- `(56.5, 35, 'male')` → `category: 'Excellent'` (90th percentile, 30–39 male).
- `(30.2, 35, 'male')` → `category: 'Poor'` (10th percentile, 30–39 male, below
  20th → Poor).
- `(37.6, 25, 'female')` → `category: 'Average'` (50th percentile, 20–29 female).
- `(19, 25, 'female')` age clamped — passes for age 19 → uses 20–29 bracket,
  returns `ageBracketNote` containing "20–29".
- `(24.0, 82, 'female')` → `category: 'Excellent'`, `ageBracketNote` containing
  "70–79" (age 82 clamped to 70–79; 24.0 is just below the 95th breakpoint 24.1).
- Value below 5th-percentile breakpoint for its bracket → reported as "below the
  5th percentile", `category: 'Poor'`.
- Value above 95th-percentile breakpoint → reported as "above the 95th percentile",
  `category: 'Superior'`.
- Computed percentile exactly = 60 → `category: 'Good'` not `'Average'` (E6:
  60 is a category boundary, upper-inclusive assigns to Good).

**interpretRestingHr:**
- `(49, 30, 'male')` → `category: 'Athlete'`, `athleteNote: true`.
- `(68, 30, 'male')` → `category: 'Above average'`, `athleteNote: false`,
  `highHrNote: false`.
- `(90, 40, 'female')` → `category: 'Poor'`, `highHrNote: true`.
- `(55, 70, 'male')` → uses the 65+ bracket.
- `(55, 15, 'female')` → clamped to 18–25 bracket, category "Athlete".

#### 4.1.6 Verification before opening Phase 1 PR

- `npx tsc --noEmit`: clean.
- `npx vitest run`: all existing tests pass; all new body-metrics-guidance tests
  pass. Every test case above produces a green result.
- Per-file lint on `apply-schema.js`, `src/db/schema.ts`, `src/types/index.ts`,
  `src/lib/body-metrics-guidance.ts`, and the test file: no new issues.
- `node apply-schema.js` twice: first run creates the table, second run is a
  no-op. `PRAGMA table_info(user_body_profiles)` returns 9 columns.

---

### Phase 2: API + UI

**Goal:** ship the full user-facing feature. After this phase, a user can enter
their profile and see interpreted feedback for all three metrics.

#### 4.2.1 API routes (`src/app/api/body-profile/route.ts`, new file)

Implement `GET` and `PATCH` in a single route file following the existing pattern
in `src/app/api/budget-settings/route.ts` (upsert semantics, same auth scaffold).

**GET:**
1. Call `auth()`, return `401` if no session.
2. Query `user_body_profiles WHERE user_id = session.user.id`. If no row, return
   a default-shape object with all data columns `null` and status `200`.
3. Return the row as JSON with camelCase keys matching `UserBodyProfile`.

**PATCH:**
1. Call `auth()`, return `401` if no session.
2. Parse body. Any field not present in the body is left unchanged (upsert
   semantics, per spec E5).
3. Validate present fields per FR-004. Return `400` with the specific error
   string on the first failure.
4. If `waistCm` is in the payload, set `waist_cm_updated_at` to `datetime('now')`.
5. Upsert via Drizzle's `insert(...).onConflictDoUpdate(...)` on `user_id`.
6. Return the full updated profile row as JSON with status `200`.

#### 4.2.2 UI extension (`src/components/activities/body-metrics-view.tsx`)

This is the largest single change. The existing component fetches `body_metrics`
on mount; extend it to also fetch `body-profile` in parallel.

**Fetch on mount:**

```ts
const [metricsRes, profileRes] = await Promise.all([
  fetch('/api/body-metrics'),
  fetch('/api/body-profile'),
]);
```

Store the profile in a `profile` state variable alongside the existing `allMetrics`.

**"About you" card** — renders below the existing chart/log section:

Add a new `<Card>` containing:
- Heading "About you" in `CardTitle`.
- Subtitle: "These details are optional and are only used to interpret your
  metrics on this screen." in `CardDescription`.
- The four inputs from FR-013, with the waist "Last updated" note driven by
  `profile.waistCmUpdatedAt`.
- A single "Save" button. On click: client-side validation (matching server rules),
  then `PATCH /api/body-profile`, then update local `profile` state from the `200`
  response.
- Inline error display per FR-014: below the relevant input on `400`, below the
  Save button on network failure.

Input refs (`useRef`) are used to support the focus-on-prompt-click behaviour for
progressive disclosure (US-3 scenario 1, 2, 3). Pass the refs down to the feedback
section.

**Feedback section** — renders below the "About you" card:

Add a `<BodyMetricsFeedback>` component (can be a sibling function in the same
file if small enough, or a separate file `body-metrics-feedback.tsx` in the same
directory if it grows long). It receives `profile`, `allMetrics`, and the input
refs as props, and calls the three pure functions from Phase 1.

For each of the three metric cards:
- If in **prompt** state: one sentence per US-3, with a `<button>` link that
  calls `inputRef.current?.focus()`.
- If in **interpreted** state: display per FR-018 (Weight), FR-019 (VO2max),
  FR-020 (Resting HR).

The medical disclaimer from FR-021 renders below all three cards, always.

Follow the existing `METRIC_CONFIG` pattern already in the component for looping
over the three metrics — the feedback section uses the same config order
(Weight, VO2max, Resting HR).

**Loading state:** while either fetch is in flight, the "About you" and feedback
sections render skeletons matching their layouts (per the existing skeleton
pattern in the file).

#### 4.2.3 Verification before opening Phase 2 PR

All gates from section 2, plus:

- `node apply-schema.js` again: the `user_body_profiles` table already exists
  from Phase 1 — second run is still a no-op. No error.
- Manual: open Body Metrics tab with no profile and no metrics. "About you" card
  shows all four inputs empty. Feedback section shows three prompt-state sentences.
  No console errors.
- Manual: enter height 170 cm, click Save. Network tab shows `PATCH /api/body-profile`
  returning `200`. Reload: height field is pre-filled with 170. Weight card shows
  BMI computation (if at least one weight reading exists) or the "log a weight"
  prompt (if none).
- Manual: enter a future date of birth, click Save. Inline error "Date of birth
  cannot be in the future" appears. No request was sent.
- Manual: log a weight of 73 kg, have height 170 cm saved. Weight card shows BMI
  25.3, "Overweight", healthy range 53.5–72.0 kg, BMI limitation note, averaging
  note.
- Manual: enter DOB and biological sex. VO2max card moves to interpreted state
  (if a VO2max reading exists). Resting HR card moves to interpreted state (if a
  resting HR reading exists).
- Manual: click the prompt link in a prompt-state card. Focus moves to the
  relevant input in the "About you" card.
- Manual: enter waist 82 cm, Save. "Last updated [today]" appears below the waist
  input.
- Manual: resting HR card for a sub-50 bpm value (logged today) shows "Athlete"
  category without alarming language.
- Manual: resting HR card for a 90 bpm value shows the "persistently high"
  healthcare note.
- Manual: medical disclaimer is visible at all times regardless of profile state.

---

### Phase 3: Master-docs sync

**Goal:** keep `specs/master/` current so future agents start from accurate
documentation.

#### 4.3.1 `specs/master/data-model.md`

- Add `UserBodyProfile` entity to the ERD mermaid block with its `user_id` FK to
  `users`.
- Add the column detail table matching spec.md "Key entities."

#### 4.3.2 `specs/master/contracts/api-routes.md`

Add a new "Body Profile" section with `GET /api/body-profile` and
`PATCH /api/body-profile`, their request/response shapes, and validation rules.

#### 4.3.3 Smoke checklist in PR body

The Phase 3 PR body includes the full SC-001 to SC-021 smoke checklist for
manual verification after deploy.

#### 4.3.4 Verification before opening Phase 3 PR

- `npx tsc --noEmit`: clean.
- `rg "body-profile" specs/master/` returns hits in both `data-model.md` and
  `contracts/api-routes.md`.
- Lint on changed doc files: no issues.

---

## 5. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Reference table transcription errors (wrong percentile value for a given age/sex bracket). | Medium. Seven tables, 42 breakpoints, manually transcribed. | High. Wrong interpretation is worse than no interpretation. | Phase 1 ships the tests before the UI. Every anchor value in the test file is verified against `reference-data.md` by a second read. Code review of Phase 1 should spot-check at least 3 table values against the source. |
| BMI limitation note feels alarming to users in the "Overweight" band despite the caveat. | Medium. The label "Overweight" is clinical and blunt. | Low. This is the standard WHO vocabulary; the caveat is always shown. | The copy review in Phase 2 should ensure the plain-language verdict is calm and non-judgmental, not just the raw category label. |
| "About you" card feels like surveillance or medical data collection. | Low. All inputs are optional and explained. | Medium. If users feel observed they will not fill it in and the feature has no value. | Subtitle copy (FR-012) is explicit: "only used to interpret your metrics on this screen." Nothing leaves the local instance. |
| Weight rolling average produces a confusing BMI for a user who logged one reading 8 days ago. | Low. E2 fallback to "most recent" handles this case. | Low. The averaging note makes the fallback transparent. | The fallback note copy must be verified in manual smoke to confirm it renders correctly. |
| Waist staleness: user entered waist 12 months ago, it is now inaccurate, and the WHtR looks misleadingly good. | Medium. Waist is a static field, not a time series. | Low. The "Last updated" date next to the waist field surfaces this. | Manual smoke check in Phase 2 verifies the last-updated date renders. |
| `Promise.all` for `body-metrics` + `body-profile` fails when one of the two endpoints returns an error, leaving the UI broken. | Low. Both routes use the same auth pattern and are unlikely to fail independently. | Medium. The tab would show a broken state. | Each fetch inside `Promise.all` is individually checked with `if (!res.ok)`; a failed body-profile fetch degrades gracefully to an empty profile (all nulls), showing prompt-state cards rather than breaking. |

---

## 6. Execution order within phases

**Phase 1:** 4.1.1 migration → 4.1.2 schema → 4.1.3 types → 4.1.5 tests (write
first) → 4.1.4 library (implement to pass tests) → 4.1.6 verification.

**Phase 2:** 4.2.1 API route → 4.2.2 UI extension (fetch wiring first, then
"About you" card, then feedback section) → 4.2.3 verification.

**Phase 3:** 4.3.1 data-model → 4.3.2 api-routes → 4.3.3 smoke checklist in PR
body → 4.3.4 verification.

---

## 7. Definition of done

The feature is done when:

- All 22 FRs in `spec.md` are implemented and pass their corresponding SCs.
- All 21 SCs in `spec.md` are manually verified on the running app.
- `specs/master/data-model.md` and `specs/master/contracts/api-routes.md` are
  current.
- Three PRs have merged to master in order.
- No new `tsc` errors or lint issues compared to pre-feature master.
- A user can enter date of birth, sex, height, and waist, and see an interpreted
  verdict for each logged metric — or a calm prompt if inputs are missing — with
  no console warnings and a visible medical disclaimer.
