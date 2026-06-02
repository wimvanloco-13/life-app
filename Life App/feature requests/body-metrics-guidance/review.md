# Review: Body Metrics Guidance — plan.md and tasks.md

**Reviewer:** Agent
**Date:** 2026-06-02
**Documents reviewed:** `plan.md`, `tasks.md` (cross-referenced against `spec.md`, `scope.md`, `reference-data.md`, and the existing codebase)

---

## Overall verdict

The plan and tasks are well-structured and largely faithful to the spec. The
three-phase split is the right call — proving the medical tables in tests before
any UI ships is good risk management. The execution order (tests first → library
second) is correct TDD.

That said, there are **two issues that must be fixed before implementation starts**,
two important gaps that will cause a developer to get stuck or ship wrong values,
and several minor points worth tidying up.

---

## Critical (fix before any code is written)

### C1. `reference-data.md` is missing the elevated-risk waist thresholds

The spec's decisions table and FR-007 both cite **two-tier ESC/IDF European waist
thresholds**: elevated risk at >94 cm (men) / >80 cm (women) and high risk at
>102 cm (men) / >88 cm (women).

`reference-data.md` section 2 only documents **one** threshold per sex for
White/European:

> White/European: **> 102 cm (men), > 88 cm (women)**

The 94 cm and 80 cm elevated-risk thresholds are entirely absent from the
project's source-of-truth document. The plan's T008 instructs the implementer to
"transcribe from `reference-data.md`" — but the elevated thresholds they need to
implement are not there to transcribe. They will either guess or silently omit
them.

**Fix:** Add the two-tier ESC/IDF table to `reference-data.md` section 2 with a
proper source citation. The IDF/ESC European criteria are:

| Sex | Elevated risk | High risk |
|---|---|---|
| Men | ≥ 94 cm | ≥ 102 cm |
| Women | ≥ 80 cm | ≥ 88 cm |

Source to add: ESC/EAS Guidelines for the Management of Dyslipidaemias (2019);
IDF consensus definition of the metabolic syndrome (2006).

---

### C2. `absoluteWaistContext` return-value semantics are contradictory between spec and plan

The spec (FR-018) describes the context note as:

> "European guidelines flag elevated risk above [sex-specific threshold] cm."

This implies a **single static reference string** showing the elevated-risk
threshold as educational context, regardless of the user's actual waist value.
SC-010 confirms this: a user with waist 90 cm (below the 94 cm threshold) still
sees "European guidelines flag elevated risk above 94 cm for men."

But the plan's T007 test cases imply the string **changes** based on whether
the user exceeds a threshold:
- Waist 90 cm, male → "mentions 94 cm elevated threshold"
- Waist 103 cm, male → "mentions 102 cm high-risk threshold" ← different message

These two behaviours are not the same function. The spec describes static
educational copy; the plan describes a status-based message that switches at 102
cm. Neither document resolves what happens at waist 97 cm (above elevated, below
high risk).

**Fix:** Decide now and lock it in the spec before T007 is written:

| Option | Behaviour |
|---|---|
| A (static) | Always show "European guidelines flag elevated risk above [elevated threshold] cm for [sex]." One string, always shown when sex + waist are present. Simple, educational. |
| B (status) | Show a category-based verdict: "Within healthy range," "Elevated risk (above 94 cm)," or "High risk (above 102 cm)." Three strings; one per band. More informative, aligns with how BMI and VO2max work. |

Option B is more consistent with the rest of the feature and is recommended.
Whichever is chosen, the spec FR-018 and FR-007 return type must be updated to
match, and T007 test cases must cover all three bands for both sexes.

---

## Important (will cause gaps or wrong values if not fixed)

### I1. T007 has no test case for female waist thresholds

Every `absoluteWaistContext` test case in T007 uses `sex: 'male'`. There is no
test for `sex: 'female'`. The female ESC/IDF thresholds (elevated ≥80 cm, high
risk ≥88 cm) could be hardcoded wrong in the implementation and every existing
test would still pass.

**Fix:** Add at minimum two female test cases:
- Waist 75 cm, female → within healthy range (below 80 cm elevated threshold)
- Waist 83 cm, female → elevated risk band (80–88 cm)
- Waist 92 cm, female → high risk band (above 88 cm)

---

### I2. T007 RHR test case 4 does not assert the expected category

> `(55, 70, 'male')` → uses 65+ bracket.

The test only checks that the 65+ bracket is selected. It does not assert the
category or the `athleteNote` flag. From `reference-data.md`, men 65+: Athlete =
50–55. A value of 55 bpm falls within that range → `category: 'Athlete'`,
`athleteNote: true`. A bug in the boundary logic (e.g., treating 55 as the
lower bound of Excellent instead of the upper bound of Athlete) would pass this
test without catching the error.

**Fix:** Change the test to assert:
```
(55, 70, 'male') → { category: 'Athlete', athleteNote: true, ageBracket: '65+' }
```

---

### I3. `today` parameter wiring not described in T015 or T017

The spec FR-007 requires `today: string` (ISO `YYYY-MM-DD`) as a parameter to
`interpretWeight`. The spec notes state: "follows the 'client owns today' pattern
from `habit-streaks.ts`." Neither T015 (parallel fetch wiring) nor T017 (feedback
section) mentions how `today` is obtained and passed. A developer could reasonably
use `new Date().toISOString().slice(0, 10)` or use a server-provided date, and the
latter breaks the pattern.

**Fix:** Add one line to T017: "Compute `today` from `new Date()` in the browser's
local timezone, formatted as ISO `YYYY-MM-DD`, following the same pattern as
`computeStreaks` in `habit-streaks.ts`. Pass it as the `today` parameter to
`interpretWeight`."

---

## Minor

### M1. T007 VO2max test case 1 has a confusing E6 comment

> `(42.4, 35, 'male')` → `percentile: 50`, `category: 'Average'`
> (comment: "50th is inside 40–59 Average range; the 50th percentile data
> breakpoint is not a category edge")

The reference to E6 is unnecessary and potentially confusing. E6 (upper-inclusive)
only applies at **category boundaries** (20, 40, 60, 80, 95). The 50th-percentile
data breakpoint is not a category boundary; it sits comfortably inside Average
(40th–59th). The comment creates doubt where there is none.

**Fix:** Simplify to: "50th percentile is within the Average range (40th–59th).
No boundary case."

---

### M2. Stacked PR branches create a rebase burden

The plan chains phases off each other:
`master → foundation → ui → docs`

If Phase 1 gets review feedback requiring changes, Phase 2 must rebase before its
PR can open. For a feature this small (one new table, two routes, one component
extension), a single PR or two independent branches off master would be simpler.
The medical-tables-first argument is valid, but the PR can still separate Phase 1
commits from Phase 2 commits without branching off each other.

This is not a blocking issue; the plan can stay as written. Just flag it if Phase 1
review takes longer than a day.

---

### M3. `BodyMetricsFeedback` component location is left ambiguous

T017 says "can be a sibling function in the same file or a separate
`body-metrics-feedback.tsx` if it grows long." This deferral will result in
different implementations depending on who runs the task. `body-metrics-view.tsx`
is already 311 lines; the feedback section will add another 100–150. Leaving it to
judgment invites an oversized file.

**Fix:** Pre-decide: extract to `body-metrics-feedback.tsx` in
`src/components/activities/`. This mirrors how other large components in the
codebase are split (e.g., `budget-dashboard.tsx`, `budget-targets-panel.tsx`,
`budget-buckets-panel.tsx`).

---

### M4. PR target `wvanloco-alt:master` should be verified

T010 and T020 specify opening PRs against `wvanloco-alt:master`. This is
presumably the correct GitHub remote name, but it does not appear anywhere in
`AGENT-ONBOARDING.md` or the codebase's git config reference. Verify with
`git remote -v` before opening any PR.

---

## Summary table

| # | Severity | Issue | Fix required before |
|---|---|---|---|
| C1 | Critical | `reference-data.md` missing elevated-risk waist thresholds (94/80 cm) | T007 is written |
| C2 | Critical | `absoluteWaistContext` string semantics contradictory between spec and plan | T007 is written |
| I1 | Important | No female waist test cases — female thresholds untested | T008 ships |
| I2 | Important | T007 RHR test 4 missing category and athleteNote assertion | T007 is written |
| I3 | Important | `today` parameter wiring not described in T015/T017 | T017 ships |
| M1 | Minor | T007 VO2max test 1 comment misleading re: E6 | T007 is written |
| M2 | Minor | Stacked branches create rebase risk | Phase 1 review |
| M3 | Minor | Feedback component location undecided | T017 starts |
| M4 | Minor | `wvanloco-alt:master` target unverified | First PR |

---

## What is solid (no action needed)

- The three-phase structure and test-first execution order are correct.
- All 22 FRs and 21 SCs are accounted for across the tasks.
- The `waist_cm_updated_at` column is correctly in both the spec and the plan.
- Every VO2max and RHR anchor test case that can be verified against
  `reference-data.md` is mathematically correct (see working below).
- The upsert semantics (spec E5 + T013 step 5) and graceful degradation on
  body-profile fetch failure (T015) are handled correctly.
- The TDD order (T007 writes tests to fail → T008 implements to pass) is right and
  the "expected state at this task boundary" note in T007's acceptance is a good
  safeguard.
- The migration idempotency check (T004) is thorough.

---

## Reference table spot-checks (verified against `reference-data.md`)

| Test case | Bracket | Lookup | Result | Correct? |
|---|---|---|---|---|
| VO2max 42.4, age 35, male | 30–39 | 50th = 42.4 → exactly 50th pct | Average (40–59th) | ✓ |
| VO2max 56.5, age 35, male | 30–39 | 90th = 56.5 → exactly 90th pct | Excellent (80–94th) | ✓ |
| VO2max 30.2, age 35, male | 30–39 | 10th = 30.2 → exactly 10th pct | Poor (< 20th) | ✓ |
| VO2max 37.6, age 25, female | 20–29 | 50th = 37.6 → exactly 50th pct | Average (40–59th) | ✓ |
| VO2max 24.0, age 82, female | 70–79 (clamped) | Between 90th (23.1) and 95th (24.1) → ~94.5th pct | Excellent (80–94th) | ✓ |
| RHR 49, age 30, male | 26–35 | Athlete = 49–54; 49 is in range | Athlete | ✓ |
| RHR 68, age 30, male | 26–35 | Above avg = 66–70; 68 is in range | Above average | ✓ |
| RHR 90, age 40, female | 36–45 | Poor = 85+; 90 > 85 | Poor, highHrNote | ✓ |
| RHR 55, age 15, female | 18–25 (clamped) | Athlete = 54–60; 55 is in range | Athlete | ✓ |
| RHR 55, age 70, male | 65+ | Athlete = 50–55; 55 is in range | **Athlete** (not asserted in test) | gap |
