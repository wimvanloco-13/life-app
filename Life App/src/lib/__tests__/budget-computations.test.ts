import { describe, it, expect } from "vitest";
import {
  validateBucketTargets,
  deriveInvestingLadder,
  computeTarget25x,
  isValidBucket,
} from "../budget-computations";

// ─── validateBucketTargets ────────────────────────────────────────────────────

describe("validateBucketTargets", () => {
  it("accepts a valid targets object summing to 100", () => {
    const result = validateBucketTargets({ fixed: 50, invest: 10, save: 10, guilt_free: 30 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fixed).toBe(50);
      expect(result.value.guilt_free).toBe(30);
    }
  });

  it("accepts values that do not sum to 100 (sum enforcement is UI-only)", () => {
    const result = validateBucketTargets({ fixed: 25, invest: 25, save: 25, guilt_free: 25 });
    expect(result.ok).toBe(true);
  });

  it("accepts zeroes (fully flexible allocation)", () => {
    const result = validateBucketTargets({ fixed: 0, invest: 0, save: 0, guilt_free: 0 });
    expect(result.ok).toBe(true);
  });

  it("rejects a value above 100", () => {
    const result = validateBucketTargets({ fixed: 101, invest: 0, save: 0, guilt_free: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("fixed");
  });

  it("rejects a negative value", () => {
    const result = validateBucketTargets({ fixed: 50, invest: -5, save: 10, guilt_free: 30 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("invest");
  });

  it("rejects a non-numeric value", () => {
    const result = validateBucketTargets({ fixed: "fifty", invest: 0, save: 0, guilt_free: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects null", () => {
    const result = validateBucketTargets(null);
    expect(result.ok).toBe(false);
  });

  it("rejects an array", () => {
    const result = validateBucketTargets([50, 10, 10, 30]);
    expect(result.ok).toBe(false);
  });
});

// ─── deriveInvestingLadder ────────────────────────────────────────────────────

describe("deriveInvestingLadder", () => {
  it("marks emergency_cash as filled when saved ≥ 3× avg fixed costs", () => {
    const rungs = deriveInvestingLadder({
      computedSaved: 9000,
      avgMonthlyFixedCosts: 3000,
      investCategoryNames: new Set(),
    });
    const rung = rungs.find((r) => r.key === "emergency_cash");
    expect(rung?.filled).toBe(true);
  });

  it("marks emergency_cash as unfilled when saved < 3× avg fixed costs", () => {
    const rungs = deriveInvestingLadder({
      computedSaved: 5000,
      avgMonthlyFixedCosts: 3000,
      investCategoryNames: new Set(),
    });
    const rung = rungs.find((r) => r.key === "emergency_cash");
    expect(rung?.filled).toBe(false);
  });

  it("marks emergency_cash as unfilled when avgMonthlyFixedCosts is 0", () => {
    const rungs = deriveInvestingLadder({
      computedSaved: 99999,
      avgMonthlyFixedCosts: 0,
      investCategoryNames: new Set(),
    });
    const rung = rungs.find((r) => r.key === "emergency_cash");
    expect(rung?.filled).toBe(false);
  });

  it("marks pensioensparen as filled when the category is mapped", () => {
    const rungs = deriveInvestingLadder({
      computedSaved: 0,
      avgMonthlyFixedCosts: 3000,
      investCategoryNames: new Set(["pensioensparen"]),
    });
    const rung = rungs.find((r) => r.key === "pensioensparen");
    expect(rung?.filled).toBe(true);
    expect(rung?.categoryMapped).toBe(true);
  });

  it("marks employer_pension as filled when 2nd_pillar is mapped (synonym)", () => {
    const rungs = deriveInvestingLadder({
      computedSaved: 0,
      avgMonthlyFixedCosts: 3000,
      investCategoryNames: new Set(["2nd_pillar"]),
    });
    const rung = rungs.find((r) => r.key === "employer_pension");
    expect(rung?.filled).toBe(true);
  });

  it("returns all 7 rungs", () => {
    const rungs = deriveInvestingLadder({
      computedSaved: 0,
      avgMonthlyFixedCosts: 0,
      investCategoryNames: new Set(),
    });
    expect(rungs).toHaveLength(7);
  });
});

// ─── computeTarget25x ────────────────────────────────────────────────────────

describe("computeTarget25x", () => {
  it("uses trailing annual spending when no override", () => {
    const result = computeTarget25x({
      trailingAnnualSpending: 36000,
      overrideAnnualSpending: null,
      statePensionAnnualAmount: null,
    });
    expect(result.activeAnnualSpending).toBe(36000);
    expect(result.target).toBe(36000 * 25);
    expect(result.adjustedTarget).toBe(36000 * 25);
  });

  it("prefers the override over trailing spending", () => {
    const result = computeTarget25x({
      trailingAnnualSpending: 36000,
      overrideAnnualSpending: 42000,
      statePensionAnnualAmount: null,
    });
    expect(result.activeAnnualSpending).toBe(42000);
    expect(result.target).toBe(42000 * 25);
  });

  it("reduces adjustedTarget by state pension (25× of net-of-pension spending)", () => {
    const result = computeTarget25x({
      trailingAnnualSpending: 36000,
      overrideAnnualSpending: null,
      statePensionAnnualAmount: 12000,
    });
    expect(result.target).toBe(36000 * 25);
    expect(result.adjustedTarget).toBe((36000 - 12000) * 25);
  });

  it("clamps adjustedTarget to 0 when pension > spending", () => {
    const result = computeTarget25x({
      trailingAnnualSpending: 10000,
      overrideAnnualSpending: null,
      statePensionAnnualAmount: 15000,
    });
    expect(result.adjustedTarget).toBe(0);
  });

  it("sets computedAnnualSpending to null when trailing is 0", () => {
    const result = computeTarget25x({
      trailingAnnualSpending: 0,
      overrideAnnualSpending: null,
      statePensionAnnualAmount: null,
    });
    expect(result.computedAnnualSpending).toBeNull();
    expect(result.activeAnnualSpending).toBe(0);
  });
});

// ─── isValidBucket ───────────────────────────────────────────────────────────

describe("isValidBucket", () => {
  it("accepts all four bucket keys", () => {
    expect(isValidBucket("fixed")).toBe(true);
    expect(isValidBucket("invest")).toBe(true);
    expect(isValidBucket("save")).toBe(true);
    expect(isValidBucket("guilt_free")).toBe(true);
  });

  it("accepts null (unassigned)", () => {
    expect(isValidBucket(null)).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isValidBucket("vacation")).toBe(false);
    expect(isValidBucket("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidBucket(42)).toBe(false);
    expect(isValidBucket(undefined)).toBe(false);
    expect(isValidBucket({})).toBe(false);
  });
});
