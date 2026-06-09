"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, addWeeks, subWeeks, parseISO } from "date-fns";
import { getWeekStartDate, getWeekDates } from "@/lib/dates";
import { getPhaseDisplayName } from "@/lib/training/periodization";
import { DayColumn } from "./day-column";
import { ActivityForm } from "./activity-form";
import { SchedulePreferencesDialog, type GoalPatch } from "./schedule-preferences-dialog";
import {
  LinkedLogActionDialog,
  type BridgedLogAction,
} from "@/components/activities/linked-log-action-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Role,
  Goal,
  Activity,
  RecurringActivity,
  Quadrant,
  SessionType,
} from "@/types";
import type { ScheduleProposal } from "@/lib/scheduler";

function formatWeekHeader(monday: Date): string {
  const sunday = addWeeks(monday, 1);
  sunday.setDate(sunday.getDate() - 1);
  const monStr = format(monday, "EEE d");
  const sunStr = format(sunday, "EEE d");
  const monMonth = format(monday, "MMM");
  const sunMonth = format(sunday, "MMM");
  const year = format(sunday, "yyyy");
  if (monMonth === sunMonth) {
    return `${monStr} – ${sunStr} ${monMonth} ${year}`;
  }
  return `${monStr} ${monMonth} – ${sunStr} ${sunMonth} ${year}`;
}

export function ThisWeekView() {
  const [currentWeekMonday, setCurrentWeekMonday] = useState<string>(() =>
    getWeekStartDate(new Date())
  );

  const [roles, setRoles] = useState<Role[]>([]);
  const [focusGoals, setFocusGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recurring, setRecurring] = useState<RecurringActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusGoalCount, setFocusGoalCount] = useState(0);

  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [defaultStartTime, setDefaultStartTime] = useState<string>("");

  const [prefsDialogOpen, setPrefsDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [pendingUncheck, setPendingUncheck] = useState<{ id: number; title: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null);

  const [trainingPlanData, setTrainingPlanData] = useState<
    Record<number, { trainingSessionsPerWeek: number | null; supplementalSessionsPerWeek: number | null }>
  >({});
  const [trainingPhaseInfo, setTrainingPhaseInfo] = useState<
    Record<number, { phaseName: string; phaseStartDate: string; durationWeeks: number }>
  >({});

  // Anchored to today — not the displayed week — so that generating from
  // /this-week always targets the current month even when the user has
  // navigated forward or backward to a different week.
  const currentMonth = useMemo(() => format(new Date(), "yyyy-MM"), []);
  const router = useRouter();

  const weekDates = useMemo(() => getWeekDates(currentWeekMonday), [currentWeekMonday]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const responses = await Promise.all([
      fetch("/api/roles"),
      fetch(`/api/weekly-plans/${currentWeekMonday}/goals`),
      fetch(`/api/activities?weekStart=${currentWeekMonday}`),
      fetch("/api/recurring-activities"),
    ]);
    const [rolesData, focusData, activitiesData, recurringData] = await Promise.all(
      responses.map((r) => r.json())
    );

    setRoles(rolesData);
    setFocusGoals(focusData);
    setActivities(activitiesData);
    setRecurring(recurringData);
    setFocusGoalCount(Array.isArray(focusData) ? focusData.length : 0);

    // Single batch request for all focus goals' training plans.
    const goalIds: number[] = Array.isArray(focusData) ? focusData.map((g: { id: number }) => g.id) : [];
    if (goalIds.length > 0) {
      const batchRes = await fetch(`/api/training-plans?goalIds=${goalIds.join(",")}`);
      const planResults: Array<{ goalId: number; trainingSessionsPerWeek: number | null; supplementalSessionsPerWeek: number | null; phases: Array<{ status: string; phaseType: string; startDate: string; durationWeeks: number }> }> = batchRes.ok ? await batchRes.json() : [];

      const planDataMap: Record<number, { trainingSessionsPerWeek: number | null; supplementalSessionsPerWeek: number | null }> = {};
      const phaseInfoMap: Record<number, { phaseName: string; phaseStartDate: string; durationWeeks: number }> = {};

      for (const plan of planResults) {
        planDataMap[plan.goalId] = {
          trainingSessionsPerWeek: plan.trainingSessionsPerWeek ?? null,
          supplementalSessionsPerWeek: plan.supplementalSessionsPerWeek ?? null,
        };
        const activePhase = Array.isArray(plan.phases)
          ? plan.phases.find((p) => p.status === "active")
          : null;
        if (activePhase) {
          phaseInfoMap[plan.goalId] = {
            phaseName: getPhaseDisplayName(activePhase.phaseType),
            phaseStartDate: activePhase.startDate,
            durationWeeks: activePhase.durationWeeks,
          };
        }
      }

      setTrainingPlanData(planDataMap);
      setTrainingPhaseInfo(phaseInfoMap);
    } else {
      setTrainingPlanData({});
      setTrainingPhaseInfo({});
    }

    setLoading(false);
  }, [currentWeekMonday]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const trainingPlanMinimums = useMemo<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    for (const [idStr, plan] of Object.entries(trainingPlanData)) {
      const id = Number(idStr);
      if (plan.trainingSessionsPerWeek != null && plan.supplementalSessionsPerWeek != null) {
        map[id] = plan.trainingSessionsPerWeek + plan.supplementalSessionsPerWeek;
      } else {
        map[id] = 3;
      }
    }
    return map;
  }, [trainingPlanData]);

  function navigatePrev() {
    setCurrentWeekMonday((prev) => format(subWeeks(parseISO(prev), 1), "yyyy-MM-dd"));
  }

  function navigateNext() {
    setCurrentWeekMonday((prev) => format(addWeeks(parseISO(prev), 1), "yyyy-MM-dd"));
  }

  function openAddActivity(dateStr: string, startTime?: string) {
    setEditingActivity(null);
    setDefaultDate(dateStr);
    setDefaultStartTime(startTime ?? "");
    setActivityFormOpen(true);
  }

  async function handleSaveActivity(data: {
    title: string;
    activityDate: string;
    startTime: string;
    endTime: string;
    quadrant: Quadrant;
    roleId: number | null;
    goalId: number | null;
    activityTypeId: number | null;
    notes: string;
    sessionType: SessionType;
  }) {
    if (editingActivity) {
      await fetch(`/api/activities/${editingActivity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setActivityFormOpen(false);
    setEditingActivity(null);
    await fetchAll();
  }

  async function performDelete(id: number, bridgedLogAction?: BridgedLogAction) {
    const qs = bridgedLogAction ? `?bridgedLogAction=${bridgedLogAction}` : "";
    const res = await fetch(`/api/activities/${id}${qs}`, { method: "DELETE" });
    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as { linkedLogId?: number } | null;
      if (body?.linkedLogId != null) {
        const activity = activities.find((a) => a.id === id);
        setPendingDelete({ id, title: activity?.title ?? "this activity" });
        return;
      }
    }
    setActivities((prev) => prev.filter((a) => a.id !== id));
    await fetchAll();
  }

  function handleDeleteActivity(activity: Activity) {
    setActivityFormOpen(false);
    setEditingActivity(null);
    if (activity.linkedLogId != null) {
      setPendingDelete({ id: activity.id, title: activity.title });
      return;
    }
    void performDelete(activity.id);
  }

  async function persistToggle(id: number, isCompleted: boolean, bridgedLogAction?: BridgedLogAction) {
    await fetch(`/api/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted, ...(bridgedLogAction != null && { bridgedLogAction }) }),
    });
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, isCompleted } : a)));
  }

  function handleToggleActivity(id: number, isCompleted: boolean) {
    if (!isCompleted) {
      const activity = activities.find((a) => a.id === id);
      if (activity?.linkedLogId != null) {
        setPendingUncheck({ id, title: activity.title });
        return;
      }
    }
    void persistToggle(id, isCompleted);
  }

  function handleGenerateSchedule() {
    if (focusGoals.length === 0) {
      router.push("/monthly-plan");
      return;
    }
    setPrefsError(null);
    setSuccessMessage(null);
    setPrefsDialogOpen(true);
  }

  async function handleConfirmGenerate(startDate: string, endDate: string, patches: GoalPatch[]) {
    setConfirming(true);
    try {
      if (patches.length > 0) {
        const patchResults = await Promise.all(
          patches.map(({ id, prefs }) =>
            fetch(`/api/goals/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(prefs),
            })
          )
        );
        if (patchResults.some((r) => !r.ok)) {
          throw new Error("Failed to update goal preferences. Please try again.");
        }
      }

      const genRes = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: currentWeekMonday,
          scope: "month",
          regenerate: true,
          month: currentMonth,
          startDate,
          endDate,
        }),
      });
      if (!genRes.ok) throw new Error("Failed to generate schedule. Please try again.");
      const data = await genRes.json();
      const { focusGoalIds, dateRange, regenerate, ...proposal } = data;

      const applyRes = await fetch("/api/schedule/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: (proposal as ScheduleProposal).activities,
          regenerate: true,
          focusGoalIds,
          dateRange,
        }),
      });
      if (!applyRes.ok) throw new Error("Failed to apply schedule. Please try again.");

      setPrefsDialogOpen(false);
      const count = (proposal as ScheduleProposal).activities?.length ?? 0;
      setSuccessMessage(`Scheduled ${count} ${count === 1 ? "activity" : "activities"}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchAll();
    } catch (err) {
      setPrefsError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  const mondayDate = parseISO(currentWeekMonday);
  const headerLabel = formatWeekHeader(mondayDate);

  return (
    <div className="px-6 py-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={navigatePrev} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">{headerLabel}</h1>
          <Button variant="ghost" size="icon" onClick={navigateNext} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {focusGoalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {focusGoalCount} {focusGoalCount === 1 ? "goal" : "goals"} in focus this month
            </span>
          )}
          <Link
            href="/monthly-plan"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            View Monthly Plan
          </Link>
          <Button size="sm" onClick={handleGenerateSchedule} disabled={confirming}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generate Schedule
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-2 text-sm text-green-800 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {/* Week grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {weekDates.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const dayActivities = activities.filter((a) => a.activityDate === dateStr);
              return (
                <DayColumn
                  key={dateStr}
                  date={date}
                  activities={dayActivities}
                  recurringActivities={recurring}
                  onAddActivity={openAddActivity}
                  onToggleActivity={handleToggleActivity}
                  onClickActivity={(activity) => {
                    setEditingActivity(activity);
                    setActivityFormOpen(true);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Activity form dialog */}
      <ActivityForm
        key={editingActivity?.id ?? "new"}
        open={activityFormOpen}
        onClose={() => {
          setActivityFormOpen(false);
          setEditingActivity(null);
        }}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        roles={roles}
        goals={focusGoals}
        activity={editingActivity}
        defaultDate={defaultDate}
        defaultStartTime={defaultStartTime}
      />

      <SchedulePreferencesDialog
        open={prefsDialogOpen}
        onClose={() => setPrefsDialogOpen(false)}
        focusGoals={focusGoals}
        currentMonth={currentMonth}
        onConfirm={handleConfirmGenerate}
        confirming={confirming}
        error={prefsError ?? undefined}
        trainingPlanMinimums={trainingPlanMinimums}
        trainingPhaseInfo={trainingPhaseInfo}
        relaxStartDateMax
      />

      <LinkedLogActionDialog
        open={pendingUncheck !== null}
        onClose={() => setPendingUncheck(null)}
        onConfirm={(action) => {
          if (pendingUncheck) void persistToggle(pendingUncheck.id, false, action);
          setPendingUncheck(null);
        }}
        mode="uncheck"
        activityTitle={pendingUncheck?.title}
      />

      <LinkedLogActionDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(action) => {
          if (pendingDelete) void performDelete(pendingDelete.id, action);
          setPendingDelete(null);
        }}
        mode="delete"
        activityTitle={pendingDelete?.title}
      />
    </div>
  );
}
