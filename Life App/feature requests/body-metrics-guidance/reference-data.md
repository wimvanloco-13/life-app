# Body Metrics Guidance — Reference Data

> **Status:** Research / source material (pre-spec)
> **Feature:** Expand the Body Metrics screen so each tracked metric tells the
> user *whether the value is good or bad for them* and *what to do next*,
> instead of just plotting the raw number over time.
> **Last updated:** 2026-06-02

---

## 1. Why this document exists

The Body Metrics tab currently tracks three metrics — **Weight (kg)**,
**VO2max (ml/kg/min)**, and **Resting HR (bpm)** — and shows the latest value, a
trend arrow, and a line chart (`src/components/activities/body-metrics-view.tsx`).
It gives **no interpretation**: a user logging `VO2max 40` or `Resting HR 44`
has no idea if that is excellent, average, or concerning, and no guidance on
what to do next.

This file collects the **authoritative reference ranges** needed to add that
interpretation layer. It is the equivalent of `budget-expansion/housel-framings.md`
for this feature: source material that the eventual `scope.md` / `spec.md` will
build on.

### Sources checked first (per the request)

- **In-app library** (`scripts/seed-library-lib.cjs`): the Running topic
  discusses VO2max conceptually ("VO2max and Its Limits", lactate threshold,
  aerobic base) and the Breathing/Tennis topics touch on heart-rate recovery,
  but **none of the library content contains normative reference tables** by
  age, sex, or height. The library is intentionally advice-style and explicitly
  avoids cited standards. **Insufficient for this feature → external sources used.**

### A critical prerequisite this research surfaced

All three "ideal" ranges depend on user attributes the app does **not** currently
store. The `users` table (`src/db/schema.ts`) has only `username`, `passwordHash`,
`role`, `isActive`, `createdAt` — **no age/date of birth, biological sex, or
height.** To personalise guidance the feature must first capture:

| Attribute | Needed for | Notes |
|---|---|---|
| **Date of birth / age** | VO2max band, Resting HR band | Age bracket drives every fitness norm. |
| **Biological sex** | VO2max band, Resting HR band | Male/female norms differ materially (VO2max ~15–20% higher in men). |
| **Height** | Weight → BMI / WHtR | Weight alone is uninterpretable without height. |
| **Waist circumference** *(optional)* | Waist-to-height ratio | Better central-adiposity signal than BMI; optional log. |

> ⚠️ **Medical disclaimer to surface in-app:** these are population reference
> ranges and screening tools, **not** diagnoses. Values outside a range (or a
> very low resting HR with symptoms like dizziness/fainting) warrant a
> healthcare professional, not just an app nudge.

---

## 2. Weight → interpreted via BMI (and better signals)

Raw weight is meaningless without height. The standard adult screening tool is
**Body Mass Index (BMI) = weight(kg) / height(m)²**. Per WHO/CDC, adult BMI
categories are **age-independent and the same for both sexes**.

### WHO / CDC adult BMI categories

| Category | BMI (kg/m²) |
|---|---|
| Severe thinness | < 16.0 |
| Underweight | 16.0 – 18.4 |
| **Healthy / normal weight** | **18.5 – 24.9** |
| Overweight | 25.0 – 29.9 |
| Obesity class I | 30.0 – 34.9 |
| Obesity class II | 35.0 – 39.9 |
| Obesity class III (morbid) | ≥ 40.0 |

**Asian-population criteria** (WHO) shift the risk thresholds lower, reflecting
earlier metabolic risk: normal 18.5–23.0, overweight 23.0–27.5, obese ≥ 27.5.
Worth offering as an optional setting.

### Healthy-weight range by height (BMI 18.5–24.9)

Derived from the BMI formula; the app should compute this live from the user's
height rather than ship a static table. Illustrative anchors:

| Height | Healthy weight range (kg) |
|---|---|
| 1.60 m | 47 – 64 kg |
| 1.70 m | 53 – 72 kg |
| 1.80 m | 60 – 81 kg |
| 1.90 m | 67 – 90 kg |

> Compute as: `min = 18.5 × h²`, `max = 24.9 × h²` (h in metres).

### Two-tier European waist thresholds (ESC/IDF)

When both `waist_cm` and `biologicalSex` are present, the feature shows a
status-based verdict derived from two risk tiers per sex:

| Sex | Elevated risk | High risk | Source |
|---|---|---|---|
| Men | ≥ 94 cm | ≥ 102 cm | IDF 2006 / ESC/EAS 2019 |
| Women | ≥ 80 cm | ≥ 88 cm | IDF 2006 / ESC/EAS 2019 |

The three bands map to these verdict labels:

| Band | Men | Women | Label |
|---|---|---|---|
| Healthy | < 94 cm | < 80 cm | "Within healthy range" |
| Elevated risk | 94–101 cm | 80–87 cm | "Elevated risk" |
| High risk | ≥ 102 cm | ≥ 88 cm | "High risk" |

Upper-inclusive convention applies at each threshold (≥ 94 → Elevated risk,
not healthy; ≥ 102 → High risk, not elevated).

**Sources:** IDF Consensus Worldwide Definition of the Metabolic Syndrome (2006);
ESC/EAS Guidelines for the Management of Dyslipidaemias (2019).

### Why BMI alone is not enough (limitations to communicate)

- Does **not** distinguish muscle from fat — flags muscular/athletic builds as
  "overweight" and misses "metabolically unhealthy normal weight" (normal BMI
  but high visceral fat).
- Does not account for age, sex, ethnicity, or fat distribution.
- Underestimates adiposity in older adults, overestimates in muscular people.

### Better / complementary signals

- **Waist-to-Height Ratio (WHtR)** — "keep your waist to less than half your
  height" → **WHtR < 0.5** is the simple healthy target. Strong, low-effort
  signal for central adiposity; largely age/sex/ethnicity independent (though a
  flat 0.5 cutoff slightly over-penalises short people / under-flags tall ones).
- **Waist circumference (absolute)** — elevated cardiometabolic risk above:
  - White/European: **> 102 cm (men), > 88 cm (women)**
  - South/East Asian: lower thresholds (**~> 90 cm men, > 80 cm women**)

**Recommendation for the feature:** interpret weight via BMI band *plus*
optional WHtR, and explicitly caveat BMI's muscle blind spot.

**Sources:** WHO Nutrition Landscape (BMI cutoffs); CDC Adult BMI Categories;
StatPearls "Physiology, Body Mass Index" (WHO/CDC/Asian criteria); StatPearls
"Secondary Causes of Obesity" (waist-circumference thresholds); Medical News
Today height/weight chart & WHtR.

---

## 3. VO2max → percentile + fitness category by age and sex

VO2max declines with age and runs ~15–20% higher in men than women (structural:
heart size, hemoglobin, lean mass). **Always compare against an age- AND
sex-matched table.** The most widely used standard is The Cooper Institute's
Aerobics Center Longitudinal Study, reproduced in **ACSM's Guidelines for
Exercise Testing and Prescription, 11th ed. (2021), Table 4.7**. All values in
ml/kg/min (treadmill maximal test).

### Men — VO2max percentiles (ml/kg/min)

| Age | 5th | 10th | 25th | 50th (median) | 75th | 90th | 95th |
|---|---|---|---|---|---|---|---|
| 20–29 | 29.0 | 32.1 | 40.1 | 48.0 | 55.2 | 61.8 | 66.3 |
| 30–39 | 27.2 | 30.2 | 35.9 | 42.4 | 49.2 | 56.5 | 59.8 |
| 40–49 | 24.2 | 26.8 | 31.9 | 37.8 | 45.0 | 52.1 | 55.6 |
| 50–59 | 20.9 | 22.8 | 27.1 | 32.6 | 39.7 | 45.6 | 50.7 |
| 60–69 | 17.4 | 19.8 | 23.7 | 28.2 | 34.5 | 40.3 | 43.0 |
| 70–79 | 16.3 | 17.1 | 20.4 | 24.4 | 30.4 | 36.6 | 39.7 |

### Women — VO2max percentiles (ml/kg/min)

| Age | 5th | 10th | 25th | 50th (median) | 75th | 90th | 95th |
|---|---|---|---|---|---|---|---|
| 20–29 | 21.7 | 23.9 | 30.5 | 37.6 | 44.7 | 51.3 | 56.0 |
| 30–39 | 19.0 | 20.9 | 25.3 | 30.2 | 36.1 | 41.4 | 45.8 |
| 40–49 | 17.0 | 18.8 | 22.1 | 26.7 | 32.4 | 38.4 | 41.7 |
| 50–59 | 16.0 | 17.3 | 19.9 | 23.4 | 27.6 | 32.0 | 35.9 |
| 60–69 | 13.4 | 14.6 | 17.2 | 20.0 | 23.8 | 27.0 | 29.4 |
| 70–79 | 13.1 | 13.6 | 15.6 | 18.3 | 20.8 | 23.1 | 24.1 |

### ACSM fitness categories (map a percentile → label)

| Category | Percentile within age+sex bracket |
|---|---|
| Poor | below 20th |
| Fair | 20th – 39th |
| Average | 40th – 59th |
| Good | 60th – 79th |
| Excellent | 80th – 94th |
| Superior | 95th and above |

**Interpretation logic for the app:** find the user's age+sex row, locate where
their value falls among the breakpoints, linearly interpolate to a percentile,
then map to a category. Quick sanity anchors (from the FRIEND registry):
VO2max **> 38** is essentially always above the "low" (<25th) group, and **> 47**
is above average for any age/sex.

> ⚠️ Norms cover ages **20–79**. Outside that, bucket to the nearest bracket
> (18–19 → 20–29; 80+ → 70–79) and widen the uncertainty caveat. Also note
> watch-estimated VO2max (Garmin/Apple) is an estimate, not a lab test.

**Sources:** ACSM Guidelines 11th ed. Table 4.7 / Cooper Institute ACLS
(via vo2maxcalculators.com men & women tables + methodology); FRIEND registry
reference standards (PMC4919021).

---

## 4. Resting HR → fitness category by age and sex

Clinically, a **normal adult resting HR is 60–100 bpm**; well-trained athletes
are often **40–60 bpm**. Lower (without symptoms) generally indicates better
cardiovascular fitness. The category charts below (age + sex) give a richer
"athlete → poor" read than the flat 60–100 band. Measure first thing in the
morning, at rest.

### Men — resting HR categories (bpm)

| Age | Athlete | Excellent | Good | Above avg | Average | Below avg | Poor |
|---|---|---|---|---|---|---|---|
| 18–25 | 49–55 | 56–61 | 62–65 | 66–69 | 70–73 | 74–81 | 82+ |
| 26–35 | 49–54 | 55–61 | 62–65 | 66–70 | 71–74 | 75–81 | 82+ |
| 36–45 | 50–56 | 57–62 | 63–66 | 67–70 | 71–75 | 76–82 | 83+ |
| 46–55 | 50–57 | 58–63 | 64–67 | 68–71 | 72–76 | 77–83 | 84+ |
| 56–65 | 51–56 | 57–61 | 62–67 | 68–71 | 72–75 | 76–81 | 82+ |
| 65+ | 50–55 | 56–61 | 62–65 | 66–69 | 70–73 | 74–79 | 80+ |

### Women — resting HR categories (bpm)

| Age | Athlete | Excellent | Good | Above avg | Average | Below avg | Poor |
|---|---|---|---|---|---|---|---|
| 18–25 | 54–60 | 61–65 | 66–69 | 70–73 | 74–78 | 79–84 | 85+ |
| 26–35 | 54–59 | 60–64 | 65–68 | 69–72 | 73–76 | 77–82 | 83+ |
| 36–45 | 54–59 | 60–64 | 65–69 | 70–73 | 74–78 | 79–84 | 85+ |
| 46–55 | 54–60 | 61–65 | 66–69 | 70–73 | 74–77 | 78–83 | 84+ |
| 56–65 | 54–59 | 60–64 | 65–68 | 69–73 | 74–77 | 78–83 | 84+ |
| 65+ | 54–59 | 60–64 | 65–68 | 69–72 | 73–76 | 77–84 | 84+ |

> Women average ~4 bpm higher than men; resting HR rises only ~1–2 bpm per
> decade. A reading below ~50 bpm in a non-athlete, or above ~85 bpm with
> symptoms, is worth a medical check rather than an app nudge.

**Sources:** etoolsage.com & changingshape.com age/sex RHR category charts;
FitnessNorms RHR percentile table; American Heart Association and CDC normal-range
guidance (60–100 bpm; athletes ~40 bpm); allfitwell.com chart.

---

## 5. "What to do next" — direction of guidance per metric

The feature should pair each interpretation with a short, actionable next step.
Draft direction (to refine in spec, and ideally cross-link to the in-app Library):

| Metric | If below target | If on target | If above target |
|---|---|---|---|
| **Weight / BMI** | If underweight: focus on adequate nutrition; rule out causes. | Maintain; watch trend + waist. | If overweight/obese: small sustainable deficit, strength + cardio, waist as the truer signal. |
| **VO2max** | Build aerobic base (80/20 rule), then add VO2max intervals once base is established → link Running library topic. | Maintain weekly aerobic volume; sprinkle intervals. | Maintain; you're already strong — protect against overtraining. |
| **Resting HR** | (Low = good if athletic & symptom-free.) | Maintain aerobic fitness, sleep, stress management. | Improve aerobic base, sleep, hydration, reduce stimulants/alcohol; recheck; see a doctor if persistently high + symptoms. |

---

## 6. Open questions for the spec

1. **Capture attributes:** add age/sex/height (and optional waist) to the user
   profile + a settings UI. Per-user (multi-user app), stored where?
2. **Units:** support metric only, or also imperial (lb/ft-in) input?
3. **BMI vs Asian-criteria toggle?** And do we show WHtR if waist is logged?
4. **Watch-estimated VO2max caveat:** label estimates vs lab tests.
5. **How prominent is the medical disclaimer**, and do we suppress alarming
   language for low resting HR in athletes?
6. **Do we localise the ranges** or ship US/WHO defaults globally?

---

## 7. Source list

- WHO — Nutrition Landscape Information System (adult BMI cutoffs):
  https://apps.who.int/nutrition/landscape/help.aspx?helpid=392
- CDC — Adult BMI Categories:
  https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
- StatPearls — Physiology, Body Mass Index (WHO/CDC/Asian criteria):
  https://www.ncbi.nlm.nih.gov/books/NBK535456/
- StatPearls — Secondary Causes of Obesity (waist-circumference thresholds):
  https://www.ncbi.nlm.nih.gov/sites/books/NBK541070/
- Medical News Today — height/weight & waist-to-height ratio:
  https://www.medicalnewstoday.com/articles/323446
- ACSM Guidelines 11th ed. / Cooper Institute VO2max norms (men, women, methodology):
  https://vo2maxcalculators.com/by-age/men/ ·
  https://vo2maxcalculators.com/by-age/women/ ·
  https://vo2maxcalculators.com/methodology/
- FRIEND registry CRF reference standards:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4919021/
- Resting HR category charts:
  https://www.etoolsage.com/Chart/Resting_Heart_Rate_Chart.asp ·
  https://www.changingshape.com/heartrate ·
  https://fitnessnorms.com/cardio/resting-heart-rate/
- American Heart Association — Target Heart Rates / normal resting HR:
  https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates
