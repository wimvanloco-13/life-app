"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetSettingsDialog } from "./budget-settings-dialog";
import { BudgetCycleSummary } from "./budget-cycle-summary";
import { BudgetBucketsPanel } from "./budget-buckets-panel";
import { BudgetInvestingLadder } from "./budget-investing-ladder";
import { BudgetTargetsPanel } from "./budget-targets-panel";
import { Settings } from "lucide-react";
import type { BudgetSettings, BudgetSummary, PlannedExpense } from "@/types";

interface BudgetDashboardProps {
  month: string;
}

export function BudgetDashboard({ month }: BudgetDashboardProps) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [allPlannedExpenses, setAllPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`/api/budget/summary?month=${month}`);
    if (res.ok) setSummary(await res.json());
  }, [month]);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/budget-settings");
    if (res.ok) setSettings(await res.json());
  }, []);

  const fetchAllPlannedExpenses = useCallback(async () => {
    const year = month.slice(0, 4);
    const res = await fetch(`/api/planned-expenses?year=${year}`);
    if (res.ok) setAllPlannedExpenses(await res.json());
  }, [month]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchSettings(), fetchAllPlannedExpenses()]).finally(() =>
      setLoading(false)
    );
  }, [fetchSummary, fetchSettings, fetchAllPlannedExpenses]);

  async function handleSave25x(
    targetAnnualSpending: number | null,
    statePensionAnnualAmount: number | null
  ) {
    const res = await fetch("/api/budget-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetAnnualSpending, statePensionAnnualAmount }),
    });
    if (res.ok) {
      await Promise.all([fetchSettings(), fetchSummary()]);
    }
  }

  if (loading || !summary || !settings) {
    return (
      <div className="space-y-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-0 space-y-12">
      {/* Settings gear — top right */}
      <div className="flex justify-end -mb-8">
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Budget settings">
          <Settings className="h-4 w-4" />
        </Button>
        <BudgetSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSaved={() => Promise.all([fetchSummary(), fetchSettings()])}
        />
      </div>

      {/* Orientation copy (spec §2.3) */}
      <p className="text-sm text-muted-foreground max-w-prose">
        The <span className="text-foreground font-medium">Buckets</span> view shows where every euro
        of your income is going. The{" "}
        <span className="text-foreground font-medium">Cycle</span> view shows what&apos;s still
        spendable this month. Same money, two questions.
      </p>

      {/* Section 1: Cycle */}
      <BudgetCycleSummary summary={summary} />

      {/* Section 2: Buckets */}
      <BudgetBucketsPanel summary={summary} />

      {/* Section 3: Investing Ladder */}
      <BudgetInvestingLadder rungs={summary.investingLadder} />

      {/* Section 4: Targets */}
      <BudgetTargetsPanel
        summary={summary}
        settings={settings}
        allPlannedExpenses={allPlannedExpenses}
        onSave25x={handleSave25x}
      />
    </div>
  );
}
