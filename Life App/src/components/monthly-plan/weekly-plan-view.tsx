"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Repeat,
  Calendar as CalendarIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { EmptyState } from "@/components/ui/empty-state";
import { DayColumn } from "./day-column";
import { ActivityForm } from "./activity-form";
import { SchedulePreview } from "./schedule-preview";
import { SchedulePreferencesDialog, type GoalPatch } from "./schedule-preferences-dialog";
import { RecurringManager } from "./recurring-manager";
import { FocusPicker } from "./focus-picker";
import { SchedulerSettingsDialog } from "./scheduler-settings-dialog";
import {
  LinkedLogActionDialog,
  type BridgedLogAction,
} from "@/components/activities/linked-log-action-dialog";
import { getWeekStartDate, getWeekDates } from "@/lib/dates";
import {
  getSessionTypeCardClasses,
  shouldShowSupplementalBadge,
} from "@/lib/session-type-styles";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachWeekOfInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Role,
  Goal,
  Activity,
  RecurringActivity,
  WeeklyPlan,
  Quadrant,
  SessionType,
} from "@/types";
import type { ScheduleProposal } from "@/lib/scheduler";

export function WeeklyPlanView() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [focusGoals, setFocusGoals] = useState<Goal[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recurring, setRecurring] = useState<RecurringActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [defaultStartTime, setDefaultStartTime] = useState<string>("");

  const [recurringOpen, setRecurringOpen] = useState(false);

  const [prefsDialogOpen, setPrefsDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [focusPickerOpen, setFocusPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [draggingActivity, setDraggingActivity] = useState<Activity | null>(null);

  // Un-check prompt state. Populated when the user clicks the checkbox to
  // un-check an activity that has a linked log; the dialog asks whether to
  // delete or unlink the log before the PATCH fires.
  const [pendingUncheck, setPendingUncheck] = useState<{
    id: number;
    title: string;
  } | null>(null);

  // Delete prompt state. Populated when deleting an activity that has a linked
  // log; the dialog asks whether to delete or unlink the log first.
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // For month view, we fetch activities for the entire month
  const [monthActivities, setMonthActivities] = useState<Activity[]>([]);

  const fetchAll = useCallback(async () => {
    const ws = getWeekStartDate(new Date(currentMonth + "-01T00:00:00"));
    setLoading(true);

    const fetches = [
      fetch(`/api/weekly-plans?week=${ws}`),
      fetch("/api/roles"),
      fetch(`/api/weekly-plans/${ws}/goals`),
      fetch("/api/goals?status=active"),
      fetch(`/api/activities?weekStart=${ws}`),
      fetch("/api/recurring-activities"),
    ];

    const responses = await Promise.all(fetches);
    const [planData, rolesData, focusData, allGoalsData, activitiesData, recurringData] =
      await Promise.all(responses.map((r) => r.json()));

    setPlan(planData);
    setRoles(rolesData);
    setFocusGoals(focusData);
    setAllGoals(allGoalsData);
    setActivities(activitiesData);
    setRecurring(recurringData);
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch all activities for the visible month
  const fetchMonthActivities = useCallback(async () => {
    const monthDate = new Date(currentMonth + "-01T00:00:00");
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    const allActs: Activity[] = [];
    for (const weekStart of weeks) {
      const ws = format(weekStart, "yyyy-MM-dd");
      const res = await fetch(`/api/activities?weekStart=${ws}`);
      const data = await res.json();
      allActs.push(...data);
    }
    // Deduplicate by id
    const seen = new Set<number>();
    setMonthActivities(allActs.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    }));
  }, [currentMonth]);

  useEffect(() => {
    fetchMonthActivities();
  }, [fetchMonthActivities]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditingActivity(null);
        setDefaultDate("");
        setDefaultStartTime("");
        setActivityFormOpen(true);
      }

      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        handleGenerateSchedule();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFocusSave(selectedIds: number[]) {
    const ws = getWeekStartDate(new Date(currentMonth + "-01T00:00:00"));
    const currentIds = focusGoals.map((g) => g.id);
    const toAdd = selectedIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !selectedIds.includes(id));

    for (const goalId of toAdd) {
      await fetch(`/api/weekly-plans/${ws}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId }),
      });
    }

    for (const goalId of toRemove) {
      await fetch(
        `/api/weekly-plans/${ws}/goals?goalId=${goalId}`,
        { method: "DELETE" }
      );
    }

    setFocusPickerOpen(false);
    await fetchAll();
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
    fetchMonthActivities();
  }

  async function performDelete(id: number, bridgedLogAction?: BridgedLogAction) {
    const qs = bridgedLogAction ? `?bridgedLogAction=${bridgedLogAction}` : "";
    const res = await fetch(`/api/activities/${id}${qs}`, { method: "DELETE" });

    // Defensive: the activity gained a linked log between GET and delete.
    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as { linkedLogId?: number } | null;
      if (body?.linkedLogId != null) {
        const activity =
          monthActivities.find((a) => a.id === id) ?? activities.find((a) => a.id === id);
        setPendingDelete({ id, title: activity?.title ?? "this activity" });
        return;
      }
    }

    setActivities((prev) => prev.filter((a) => a.id !== id));
    setMonthActivities((prev) => prev.filter((a) => a.id !== id));
    await fetchAll();
    fetchMonthActivities();
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

  async function persistToggle(
    id: number,
    isCompleted: boolean,
    bridgedLogAction?: BridgedLogAction
  ) {
    await fetch(`/api/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isCompleted,
        ...(bridgedLogAction != null && { bridgedLogAction }),
      }),
    });
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isCompleted } : a))
    );
    setMonthActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isCompleted } : a))
    );
  }

  function handleToggleActivity(id: number, isCompleted: boolean) {
    // Un-check direction + a linked log → prompt before PATCHing. The
    // checkbox itself stays in its current state because we have not
    // touched local state yet; if the user cancels the dialog nothing
    // changes. monthActivities is the authoritative source for the
    // calendar but daily/weekly state may diverge briefly, so we fall
    // through to activities as a backup.
    if (!isCompleted) {
      const activity =
        monthActivities.find((a) => a.id === id) ??
        activities.find((a) => a.id === id);
      if (activity?.linkedLogId != null) {
        setPendingUncheck({ id, title: activity.title });
        return;
      }
    }
    void persistToggle(id, isCompleted);
  }

  function handleDragStart(event: DragStartEvent) {
    const act = event.active.data.current?.activity as Activity | undefined;
    setDraggingActivity(act ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingActivity(null);
    const { active, over } = event;
    if (!over) return;

    const activity = active.data.current?.activity as Activity | undefined;
    const newDate = over.data.current?.date as string | undefined;
    if (!activity || !newDate || activity.activityDate === newDate) return;

    setMonthActivities((prev) =>
      prev.map((a) => (a.id === activity.id ? { ...a, activityDate: newDate } : a))
    );

    await fetch(`/api/activities/${activity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityDate: newDate }),
    });
  }

  function openAddActivity(dateStr: string, startTime?: string) {
    setEditingActivity(null);
    setDefaultDate(dateStr);
    setDefaultStartTime(startTime ?? "");
    setActivityFormOpen(true);
  }

  function handleGenerateSchedule() {
    if (focusGoals.length === 0) {
      setFocusPickerOpen(true);
      return;
    }
    setPrefsError(null);
    setSuccessMessage(null);
    setPrefsDialogOpen(true);
  }

  async function handleConfirmGenerate(startDate: string, patches: GoalPatch[]) {
    setConfirming(true);
    try {
      // 1. Patch modified goal preferences in parallel.
      if (patches.length > 0) {
        await Promise.all(
          patches.map(({ id, prefs }) =>
            fetch(`/api/goals/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(prefs),
            })
          )
        );
      }

      // 2. Generate.
      const ws = getWeekStartDate(new Date(currentMonth + "-01T00:00:00"));
      const genRes = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: ws,
          scope: "month",
          regenerate: true,
          month: currentMonth,
          startDate,
        }),
      });
      if (!genRes.ok) throw new Error("Failed to generate schedule. Please try again.");
      const data = await genRes.json();
      const { focusGoalIds, dateRange, regenerate, ...proposal } = data;

      // 3. Apply.
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

      // 4. Close, refresh, and show success banner.
      setPrefsDialogOpen(false);
      const count = (proposal as ScheduleProposal).activities?.length ?? 0;
      setSuccessMessage(`Scheduled ${count} ${count === 1 ? "activity" : "activities"}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchAll();
      fetchMonthActivities();
    } catch (err) {
      setPrefsError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleResetSchedule() {
    if (!confirm("This will remove all scheduled (non-logged, non-completed) activities for this month. Continue?")) return;

    const [y, m] = currentMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const start = `${currentMonth}-01`;
    const end = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;

    const res = await fetch("/api/schedule/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, end }),
    });
    if (!res.ok) {
      alert("Failed to reset schedule. Please try again.");
      return;
    }

    await fetchAll();
    fetchMonthActivities();
  }


  // Month view: generate all weeks in the month
  const currentDate = new Date(currentMonth + "-01T00:00:00");
  const monthWeekStarts = eachWeekOfInterval(
    { start: startOfMonth(currentDate), end: endOfMonth(currentDate) },
    { weekStartsOn: 1 }
  );

  const dragOverlaySessionType = draggingActivity?.sessionType ?? "training";
  const showDragOverlaySupplementalBadge = shouldShowSupplementalBadge(
    dragOverlaySessionType
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-60" />
        </div>
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            {format(currentDate, "MMMM yyyy")}
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            {focusGoals.length > 0
              ? `${focusGoals.length} goal${focusGoals.length > 1 ? "s" : ""} in focus this month`
              : "Select goals to focus on, then generate a schedule"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(format(subMonths(currentDate, 1), "yyyy-MM"))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[160px] text-center font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(format(addMonths(currentDate, 1), "yyyy-MM"))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {currentMonth !== format(new Date(), "yyyy-MM") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(format(new Date(), "yyyy-MM"))}
            >
              This month
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSettingsOpen(true)}
            title="Scheduler Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecurringOpen(true)}
          >
            <Repeat className="mr-1.5 h-4 w-4" />
            Recurring
            {recurring.filter((r) => !r.isPaused).length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({recurring.filter((r) => !r.isPaused).length})
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFocusPickerOpen(true)}
          >
            <CalendarIcon className="mr-1.5 h-4 w-4" />
            Focus Goals
            {focusGoals.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({focusGoals.length})
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetSchedule}
            title="Remove all scheduled activities for this month"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleGenerateSchedule}
            disabled={confirming}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generate Schedule
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-2 text-sm text-green-800 dark:text-green-300">
          {successMessage}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="space-y-1 min-w-[700px]">
            {monthActivities.length === 0 && focusGoals.length === 0 && (
              <EmptyState
                icon={CalendarIcon}
                title="No schedule yet"
                description="Select goals to focus on, then generate a schedule to fill your month."
                action={{ label: "Pick Focus Goals", onClick: () => setFocusPickerOpen(true) }}
              />
            )}
            <div className="grid grid-cols-7 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center text-[11px] font-medium text-muted-foreground/70 py-1.5">
                  {d}
                </div>
              ))}
            </div>
            {monthWeekStarts.map((ws, weekIdx) => {
              const wDates = getWeekDates(format(ws, "yyyy-MM-dd"));
              return (
                <div key={format(ws, "yyyy-MM-dd")} className={`grid grid-cols-7 gap-2 ${weekIdx % 2 === 1 ? "bg-muted/10 rounded-lg py-0.5" : ""}`}>
                  {wDates.map((date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const dayActs = monthActivities.filter(
                      (a) => a.activityDate === dateStr
                    );
                    return (
                      <DayColumn
                        key={dateStr}
                        date={date}
                        activities={dayActs}
                        recurringActivities={recurring}
                        onAddActivity={openAddActivity}
                        onToggleActivity={handleToggleActivity}
                        onClickActivity={(a) => {
                          setEditingActivity(a);
                          setActivityFormOpen(true);
                        }}
                        compact
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {draggingActivity && (
            <div
              className={cn(
                "relative rounded px-2 py-1 text-xs border shadow-lg max-w-[160px]",
                getSessionTypeCardClasses(dragOverlaySessionType)
              )}
            >
              {showDragOverlaySupplementalBadge && (
                <Badge
                  variant="secondary"
                  className="absolute right-0.5 top-0.5 h-4 px-1 text-[9px] font-normal leading-none"
                >
                  Supplemental
                </Badge>
              )}
              <div
                className={cn(
                  "font-medium truncate",
                  showDragOverlaySupplementalBadge && "pr-11"
                )}
              >
                {draggingActivity.title}
              </div>
              <div className="text-muted-foreground">
                {draggingActivity.startTime}–{draggingActivity.endTime}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <FocusPicker
        open={focusPickerOpen}
        onClose={() => setFocusPickerOpen(false)}
        onSave={handleFocusSave}
        allGoals={allGoals}
        currentFocusIds={focusGoals.map((g) => g.id)}
        roles={roles}
        currentMonth={currentMonth}
      />

      <RecurringManager
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
        recurring={recurring}
        roles={roles}
        onRefresh={fetchAll}
      />

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
      />

      <SchedulerSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <LinkedLogActionDialog
        open={pendingUncheck !== null}
        onClose={() => setPendingUncheck(null)}
        onConfirm={(action) => {
          if (pendingUncheck) {
            void persistToggle(pendingUncheck.id, false, action);
          }
          setPendingUncheck(null);
        }}
        mode="uncheck"
        activityTitle={pendingUncheck?.title}
      />

      <LinkedLogActionDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={(action) => {
          if (pendingDelete) {
            void performDelete(pendingDelete.id, action);
          }
          setPendingDelete(null);
        }}
        mode="delete"
        activityTitle={pendingDelete?.title}
      />
    </div>
  );
}
