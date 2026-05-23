"use client";

import type { InvestingLadderRung } from "@/types";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

interface BudgetInvestingLadderProps {
  rungs: InvestingLadderRung[];
}

export function BudgetInvestingLadder({ rungs }: BudgetInvestingLadderProps) {
  const unfilledCount = rungs.filter((r) => !r.filled).length;
  const showMappingCta = unfilledCount >= 3;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          Investing Ladder
        </h2>
        <p className="text-xs text-muted-foreground">
          Belgian ladder — work from the bottom up
        </p>
      </div>

      <div className="space-y-1">
        {rungs.map((rung, i) => (
          <div
            key={rung.key}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
              rung.filled
                ? "bg-emerald-50 dark:bg-emerald-950/20"
                : "bg-muted/20"
            }`}
          >
            <div className="shrink-0 text-xs font-mono text-muted-foreground w-4 text-right">
              {i + 1}
            </div>
            {rung.filled ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            )}
            <span
              className={`text-sm ${
                rung.filled
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {rung.label}
            </span>
          </div>
        ))}
      </div>

      {showMappingCta && (
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          <span>
            Don&apos;t see your contributions?{" "}
            <span className="text-foreground font-medium">
              Assign buckets to categories in the Categories tab
            </span>{" "}
            to map them to the ladder.
          </span>
        </div>
      )}
    </section>
  );
}
