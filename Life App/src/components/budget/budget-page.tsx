"use client";

import { useState } from "react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BudgetDashboard } from "./budget-dashboard";
import { SpendingLog } from "./spending-log";
import { IncomeView } from "./income-view";
import { FixedCostsView } from "./fixed-costs-view";
import { CategoriesPage } from "./categories-page";
import { BudgetGoals } from "./budget-goals";

function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

function isCurrentMonth(month: string): boolean {
  return month === getCurrentMonth();
}

export function BudgetPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const monthDate = parseISO(month + "-01");

  function goPrev() {
    setMonth(format(subMonths(monthDate, 1), "yyyy-MM"));
  }

  function goNext() {
    setMonth(format(addMonths(monthDate, 1), "yyyy-MM"));
  }

  function goThisMonth() {
    setMonth(getCurrentMonth());
  }

  return (
    <div className="px-6 py-8 space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track income, spending, and savings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center">
            <div className="font-[family-name:var(--font-display)] font-semibold">
              {format(monthDate, "MMMM yyyy")}
            </div>
            {isCurrentMonth(month) ? (
              <span className="text-xs text-emerald-600 font-medium">
                This month
              </span>
            ) : (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={goThisMonth}
              >
                This month
              </Button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="spending">Log Spending</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="fixed">Fixed Costs</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="goals">Planned Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <BudgetDashboard month={month} />
        </TabsContent>
        <TabsContent value="spending" className="mt-4">
          <SpendingLog month={month} />
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          <IncomeView month={month} />
        </TabsContent>
        <TabsContent value="fixed" className="mt-4">
          <FixedCostsView month={month} />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <CategoriesPage />
        </TabsContent>
        <TabsContent value="goals" className="mt-4">
          <BudgetGoals />
        </TabsContent>
      </Tabs>
    </div>
  );
}
