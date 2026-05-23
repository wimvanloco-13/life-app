"use client";

import type { PlannedExpense } from "@/types";
import { formatEur } from "@/lib/currency";
import { CalendarDays } from "lucide-react";

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

interface BudgetTrueExpensesStripProps {
  /** All planned expenses (caller supplies the full list, not just this month) */
  expenses: PlannedExpense[];
  currentMonth: string;
}

export function BudgetTrueExpensesStrip({
  expenses,
  currentMonth,
}: BudgetTrueExpensesStripProps) {
  const year = currentMonth.slice(0, 4);

  const byMonth = new Map<string, PlannedExpense[]>();
  for (const e of expenses) {
    if (!e.month.startsWith(year)) continue;
    const list = byMonth.get(e.month) ?? [];
    list.push(e);
    byMonth.set(e.month, list);
  }

  if (byMonth.size === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span>No planned expenses this year — add them in the Planned Expenses tab.</span>
      </div>
    );
  }

  const months = Array.from({ length: 12 }, (_, i) =>
    `${year}-${(i + 1).toString().padStart(2, "0")}`
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-max pb-1">
        {months.map((m) => {
          const items = byMonth.get(m) ?? [];
          const total = items.reduce((s, e) => s + e.amount, 0);
          const isCurrent = m === currentMonth;

          return (
            <div
              key={m}
              className={`flex flex-col gap-1 rounded-lg px-3 py-2.5 min-w-[80px] ${
                isCurrent
                  ? "bg-[oklch(var(--palette-amber)/_0.12)] ring-1 ring-[oklch(var(--palette-amber)/_0.3)]"
                  : items.length > 0
                    ? "bg-muted/30"
                    : "bg-muted/10"
              }`}
            >
              <p className={`text-xs font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                {MONTH_LABELS[m.slice(5)] ?? m.slice(5)}
              </p>
              {items.length > 0 ? (
                <>
                  <p className="text-sm font-bold tracking-tight">{formatEur(total)}</p>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((e) => (
                      <p key={e.id} className="text-[10px] text-muted-foreground truncate max-w-[72px]">
                        {e.name}
                      </p>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{items.length - 3} more</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground/50">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
