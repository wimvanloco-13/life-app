import { describe, it, expect } from "vitest";

// ─── Step navigation pure-logic tests ────────────────────────────────────────
// The dialog has 5 steps: preflight → scorecard → utility-status → six-month → decision
// Back, Skip, and Continue must traverse them correctly.

type Step = "preflight" | "scorecard" | "utility-status" | "six-month" | "decision";
const STEPS: Step[] = ["preflight", "scorecard", "utility-status", "six-month", "decision"];

function goNext(current: Step): Step {
  const idx = STEPS.indexOf(current);
  return idx < STEPS.length - 1 ? STEPS[idx + 1] : current;
}

function goBack(current: Step): Step {
  const idx = STEPS.indexOf(current);
  return idx > 0 ? STEPS[idx - 1] : current;
}

describe("dialog step navigation", () => {
  it("starts at preflight (step 1 of 5)", () => {
    expect(STEPS[0]).toBe("preflight");
    expect(STEPS.length).toBe(5);
  });

  it("Continue from preflight goes to scorecard", () => {
    expect(goNext("preflight")).toBe("scorecard");
  });

  it("Continue from scorecard goes to utility-status", () => {
    expect(goNext("scorecard")).toBe("utility-status");
  });

  it("Skip on scorecard also goes to utility-status (same as Continue)", () => {
    // Skip and Continue call the same goNext internally
    expect(goNext("scorecard")).toBe("utility-status");
  });

  it("Continue from utility-status goes to six-month", () => {
    expect(goNext("utility-status")).toBe("six-month");
  });

  it("Continue from six-month goes to decision", () => {
    expect(goNext("six-month")).toBe("decision");
  });

  it("Continue on decision does not advance further", () => {
    expect(goNext("decision")).toBe("decision");
  });

  it("Back from scorecard returns to preflight", () => {
    expect(goBack("scorecard")).toBe("preflight");
  });

  it("Back from utility-status returns to scorecard", () => {
    expect(goBack("utility-status")).toBe("scorecard");
  });

  it("Back from decision returns to six-month", () => {
    expect(goBack("decision")).toBe("six-month");
  });

  it("Back from preflight stays on preflight (no previous step)", () => {
    expect(goBack("preflight")).toBe("preflight");
  });

  it("full forward walk traverses all 5 steps in order", () => {
    let step: Step = "preflight";
    const visited: Step[] = [step];
    while (goNext(step) !== step) {
      step = goNext(step);
      visited.push(step);
    }
    expect(visited).toEqual(STEPS);
  });

  it("full backward walk from decision returns to preflight", () => {
    let step: Step = "decision";
    const visited: Step[] = [step];
    while (goBack(step) !== step) {
      step = goBack(step);
      visited.push(step);
    }
    expect(visited).toEqual([...STEPS].reverse());
  });
});

// ─── Decision validation ──────────────────────────────────────────────────────

type MomentDecision = "proceeded" | "declined" | "parked";
const VALID_DECISIONS: MomentDecision[] = ["proceeded", "declined", "parked"];

function isValidDecision(v: unknown): v is MomentDecision {
  return VALID_DECISIONS.includes(v as MomentDecision);
}

describe("decision validation", () => {
  it("accepts 'proceeded'", () => expect(isValidDecision("proceeded")).toBe(true));
  it("accepts 'declined'", () => expect(isValidDecision("declined")).toBe(true));
  it("accepts 'parked'", () => expect(isValidDecision("parked")).toBe(true));
  it("rejects 'approved'", () => expect(isValidDecision("approved")).toBe(false));
  it("rejects null", () => expect(isValidDecision(null)).toBe(false));
  it("rejects undefined", () => expect(isValidDecision(undefined)).toBe(false));
  it("rejects empty string", () => expect(isValidDecision("")).toBe(false));
});

// ─── "Also log as spending" checkbox visibility rule ─────────────────────────

function showAlsoLog(decision: MomentDecision): boolean {
  return decision === "proceeded";
}

describe("alsoLogAsSpending checkbox visibility", () => {
  it("shows checkbox when decision is 'proceeded'", () => {
    expect(showAlsoLog("proceeded")).toBe(true);
  });
  it("hides checkbox when decision is 'declined'", () => {
    expect(showAlsoLog("declined")).toBe(false);
  });
  it("hides checkbox when decision is 'parked'", () => {
    expect(showAlsoLog("parked")).toBe(false);
  });
});

// ─── Below-threshold indicator ────────────────────────────────────────────────

function isBelowThreshold(amount: number, threshold: number): boolean {
  return amount > 0 && amount < threshold;
}

describe("below-threshold indicator", () => {
  it("shows note when amount is below threshold", () => {
    expect(isBelowThreshold(150, 200)).toBe(true);
  });
  it("does not show note when amount equals threshold", () => {
    expect(isBelowThreshold(200, 200)).toBe(false);
  });
  it("does not show note when amount is above threshold", () => {
    expect(isBelowThreshold(500, 200)).toBe(false);
  });
  it("does not show note for zero amount (not yet filled in)", () => {
    expect(isBelowThreshold(0, 200)).toBe(false);
  });
  it("threshold of 0 means note never shows", () => {
    expect(isBelowThreshold(100, 0)).toBe(false);
  });
});
