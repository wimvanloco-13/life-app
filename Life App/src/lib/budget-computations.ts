/**
 * Pure budget computation functions extracted for testability.
 * These are the same computations used by GET /api/budget/summary.
 */

import type { BucketKey, BucketTargets } from "@/types";

// ─── bucketTargets JSON validation ───────────────────────────────────────────

export type BucketTargetsValidationResult =
  | { ok: true; value: BucketTargets }
  | { ok: false; error: string };

export function validateBucketTargets(raw: unknown): BucketTargetsValidationResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "bucketTargets must be an object" };
  }
  const obj = raw as Record<string, unknown>;
  const keys = ["fixed", "invest", "save", "guilt_free"] as const;
  for (const k of keys) {
    const v = Number(obj[k]);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return { ok: false, error: `bucketTargets.${k} must be a number between 0 and 100` };
    }
  }
  return {
    ok: true,
    value: {
      fixed: Number(obj.fixed),
      invest: Number(obj.invest),
      save: Number(obj.save),
      guilt_free: Number(obj.guilt_free),
    },
  };
}

// ─── Investing-ladder rung derivation ────────────────────────────────────────

export interface LadderInput {
  computedSaved: number;
  avgMonthlyFixedCosts: number;
  investCategoryNames: Set<string>;
}

export interface LadderRungResult {
  key: string;
  label: string;
  filled: boolean;
  categoryMapped: boolean;
}

const LADDER_RUNGS = [
  { key: "emergency_cash", label: "Emergency Cash (3 months)", matchNames: [] as string[] },
  { key: "credit_card_debt", label: "Pay off credit card debt", matchNames: ["credit_card_debt"] },
  { key: "consumer_credit", label: "Pay off consumer credit", matchNames: ["consumer_credit"] },
  { key: "employer_pension", label: "Max employer pension / 2nd pillar", matchNames: ["employer_pension", "2nd_pillar"] },
  { key: "pensioensparen", label: "Pensioensparen (€1,350/yr)", matchNames: ["pensioensparen"] },
  { key: "langetermijnsparen", label: "Langetermijnsparen (€2,450/yr)", matchNames: ["langetermijnsparen"] },
  { key: "etf_investment", label: "Broad ETF investment (VT/IWDA)", matchNames: ["etf_investment"] },
];

export function deriveInvestingLadder(input: LadderInput): LadderRungResult[] {
  const { computedSaved, avgMonthlyFixedCosts, investCategoryNames } = input;
  const emergencyCashFilled = avgMonthlyFixedCosts > 0 && computedSaved >= 3 * avgMonthlyFixedCosts;

  return LADDER_RUNGS.map((rung) => {
    if (rung.key === "emergency_cash") {
      return { key: rung.key, label: rung.label, filled: emergencyCashFilled, categoryMapped: true };
    }
    const categoryMapped = rung.matchNames.some((n) => investCategoryNames.has(n));
    return { key: rung.key, label: rung.label, filled: categoryMapped, categoryMapped };
  });
}

// ─── 25× target computation ──────────────────────────────────────────────────

export interface Target25xInput {
  trailingAnnualSpending: number;
  overrideAnnualSpending: number | null;
  statePensionAnnualAmount: number | null;
}

export interface Target25xResult {
  computedAnnualSpending: number | null;
  overrideAnnualSpending: number | null;
  activeAnnualSpending: number;
  target: number;
  adjustedTarget: number;
}

export function computeTarget25x(input: Target25xInput): Target25xResult {
  const { trailingAnnualSpending, overrideAnnualSpending, statePensionAnnualAmount } = input;
  const computedAnnualSpending = trailingAnnualSpending > 0 ? trailingAnnualSpending : null;
  const activeAnnualSpending = overrideAnnualSpending ?? computedAnnualSpending ?? 0;
  const statePension = statePensionAnnualAmount ?? 0;
  const target = activeAnnualSpending * 25;
  const adjustedTarget = Math.max(0, (activeAnnualSpending - statePension) * 25);
  return { computedAnnualSpending, overrideAnnualSpending, activeAnnualSpending, target, adjustedTarget };
}

// ─── Bucket key validation ────────────────────────────────────────────────────

const VALID_BUCKETS: (BucketKey | null)[] = ["fixed", "invest", "save", "guilt_free", null];

export function isValidBucket(value: unknown): value is BucketKey | null {
  return VALID_BUCKETS.includes(value as BucketKey | null);
}
