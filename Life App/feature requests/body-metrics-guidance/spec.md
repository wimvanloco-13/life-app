# Spec: Body Metrics Guidance

**Feature ID:** `body-metrics-guidance`
**Status:** Spec. Scope confirmed 2026-06-02; spec drafted 2026-06-02.
**Depends on:** None (additive to the existing Body Metrics tab).
**Last updated:** 2026-06-02

---

## Context

Adds an interpretation layer to the existing Body Metrics tab
(`src/components/activities/body-metrics-view.tsx`). The tab currently lets the
user log Weight (kg), VO2max (ml/kg/min), and Resting HR (bpm) and view trend
charts. It gives no guidance on whether a value is good or concerning for someone
of that age and sex.

This feature adds two things, both inside the existing tab and below the current
chart:

1. An **"About you" card** — optional inputs for date of birth, biological sex,
   height, and waist circumference.
2. A **feedback section** — one card per metric, showing the category the value
   falls into, a plain-language sentence explaining why, and a gentle prompt when
   the required inputs are missing.

No new page. No new nav entry. All inputs opt-in. Full design rationale, reference
tables, and source list are in `scope.md` and `reference-data.md`.

---

## Decisions locked from scope review

| Question | Decision | Source |
|---|---|---|
| Where does guidance live? | Inside the existing Body Metrics tab, below the stats and chart. No new page or nav entry. | Scope 2026-06-02 |
| Are attribute inputs required? | No. All optional, opt-in. Partial inputs unlock partial feedback. | Scope 2026-06-02 |
| Where are attributes stored? | New `user_body_profiles` table (1:1 with users, all data columns nullable). Keeps the auth `users` table clean. | Scope 2026-06-02 |
| Is waist a tracked metric or an attribute? | Static "About you" input, stored as `waist_cm` in `user_body_profiles`. Not logged to `body_metrics`. No trend chart. Powers WHtR only. | User confirmed 2026-06-02 |
| Reference standards? | European throughout: WHO/European BMI bands (18.5 / 25.0 / 30.0 cutoffs); ESC/IDF European waist thresholds (men >94/>102 cm, women >80/>88 cm); ACSM/Cooper Institute VO2max tables; standard age/sex resting HR charts. No Asian BMI variant. | User confirmed 2026-06-02 |
| "What to do next" advice? | Removed. Feedback is interpretation only: category + plain-language reason. No advice copy, no Library links. | User confirmed 2026-06-02 |
| Which weight value is interpreted? | 7-day rolling average of the most recent weight readings (window = past 7 calendar days from today). Fewer than 7 readings in the window uses what is available with a note. | Best practice; user confirmed 2026-06-02 |
| BMI standard? | WHO/European only. No `bmi_standard` column, no toggle. | User confirmed 2026-06-02 |
| Medical disclaimer? | Always visible in the feedback section, never collapsible. | Scope 2026-06-02 |

---

## User stories

### US-1. Enter and save personal attributes

**As a** user who wants personalised metric interpretation,
**I want to** enter my date of birth, biological sex, height, and optionally waist
circumference,
**so that** the app can compare my metrics against the reference ranges that match
my profile.

#### Acceptance scenarios

1. **Given** I am on the Body Metrics tab with no profile saved, **when** I scroll
   below the chart, **then** I see an "About you" card with four inputs (date of
   birth, biological sex, height, waist circumference), all empty, with a single
   "Save" button.
2. **Given** I fill in date of birth and height and leave sex and waist empty,
   **when** I click "Save," **then** `PATCH /api/body-profile` is called, the
   values persist on a page reload, and the feedback section shows weight
   interpretation (height is present) but prompts for sex before interpreting
   VO2max and resting HR.
3. **Given** a profile already exists, **when** I open the Body Metrics tab,
   **then** the "About you" card is pre-populated with the stored values.
4. **Given** I update my height and click "Save," **then** the new value persists
   and the Weight feedback card immediately recalculates using the updated height.
5. **Given** I enter a date of birth in the future, **when** I click "Save,"
   **then** the form shows an inline error "Date of birth cannot be in the future"
   and no request is sent.
6. **Given** I enter a height of 0 or a negative number, **when** I click "Save,"
   **then** the form shows "Height must be a positive number" and no request is sent.
7. **Given** I enter a waist of 0 or a negative number, **when** I click "Save,"
   **then** the form shows "Waist must be a positive number" and no request is sent.
8. **Given** I enter a biological sex value other than Male or Female via the
   select, **when** the server receives the request, **then** it returns
   `400 { error: "Biological sex must be 'male' or 'female'" }`.

### US-2. See interpreted feedback for each metric

**As a** user who has logged at least one metric and provided the relevant profile
attributes,
**I want to** see the category my value falls into and understand why,
**so that** the number means something to me.

#### Acceptance scenarios

1. **Given** I have logged weight entries and have height saved, **when** I view
   the feedback section, **then** the Weight card shows: the BMI value (computed
   from the 7-day rolling average), the WHO BMI category label (e.g. "Healthy
   weight"), the healthy weight range for my height (e.g. "53 – 72 kg for 170
   cm"), a calm note about BMI's muscle blind spot, and an averaging note if fewer
   than 7 readings were used.
2. **Given** I have height and waist_cm both present in my profile and have logged
   weight, **when** I view the Weight card, **then** a WHtR row also appears
   showing the ratio value, the category ("Healthy" for WHtR < 0.5, "Elevated
   central adiposity" for WHtR ≥ 0.5), and a plain-language sentence.
3. **Given** I have waist_cm and biological sex both present, **when** I view the
   Weight card, **then** a waist category verdict is shown: "Within healthy range,"
   "Elevated risk," or "High risk" — derived from the two-tier ESC/IDF thresholds
   (94/102 cm for men, 80/88 cm for women).
4. **Given** I have logged VO2max and have date of birth and biological sex saved,
   **when** I view the VO2max card, **then** it shows: the latest logged value,
   the estimated percentile for my age and sex group, the ACSM category label
   (Poor / Fair / Average / Good / Excellent / Superior), and a plain-language
   sentence explaining the verdict.
5. **Given** I have logged resting HR and have date of birth and biological sex
   saved, **when** I view the Resting HR card, **then** it shows: the latest
   logged value, the category from the age/sex chart (Athlete / Excellent / Good /
   Above average / Average / Below average / Poor), and a plain-language sentence.
6. **Given** my resting HR puts me in the "Athlete" category, **when** I view the
   card, **then** the sentence acknowledges this is typical for trained athletes
   rather than framing a low heart rate as a concern.
7. **Given** my resting HR is above 85 bpm, **when** I view the card, **then** a
   note is appended: "A persistently high resting heart rate with symptoms warrants
   a check with a healthcare professional."
8. **Given** my age is outside the standard reference range (e.g. 82 years),
   **when** I view the VO2max or Resting HR card, **then** the card notes which
   age bracket was used: "This comparison uses the closest available age group
   (70–79)."

### US-3. Progressive disclosure when inputs are missing

**As a** user who has only partially filled in "About you,"
**I want to** see useful feedback for what I can interpret and a gentle prompt for
the rest,
**so that** an incomplete profile does not produce blank or broken cards.

#### Acceptance scenarios

1. **Given** I have logged weight but have no height saved, **when** I view the
   feedback section, **then** the Weight card shows: "Add your height in About you
   to see whether your weight is in a healthy range." Clicking or tapping the
   prompt focuses the height input in the "About you" card.
2. **Given** I have logged VO2max but have no date of birth or biological sex,
   **then** the VO2max card shows: "Add your date of birth and biological sex in
   About you to see how your VO2max compares."
3. **Given** I have logged VO2max and have date of birth but not biological sex,
   **then** the VO2max card shows: "Add your biological sex in About you to see how
   your VO2max compares."
4. **Given** I have no weight logged, **when** I view the feedback section,
   **then** the Weight card shows: "Log a weight measurement above to see your
   BMI."
5. **Given** I have waist_cm in my profile but no height, **when** I view the
   Weight card, **then** the WHtR row is suppressed and the missing-input prompt
   says: "Add your height in About you to see your BMI and waist-to-height ratio."

---

## Edge cases

### E1. Age outside the standard reference range

The ACSM VO2max tables cover ages 20–79. The resting HR charts cover ages 18–65+.
If the user's derived age is outside these bounds:

- VO2max: ages < 20 bucket to 20–29; ages ≥ 80 bucket to 70–79.
- Resting HR: ages < 18 bucket to 18–25; ages ≥ 65 already covered by the 65+
  bracket.

In all clamped cases the card appends: "This comparison uses the closest available
age group (X–Y)."

### E2. Insufficient weight readings for the 7-day rolling average

**Why a rolling average rather than the most recent reading:** daily body weight
fluctuates 1–3 kg due to water retention, food, and time of day. A single reading
can misrepresent the true trend and produce a misleading BMI verdict. Averaging the
past 7 days smooths that noise without requiring the user to log at a fixed time.

**Acknowledged tension:** when fewer than 7 readings exist in the window the
fallback reintroduces some noise. This is acceptable at v1 scale — showing a
slightly noisier reading with a caveat is better than showing nothing. The BMI
limitation note (E3) already signals that the figure is a screening tool, not
a precise measurement.

The rolling window covers the past 7 calendar days from today's date:

- 7+ readings in the window: average all; no extra note.
- 1–6 readings in the window: average those available; note "Based on your last
  N readings."
- 0 readings in the window but older readings exist: use the most recent single
  reading; note "Based on your most recent logged weight."
- 0 readings ever: show the "no data" prompt (US-3 scenario 4).

### E3. BMI limitation note

The note "BMI does not distinguish muscle from fat. If you carry significant
muscle mass, this figure may overstate adiposity." is always visible in the Weight
card, regardless of the BMI category. It is not conditional on an "overweight"
verdict.

### E4. WHtR without height

If `waist_cm` is present but `height_cm` is absent, the WHtR row is suppressed.
The missing-input prompt for Weight covers this (see US-3 scenario 5).

### E5. Profile upsert

`PATCH /api/body-profile` is an upsert: creates the row on first call, updates
only the supplied fields on subsequent calls. Unsupplied fields are left unchanged.
A client can update height without touching the other fields.

### E6. Values exactly on a boundary

When a value lands exactly on a **category boundary threshold**, the upper-inclusive
convention applies: the value belongs to the higher category.

Category boundary thresholds are:

- **BMI**: 18.5, 25.0, 30.0, 35.0, 40.0 (e.g. BMI 25.0 → "Overweight" not
  "Healthy weight"; WHtR 0.5 → "Elevated central adiposity").
- **VO2max percentile**: 20th, 40th, 60th, 80th, 95th (e.g. computed percentile
  exactly = 60 → "Good" not "Average").
- **Resting HR**: the lower bound of each category range (e.g. a value that sits
  exactly on the boundary between "Good" and "Above average" belongs to "Good").

**Important distinction:** the 5th, 10th, 25th, 50th, 75th, 90th, and 95th values
in the Cooper/ACSM reference tables are **data breakpoints used for interpolation**,
not category boundaries. A value that interpolates to exactly the 50th percentile
lands in "Average" (40th–59th range) — E6 does not change that. E6 only applies
when the *computed percentile* equals a category edge (20, 40, 60, 80, 95).

### E7. VO2max percentile interpolation at the extremes

Values below the 5th-percentile breakpoint yield < 5th percentile (reported as
"below the 5th percentile"). Values above the 95th breakpoint yield > 95th
(reported as "above the 95th percentile"). Both still map to their ACSM category
(Poor and Superior respectively).

---

## Key entities

### `user_body_profiles`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK, auto-increment | |
| `user_id` | TEXT | NOT NULL, FK to `users.id`, UNIQUE | One row per user. |
| `date_of_birth` | TEXT | nullable, ISO `YYYY-MM-DD` | Age derived live at read time. |
| `biological_sex` | TEXT | nullable, `'male'` or `'female'` | Reference tables are sex-binary. |
| `height_cm` | REAL | nullable | Drives BMI and healthy-weight range. |
| `waist_cm` | REAL | nullable | Drives WHtR. Static input, not a time series. |
| `waist_cm_updated_at` | TEXT | nullable, ISO datetime | Set whenever `waist_cm` is written. Lets the UI flag a stale waist reading. |
| `created_at` | TEXT | NOT NULL, ISO datetime | |
| `updated_at` | TEXT | NOT NULL, ISO datetime | |

Migration entries (`apply-schema.js`):
1. `CREATE TABLE IF NOT EXISTS user_body_profiles (...)` — idempotent.
2. No `ALTER TABLE` statements; this is a new table only.

### Existing tables unchanged

`body_metrics`, `users`, and all API routes for body metrics are unchanged.
No new `metricType` value is added.

---

## Functional requirements

### Schema and migration

- **FR-001**: A new `user_body_profiles` table MUST be created with the columns
  and constraints above. The `CREATE TABLE IF NOT EXISTS` statement is idempotent.
  The Drizzle schema in `src/db/schema.ts` must mirror it.
- **FR-002**: A TypeScript interface `UserBodyProfile` is exported from
  `src/types/index.ts` matching the table shape. A companion type
  `UserBodyProfileInput` (all data columns optional) is used for PATCH payloads.

### API

- **FR-003**: `GET /api/body-profile` returns the authenticated user's profile row
  as JSON. If no row exists, it returns a default object with all data columns set
  to `null` (same shape as a real row). Always returns `200`.
- **FR-004**: `PATCH /api/body-profile` accepts any subset of
  `{ dateOfBirth, biologicalSex, heightCm, waistCm }` and upserts the row.
  When `waistCm` is included in the payload (even if setting it to null),
  `waist_cm_updated_at` is set to the current server timestamp.
  Server-side validation:
  - `dateOfBirth`: valid ISO `YYYY-MM-DD`, not in the future. Error:
    `"Date of birth cannot be in the future"`.
  - `biologicalSex`: must be `'male'` or `'female'`. Error:
    `"Biological sex must be 'male' or 'female'"`.
  - `heightCm`: positive real number. Error: `"Height must be a positive number"`.
  - `waistCm`: positive real number. Error: `"Waist must be a positive number"`.
  - Any validation failure returns `400` with the specific error string. Valid
    unsupplied fields are left unchanged (upsert semantics per E5). Returns `200`
    with the full updated profile row on success.
- **FR-005**: Both routes call `auth()` and return `401` if no session. All queries
  scope to `WHERE user_id = session.user.id`.

### Interpretation module

- **FR-006**: A pure module `src/lib/body-metrics-guidance.ts` exports the three
  functions below. It has no side effects, no I/O, and no dependency on Next.js.
  It is unit-testable without a server or DOM.

- **FR-007**: `interpretWeight(params)` where params is
  `{ weightReadings: { date: string; value: number }[], heightCm: number, waistCm?: number, sex?: 'male' | 'female', today: string }`.
  Computes:
  - Rolling average weight using the 7-day window from `today` per E2.
  - BMI = averaged weight (kg) / (heightCm / 100)².
  - WHO BMI category using European standard thresholds (upper-inclusive per E6):
    < 16.0 → Severe thinness; 16.0–18.4 → Underweight; 18.5–24.9 → Healthy
    weight; 25.0–29.9 → Overweight; 30.0–34.9 → Obesity class I; 35.0–39.9 →
    Obesity class II; ≥ 40.0 → Obesity class III.
  - Healthy weight range: min = 18.5 × (h/100)², max = 24.9 × (h/100)², both
    rounded to 1 decimal place (h = heightCm).
  - If `waistCm` is supplied: WHtR = waistCm / heightCm (rounded to 2 decimal
    places); category: "Healthy" (< 0.5) or "Elevated central adiposity" (≥ 0.5).
  - If `waistCm` and `sex` are both supplied: derive a `waistCategory` using the
    two-tier ESC/IDF thresholds from `reference-data.md`. Three possible values:
    - `"Within healthy range"` — below the elevated-risk threshold (< 94 cm men /
      < 80 cm women).
    - `"Elevated risk"` — at or above the elevated-risk threshold but below the
      high-risk threshold (94–101 cm men / 80–87 cm women). Upper-inclusive.
    - `"High risk"` — at or above the high-risk threshold (≥ 102 cm men /
      ≥ 88 cm women). Upper-inclusive.
  - Returns `{ bmi, bmiCategory, healthyRangeMin, healthyRangeMax, readingsUsed, averagingNote?, whr?, whrCategory?, waistCategory? }`.

- **FR-008**: `interpretVo2max(value: number, ageYears: number, sex: 'male' | 'female'): Vo2maxInterpretation` computes:
  - Age bracket: nearest ACSM bracket (20–29, 30–39, 40–49, 50–59, 60–69, 70–79).
    Ages < 20 clamp to 20–29; ages ≥ 80 clamp to 70–79. Returns `ageBracketNote`
    if clamped.
  - Percentile: linear interpolation between the 7 breakpoints (5th, 10th, 25th,
    50th, 75th, 90th, 95th) from the tables in `reference-data.md`. Values below
    the 5th breakpoint → below 5th percentile; values above the 95th breakpoint →
    above 95th percentile.
  - ACSM category from percentile (upper-inclusive per E6): Poor (< 20th), Fair
    (20th–39th), Average (40th–59th), Good (60th–79th), Excellent (80th–94th),
    Superior (≥ 95th).
  - Returns `{ percentile, category, ageBracket, ageBracketNote? }`.

- **FR-009**: `interpretRestingHr(value: number, ageYears: number, sex: 'male' | 'female'): RestingHrInterpretation` computes:
  - Age bracket from the resting HR tables in `reference-data.md` (18–25, 26–35,
    36–45, 46–55, 56–65, 65+). Ages < 18 bucket to 18–25.
  - Category (Athlete / Excellent / Good / Above average / Average / Below average
    / Poor) for the value within the bracket. Upper-inclusive per E6.
  - `athleteNote: true` when category is "Athlete".
  - `highHrNote: true` when value > 85.
  - Returns `{ category, ageBracket, athleteNote, highHrNote }`.

- **FR-010**: All three functions apply the upper-inclusive boundary convention
  consistently (E6). A value exactly equal to a threshold belongs to the higher
  category.

- **FR-011**: All three functions are unit-tested in
  `src/lib/__tests__/body-metrics-guidance.test.ts`. Tests must cover:
  - At least two known anchor values per function (one male, one female), verified
    against the tables in `reference-data.md`.
  - Boundary: value exactly on a threshold (BMI 25.0, WHtR 0.5, a VO2max exactly
    matching a percentile breakpoint).
  - Age clamping: ageYears = 19 and ageYears = 80 for both VO2max and resting HR.
  - E2 weight averaging: 0 readings in window (with older readings), 1 reading,
    7 readings, and 10 readings in the window.
  - Extreme VO2max: value below the 5th-percentile breakpoint; value above the
    95th-percentile breakpoint.
  - Resting HR athlete note and high-HR note.

### UI — "About you" card

- **FR-012**: The "About you" card renders below the existing chart in the Body
  Metrics tab. Card heading: "About you". Subtitle: "These details are optional
  and are only used to interpret your metrics on this screen."
- **FR-013**: The card contains four inputs in order:
  - **Date of birth**: HTML date input, `max` set to today's date.
  - **Biological sex**: select with placeholder "Select", options "Male" and
    "Female". Stored as `'male'` / `'female'`.
  - **Height**: number input, step 0.1, unit label "cm",
    placeholder "e.g. 175".
  - **Waist circumference**: number input, step 0.1, unit label "cm",
    placeholder "e.g. 85", labelled with "(optional)". When `waist_cm_updated_at`
    is present in the profile, a small muted line is rendered below the input:
    "Last updated [date in DD MMM YYYY format]." This flags staleness — waist
    does not update automatically and a reading from 6 months ago may no longer
    be accurate.
- **FR-014**: A single "Save" button sends `PATCH /api/body-profile` with all four
  field values (sending `null` for fields left empty). On `200`, the feedback
  section re-renders with the updated profile. On `400`, the specific error string
  from the server is displayed inline below the relevant input. On network failure,
  a generic error appears below the Save button.
- **FR-015**: On page load, `GET /api/body-profile` is called in parallel with
  `GET /api/body-metrics`. While loading, the four inputs are replaced by skeleton
  placeholders matching their layout. The card is pre-filled with the stored values
  on load.

### UI — Feedback section

- **FR-016**: The feedback section renders below the "About you" card under the
  heading "Your metrics". It always shows all three metric cards (Weight, VO2max,
  Resting HR), regardless of whether data or profile inputs exist. Each card
  occupies one of two states: interpreted or prompt.
- **FR-017**: A metric card is in **interpreted** state when both a logged value
  and the required profile inputs for that metric are present. It is in **prompt**
  state otherwise. The prompt state never shows an error; it shows a single calm
  sentence (per US-3) with a focusable link to the relevant "About you" input.
- **FR-018**: The Weight card in interpreted state shows:
  - BMI value (one decimal place) and WHO category label.
  - Healthy weight range: "Healthy weight range for [height] cm: [min] – [max] kg."
  - BMI limitation note (always shown, per E3).
  - Averaging note from FR-007 if applicable.
  - WHtR row (if `waist_cm` present): ratio and category.
  - Waist category verdict (if `waist_cm` and sex both present): one of "Within
    healthy range," "Elevated risk," or "High risk," derived from the two-tier
    ESC/IDF thresholds in `reference-data.md`.
- **FR-019**: The VO2max card in interpreted state shows: the latest logged value,
  the percentile (e.g. "approximately 70th percentile for a 35-year-old man"), the
  ACSM category label, and a 1–2 sentence plain-language verdict. If the age was
  clamped, the bracket note is shown.
- **FR-020**: The Resting HR card in interpreted state shows: the latest logged
  value, the category label, and a 1–2 sentence plain-language verdict. If
  `athleteNote` is true, the sentence acknowledges this is typical for trained
  athletes. If `highHrNote` is true, the additional note from US-2 scenario 7 is
  appended.
- **FR-021**: A persistent medical disclaimer renders below all three cards:
  "These are population reference ranges and screening tools, not a diagnosis.
  Readings outside a normal range, especially if accompanied by symptoms, warrant
  a consultation with a healthcare professional." Never hidden, never collapsible.
- **FR-022**: All user-facing copy follows the project's editorial voice: calm,
  declarative, second person, sentence-case headings, no em dashes, no source
  name-drops in body copy, no advice or "what to do next" language.

---

## Success criteria

### Setup and attributes

- **SC-001**: A user with no profile and no metrics visits the Body Metrics tab.
  The "About you" card shows all four inputs empty. The feedback section shows three
  prompt-state cards. No console errors.
- **SC-002**: The user enters height 170 cm and clicks Save. `PATCH /api/body-profile`
  returns `200`. On reload, the "About you" card shows 170 cm in the height field.
- **SC-003**: `PATCH /api/body-profile` with `{ dateOfBirth: "2030-01-01" }` returns
  `400 { error: "Date of birth cannot be in the future" }`.
- **SC-004**: `PATCH /api/body-profile` with `{ biologicalSex: "other" }` returns
  `400 { error: "Biological sex must be 'male' or 'female'" }`.
- **SC-005**: `PATCH /api/body-profile` with `{ heightCm: -5 }` returns
  `400 { error: "Height must be a positive number" }`.
- **SC-006**: Two successive `PATCH /api/body-profile` calls — first
  `{ heightCm: 170 }`, then `{ dateOfBirth: "1990-05-15" }` — leave both values
  persisted (upsert semantics; the second call does not nullify height).

### Weight interpretation

- **SC-007**: A user with height 170 cm logs a single weight of 73 kg today.
  The Weight card shows BMI 25.3 ("Overweight"), healthy range "53.5 – 72.0 kg for
  170 cm," the BMI limitation note, and the averaging note "Based on your most
  recent logged weight." (One reading, within the 7-day window.)
- **SC-008**: The same user logs weight readings of 72.0, 73.0, 74.0, 73.0, 72.5,
  71.5, 73.5 on seven consecutive days ending today. The Weight card computes the
  average (≈ 72.8 kg) and shows BMI 25.2. No averaging note (7 readings, window
  met). A new reading tomorrow of 68 kg does not retroactively change the BMI shown
  today.
- **SC-009**: A user with height 175 cm and waist 82 cm sees WHtR 0.47 and
  category "Healthy." Updating waist to 90 cm shows WHtR 0.51 and "Elevated central
  adiposity."
- **SC-010**: Waist category verdicts for a male user (ESC/IDF thresholds: elevated
  ≥ 94 cm, high risk ≥ 102 cm):
  - Waist 90 cm → "Within healthy range" (below 94 cm).
  - Waist 96 cm → "Elevated risk" (94–101 cm band).
  - Waist 103 cm → "High risk" (≥ 102 cm).

### VO2max interpretation

- **SC-011**: `interpretVo2max(42.4, 35, 'male')` returns `category: 'Average'`
  and `percentile: 50` (exactly the 50th-percentile breakpoint in the 30–39 male
  bracket from `reference-data.md`).
- **SC-012**: `interpretVo2max(56.5, 35, 'male')` returns `category: 'Excellent'`
  (90th percentile in the 30–39 male bracket).
- **SC-013**: `interpretVo2max(24.0, 82, 'female')` uses the 70–79 bracket (age
  clamped), returns `ageBracketNote` containing "70–79", and returns
  `category: 'Excellent'`. (In the 70–79 female bracket the 95th breakpoint is
  24.1, so 24.0 interpolates to just below the 95th percentile — within the
  Excellent range of 80th–94th.)
- **SC-014**: A VO2max reading of 60 ml/kg/min for a 35-year-old woman is shown with
  a percentile and category matching the tables in `reference-data.md` (30–39
  female bracket: 95th = 45.8; 60 is above 95th → "Superior," reported as "above
  the 95th percentile").

### Resting HR interpretation

- **SC-015**: `interpretRestingHr(49, 30, 'male')` returns `category: 'Athlete'`
  and `athleteNote: true` (30-year-old male, 49 bpm is within the 26–35 Athlete
  range 49–54 from `reference-data.md`).
- **SC-016**: `interpretRestingHr(90, 40, 'female')` returns `category: 'Poor'`
  and `highHrNote: true`.
- **SC-017**: The Resting HR card for a user with `athleteNote: true` does not
  contain alarming language. The sentence acknowledges the value is typical for
  trained athletes.

### Progressive disclosure

- **SC-018**: A user with height but no biological sex sees the VO2max card in
  prompt state with the correct missing-input sentence, not an error.
- **SC-019**: Clicking the prompt link in the VO2max card moves focus to the
  "Biological sex" select in the "About you" card.

### Disclaimer

- **SC-020**: The medical disclaimer is visible at the bottom of the feedback
  section regardless of whether the cards are in interpreted or prompt state. It is
  not collapsible.

### Auth

- **SC-021**: `GET /api/body-profile` without a valid session returns `401`.
  A direct `PATCH /api/body-profile` from user A with user B's `user_id` in the
  body cannot modify user B's profile: the route always uses `session.user.id`,
  ignoring any `userId` supplied in the request body.

---

## Out of scope, restated

- A separate profile or settings page.
- Required onboarding or forced attribute collection.
- Imperial units.
- Additional metrics (blood pressure, body fat %, HRV, blood markers).
- Trend-based coaching or change detection across readings.
- "What to do next" advice copy.
- Library topic links from feedback cards.
- Goal integration from a metric verdict.
- Notifications or reminders.
- Clinical risk scoring.
- Asian BMI criteria or non-European waist thresholds.
- Waist as a tracked time-series metric with its own chart.

---

## Notes for the implementer

- The three interpretation functions are pure and belong in `src/lib/`. No DOM,
  no fetch, no server dependency. Write the tests first — the medical tables are
  the load-bearing part and must be verified against `reference-data.md` before any
  UI work begins.
- `today` is passed as a parameter to `interpretWeight` (ISO `YYYY-MM-DD` from the
  client). This keeps the function testable and consistent with the "client owns
  today" pattern already established in the codebase (see `habit-streaks.ts`).
  The server does not validate `today`; a user who supplies a past date shifts the
  rolling window but only affects their own view. This is a deliberate, conscious
  trade-off for the single-user trust model of this app — no server-side
  sanitisation is required.
- The `GET /api/body-profile` and `GET /api/body-metrics` calls can be fired in
  parallel on page load with `Promise.all`, consistent with the existing pattern in
  the codebase.
- The "About you" card uses a single Save button for all four fields together, not
  inline auto-save per field. This is simpler and avoids partial-save ambiguity.
- The feedback section receives both the profile and the body metrics as props and
  calls the pure interpretation functions client-side. There is no dedicated
  "interpretation" API endpoint; the logic runs in the browser from the two data
  sources already fetched.
- The BMI limitation note and the medical disclaimer are always rendered regardless
  of the user's BMI or any other metric. Do not make them conditional.
