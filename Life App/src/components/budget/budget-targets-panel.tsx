"use client";

import { formatEur } from "@/lib/currency";
import type { BudgetSettings, BudgetSummary } from "@/types";
import { Budget25xCard } from "./budget-25x-card";
import { BudgetTrueExpensesStrip } from "./budget-true-expenses-strip";

interface BudgetTargetsPanelProps {
  summary: BudgetSummary;
  settings: BudgetSettings;
  allPlannedExpenses: BudgetSummary["plannedExpenses"];
  onSave25x: (targetAnnualSpending: number | null, statePensionAnnualAmount: number | null) => Promise<void>;
}

export function BudgetTargetsPanel({
  summary,
  settings,
  allPlannedExpenses,
  onSave25x,
}: BudgetTargetsPanelProps) {
  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          Targets
        </h2>
        <p className="text-xs text-muted-foreground">
          Long-horizon goals and annual expenses
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Budget25xCard
          target25x={summary.target25x}
          statePensionAnnualAmount={settings.statePensionAnnualAmount}
          onSave={onSave25x}
        />

        {summary.savingsGoal && (
          <div className="rounded-xl bg-muted/20 p-6 space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Savings Goal
              </h3>
              <p className="text-xs text-muted-foreground">
                {summary.savingsGoal.targetDate
                  ? `Target by ${summary.savingsGoal.targetDate}`
                  : "Open-ended goal"}
              </p>
            </div>
            {summary.savingsGoal.percentage >= 100 ? (
              <p className="text-emerald-600 font-semibold">Goal reached</p>
            ) : (
              <div className="space-y-3">
                <p className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
                  {formatEur(summary.savingsGoal.saved)}
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    / {formatEur(summary.savingsGoal.total)}
                  </span>
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{summary.savingsGoal.percentage}% saved</span>
                    <span>{formatEur(summary.savingsGoal.total - summary.savingsGoal.saved)} to go</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(summary.savingsGoal.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">True Expenses — {summary.month.slice(0, 4)}</p>
          <p className="text-xs text-muted-foreground">
            Annual costs broken into monthly slices — plan them before they arrive
          </p>
        </div>
        <BudgetTrueExpensesStrip
          expenses={allPlannedExpenses}
          currentMonth={summary.month}
        />
      </div>
    </section>
  );
}
