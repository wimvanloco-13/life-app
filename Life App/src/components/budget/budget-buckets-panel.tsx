"use client";

import { formatEur } from "@/lib/currency";
import type { BucketActual, BudgetSummary } from "@/types";
import { AlertTriangle } from "lucide-react";

interface BudgetBucketsPanelProps {
  summary: BudgetSummary;
}

const BUCKET_COLORS: Record<string, string> = {
  fixed: "bg-[oklch(var(--palette-gray)/_0.15)]",
  invest: "bg-[oklch(var(--palette-blue)/_0.15)]",
  save: "bg-[oklch(var(--palette-emerald)/_0.15)]",
  guilt_free: "bg-[oklch(var(--palette-amber)/_0.15)]",
  unassigned: "bg-muted/30",
};

const BUCKET_BAR_COLORS: Record<string, string> = {
  fixed: "bg-[oklch(var(--palette-gray))]",
  invest: "bg-[oklch(var(--palette-blue))]",
  save: "bg-[oklch(var(--palette-emerald))]",
  guilt_free: "bg-[oklch(var(--palette-amber))]",
  unassigned: "bg-muted-foreground/30",
};

function BucketRow({ bucket }: { bucket: BucketActual }) {
  const bg = BUCKET_COLORS[bucket.key] ?? "bg-muted/30";
  const bar = BUCKET_BAR_COLORS[bucket.key] ?? "bg-muted-foreground/30";
  const overTarget = bucket.targetPct !== null && bucket.actualPct > bucket.targetPct;

  return (
    <div className={`rounded-xl p-5 space-y-3 ${bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{bucket.label}</p>
          {bucket.targetPct !== null && (
            <p className="text-xs text-muted-foreground">
              Target {bucket.targetPct}%
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-base font-bold tracking-tight">{formatEur(bucket.actualAmount)}</p>
          <p className={`text-xs font-medium ${overTarget ? "text-red-500" : "text-muted-foreground"}`}>
            {bucket.actualPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${bar} ${overTarget ? "opacity-70" : ""}`}
          style={{ width: `${Math.min(bucket.actualPct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function BudgetBucketsPanel({ summary }: BudgetBucketsPanelProps) {
  const assignedBuckets = summary.buckets.filter((b) => b.key !== "unassigned");
  const unassigned = summary.buckets.find((b) => b.key === "unassigned");

  const assignedTargetSum = assignedBuckets.reduce(
    (sum, b) => sum + (b.targetPct ?? 0),
    0
  );
  const targetSumOff = assignedTargetSum < 95 || assignedTargetSum > 105;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Buckets
          </h2>
          <p className="text-xs text-muted-foreground">
            Where every euro of your income goes — assign categories in the Categories tab
          </p>
        </div>
        {targetSumOff && (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Targets sum to {assignedTargetSum}% — adjust to reach ~100%</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {assignedBuckets.map((b) => (
          <BucketRow key={b.key} bucket={b} />
        ))}
      </div>

      {unassigned && (
        <div className="rounded-xl border border-dashed border-border/60 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assign buckets to categories in the Categories tab
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold">{formatEur(unassigned.actualAmount)}</p>
            <p className="text-xs text-muted-foreground">{unassigned.actualPct.toFixed(1)}%</p>
          </div>
        </div>
      )}
    </section>
  );
}
