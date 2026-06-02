# Tasks: Body Metrics Guidance

**Feature ID:** `body-metrics-guidance`
**Source documents:** `scope.md`, `spec.md` (22 FRs, 21 SCs), `plan.md` (3 phases), `reference-data.md`.
**Last updated:** 2026-06-02

---

## Cross-task notes

- Every task is tagged with one of: `[SETUP]`, `[CODE]`, `[TEST]`, `[AUDIT]`, `[GATES]`, `[VERIFY]`, `[SHIP]`.
- Tasks within a phase are sequential unless stated otherwise. Sub-orderings are noted in `Blocked-by`.
- The feature is split across three phased PRs (see `plan.md` section 3). Each phase has its own `[SHIP]` and `[VERIFY]` task.
- No new page, no nav changes. All changes are additive to the existing Body Metrics tab.

---

## Phase 1: Foundation (schema, types, interpretation library)

Expected PR: ~4 to 6 commits, ~250 to 350 LoC.

### T001 [SETUP], sync master and create branch

- Action: Pull the latest master (fast-forward from upstream). Create branch `feat/body-metrics-guidance-foundation` off master.
- Files: none (git).
- Acceptance: `git branch --show-current` returns `feat/body-metrics-guidance-foundation`; `git status --short` is empty; branch tip is at the current master HEAD.
- Blocked-by: nothing.

### T002 [SETUP], commit planning documents

- Action: Add `feature requests/body-metrics-guidance/scope.md`, `spec.md`, `plan.md`, `tasks.md`, and `reference-data.md` to the index. Commit as `docs(body-metrics-guidance): commit planning documents`.
- Files: `feature requests/body-metrics-guidance/{scope,spec,plan,tasks,reference-data}.md`.
- Acceptance: One commit on the branch; `git status --short` is empty.
- Blocked-by: T001.

### T003 [CODE], migration (`apply-schema.js`)

- Action: Append one `CREATE TABLE IF NOT EXISTS` statement to the `createStatements` array in `apply-schema.js`. Place it near the existing `budget_settings` block. Exact SQL per `plan.md` section 4.1.1:

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

- Files: `apply-schema.js`.
- Acceptance: File parses in Node without errors. The new statement is present. No existing statements are touched.
- Blocked-by: T002.

### T004 [GATES], migration idempotency check

- Action: Run `node apply-schema.js` twice on a fresh local DB. Then run:
  ```
  node -e "const D=require('better-sqlite3');const db=new D('./life-app.db');console.log(db.prepare('PRAGMA table_info(user_body_profiles)').all().map(c=>c.name));"
  ```
- Files: none (verification).
- Acceptance: First run creates the table; second run is a no-op (no errors). `PRAGMA table_info` returns exactly 9 columns: `id`, `user_id`, `date_of_birth`, `biological_sex`, `height_cm`, `waist_cm`, `waist_cm_updated_at`, `created_at`, `updated_at`.
- Blocked-by: T003.

### T005 [CODE], Drizzle schema (`src/db/schema.ts`)

- Action: Add the `userBodyProfiles` table definition mirroring the SQL from T003. Use the same helpers as the rest of the file (`sqliteTable`, `text`, `real`, `timestamp()`, `updatedAt()`). Export the table.
- Files: `src/db/schema.ts`.
- Acceptance: `npx tsc --noEmit` clean. The table is exported and its column names match the SQL.
- Blocked-by: T004.

### T006 [CODE], TypeScript types (`src/types/index.ts`)

- Action: Export two interfaces per `plan.md` section 4.1.3:

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

- Files: `src/types/index.ts`.
- Acceptance: `npx tsc --noEmit` clean. Both interfaces are exported.
- Blocked-by: T005.

### T007 [TEST], write interpretation library tests first

- Action: Create `src/lib/__tests__/body-metrics-guidance.test.ts`. Write all test cases from `plan.md` section 4.1.5 **before** implementing the functions. The tests will fail (the module does not exist yet). This is intentional — the reference table values are verified against `reference-data.md` at test-writing time, not at implementation time.

  Required test cases (grouped into three `describe` blocks):

  **`interpretWeight`:**
  1. Height 170 cm, single weight 73 kg in window → BMI 25.3, category "Overweight", healthy range min 53.5, max 72.0.
  2. Height 175 cm, waist 82 cm → WHtR 0.47, category "Healthy".
  3. Height 175 cm, waist 90 cm → WHtR 0.51, category "Elevated central adiposity".
  4. Waist 90 cm, sex "male" → `waistCategory: "Within healthy range"` (below 94 cm threshold).
  5. Waist 96 cm, sex "male" → `waistCategory: "Elevated risk"` (94–101 cm band).
  6. Waist 103 cm, sex "male" → `waistCategory: "High risk"` (≥ 102 cm).
  7. Waist 75 cm, sex "female" → `waistCategory: "Within healthy range"` (below 80 cm threshold).
  8. Waist 83 cm, sex "female" → `waistCategory: "Elevated risk"` (80–87 cm band).
  9. Waist 92 cm, sex "female" → `waistCategory: "High risk"` (≥ 88 cm).
  10. 0 readings in 7-day window, 1 older reading → `readingsUsed: 1`, `averagingNote` present.
  11. 3 readings in window → `readingsUsed: 3`, `averagingNote` present.
  12. 7 readings in window → `readingsUsed: 7`, no `averagingNote`.
  13. 10 readings, 7 within window → averages only the 7 in window, no `averagingNote`.
  14. BMI exactly 25.0 → category "Overweight" (E6 upper-inclusive).
  15. WHtR exactly 0.5 → category "Elevated central adiposity" (E6 upper-inclusive).

  **`interpretVo2max`:**
  1. `(42.4, 35, 'male')` → `percentile: 50`, `category: 'Average'`. (50th percentile is within the Average range 40th–59th. No boundary case.)
  2. `(56.5, 35, 'male')` → `category: 'Excellent'` (90th percentile, 30–39 male bracket).
  3. `(30.2, 35, 'male')` → `category: 'Poor'` (10th percentile; below 20th → Poor).
  4. `(37.6, 25, 'female')` → `category: 'Average'` (50th percentile, 20–29 female bracket).
  5. Age 19 → uses 20–29 bracket, `ageBracketNote` contains "20–29".
  6. `(24.0, 82, 'female')` → `category: 'Excellent'`, `ageBracketNote` contains "70–79".
  7. Value below the 5th-percentile breakpoint for its bracket → `category: 'Poor'`, percentile label "below the 5th percentile".
  8. Value above the 95th-percentile breakpoint → `category: 'Superior'`, percentile label "above the 95th percentile".
  9. Computed percentile exactly 60 → `category: 'Good'` (60 is a category boundary; upper-inclusive → Good, not Average).

  **`interpretRestingHr`:**
  1. `(49, 30, 'male')` → `category: 'Athlete'`, `athleteNote: true`.
  2. `(68, 30, 'male')` → `category: 'Above average'`, `athleteNote: false`, `highHrNote: false`.
  3. `(90, 40, 'female')` → `category: 'Poor'`, `highHrNote: true`.
  4. `(55, 70, 'male')` → `{ category: 'Athlete', athleteNote: true, ageBracket: '65+' }`. (Men 65+: Athlete = 50–55 bpm; 55 is the upper bound of that range → Athlete, not Excellent.)
  5. `(55, 15, 'female')` → clamped to 18–25 bracket, `category: 'Athlete'`.

- Files: `src/lib/__tests__/body-metrics-guidance.test.ts`.
- Acceptance: File parses without syntax errors. `npx vitest run src/lib/__tests__/body-metrics-guidance.test.ts` runs and **fails** (module not found). That is the expected state at this task boundary.
- Blocked-by: T006.

### T008 [CODE], interpretation library (`src/lib/body-metrics-guidance.ts`)

- Action: Create the file and implement the three pure functions until all tests from T007 pass. Structure per `plan.md` section 4.1.4:
  1. Reference tables at the top of the file (transcribed from `reference-data.md`). Keep them as named constants so they are easy to spot-check in code review.
  2. `interpretWeight(params)` — rolling average, BMI, WHO categories, healthy range, optional WHtR and waist context.
  3. `interpretVo2max(value, ageYears, sex)` — bracket clamping, linear interpolation, ACSM category.
  4. `interpretRestingHr(value, ageYears, sex)` — bracket lookup, category, athlete and high-HR flags.

  All three functions are pure: no imports beyond TypeScript built-ins, no I/O, no Next.js dependencies.

- Files: `src/lib/body-metrics-guidance.ts`.
- Acceptance: `npx vitest run src/lib/__tests__/body-metrics-guidance.test.ts` passes with all test cases green. `npx tsc --noEmit` clean.
- Blocked-by: T007.

### T009 [GATES], Phase 1 verification gates

- Action: Run all four gates from `plan.md` section 2:
  1. `npx tsc --noEmit` — clean.
  2. `npx vitest run` — all tests pass (existing suite plus the new body-metrics-guidance tests).
  3. Per-file lint on every file touched in T003–T008 — no new issues vs master.
  4. `node apply-schema.js` twice — idempotent (re-run from T004 as a final sanity check).
- Files: none (verification).
- Acceptance: All four gates pass.
- Blocked-by: T008.

### T010 [SHIP], commit, push, open Phase 1 PR

- Action: Stage and commit in logical groups. Suggested 5 commits:
  1. `docs(body-metrics-guidance): commit planning documents` (already exists from T002).
  2. `feat(body-metrics): add user_body_profiles schema and Drizzle definition (FR-001, FR-002)`.
  3. `feat(body-metrics): export UserBodyProfile and UserBodyProfileInput types (FR-002)`.
  4. `test(body-metrics): write interpretation library tests against reference tables (FR-011)`.
  5. `feat(body-metrics): implement interpretWeight, interpretVo2max, interpretRestingHr (FR-006–FR-009)`.

  Push to `origin`. Open PR against `wvanloco-alt:master` titled `feat(body-metrics): foundation — schema, types, interpretation library`. PR body explains that no UI ships in this phase, and that the primary value of this PR is proving the medical tables are correctly transcribed (the tests are the deliverable). Tag the SC anchor values proven: SC-011, SC-012, SC-013, SC-014, SC-015, SC-016.

- Files: none (git).
- Acceptance: Phase 1 PR is open against `wvanloco-alt:master`; CI green.
- Blocked-by: T009.

---

## Phase 2: API and UI

Expected PR: ~8 to 10 commits, ~500 to 650 LoC. Branches off Phase 1.

### T011 [SETUP], Phase 2 branch

- Action: After Phase 1 PR merges, pull master. Create branch `feat/body-metrics-guidance-ui` off the latest master.
- Files: none (git).
- Acceptance: Branch tip includes Phase 1's merge.
- Blocked-by: Phase 1 PR merged.

### T012 [CODE], `GET /api/body-profile` route

- Action: Create `src/app/api/body-profile/route.ts`. Implement `GET`:
  1. Call `auth()`, return `401` if no session.
  2. Query `user_body_profiles WHERE user_id = session.user.id`.
  3. If no row exists, return a default object with `id: null` and all data columns `null`, status `200`.
  4. Return the row with camelCase keys matching `UserBodyProfile`, status `200`.

  Follow the pattern in `src/app/api/budget-settings/route.ts`.

- Files: `src/app/api/body-profile/route.ts`.
- Acceptance: `npx tsc --noEmit` clean. `GET /api/body-profile` with a valid session returns `200` with the correct shape. `GET` without a session returns `401`. Proves SC-021 (auth scope).
- Blocked-by: T011.

### T013 [CODE], `PATCH /api/body-profile` route

- Action: In the same route file, implement `PATCH`:
  1. Call `auth()`, return `401` if no session.
  2. Parse body. Only fields present in the body are validated and updated.
  3. Server-side validation in this order (return `400` with the exact error string on first failure):
     - `dateOfBirth`: valid ISO `YYYY-MM-DD`, not in the future. Error: `"Date of birth cannot be in the future"`.
     - `biologicalSex`: `'male'` or `'female'`. Error: `"Biological sex must be 'male' or 'female'"`.
     - `heightCm`: positive real number. Error: `"Height must be a positive number"`.
     - `waistCm`: positive real number. Error: `"Waist must be a positive number"`.
  4. If `waistCm` is present in the payload, set `waist_cm_updated_at` to the current timestamp.
  5. Upsert via Drizzle `insert(...).onConflictDoUpdate(...)` on `user_id`. Only update the columns that were in the payload; leave others unchanged (upsert semantics per spec E5).
  6. Return the full updated profile row, status `200`.
- Files: `src/app/api/body-profile/route.ts`.
- Acceptance: `npx tsc --noEmit` clean. Proves SC-002–SC-006:
  - `PATCH { heightCm: 170 }` → `200`, row stored.
  - `PATCH { dateOfBirth: "2030-01-01" }` → `400 "Date of birth cannot be in the future"`.
  - `PATCH { biologicalSex: "other" }` → `400 "Biological sex must be 'male' or 'female'"`.
  - `PATCH { heightCm: -5 }` → `400 "Height must be a positive number"`.
  - Two successive PATCHes (`{ heightCm: 170 }` then `{ dateOfBirth: "1990-05-15" }`) → both values persisted (SC-006 upsert).
- Blocked-by: T012.

### T014 [AUDIT], API auth and scope sweep

- Action: Re-read both handlers in `body-profile/route.ts`. Verify:
  - First action in every handler is `auth()` with a `401` guard.
  - All DB queries scope to `session.user.id`; no `userId` accepted from the request body.
  - The `400` error strings match `spec.md` FR-004 exactly (copy-compare, not paraphrase).
- Files: review only.
- Acceptance: All checks pass. Fix anything that does not match before moving on.
- Blocked-by: T013.

### T015 [CODE], extend `body-metrics-view.tsx` — parallel fetch and state

- Action: In `src/components/activities/body-metrics-view.tsx`, extend the `fetchMetrics` / mount logic to also fetch `GET /api/body-profile` in parallel using `Promise.all`. Add a `profile` state variable (`UserBodyProfile | null`). While either fetch is in flight, the new sections below the chart render skeletons.

  If `GET /api/body-profile` fails (non-2xx), degrade gracefully: set `profile` to the default all-null shape and continue rendering prompt-state cards rather than breaking the tab.

- Files: `src/components/activities/body-metrics-view.tsx`.
- Acceptance: `npx tsc --noEmit` clean. The tab loads without console errors. Both fetches fire simultaneously (confirm in browser Network tab: two requests with near-identical start times).
- Blocked-by: T014.

### T016 [CODE], "About you" card

- Action: In `body-metrics-view.tsx` (or a new sibling component `body-metrics-about-you.tsx` if it grows large), add the "About you" `<Card>` below the existing chart and log-form section.

  Contents per FR-012, FR-013, FR-015:
  - `CardTitle`: "About you".
  - `CardDescription`: "These details are optional and are only used to interpret your metrics on this screen."
  - Date of birth: HTML `<Input type="date">` with `max` set to today's ISO date.
  - Biological sex: `<Select>` with placeholder "Select", options "Male" / "Female".
  - Height: `<Input type="number" step="0.1">` with unit label "cm", placeholder "e.g. 175".
  - Waist: `<Input type="number" step="0.1">` with unit label "cm", placeholder "e.g. 85", label suffix "(optional)". When `profile.waistCmUpdatedAt` is non-null, show a muted line below: "Last updated [DD MMM YYYY]."
  - A single "Save" button.

  On "Save": client-side validation first (matching server rules, to avoid a round-trip for obvious errors), then `PATCH /api/body-profile`. On `200`: update local `profile` state from the response body. On `400`: show the specific error string inline below the relevant input. On network failure: show a generic error below the Save button.

  Attach `useRef` to each of the four inputs (date of birth, biological sex, height, waist). Store the refs so the feedback section (T017) can call `ref.current?.focus()` for the prompt-click behaviour.

  Pre-fill all four inputs from `profile` on load (including after a Save).

- Files: `src/components/activities/body-metrics-view.tsx` (or new `body-metrics-about-you.tsx`).
- Acceptance: Manual verification of SC-001, SC-002, SC-003, SC-004, SC-005. Pre-fill from stored values on reload. "Last updated" note appears next to waist after saving a waist value.
- Blocked-by: T015.

### T017 [CODE], feedback section

- Action: Add the feedback section below the "About you" card. Extract as a separate component `src/components/activities/body-metrics-feedback.tsx` (not inline in `body-metrics-view.tsx`, which is already 311 lines — this mirrors the split pattern of `budget-targets-panel.tsx` and `budget-buckets-panel.tsx`). Props: `profile: UserBodyProfile`, `allMetrics: BodyMetric[]`, and the four input refs from T016.

  Compute `today` inside this component (or in the parent and passed as a prop) using `new Date().toLocaleDateString('sv-SE')`, which returns an ISO `YYYY-MM-DD` string in the browser's local timezone. Pass it as the `today` parameter to `interpretWeight`. Follow the same pattern as `computeStreaks` in `habit-streaks.ts` — the client owns "today," never the server.

  The component calls the three pure functions from Phase 1 to derive interpretation results, then renders one card per metric.

  **Interpreted state** (per FR-018, FR-019, FR-020):
  - Weight card: BMI value (1 decimal), WHO category label, healthy weight range, BMI limitation note (always), averaging note if applicable, WHtR row if `waist_cm` present, European waist threshold context if `waist_cm` and `biologicalSex` both present.
  - VO2max card: latest value, percentile string (e.g. "approximately 70th percentile for a 35-year-old man"), ACSM category label, 1–2 sentence plain-language verdict. Age bracket note if clamped.
  - Resting HR card: latest value, category label, 1–2 sentence verdict. If `athleteNote: true`: sentence acknowledges this is typical for trained athletes, no alarming language. If `highHrNote: true`: append the healthcare note from SC-017.

  **Prompt state** (per US-3, FR-017):
  - Each missing-input sentence is a `<button>` or `<a>` that calls `inputRef.current?.focus()` on the relevant "About you" input when clicked.
  - Use the exact sentences from spec `US-3` scenarios 1–5.

  **Medical disclaimer** (FR-021): always rendered below all three cards, never hidden or collapsible. Copy per spec FR-021.

  Heading "Your metrics" above the three cards.

- Files: `src/components/activities/body-metrics-view.tsx` (or new `body-metrics-feedback.tsx`).
- Acceptance: Manual smoke per `plan.md` section 4.2.3. Specifically:
  - SC-007: height 170 cm, weight 73 kg → BMI 25.3, "Overweight", correct healthy range, BMI note, averaging note.
  - SC-008: 7-day weight average → correct BMI, no averaging note.
  - SC-009: height 175 cm, waist 82 cm → WHtR 0.47 "Healthy"; update to 90 cm → 0.51 "Elevated central adiposity".
  - SC-010: waist 90 cm, sex male → European 94 cm threshold note visible.
  - SC-017: resting HR card with `athleteNote` contains no alarming language.
  - SC-018: height present, sex absent → VO2max card in prompt state with correct sentence.
  - SC-019: clicking the prompt link focuses the biological sex select.
  - SC-020: medical disclaimer visible when all cards are in prompt state.
- Blocked-by: T016.

### T018 [GATES], Phase 2 verification gates

- Action: Run all four gates from `plan.md` section 2.
- Files: none.
- Acceptance: All gates pass. Zero new lint issues or `tsc` errors vs master.
- Blocked-by: T017.

### T019 [VERIFY], full manual smoke for Phase 2

- Action: Run through every SC in `spec.md` that is testable at this point (SC-001 through SC-021). Key checks:
  - SC-001: empty profile + no metrics → three prompt-state cards, no console errors.
  - SC-002 through SC-006: API validation (can be verified via browser Network tab while using the Save button).
  - SC-007 through SC-010: weight interpretation with various height/waist combinations.
  - SC-011 through SC-014: VO2max cards (requires logging a VO2max reading and having DOB + sex saved).
  - SC-015 through SC-017: resting HR cards.
  - SC-018, SC-019: progressive disclosure and focus behaviour.
  - SC-020: disclaimer always visible.
  - SC-021: auth — confirm the Network tab shows `401` when accessing `/api/body-profile` from a logged-out browser tab.
- Files: none.
- Acceptance: Every SC passes locally. Any failure is fixed before opening the PR.
- Blocked-by: T018.

### T020 [SHIP], commit, push, open Phase 2 PR

- Action: Commit in logical groups. Suggested 5 commits:
  1. `feat(api): GET and PATCH /api/body-profile with upsert semantics (FR-003, FR-004, FR-005)`.
  2. `feat(body-metrics): parallel fetch of body-profile alongside body-metrics (FR-015)`.
  3. `feat(body-metrics): About you card with profile inputs and Save (FR-012–FR-015)`.
  4. `feat(body-metrics): feedback section with interpreted and prompt states (FR-016–FR-022)`.
  5. `feat(body-metrics): medical disclaimer always visible (FR-021)`.

  Push to `origin`. Open PR against `wvanloco-alt:master` titled `feat(body-metrics): About you inputs and interpreted metric feedback`. PR body explains the feature scope, confirms the pure library shipped in Phase 1 is the only calculation layer, and lists all SCs proven.

- Files: none (git).
- Acceptance: Phase 2 PR is open against `wvanloco-alt:master`; CI green.
- Blocked-by: T019.

---

## Phase 3: Master-docs sync

Expected PR: ~2 to 3 commits, ~100 to 150 LoC. Branches off Phase 2.

### T021 [SETUP], Phase 3 branch

- Action: After Phase 2 PR merges, pull master. Create branch `feat/body-metrics-guidance-docs` off the latest master.
- Files: none (git).
- Acceptance: Branch tip includes Phase 2's merge.
- Blocked-by: Phase 2 PR merged.

### T022 [CODE], `specs/master/data-model.md` update

- Action:
  - Add `UserBodyProfile` to the Mermaid ERD mermaid block. Relationship: `users ||--o| user_body_profiles : "has profile"`.
  - Add the entity detail table for `user_body_profiles` matching `spec.md` "Key entities" (9 columns, noting all data columns are nullable).
  - Add `userBodyProfiles` to the Tables Summary section.
- Files: `specs/master/data-model.md`.
- Acceptance: The Mermaid block renders without syntax errors. The entity table columns match `spec.md` exactly.
- Blocked-by: T021.

### T023 [CODE], `specs/master/contracts/api-routes.md` update

- Action: Add a new "Body Profile" section after the existing "Body Metrics" section:
  - `GET /api/body-profile` — response shape, default all-null behaviour when no row exists.
  - `PATCH /api/body-profile` — accepted fields, upsert semantics, validation rules and `400` error strings, `waist_cm_updated_at` behaviour.
  - Note that the interpretation logic runs client-side using `src/lib/body-metrics-guidance.ts`; there is no interpretation endpoint.
- Files: `specs/master/contracts/api-routes.md`.
- Acceptance: The new section is consistent with `spec.md` FR-003 and FR-004 exactly.
- Blocked-by: T022.

### T024 [GATES], Phase 3 verification gates

- Action:
  - `npx tsc --noEmit` — clean.
  - `npx vitest run` — all tests pass.
  - Per-file lint on changed files — no new issues.
  - `rg "body-profile" specs/master/` — returns hits in both `data-model.md` and `contracts/api-routes.md`.
- Files: none.
- Acceptance: All checks pass.
- Blocked-by: T023.

### T025 [SHIP], commit, push, open Phase 3 PR

- Action: Two commits:
  1. `docs(master): add user_body_profiles entity to data-model.md`.
  2. `docs(master): add body-profile API routes to api-routes.md`.

  Push to `origin`. Open PR against `wvanloco-alt:master` titled `docs(body-metrics): sync master documentation`. PR body includes the full SC-001 through SC-021 smoke checklist for post-deploy manual verification.

- Files: none (git).
- Acceptance: Phase 3 PR is open against `wvanloco-alt:master`; CI green.
- Blocked-by: T024.

### T026 [VERIFY], post-deploy smoke

- Action: After Phase 3 merges and the app redeploys, run through SC-001 to SC-021 on the live app. Flag any failure as a bug with the SC number.
- Files: none.
- Acceptance: Every SC passes on the deployed app.
- Blocked-by: T025 merged and deploy confirmed.

---

## Definition of done (whole feature)

- All three phase PRs merged to master.
- All 22 FRs in `spec.md` implemented.
- All 21 SCs in `spec.md` verified on the deployed app (T026).
- `specs/master/data-model.md` and `specs/master/contracts/api-routes.md` are current.
- No new `tsc` errors or lint issues compared to pre-feature master.
- A user can enter date of birth, biological sex, height, and waist, and see an interpreted verdict for each logged metric — or a calm prompt if inputs are missing — with no console warnings and a persistent medical disclaimer.
