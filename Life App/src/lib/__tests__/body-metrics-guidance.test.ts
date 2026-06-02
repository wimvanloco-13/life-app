import { describe, it, expect } from "vitest";
import {
  interpretWeight,
  interpretVo2max,
  interpretRestingHr,
} from "../body-metrics-guidance";

/**
 * Reference data: feature requests/body-metrics-guidance/reference-data.md
 * Spec: feature requests/body-metrics-guidance/spec.md
 *
 * All test cases are verified against the reference tables BEFORE implementation
 * (TDD: tests → fail → implement until green).
 *
 * Fixed today anchor: "2026-05-15" for rolling-window tests so arithmetic is
 * reproducible (same pattern as habit-streaks.test.ts).
 */

// ─── interpretWeight ──────────────────────────────────────────────────────────

describe("interpretWeight", () => {
  const TODAY = "2026-05-15";

  /** Build dated weight readings ending on TODAY */
  function readings(
    values: number[],
    endDate: string = TODAY
  ): { value: number; date: string }[] {
    const [y, m, d] = endDate.split("-").map(Number);
    return values.map((value, i) => {
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() - (values.length - 1 - i));
      return {
        value,
        date: dt.toISOString().slice(0, 10),
      };
    });
  }

  it("single reading in window: BMI, category, healthy range", () => {
    // BMI = 73 / (1.70²) = 73 / 2.89 = 25.26 ≈ 25.3 → Overweight
    // healthyMin = 18.5 × 2.89 = 53.465 ≈ 53.5
    // healthyMax = 24.9 × 2.89 = 71.961 ≈ 72.0
    const result = interpretWeight({
      heightCm: 170,
      weightReadings: readings([73]),
      today: TODAY,
    });
    expect(result.bmi).toBeCloseTo(25.3, 1);
    expect(result.bmiCategory).toBe("Overweight");
    expect(result.healthyRangeMin).toBeCloseTo(53.5, 1);
    expect(result.healthyRangeMax).toBeCloseTo(72.0, 1);
    expect(result.readingsUsed).toBe(1);
  });

  it("WHtR Healthy: waist 82 cm, height 175 cm → 0.47", () => {
    // 82 / 175 = 0.4686 ≈ 0.47 — below 0.5 threshold → Healthy
    const result = interpretWeight({
      heightCm: 175,
      weightReadings: readings([75]),
      today: TODAY,
      waistCm: 82,
    });
    expect(result.whr).toBeCloseTo(0.47, 2);
    expect(result.whrCategory).toBe("Healthy");
  });

  it("WHtR Elevated central adiposity: waist 90 cm, height 175 cm → 0.51", () => {
    // 90 / 175 = 0.5143 ≈ 0.51 — at or above 0.5 threshold
    const result = interpretWeight({
      heightCm: 175,
      weightReadings: readings([75]),
      today: TODAY,
      waistCm: 90,
    });
    expect(result.whr).toBeCloseTo(0.51, 2);
    expect(result.whrCategory).toBe("Elevated central adiposity");
  });

  // ── Waist absolute category (ESC/IDF two-tier thresholds) ──
  it("waist 90 cm, male → Within healthy range (below 94 cm threshold)", () => {
    const result = interpretWeight({
      heightCm: 175,
      weightReadings: readings([75]),
      today: TODAY,
      waistCm: 90,
      sex: "male",
    });
    expect(result.waistCategory).toBe("Within healthy range");
  });

  it("waist 96 cm, male → Elevated risk (94–101 cm band)", () => {
    const result = interpretWeight({
      heightCm: 175,
      weightReadings: readings([75]),
      today: TODAY,
      waistCm: 96,
      sex: "male",
    });
    expect(result.waistCategory).toBe("Elevated risk");
  });

  it("waist 103 cm, male → High risk (≥ 102 cm)", () => {
    const result = interpretWeight({
      heightCm: 175,
      weightReadings: readings([75]),
      today: TODAY,
      waistCm: 103,
      sex: "male",
    });
    expect(result.waistCategory).toBe("High risk");
  });

  it("waist 75 cm, female → Within healthy range (below 80 cm threshold)", () => {
    const result = interpretWeight({
      heightCm: 165,
      weightReadings: readings([60]),
      today: TODAY,
      waistCm: 75,
      sex: "female",
    });
    expect(result.waistCategory).toBe("Within healthy range");
  });

  it("waist 83 cm, female → Elevated risk (80–87 cm band)", () => {
    const result = interpretWeight({
      heightCm: 165,
      weightReadings: readings([60]),
      today: TODAY,
      waistCm: 83,
      sex: "female",
    });
    expect(result.waistCategory).toBe("Elevated risk");
  });

  it("waist 92 cm, female → High risk (≥ 88 cm)", () => {
    const result = interpretWeight({
      heightCm: 165,
      weightReadings: readings([60]),
      today: TODAY,
      waistCm: 92,
      sex: "female",
    });
    expect(result.waistCategory).toBe("High risk");
  });

  // ── Rolling average window ──
  it("0 readings in 7-day window, 1 older reading → readingsUsed: 1, averagingNote present", () => {
    // Older reading is 10 days before today
    const oldDate = "2026-05-05";
    const result = interpretWeight({
      heightCm: 170,
      weightReadings: [{ value: 73, date: oldDate }],
      today: TODAY,
    });
    expect(result.readingsUsed).toBe(1);
    expect(result.averagingNote).toBeTruthy();
  });

  it("3 readings in window → readingsUsed: 3, averagingNote present", () => {
    const result = interpretWeight({
      heightCm: 170,
      weightReadings: readings([72, 73, 74]),
      today: TODAY,
    });
    expect(result.readingsUsed).toBe(3);
    expect(result.averagingNote).toBeTruthy();
  });

  it("7 readings in window → readingsUsed: 7, no averagingNote", () => {
    const result = interpretWeight({
      heightCm: 170,
      weightReadings: readings([70, 71, 72, 73, 74, 75, 76]),
      today: TODAY,
    });
    expect(result.readingsUsed).toBe(7);
    expect(result.averagingNote).toBeFalsy();
  });

  it("10 readings, 7 within 7-day window → averages only 7, no averagingNote", () => {
    // 3 readings older than 7 days, 7 within the window
    const old = ["2026-05-01", "2026-05-02", "2026-05-03"].map((date) => ({
      value: 80,
      date,
    }));
    const recent = readings([70, 71, 72, 73, 74, 75, 76]);
    const result = interpretWeight({
      heightCm: 170,
      weightReadings: [...old, ...recent],
      today: TODAY,
    });
    expect(result.readingsUsed).toBe(7);
    expect(result.averagingNote).toBeFalsy();
  });

  it("BMI exactly 25.0 → Overweight (E6 upper-inclusive at category boundary)", () => {
    // weight = 25.0 × (1.70)² = 25.0 × 2.89 = 72.25 kg
    const result = interpretWeight({
      heightCm: 170,
      weightReadings: readings([72.25]),
      today: TODAY,
    });
    expect(result.bmiCategory).toBe("Overweight");
  });

  it("WHtR exactly 0.5 → Elevated central adiposity (E6 upper-inclusive)", () => {
    // waist = 0.5 × 175 = 87.5 cm
    const result = interpretWeight({
      heightCm: 175,
      weightReadings: readings([75]),
      today: TODAY,
      waistCm: 87.5,
    });
    expect(result.whrCategory).toBe("Elevated central adiposity");
  });
});

// ─── interpretVo2max ──────────────────────────────────────────────────────────

describe("interpretVo2max", () => {
  it("42.4, age 35, male → percentile 50, category Average", () => {
    // 30–39 male bracket: 50th = 42.4. Exactly on 50th breakpoint.
    // 50th percentile is within Average range (40–59th). No boundary case.
    const result = interpretVo2max(42.4, 35, "male");
    expect(result.percentile).toBeCloseTo(50, 0);
    expect(result.category).toBe("Average");
  });

  it("56.5, age 35, male → category Excellent (90th percentile, 30–39)", () => {
    // 30–39 male bracket: 90th = 56.5. Excellent = 80–94th.
    const result = interpretVo2max(56.5, 35, "male");
    expect(result.category).toBe("Excellent");
  });

  it("30.2, age 35, male → category Poor (10th percentile, below 20th)", () => {
    // 30–39 male: 10th = 30.2. Poor = below 20th.
    const result = interpretVo2max(30.2, 35, "male");
    expect(result.category).toBe("Poor");
  });

  it("37.6, age 25, female → category Average (50th percentile, 20–29)", () => {
    // 20–29 female: 50th = 37.6.
    const result = interpretVo2max(37.6, 25, "female");
    expect(result.category).toBe("Average");
  });

  it("age 19 → clamps to 20–29 bracket, ageBracketNote contains '20–29'", () => {
    const result = interpretVo2max(40, 19, "male");
    expect(result.ageBracketNote).toMatch(/20.29|20–29/);
  });

  it("24.0, age 82, female → Excellent, ageBracketNote contains '70–79'", () => {
    // Age 82 → clamps to 70–79 female bracket.
    // 70–79 female: 90th = 23.1, 95th = 24.1.
    // Linear interpolation: (24.0 - 23.1) / (24.1 - 23.1) * (95 - 90) + 90 = 94.5th pct
    // 94.5 < 95 → Excellent (80–94th); upper boundary of Superior is ≥ 95.
    const result = interpretVo2max(24.0, 82, "female");
    expect(result.category).toBe("Excellent");
    expect(result.ageBracketNote).toMatch(/70.79|70–79/);
  });

  it("value below 5th percentile → Poor, percentile label 'below the 5th percentile'", () => {
    // 30–39 male: 5th = 27.2. Use a value well below.
    const result = interpretVo2max(20, 35, "male");
    expect(result.category).toBe("Poor");
    expect(result.percentileLabel).toMatch(/below.*5th/i);
  });

  it("value above 95th percentile → Superior, percentile label 'above the 95th percentile'", () => {
    // 30–39 male: 95th = 59.8. Use a value well above.
    const result = interpretVo2max(65, 35, "male");
    expect(result.category).toBe("Superior");
    expect(result.percentileLabel).toMatch(/above.*95th/i);
  });

  it("computed percentile exactly 60 → Good (E6: lower bound of Good category)", () => {
    // At exactly 60th we assign Good (not Average). Upper-inclusive: 60th → Good.
    // 30–39 male: 75th = 49.2, 90th = 56.5. We need a value that interpolates to exactly 60th.
    // Interp between 50th (42.4) and 75th (49.2):
    // pct = 50 + (value - 42.4) / (49.2 - 42.4) * 25
    // 60 = 50 + (value - 42.4) / 6.8 * 25 → 10 = (value-42.4)/6.8*25 → value = 42.4 + 10*6.8/25 = 42.4 + 2.72 = 45.12
    const result = interpretVo2max(45.12, 35, "male");
    expect(result.category).toBe("Good");
  });
});

// ─── interpretRestingHr ───────────────────────────────────────────────────────

describe("interpretRestingHr", () => {
  it("49 bpm, age 30, male → Athlete, athleteNote true", () => {
    // 26–35 male: Athlete = 49–54. 49 is at the lower bound.
    const result = interpretRestingHr(49, 30, "male");
    expect(result.category).toBe("Athlete");
    expect(result.athleteNote).toBe(true);
  });

  it("68 bpm, age 30, male → Above average, no athlete note, no high HR note", () => {
    // 26–35 male: Above avg = 66–70.
    const result = interpretRestingHr(68, 30, "male");
    expect(result.category).toBe("Above average");
    expect(result.athleteNote).toBe(false);
    expect(result.highHrNote).toBe(false);
  });

  it("90 bpm, age 40, female → Poor, highHrNote true", () => {
    // 36–45 female: Poor = 85+. 90 > 85.
    const result = interpretRestingHr(90, 40, "female");
    expect(result.category).toBe("Poor");
    expect(result.highHrNote).toBe(true);
  });

  it("55 bpm, age 70, male → Athlete, athleteNote true, ageBracket 65+", () => {
    // 65+ male: Athlete = 50–55. 55 is the upper bound of the Athlete range.
    // Upper-inclusive: 55 → Athlete (not Excellent which starts at 56).
    const result = interpretRestingHr(55, 70, "male");
    expect(result.category).toBe("Athlete");
    expect(result.athleteNote).toBe(true);
    expect(result.ageBracket).toBe("65+");
  });

  it("55 bpm, age 15, female → clamped to 18–25 bracket, category Athlete", () => {
    // Age 15 → clamped to 18–25 female: Athlete = 54–60. 55 is in range.
    const result = interpretRestingHr(55, 15, "female");
    expect(result.category).toBe("Athlete");
  });
});
