/**
 * Body Metrics Guidance — pure interpretation library
 *
 * Three exported pure functions, no I/O, no Next.js dependencies.
 * Reference data: feature requests/body-metrics-guidance/reference-data.md
 * Spec: feature requests/body-metrics-guidance/spec.md
 */

// ─── Reference tables ────────────────────────────────────────────────────────

/** ACSM VO2max percentile breakpoints from Cooper Institute ACLS.
 *  Indexed as [bracketIndex][percentileIndex] where percentiles = 5,10,25,50,75,90,95.
 *  Source: ACSM Guidelines 11th ed. Table 4.7.
 */
const VO2MAX_PERCENTILE_KEYS = [5, 10, 25, 50, 75, 90, 95] as const;

type Vo2maxBracket = {
  label: string;
  minAge: number;
  maxAge: number;
  values: Readonly<[number, number, number, number, number, number, number]>;
};

const VO2MAX_MEN: Readonly<Vo2maxBracket[]> = [
  { label: "20–29", minAge: 20, maxAge: 29, values: [29.0, 32.1, 40.1, 48.0, 55.2, 61.8, 66.3] },
  { label: "30–39", minAge: 30, maxAge: 39, values: [27.2, 30.2, 35.9, 42.4, 49.2, 56.5, 59.8] },
  { label: "40–49", minAge: 40, maxAge: 49, values: [24.2, 26.8, 31.9, 37.8, 45.0, 52.1, 55.6] },
  { label: "50–59", minAge: 50, maxAge: 59, values: [20.9, 22.8, 27.1, 32.6, 39.7, 45.6, 50.7] },
  { label: "60–69", minAge: 60, maxAge: 69, values: [17.4, 19.8, 23.7, 28.2, 34.5, 40.3, 43.0] },
  { label: "70–79", minAge: 70, maxAge: 79, values: [16.3, 17.1, 20.4, 24.4, 30.4, 36.6, 39.7] },
];

const VO2MAX_WOMEN: Readonly<Vo2maxBracket[]> = [
  { label: "20–29", minAge: 20, maxAge: 29, values: [21.7, 23.9, 30.5, 37.6, 44.7, 51.3, 56.0] },
  { label: "30–39", minAge: 30, maxAge: 39, values: [19.0, 20.9, 25.3, 30.2, 36.1, 41.4, 45.8] },
  { label: "40–49", minAge: 40, maxAge: 49, values: [17.0, 18.8, 22.1, 26.7, 32.4, 38.4, 41.7] },
  { label: "50–59", minAge: 50, maxAge: 59, values: [16.0, 17.3, 19.9, 23.4, 27.6, 32.0, 35.9] },
  { label: "60–69", minAge: 60, maxAge: 69, values: [13.4, 14.6, 17.2, 20.0, 23.8, 27.0, 29.4] },
  { label: "70–79", minAge: 70, maxAge: 79, values: [13.1, 13.6, 15.6, 18.3, 20.8, 23.1, 24.1] },
];

/** ACSM fitness category boundaries (percentile → label). Lower-inclusive.
 *  E6: at a category boundary, assign to the UPPER category (e.g. exactly 60th → Good).
 */
const VO2MAX_CATEGORIES: { minPct: number; label: string }[] = [
  { minPct: 95, label: "Superior" },
  { minPct: 80, label: "Excellent" },
  { minPct: 60, label: "Good" },
  { minPct: 40, label: "Average" },
  { minPct: 20, label: "Fair" },
  { minPct: 0,  label: "Poor" },
];

/** Resting HR category bands — lower and upper values are INCLUSIVE.
 *  Source: reference-data.md section 4 (etoolsage / changingshape charts).
 */
type RhrBand = { label: string; min: number; max: number };
type RhrBracket = {
  label: string;
  minAge: number;
  maxAge: number;
  bands: Readonly<RhrBand[]>;
};

const RHR_MEN: Readonly<RhrBracket[]> = [
  { label: "18–25", minAge: 18, maxAge: 25, bands: [
    { label: "Athlete",       min: 49, max: 55 },
    { label: "Excellent",     min: 56, max: 61 },
    { label: "Good",          min: 62, max: 65 },
    { label: "Above average", min: 66, max: 69 },
    { label: "Average",       min: 70, max: 73 },
    { label: "Below average", min: 74, max: 81 },
    { label: "Poor",          min: 82, max: Infinity },
  ]},
  { label: "26–35", minAge: 26, maxAge: 35, bands: [
    { label: "Athlete",       min: 49, max: 54 },
    { label: "Excellent",     min: 55, max: 61 },
    { label: "Good",          min: 62, max: 65 },
    { label: "Above average", min: 66, max: 70 },
    { label: "Average",       min: 71, max: 74 },
    { label: "Below average", min: 75, max: 81 },
    { label: "Poor",          min: 82, max: Infinity },
  ]},
  { label: "36–45", minAge: 36, maxAge: 45, bands: [
    { label: "Athlete",       min: 50, max: 56 },
    { label: "Excellent",     min: 57, max: 62 },
    { label: "Good",          min: 63, max: 66 },
    { label: "Above average", min: 67, max: 70 },
    { label: "Average",       min: 71, max: 75 },
    { label: "Below average", min: 76, max: 82 },
    { label: "Poor",          min: 83, max: Infinity },
  ]},
  { label: "46–55", minAge: 46, maxAge: 55, bands: [
    { label: "Athlete",       min: 50, max: 57 },
    { label: "Excellent",     min: 58, max: 63 },
    { label: "Good",          min: 64, max: 67 },
    { label: "Above average", min: 68, max: 71 },
    { label: "Average",       min: 72, max: 76 },
    { label: "Below average", min: 77, max: 83 },
    { label: "Poor",          min: 84, max: Infinity },
  ]},
  { label: "56–65", minAge: 56, maxAge: 65, bands: [
    { label: "Athlete",       min: 51, max: 56 },
    { label: "Excellent",     min: 57, max: 61 },
    { label: "Good",          min: 62, max: 67 },
    { label: "Above average", min: 68, max: 71 },
    { label: "Average",       min: 72, max: 75 },
    { label: "Below average", min: 76, max: 81 },
    { label: "Poor",          min: 82, max: Infinity },
  ]},
  { label: "65+", minAge: 65, maxAge: Infinity, bands: [
    { label: "Athlete",       min: 50, max: 55 },
    { label: "Excellent",     min: 56, max: 61 },
    { label: "Good",          min: 62, max: 65 },
    { label: "Above average", min: 66, max: 69 },
    { label: "Average",       min: 70, max: 73 },
    { label: "Below average", min: 74, max: 79 },
    { label: "Poor",          min: 80, max: Infinity },
  ]},
];

const RHR_WOMEN: Readonly<RhrBracket[]> = [
  { label: "18–25", minAge: 18, maxAge: 25, bands: [
    { label: "Athlete",       min: 54, max: 60 },
    { label: "Excellent",     min: 61, max: 65 },
    { label: "Good",          min: 66, max: 69 },
    { label: "Above average", min: 70, max: 73 },
    { label: "Average",       min: 74, max: 78 },
    { label: "Below average", min: 79, max: 84 },
    { label: "Poor",          min: 85, max: Infinity },
  ]},
  { label: "26–35", minAge: 26, maxAge: 35, bands: [
    { label: "Athlete",       min: 54, max: 59 },
    { label: "Excellent",     min: 60, max: 64 },
    { label: "Good",          min: 65, max: 68 },
    { label: "Above average", min: 69, max: 72 },
    { label: "Average",       min: 73, max: 76 },
    { label: "Below average", min: 77, max: 82 },
    { label: "Poor",          min: 83, max: Infinity },
  ]},
  { label: "36–45", minAge: 36, maxAge: 45, bands: [
    { label: "Athlete",       min: 54, max: 59 },
    { label: "Excellent",     min: 60, max: 64 },
    { label: "Good",          min: 65, max: 69 },
    { label: "Above average", min: 70, max: 73 },
    { label: "Average",       min: 74, max: 78 },
    { label: "Below average", min: 79, max: 84 },
    { label: "Poor",          min: 85, max: Infinity },
  ]},
  { label: "46–55", minAge: 46, maxAge: 55, bands: [
    { label: "Athlete",       min: 54, max: 60 },
    { label: "Excellent",     min: 61, max: 65 },
    { label: "Good",          min: 66, max: 69 },
    { label: "Above average", min: 70, max: 73 },
    { label: "Average",       min: 74, max: 77 },
    { label: "Below average", min: 78, max: 83 },
    { label: "Poor",          min: 84, max: Infinity },
  ]},
  { label: "56–65", minAge: 56, maxAge: 65, bands: [
    { label: "Athlete",       min: 54, max: 59 },
    { label: "Excellent",     min: 60, max: 64 },
    { label: "Good",          min: 65, max: 68 },
    { label: "Above average", min: 69, max: 73 },
    { label: "Average",       min: 74, max: 77 },
    { label: "Below average", min: 78, max: 83 },
    { label: "Poor",          min: 84, max: Infinity },
  ]},
  { label: "65+", minAge: 65, maxAge: Infinity, bands: [
    { label: "Athlete",       min: 54, max: 59 },
    { label: "Excellent",     min: 60, max: 64 },
    { label: "Good",          min: 65, max: 68 },
    { label: "Above average", min: 69, max: 72 },
    { label: "Average",       min: 73, max: 76 },
    { label: "Below average", min: 77, max: 84 },
    { label: "Poor",          min: 84, max: Infinity },
  ]},
];

/** WHO adult BMI categories. Upper-inclusive at each boundary (E6). */
const BMI_CATEGORIES: { minBmi: number; label: string }[] = [
  { minBmi: 40.0, label: "Obesity class III (morbid)" },
  { minBmi: 35.0, label: "Obesity class II" },
  { minBmi: 30.0, label: "Obesity class I" },
  { minBmi: 25.0, label: "Overweight" },
  { minBmi: 18.5, label: "Healthy weight" },
  { minBmi: 16.0, label: "Underweight" },
  { minBmi: 0,    label: "Severe thinness" },
];

/** ESC/IDF two-tier waist thresholds. Upper-inclusive (≥ threshold → next band). */
const WAIST_THRESHOLDS = {
  male:   { elevated: 94, high: 102 },
  female: { elevated: 80, high: 88 },
} as const;

// ─── Helper functions ─────────────────────────────────────────────────────────

function clampBracket<T extends { minAge: number; maxAge: number }>(
  brackets: Readonly<T[]>,
  ageYears: number
): T {
  const clampedAge = Math.max(brackets[0].minAge, Math.min(brackets[brackets.length - 1].maxAge, ageYears));
  return brackets.find((b) => clampedAge >= b.minAge && clampedAge <= b.maxAge) ?? brackets[brackets.length - 1];
}

/** Linear interpolation of percentile from ACSM table breakpoints. */
function interpolatePercentile(value: number, values: Readonly<number[]>): number {
  const pcts = VO2MAX_PERCENTILE_KEYS as Readonly<number[]>;

  if (value <= values[0]) return pcts[0] * (value / values[0]);
  if (value >= values[values.length - 1]) return 100;

  for (let i = 0; i < values.length - 1; i++) {
    if (value >= values[i] && value <= values[i + 1]) {
      const t = (value - values[i]) / (values[i + 1] - values[i]);
      return pcts[i] + t * (pcts[i + 1] - pcts[i]);
    }
  }
  return 50;
}

function vo2maxCategory(percentile: number): string {
  for (const cat of VO2MAX_CATEGORIES) {
    if (percentile >= cat.minPct) return cat.label;
  }
  return "Poor";
}

function bmiCategory(bmi: number): string {
  for (const cat of BMI_CATEGORIES) {
    if (bmi >= cat.minBmi) return cat.label;
  }
  return "Severe thinness";
}

function whrCategory(whr: number): string {
  return whr >= 0.5 ? "Elevated central adiposity" : "Healthy";
}

function waistCategory(waistCm: number, sex: "male" | "female"): string {
  const t = WAIST_THRESHOLDS[sex];
  if (waistCm >= t.high) return "High risk";
  if (waistCm >= t.elevated) return "Elevated risk";
  return "Within healthy range";
}

/** Returns the ISO date that is `days` before `isoDate`. */
function subtractDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - days);
  return dt.toISOString().slice(0, 10);
}

// ─── interpretWeight ──────────────────────────────────────────────────────────

export interface WeightReading {
  value: number;
  date: string;
}

export interface InterpretWeightParams {
  heightCm: number;
  weightReadings: WeightReading[];
  today: string;
  waistCm?: number | null;
  sex?: "male" | "female" | null;
}

export interface InterpretWeightResult {
  bmi: number;
  bmiCategory: string;
  healthyRangeMin: number;
  healthyRangeMax: number;
  readingsUsed: number;
  averagingNote?: string;
  whr?: number;
  whrCategory?: string;
  waistCategory?: string;
}

export function interpretWeight(params: InterpretWeightParams): InterpretWeightResult {
  const { heightCm, weightReadings, today, waistCm, sex } = params;
  const heightM = heightCm / 100;

  const windowStart = subtractDays(today, 6);

  const inWindow = weightReadings
    .filter((r) => r.date >= windowStart && r.date <= today)
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  let usedReadings: WeightReading[];
  let averagingNote: string | undefined;

  if (inWindow.length > 0) {
    usedReadings = inWindow;
    if (inWindow.length < 7) {
      averagingNote = `Based on ${inWindow.length} reading${inWindow.length > 1 ? "s" : ""} in the last 7 days.`;
    }
  } else {
    const sorted = [...weightReadings].sort((a, b) => (a.date > b.date ? -1 : 1));
    usedReadings = sorted.length > 0 ? [sorted[0]] : [];
    if (usedReadings.length > 0) {
      averagingNote = "No readings in the last 7 days; using the most recent available.";
    }
  }

  const avg =
    usedReadings.length > 0
      ? usedReadings.reduce((s, r) => s + r.value, 0) / usedReadings.length
      : 0;

  const bmi = parseFloat((avg / (heightM * heightM)).toFixed(1));
  const healthyRangeMin = parseFloat((18.5 * heightM * heightM).toFixed(1));
  const healthyRangeMax = parseFloat((24.9 * heightM * heightM).toFixed(1));

  const result: InterpretWeightResult = {
    bmi,
    bmiCategory: bmiCategory(bmi),
    healthyRangeMin,
    healthyRangeMax,
    readingsUsed: usedReadings.length,
    ...(averagingNote ? { averagingNote } : {}),
  };

  if (waistCm != null && heightCm > 0) {
    const whr = parseFloat((waistCm / heightCm).toFixed(2));
    result.whr = whr;
    result.whrCategory = whrCategory(whr);
  }

  if (waistCm != null && sex != null) {
    result.waistCategory = waistCategory(waistCm, sex);
  }

  return result;
}

// ─── interpretVo2max ──────────────────────────────────────────────────────────

export interface InterpretVo2maxResult {
  percentile: number;
  percentileLabel: string;
  category: string;
  ageBracketNote?: string;
}

export function interpretVo2max(
  value: number,
  ageYears: number,
  sex: "male" | "female"
): InterpretVo2maxResult {
  const table = sex === "male" ? VO2MAX_MEN : VO2MAX_WOMEN;

  const clampedAge = Math.max(table[0].minAge, Math.min(table[table.length - 1].maxAge, ageYears));
  const bracket = table.find((b) => clampedAge >= b.minAge && clampedAge <= b.maxAge) ?? table[table.length - 1];
  const wasClamped = ageYears < table[0].minAge || ageYears > table[table.length - 1].maxAge;

  const vals = bracket.values as Readonly<number[]>;
  const pcts = VO2MAX_PERCENTILE_KEYS as Readonly<number[]>;

  let percentile: number;
  let percentileLabel: string;

  if (value <= vals[0]) {
    // Below 5th percentile — extrapolate down to 0
    const t = value / vals[0];
    percentile = parseFloat((pcts[0] * t).toFixed(1));
    percentileLabel = "below the 5th percentile";
  } else if (value >= vals[vals.length - 1]) {
    percentile = 100;
    percentileLabel = "above the 95th percentile";
  } else {
    const raw = interpolatePercentile(value, vals);
    percentile = parseFloat(raw.toFixed(1));
    percentileLabel = `approximately the ${Math.round(raw)}th percentile`;
  }

  const category = vo2maxCategory(percentile);

  return {
    percentile,
    percentileLabel,
    category,
    ...(wasClamped ? { ageBracketNote: `Age outside the normed range (20–79); using the ${bracket.label} bracket.` } : {}),
  };
}

// ─── interpretRestingHr ───────────────────────────────────────────────────────

export interface InterpretRhrResult {
  category: string;
  athleteNote: boolean;
  highHrNote: boolean;
  ageBracket?: string;
}

export function interpretRestingHr(
  value: number,
  ageYears: number,
  sex: "male" | "female"
): InterpretRhrResult {
  const table = sex === "male" ? RHR_MEN : RHR_WOMEN;

  const clampedAge = Math.max(table[0].minAge, Math.min(Infinity, ageYears));
  const bracket = clampBracket(table, clampedAge);
  const wasClamped = ageYears < table[0].minAge;

  const band = bracket.bands.find((b) => value >= b.min && value <= b.max) ?? bracket.bands[bracket.bands.length - 1];
  const category = band.label;

  const athleteNote = category === "Athlete";
  // FR-009: highHrNote fires on the raw value threshold (> 85 bpm), not the
  // age-bracket category. A 70-year-old man whose bracket labels 80 bpm as
  // "Poor" should not receive the same clinical note as a 75+ bpm reading.
  const highHrNote = value > 85;

  return {
    category,
    athleteNote,
    highHrNote,
    ageBracket: bracket.label,
  };
}
