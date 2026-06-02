# Scope: Body Metrics Guidance

**Feature ID:** `body-metrics-guidance`
**Priority:** Medium. Real, not urgent. Builds directly on the existing Body Metrics tab.
**Status:** Scoping. Product framing confirmed with user 2026-06-02.
**Last updated:** 2026-06-02

---

## Constitutional note

This `scope.md` is permitted during the Specify phase because scoping touches no
code. Implementation respects the "one feature at a time" rule and waits for the
current queue to clear. Reference data for this feature is collected in
`reference-data.md` in this same folder.

---

## Problem statement

The Body Metrics tab (`src/components/activities/body-metrics-view.tsx`) lets the
user log three metrics (Weight in kg, VO2max in ml/kg/min, Resting HR in bpm),
and shows the latest value, a trend arrow, and a line chart. It gives **no
interpretation**. A user who logs `VO2max 40` or `Resting HR 44` has no idea
whether that is excellent, average, or worth a doctor visit, and no sense of what
to do next.

The raw number is the least useful part. The value is in the answer to "is this
good for someone like me, and what should I do about it." That answer requires
two things the app does not have today:

1. **Reference data** (collected in `reference-data.md`).
2. **A few user attributes** the reference tables key off. The `users` table
   (`src/db/schema.ts`) stores only `username`, `passwordHash`, `role`,
   `isActive`, `createdAt`. There is no age, sex, or height.

## What each metric needs to be interpreted

| Metric | Required inputs | Reference basis |
|---|---|---|
| Weight | height (age/sex add nuance) | BMI bands (WHO/CDC); optional waist-to-height ratio |
| VO2max | age + biological sex | Cooper Institute / ACSM percentile tables, 6 fitness categories |
| Resting HR | age + biological sex | age/sex category charts (athlete to poor) + clinical 60 to 100 bpm |

---

## Goal

Keep everything inside the existing Body Metrics tab. Below the current
statistics, add:

1. An **"About you" entry section** with optional inputs (date of birth,
   biological sex, height, and optionally waist). The user fills in only what
   they want.
2. A **feedback section** that interprets each logged metric against the
   reference data, shows where the user falls (category plus a plain-language
   read), and offers a short "what to do next" note.

Feedback reveals **progressively**: a metric is interpreted only once the inputs
it depends on are present. Missing inputs produce a gentle prompt rather than a
blank or an error.

That is the entire v1 surface area. No new page, no new nav entry.

---

## What we're building (v1)

### Schema

A single new table, one row per user, all attribute columns nullable so the
feature is entirely opt-in. Weight, VO2max and resting HR already live in the
existing `body_metrics` table and are untouched.

**`user_body_profiles`** (1:1 with users):

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK | autoincrement |
| `user_id` | text, FK to users, unique | auth scope, per constitution |
| `date_of_birth` | text (YYYY-MM-DD), nullable | store DOB, derive age live so it never goes stale |
| `biological_sex` | text, nullable | `male` or `female` (the reference tables are split this way) |
| `height_cm` | real, nullable | drives BMI and healthy-weight range |
| `waist_cm` | real, nullable | drives WHtR; static input, not a time series (see decision below) |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

No `bmi_standard` column. European/WHO standard thresholds only (decided 2026-06-02).

**Waist circumference** is a nullable column in `user_body_profiles`, entered in
the "About you" card as a static input. It is not logged to `body_metrics` and has
no trend chart. It feeds the waist-to-height ratio calculation only.

> `user_body_profiles` as a separate table confirmed (decided 2026-06-02).
> Keeps the auth `users` table clean.

### API

| Endpoint | Purpose |
|---|---|
| `GET /api/body-profile` | Returns the current user's profile row (or an empty/default shape if none). |
| `PATCH /api/body-profile` | Upserts any subset of `{dateOfBirth, biologicalSex, heightCm, waistCm}`. All fields optional. |

No changes to the `body_metrics` routes. The API currently accepts any `metricType`
string with no validation allowlist; `waist` is not added to either the API or the
client `METRIC_CONFIG` array, as waist is now an "About you" input only (see above).
Interpretation is computed in a small pure server-side module (see below). All routes
scoped by `userId` from `auth()`, same pattern as existing routes.

### Interpretation logic

A pure, unit-tested module (e.g. `src/lib/body-metrics-guidance.ts`) holding the
reference tables from `reference-data.md` and functions like:

- `interpretWeight(weightKg, heightCm, opts)` → BMI value, BMI band, healthy
  weight range for the height, and (if waist present) WHtR.
- `interpretVo2max(value, age, sex)` → percentile (linear interpolation between
  breakpoints) and ACSM category.
- `interpretRestingHr(value, age, sex)` → category from the age/sex chart.

Pure functions keep the medical tables in one auditable place and make edge cases
(age outside 20 to 79, missing inputs) explicit and testable.

### UI (all within the Body Metrics tab, below the existing stats + chart)

**"About you" entry section** (a card):

- Heading and one calm line of context: these details are optional and only used
  to interpret your metrics on this screen.
- Inputs: Date of birth (date), Biological sex (select: male / female), Height
  (number, cm), optional Waist (number, cm).
- Saves via `PATCH /api/body-profile`. No blocking, no required fields.

**Feedback section** (a card or a row of cards, one per metric):

- For each metric with sufficient inputs: show the value, its **category**
  (e.g. VO2max "Good, approximately 72nd percentile for a 35-year-old man"), and
  a 1–2 sentence plain-language explanation of why the app assigns that category.
  No "what to do next" advice. No links to Library topics.
- For each metric **missing** inputs: a gentle inline prompt, e.g. "Add your
  height in About you to see whether your weight is in a healthy range," with the
  field focused on click.
- A persistent, quiet **medical disclaimer**: these are population reference
  ranges and screening tools, not a diagnosis; unusual readings with symptoms
  warrant a healthcare professional.

**Editorial voice rules** (same as the rest of the repo): calm, declarative,
second person, sentence-case headings, no em dashes, no superlatives, no source
name-drops in the body copy. Sources stay in `reference-data.md`.

---

## What we're keeping

- The existing Weight / VO2max / Resting HR logging, stat cards, trend arrows and
  line chart are untouched. Guidance is additive, below them.
- The `body_metrics` table and its routes keep their shape, gaining only the new
  `waist` metric type.
- No new top-level page, no new nav entry.

---

## What we're NOT building (now)

- **A separate profile / settings page.** Inputs live in the Body Metrics tab.
- **Required onboarding for attributes.** Everything is opt-in.
- **Imperial units (lb, ft/in).** Metric only in v1. Revisit if requested.
- **More metrics** (blood pressure, body fat %, HRV, blood markers). Out of scope.
- **Trend-based coaching** ("your VO2max dropped 3 points, here is a plan").
  v1 interprets the latest value only (using a 7-day rolling average for weight).
- **"What to do next" advice copy.** Feedback is interpretation-only. Decided 2026-06-02.
- **Library topic links from feedback cards.** Decided 2026-06-02.
- **Goal integration** (auto-creating a goal from a metric verdict). Separate scope.
- **Notifications / reminders.** No notification infrastructure exists.
- **Clinical-grade thresholds or risk scoring.** Screening-level reference ranges
  only, with a disclaimer.
- **Non-European / region-specific norms** (Asian BMI criteria, US-specific
  waist thresholds). European/WHO standards only. Decided 2026-06-02.
- **Waist as a time-series metric.** Waist is a static "About you" input only.
  Decided 2026-06-02.

---

## Decisions made

| Question | Decision | Date |
|---|---|---|
| Where does guidance live? | **Inside the Body Metrics tab**, below the stats. No new page or nav entry. | 2026-06-02 |
| Are attribute inputs required? | **No. All optional**, opt-in. | 2026-06-02 |
| Minimum inputs to give feedback? | **Age + sex + height.** Age+sex unlock VO2max and resting HR; height unlocks weight/BMI. | 2026-06-02 |
| Store age or DOB? | **DOB**, derive age live so it stays correct. | 2026-06-02 |
| Where to store attributes? | **New `user_body_profiles` table** (1:1, nullable columns). Keeps the auth `users` table clean. | 2026-06-02 |
| How to handle waist? | **Static "About you" input** stored as `waist_cm` in `user_body_profiles`. Not a time-series metric. Powers WHtR only. | 2026-06-02 |
| Reference standard for VO2max? | **Cooper Institute / ACSM 11th ed.** percentiles + 6 categories. | 2026-06-02 |
| Reference standard for resting HR? | **Age/sex category charts** plus clinical 60 to 100 bpm context. | 2026-06-02 |
| Reference standard for weight / BMI? | **WHO/European standard BMI bands** (18.5 / 25.0 / 30.0 cutoffs). Waist absolute thresholds use **ESC/IDF European criteria** (men > 94 / > 102 cm; women > 80 / > 88 cm). No Asian-criteria toggle. | 2026-06-02 |
| Feedback when inputs missing? | **Gentle inline prompt**, never an error or blank. | 2026-06-02 |
| Units? | **Metric only** in v1. | 2026-06-02 |
| Medical disclaimer? | **Always visible** in the feedback section. | 2026-06-02 |
| "What to do next" advice copy? | **Removed.** Feedback is interpretation-only: category + why. No advice, no Library links. | 2026-06-02 |
| BMI standard — WHO vs Asian criteria? | **WHO/European only.** No `bmi_standard` column, no toggle. | 2026-06-02 |
| Which weight value to interpret? | **7-day rolling average** of the most recent weight readings (best practice). Fewer than 7 readings uses what is available with an explanatory note. | 2026-06-02 |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Users read app feedback as medical diagnosis. | Medium | High | Persistent disclaimer; "screening, not diagnosis" language; suppress alarming wording for low resting HR in athletes. |
| BMI flags muscular users as overweight. | Medium | Medium | State BMI's muscle blind spot inline; offer WHtR when waist is logged. |
| Reference tables drift or are transcribed wrong. | Low | High | Tables live in one pure module sourced from `reference-data.md`; unit tests assert known anchor values. |
| Age outside 20 to 79 has no exact norm. | Medium | Low | Bucket to nearest bracket and widen the caveat, per `reference-data.md`. |
| Watch-estimated VO2max treated as lab-accurate. | Medium | Low | Label estimates vs measured tests in the feedback copy. |
| Attribute inputs feel like surveillance / privacy concern. | Low | Medium | Optional, local to this screen, clearly explained, never required. |

---

## Open questions

All open questions resolved as of 2026-06-02. See Decisions made table above and `spec.md`.

---

## Out of scope (deferred)

Separate profile page, required onboarding, imperial units, additional metrics
(BP, body fat, HRV, labs), trend-based coaching, goal integration, notifications,
clinical risk scoring, and region-specific norms beyond the optional Asian BMI
toggle.

---

## Next steps

1. ~~Collect reference data.~~ Done (`reference-data.md`).
2. ~~Confirm scope direction.~~ Done 2026-06-02 (this doc).
3. ~~User reviews `scope.md`.~~ Done 2026-06-02. All decisions resolved.
4. ~~Draft `spec.md`.~~ Done 2026-06-02.
5. `plan.md`: per-area edits, schema migration, verification gates, branching.
6. `tasks.md`: sequential tasks with acceptance.
7. Implement when the queue clears.

---

## Notes

- All decisions confirmed 2026-06-02. See `spec.md` for full functional requirements.
- All reference numbers and their sources are in `reference-data.md`; the spec
  pins them into a single tested pure module so the medical tables are auditable.
