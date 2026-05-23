import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgetSettings, incomeEntries, fixedCosts, spendingEntries, spendingCategories, plannedExpenses } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { format, parseISO, getDaysInMonth, differenceInDays, endOfMonth, parse, addMonths, subMonths, isBefore, isAfter } from "date-fns";
import type { BudgetSummary, BucketActual, BucketKey, BucketTargets, InvestingLadderRung, Target25x } from "@/types";
import { validateBucketTargets, deriveInvestingLadder, computeTarget25x } from "@/lib/budget-computations";
import { auth } from "@/lib/auth";

async function getOrCreateBudgetSettings(userId: string) {
  const rows = await db.select().from(budgetSettings).where(eq(budgetSettings.userId, userId));
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(budgetSettings).values({ currency: "EUR", monthlySavingsTarget: 0, userId }).returning();
  return created!;
}

function getDaysLeft(month: string): number {
  const today = new Date();
  const targetMonth = parse(month + "-01", "yyyy-MM-dd", new Date());
  const targetYear = targetMonth.getFullYear();
  const targetMonthNum = targetMonth.getMonth();
  if (targetYear < today.getFullYear()) return 0;
  if (targetYear === today.getFullYear() && targetMonthNum < today.getMonth()) return 0;
  if (targetYear > today.getFullYear()) return getDaysInMonth(targetMonth);
  if (targetMonthNum > today.getMonth()) return getDaysInMonth(targetMonth);
  return differenceInDays(endOfMonth(today), today) + 1;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const today = new Date();
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : format(today, "yyyy-MM");

  const settings = await getOrCreateBudgetSettings(userId);
  const monthStart = month + "-01";
  const monthEnd = format(endOfMonth(parseISO(monthStart)), "yyyy-MM-dd");

  const monthIncomeEntries = await db.select().from(incomeEntries).where(and(eq(incomeEntries.month, month), eq(incomeEntries.userId, userId)));
  const recurringEntries = await db.select().from(incomeEntries).where(and(eq(incomeEntries.isRecurring, true), eq(incomeEntries.userId, userId)));

  const recurringBySource = new Map<string, (typeof recurringEntries)[0]>();
  for (const entry of recurringEntries) {
    const existing = recurringBySource.get(entry.source);
    if (!existing || (entry.createdAt && existing.createdAt && entry.createdAt > existing.createdAt)) recurringBySource.set(entry.source, entry);
  }

  const monthSources = new Set(monthIncomeEntries.map((e) => e.source));
  let totalIncome = monthIncomeEntries.reduce((sum, e) => sum + e.amount, 0);
  for (const [, e] of recurringBySource) {
    if (!monthSources.has(e.source)) totalIncome += e.amount;
  }

  const allFixedCosts = await db.select().from(fixedCosts).where(and(eq(fixedCosts.isActive, true), eq(fixedCosts.userId, userId)));
  const totalFixedCosts = allFixedCosts.filter((fc) => fc.endMonth == null || (fc.startMonth <= month && fc.endMonth >= month)).reduce((sum, fc) => sum + fc.amount, 0);

  const monthlySavingsTarget = settings.monthlySavingsTarget ?? 0;
  const spendingBudget = totalIncome - totalFixedCosts - monthlySavingsTarget;

  const allSpending = await db.select().from(spendingEntries).where(eq(spendingEntries.userId, userId));
  const monthSpending = allSpending.filter((e) => e.date >= monthStart && e.date <= monthEnd);
  const totalSpent = monthSpending.reduce((sum, e) => sum + e.amount, 0);
  const remaining = spendingBudget - totalSpent;
  const daysLeft = getDaysLeft(month);
  const dailyAllowance = daysLeft > 0 ? Math.round((remaining / daysLeft) * 100) / 100 : 0;

  const byCategory = new Map<string, { amount: number; icon: string; color: string }>();
  const activeFixedCosts = allFixedCosts.filter((fc) => fc.endMonth == null || (fc.startMonth <= month && fc.endMonth >= month));
  for (const fc of activeFixedCosts) {
    const cur = byCategory.get(fc.category) ?? { amount: 0, icon: "home", color: "#6B7280" };
    cur.amount += fc.amount;
    byCategory.set(fc.category, cur);
  }
  for (const e of monthSpending) {
    const cur = byCategory.get(e.category) ?? { amount: 0, icon: "package", color: "#6B7280" };
    cur.amount += e.amount;
    byCategory.set(e.category, cur);
  }

  const categories = await db.select().from(spendingCategories).where(and(eq(spendingCategories.isArchived, false), eq(spendingCategories.userId, userId)));

  const monthPlannedExpenses = await db
    .select({
      id: plannedExpenses.id,
      name: plannedExpenses.name,
      amount: plannedExpenses.amount,
      month: plannedExpenses.month,
      categoryId: plannedExpenses.categoryId,
      categoryName: spendingCategories.name,
      categoryIcon: spendingCategories.icon,
      notes: plannedExpenses.notes,
      createdAt: plannedExpenses.createdAt,
      updatedAt: plannedExpenses.updatedAt,
    })
    .from(plannedExpenses)
    .leftJoin(spendingCategories, eq(plannedExpenses.categoryId, spendingCategories.id))
    .where(and(eq(plannedExpenses.month, month), eq(plannedExpenses.userId, userId)));

  const totalPlannedExpenses = monthPlannedExpenses.reduce((sum, pe) => sum + pe.amount, 0);

  const catMap = new Map(categories.map((c) => [c.name, c]));
  const spendingByCategory = Array.from(byCategory.entries()).map(([category, { amount }]) => {
    const cat = catMap.get(category);
    return { category, amount, icon: cat?.icon ?? "package", color: cat?.color ?? "#6B7280" };
  });

  let savingsGoal: BudgetSummary["savingsGoal"] = null;
  if (settings.savingsGoalTotal != null && settings.savingsGoalTotal > 0) {
    const allSavingsEntries = await db.select().from(spendingEntries)
      .where(and(eq(spendingEntries.userId, userId), eq(spendingEntries.category, "Savings")));
    const allWithdrawalEntries = await db.select().from(spendingEntries)
      .where(and(eq(spendingEntries.userId, userId), eq(spendingEntries.category, "Savings Withdrawal")));

    const totalContributions = allSavingsEntries.reduce((s, e) => s + e.amount, 0);
    const totalWithdrawals = allWithdrawalEntries.reduce((s, e) => s + e.amount, 0);

    // Count recurring fixed costs categorised as "Savings" across all months they've been active up to and including the viewed month.
    const savingsFixedCosts = await db.select().from(fixedCosts)
      .where(and(eq(fixedCosts.userId, userId), eq(fixedCosts.category, "Savings")));

    let fixedSavingsTotal = 0;
    const viewedMonthDate = parse(month + "-01", "yyyy-MM-dd", new Date());
    const currentMonthDate = parse(format(today, "yyyy-MM") + "-01", "yyyy-MM-dd", new Date());
    // Never count future months — cap at whichever is earlier: the viewed month or today's month.
    const upperBound = isBefore(viewedMonthDate, currentMonthDate) ? viewedMonthDate : currentMonthDate;
    for (const fc of savingsFixedCosts) {
      const start = parse(fc.startMonth + "-01", "yyyy-MM-dd", new Date());
      const end = fc.endMonth ? parse(fc.endMonth + "-01", "yyyy-MM-dd", new Date()) : upperBound;
      const effectiveEnd = isBefore(end, upperBound) ? end : upperBound;
      if (isAfter(start, effectiveEnd)) continue;
      let d = start;
      while (!isAfter(d, effectiveEnd)) {
        fixedSavingsTotal += fc.amount;
        d = addMonths(d, 1);
      }
    }

    const startingBalance = settings.savingsStartingBalance ?? 0;
    const saved = Math.max(0, startingBalance + totalContributions + fixedSavingsTotal - totalWithdrawals);

    const total = settings.savingsGoalTotal;
    savingsGoal = { total, targetDate: settings.savingsGoalTargetDate, saved, percentage: total > 0 ? Math.min(100, Math.round((saved / total) * 10000) / 100) : 0 };
  }

  // ── Buckets (Task 1.9) ────────────────────────────────────────────────────
  // Bucket actuals are expressed as % of totalIncome (Sethi-style),
  // NOT as % of spendingBudget. Base is always totalIncome.
  let parsedBucketTargets: BucketTargets | null = null;
  if (settings.bucketTargets) {
    try {
      const parsed = JSON.parse(settings.bucketTargets);
      const validation = validateBucketTargets(parsed);
      if (validation.ok) parsedBucketTargets = validation.value;
    } catch {
      // corrupt JSON → fall through to defaults
    }
  }
  const bucketTargets: BucketTargets = parsedBucketTargets ?? { fixed: 50, invest: 10, save: 10, guilt_free: 30 };

  const BUCKET_LABELS: Record<BucketKey, string> = {
    fixed: "Fixed",
    invest: "Invest",
    save: "Save",
    guilt_free: "Guilt-Free Spending",
  };

  // Build a map of category name → bucket key
  const catBucketMap = new Map<string, BucketKey | null>();
  for (const cat of categories) {
    catBucketMap.set(cat.name, (cat.bucket as BucketKey | null) ?? null);
  }

  // Sum actual spending + active fixed costs per bucket (for the viewed month)
  const bucketAmounts: Record<BucketKey | "unassigned", number> = {
    fixed: 0,
    invest: 0,
    save: 0,
    guilt_free: 0,
    unassigned: 0,
  };

  for (const fc of activeFixedCosts) {
    const bucket = catBucketMap.get(fc.category) ?? null;
    if (bucket) bucketAmounts[bucket] += fc.amount;
    else bucketAmounts.unassigned += fc.amount;
  }
  for (const e of monthSpending) {
    const bucket = catBucketMap.get(e.category) ?? null;
    if (bucket) bucketAmounts[bucket] += e.amount;
    else bucketAmounts.unassigned += e.amount;
  }

  const incomeBase = totalIncome > 0 ? totalIncome : 1;
  const buckets: BucketActual[] = (["fixed", "invest", "save", "guilt_free"] as BucketKey[]).map((key) => ({
    key,
    label: BUCKET_LABELS[key],
    targetPct: bucketTargets[key],
    actualPct: Math.round((bucketAmounts[key] / incomeBase) * 10000) / 100,
    actualAmount: bucketAmounts[key],
  }));
  if (bucketAmounts.unassigned > 0) {
    buckets.push({
      key: "unassigned",
      label: "Unassigned",
      targetPct: null,
      actualPct: Math.round((bucketAmounts.unassigned / incomeBase) * 10000) / 100,
      actualAmount: bucketAmounts.unassigned,
    });
  }

  // ── Investing ladder (Task 1.10) ──────────────────────────────────────────
  // Compute saved balance (same formula as savingsGoal.saved above)
  const allSavingsEntriesForLadder = await db.select().from(spendingEntries)
    .where(and(eq(spendingEntries.userId, userId), eq(spendingEntries.category, "Savings")));
  const allWithdrawalEntriesForLadder = await db.select().from(spendingEntries)
    .where(and(eq(spendingEntries.userId, userId), eq(spendingEntries.category, "Savings Withdrawal")));
  const totalContributionsForLadder = allSavingsEntriesForLadder.reduce((s, e) => s + e.amount, 0);
  const totalWithdrawalsForLadder = allWithdrawalEntriesForLadder.reduce((s, e) => s + e.amount, 0);
  const savingsFixedForLadder = await db.select().from(fixedCosts)
    .where(and(eq(fixedCosts.userId, userId), eq(fixedCosts.category, "Savings")));

  const viewedMonthDateForLadder = parse(month + "-01", "yyyy-MM-dd", new Date());
  const currentMonthDateForLadder = parse(format(today, "yyyy-MM") + "-01", "yyyy-MM-dd", new Date());
  const upperBoundForLadder = isBefore(viewedMonthDateForLadder, currentMonthDateForLadder) ? viewedMonthDateForLadder : currentMonthDateForLadder;

  let fixedSavingsTotalForLadder = 0;
  for (const fc of savingsFixedForLadder) {
    const start = parse(fc.startMonth + "-01", "yyyy-MM-dd", new Date());
    const end = fc.endMonth ? parse(fc.endMonth + "-01", "yyyy-MM-dd", new Date()) : upperBoundForLadder;
    const effectiveEnd = isBefore(end, upperBoundForLadder) ? end : upperBoundForLadder;
    if (isAfter(start, effectiveEnd)) continue;
    let d = start;
    while (!isAfter(d, effectiveEnd)) {
      fixedSavingsTotalForLadder += fc.amount;
      d = addMonths(d, 1);
    }
  }
  const startingBalanceForLadder = settings.savingsStartingBalance ?? 0;
  const computedSaved = Math.max(0, startingBalanceForLadder + totalContributionsForLadder + fixedSavingsTotalForLadder - totalWithdrawalsForLadder);

  // Average monthly fixed costs over last 3 completed months
  const prev3Months: string[] = [];
  for (let i = 1; i <= 3; i++) {
    prev3Months.push(format(subMonths(parse(format(today, "yyyy-MM") + "-01", "yyyy-MM-dd", new Date()), i), "yyyy-MM"));
  }
  let totalFixedCostsFor3Months = 0;
  let monthsWithData = 0;
  for (const pm of prev3Months) {
    const pmFixedCosts = allFixedCosts.filter(
      (fc) => fc.startMonth <= pm && (fc.endMonth == null || fc.endMonth >= pm)
    ).reduce((sum, fc) => sum + fc.amount, 0);
    if (pmFixedCosts > 0) {
      totalFixedCostsFor3Months += pmFixedCosts;
      monthsWithData++;
    }
  }
  const avgMonthlyFixed = monthsWithData > 0 ? totalFixedCostsFor3Months / monthsWithData : totalFixedCosts;

  const investCategoryNames = new Set(
    categories.filter((c) => c.bucket === "invest").map((c) => c.name.toLowerCase())
  );

  const investingLadder: InvestingLadderRung[] = deriveInvestingLadder({
    computedSaved,
    avgMonthlyFixedCosts: avgMonthlyFixed,
    investCategoryNames,
  });

  // ── 25× target (Task 1.11) ────────────────────────────────────────────────
  const last12MonthsStart = format(subMonths(parse(format(today, "yyyy-MM") + "-01", "yyyy-MM-dd", new Date()), 12), "yyyy-MM-dd");
  const allSpendingForTarget = await db.select().from(spendingEntries)
    .where(and(eq(spendingEntries.userId, userId), gte(spendingEntries.date, last12MonthsStart)));
  const trailingAnnualSpending = allSpendingForTarget.reduce((s, e) => s + e.amount, 0);

  const target25x: Target25x = computeTarget25x({
    trailingAnnualSpending,
    overrideAnnualSpending: settings.targetAnnualSpending ?? null,
    statePensionAnnualAmount: settings.statePensionAnnualAmount ?? null,
  });

  const summary: BudgetSummary = {
    month, totalIncome, totalFixedCosts, monthlySavingsTarget, spendingBudget, totalSpent,
    remaining, dailyAllowance, daysLeft, spendingByCategory, savingsGoal,
    totalPlannedExpenses, plannedExpenses: monthPlannedExpenses,
    buckets, investingLadder, target25x,
  };
  return NextResponse.json(summary);
}
