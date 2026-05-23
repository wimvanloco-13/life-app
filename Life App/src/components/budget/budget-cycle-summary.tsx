"use client";

import { formatEur } from "@/lib/currency";
import type { BudgetSummary } from "@/types";

interface BudgetCycleSummaryProps {
  summary: BudgetSummary;
}

export function BudgetCycleSummary({ summary }: BudgetCycleSummaryProps) {
  const remainingPct =
    summary.spendingBudget > 0
      ? (summary.remaining / summary.spendingBudget) * 100
      : 100;
  const remainingColor =
    remainingPct > 50
      ? "text-emerald-600"
      : remainingPct >= 20
        ? "text-amber-600"
        : "text-red-600";

  const items = [
    { label: "Monthly Income", value: formatEur(summary.totalIncome) },
    { label: "Fixed Costs", value: formatEur(summary.totalFixedCosts) },
    { label: "Savings Target", value: formatEur(summary.monthlySavingsTarget) },
    { label: "Spending Budget", value: formatEur(summary.spendingBudget) },
    { label: "Spent", value: formatEur(summary.totalSpent) },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          This Month
        </h2>
        <p className="text-xs text-muted-foreground">
          {summary.daysLeft > 0
            ? `${summary.daysLeft} days left · ${formatEur(summary.dailyAllowance)}/day remaining`
            : "Month ended"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-muted/30 p-5">
            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-muted/20 px-6 py-5">
        <p className="text-sm font-medium text-muted-foreground mb-1">Remaining Budget</p>
        <p className={`text-4xl font-bold tracking-tight ${remainingColor}`}>
          {formatEur(summary.remaining)}
        </p>
      </div>
    </section>
  );
}
