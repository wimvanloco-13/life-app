import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  goals,
  activities,
  recurringActivities,
  roles,
  weeklyPlans,
  weeklyFocusGoals,
  goalRoles,
  schedulerSettings,
  schedulerBlackoutDates,
  goalSessionPatterns,
  trainingPlans,
  trainingPhases,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateSchedule, type MonthlyOverride, type SessionPattern, type TrainingPhaseInfo } from "@/lib/scheduler";
import { getPhaseDisplayName } from "@/lib/training/periodization";
import { defaultSplit, type TrainingPlanSplit } from "@/lib/training/split";
import { deriveQuadrant } from "@/lib/quadrants";
import type { SchedulerSettings } from "@/types";
import { auth } from "@/lib/auth";

async function getSettings(userId: string): Promise<SchedulerSettings> {
  const rows = await db.select().from(schedulerSettings).where(eq(schedulerSettings.userId, userId));
  if (rows.length > 0) {
    return {
      id: rows[0].id,
      workStartTime: rows[0].workStartTime,
      workEndTime: rows[0].workEndTime,
      workDays: rows[0].workDays.split(",").map(Number),
      enforceWeeklySpread: rows[0].enforceWeeklySpread ?? true,
      maxActivitiesPerDay: rows[0].maxActivitiesPerDay ?? 4,
    };
  }
  return { id: 0, workStartTime: "09:00", workEndTime: "17:00", workDays: [1, 2, 3, 4, 5], enforceWeeklySpread: true, maxActivitiesPerDay: 4 };
}

async function getBlackoutDates(userId: string, year: number): Promise<Set<string>> {
  const allBlackouts = await db.select().from(schedulerBlackoutDates).where(eq(schedulerBlackoutDates.userId, userId));
  const dates = new Set<string>();
  for (const b of allBlackouts) {
    if (b.isRecurring) {
      const [, mm, dd] = b.date.split("-");
      dates.add(`${year}-${mm}-${dd}`);
    } else {
      dates.add(b.date);
    }
  }
  return dates;
}

function getDateRange(startDate: string, days: number): string[] {
  const [y, m, d] = startDate.split("-").map(Number);
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(y, m - 1, d + i);
    dates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

function getMonthDateRange(weekStartDate: string): string[] {
  const [y, m] = weekStartDate.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const dates: string[] = [];
  for (let d = firstDay.getDate(); d <= lastDay.getDate(); d++) {
    const date = new Date(y, m - 1, d);
    dates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

function parseDayIds(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const body = await request.json();
    const { weekStartDate, scope = "week", regenerate = false, month, startDate } = body;

    if (!weekStartDate) return NextResponse.json({ error: "weekStartDate is required" }, { status: 400 });

    const monthFirstDay = scope === "month" && month ? `${month}-01` : weekStartDate;

    const plan = await db.select().from(weeklyPlans).where(and(eq(weeklyPlans.weekStartDate, weekStartDate), eq(weeklyPlans.userId, userId)));
    if (plan.length === 0) return NextResponse.json({ error: "No weekly plan found. Select focus goals first." }, { status: 404 });

    const focusRows = await db
      .select({
        goalId: goals.id,
        title: goals.title,
        description: goals.description,
        targetDate: goals.targetDate,
        sessionsPerWeek: goals.sessionsPerWeek,
        activityTypeId: goals.activityTypeId,
        status: goals.status,
        isCompleted: goals.isCompleted,
        preferredDays: goals.preferredDays,
        preferredTimeSlot: goals.preferredTimeSlot,
        horizon: goals.horizon,
        parentGoalId: goals.parentGoalId,
        month: goals.month,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt,
      })
      .from(weeklyFocusGoals)
      .innerJoin(goals, and(eq(weeklyFocusGoals.goalId, goals.id), eq(goals.userId, userId)))
      .where(eq(weeklyFocusGoals.weeklyPlanId, plan[0].id));

    const goalIds = focusRows.map((r) => r.goalId);

    const allGR = await db
      .select({ goalId: goalRoles.goalId, roleId: roles.id, roleName: roles.name, roleColor: roles.color })
      .from(goalRoles)
      .innerJoin(roles, and(eq(goalRoles.roleId, roles.id), eq(roles.userId, userId)));

    const roleMap = new Map<number, { id: number; name: string; color: string }[]>();
    for (const row of allGR) {
      if (!goalIds.includes(row.goalId)) continue;
      const arr = roleMap.get(row.goalId) ?? [];
      arr.push({ id: row.roleId, name: row.roleName, color: row.roleColor });
      roleMap.set(row.goalId, arr);
    }

    const focusGoals = focusRows.map((r) => ({
      id: r.goalId,
      title: r.title,
      description: r.description,
      quadrant: deriveQuadrant(r.targetDate),
      targetDate: r.targetDate,
      sessionsPerWeek: r.sessionsPerWeek,
      activityTypeId: r.activityTypeId ?? null,
      status: r.status,
      isCompleted: r.isCompleted,
      preferredDays: r.preferredDays,
      preferredTimeSlot: r.preferredTimeSlot,
      horizon: r.horizon,
      parentGoalId: r.parentGoalId,
      month: r.month,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      roles: roleMap.get(r.goalId) ?? [],
    }));

    const [allRoles, allRecurring, settings] = await Promise.all([
      db.select().from(roles).where(and(eq(roles.isArchived, false), eq(roles.userId, userId))),
      db.select().from(recurringActivities).where(and(eq(recurringActivities.isPaused, false), eq(recurringActivities.userId, userId))),
      getSettings(userId),
    ]);

    const dates = scope === "month" ? getMonthDateRange(monthFirstDay) : getDateRange(weekStartDate, 7);

    // Clip the working date range so no activity is proposed before startDate.
    // startDate only raises the floor — the ceiling (end of month) is unchanged.
    const effectiveDates = startDate ? dates.filter((d) => d >= startDate) : dates;

    const allActivities = await db.select().from(activities).where(eq(activities.userId, userId));
    let scopeActivities = allActivities.filter((a) => effectiveDates.includes(a.activityDate));

    if (regenerate) {
      const focusGoalIds = new Set(goalIds);
      // Only remove existing scheduled activities within the effective date range.
      scopeActivities = scopeActivities.filter((a) => !(a.goalId && focusGoalIds.has(a.goalId) && !a.createdFromLog && !a.isCompleted));
    }

    const [schedYear, schedMonth] = monthFirstDay.split("-").map(Number);
    const currentMonthStr = `${schedYear}-${String(schedMonth).padStart(2, "0")}`;

    const parentIdMap = new Map<number, number>();
    for (const fg of focusGoals) {
      if (fg.horizon === "monthly" && fg.parentGoalId) parentIdMap.set(fg.id, fg.parentGoalId);
    }

    const monthlyOverrides = new Map<number, MonthlyOverride>();
    for (const fg of focusGoals) {
      if (parentIdMap.has(fg.id)) continue;
      const children = await db.select().from(goals).where(and(eq(goals.parentGoalId, fg.id), eq(goals.month, currentMonthStr), eq(goals.horizon, "monthly"), eq(goals.userId, userId)));
      if (children.length > 0) {
        const child = children[0];
        monthlyOverrides.set(fg.id, {
          sessionsPerWeek: child.sessionsPerWeek,
          benchmarkLabel: `Using ${new Date(schedYear, schedMonth - 1).toLocaleString("en", { month: "long" })} benchmark: ${child.sessionsPerWeek} sessions/week`,
        });
      }
    }

    const blackoutDates = await getBlackoutDates(userId, schedYear);

    const goalPatterns = new Map<number, SessionPattern[]>();
    for (const fg of focusGoals) {
      const lookupId = parentIdMap.get(fg.id) ?? fg.id;
      const patterns = await db.select().from(goalSessionPatterns).where(eq(goalSessionPatterns.goalId, lookupId));
      if (patterns.length > 0) {
        goalPatterns.set(fg.id, patterns.sort((a, b) => a.position - b.position).map((p) => ({ position: p.position, label: p.label, restDaysAfter: p.restDaysAfter })));
      }
    }

    const trainingPhaseMap = new Map<number, TrainingPhaseInfo>();
    const trainingPlanSplitMap = new Map<number, TrainingPlanSplit>();
    for (const fg of focusGoals) {
      const lookupId = parentIdMap.get(fg.id) ?? fg.id;
      const plans = await db.select().from(trainingPlans).where(and(eq(trainingPlans.goalId, lookupId), eq(trainingPlans.userId, userId)));
      if (plans.length > 0) {
        const planRow = plans[0];
        const override = monthlyOverrides.get(fg.id);
        const spwForSplit = override?.sessionsPerWeek ?? fg.sessionsPerWeek;
        let trainingCount = planRow.trainingSessionsPerWeek;
        let supplementalCount = planRow.supplementalSessionsPerWeek;
        if (trainingCount == null || supplementalCount == null) {
          const d = defaultSplit(spwForSplit);
          trainingCount = d.training;
          supplementalCount = d.supplemental;
        }
        trainingPlanSplitMap.set(fg.id, {
          trainingSessionsPerWeek: trainingCount,
          supplementalSessionsPerWeek: supplementalCount,
          trainingPreferredDays: parseDayIds(planRow.trainingPreferredDays),
          supplementalPreferredDays: parseDayIds(planRow.supplementalPreferredDays),
        });

        const activePhases = await db.select().from(trainingPhases).where(and(eq(trainingPhases.trainingPlanId, planRow.id), eq(trainingPhases.status, "active")));
        if (activePhases.length > 0) {
          const ap = activePhases[0];
          trainingPhaseMap.set(fg.id, {
            phaseType: ap.phaseType,
            displayName: getPhaseDisplayName(ap.phaseType),
            phaseStartDate: ap.startDate,
            durationWeeks: ap.durationWeeks,
            isRest: ap.phaseType === "rest" || ap.phaseType === "recovery",
            description: ap.description || undefined,
            sportFocusContent: ap.sportFocusContent ?? undefined,
            supplementalContent: ap.supplementalContent ?? undefined,
            mentalGameContent: ap.mentalGameContent ?? undefined,
            limitationNotes: ap.limitationNotes || undefined,
          });
        }
      }
    }

    const proposal = generateSchedule(
      focusGoals as any,
      scopeActivities as any,
      allRecurring as any,
      allRoles as any,
      scope === "month" ? (effectiveDates[0] ?? monthFirstDay) : weekStartDate,
      settings,
      scope as "week" | "month",
      monthlyOverrides.size > 0 ? monthlyOverrides : undefined,
      blackoutDates,
      goalPatterns.size > 0 ? goalPatterns : undefined,
      trainingPhaseMap.size > 0 ? trainingPhaseMap : undefined,
      trainingPlanSplitMap.size > 0 ? trainingPlanSplitMap : undefined
    );

    return NextResponse.json({
      ...proposal,
      regenerate,
      focusGoalIds: regenerate ? goalIds : [],
      dateRange: regenerate ? { start: effectiveDates[0] ?? dates[0], end: effectiveDates[effectiveDates.length - 1] ?? dates[dates.length - 1] } : null,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate schedule", details: String(error) }, { status: 500 });
  }
}
