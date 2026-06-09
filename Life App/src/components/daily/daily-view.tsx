"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  ArrowRight,
  X,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import {
  isToday,
  toISODate,
  formatTime,
  getWeekStartDate,
  getFocusGoalWeekKey,
} from "@/lib/dates";
import { getQuadrantInfo } from "@/lib/quadrants";
import {
  getSessionTypeCardClasses,
  shouldShowSupplementalBadge,
} from "@/lib/session-type-styles";
import { cn } from "@/lib/utils";
import { ActivityForm } from "@/components/monthly-plan/activity-form";
import { GoalOverviewSection } from "@/components/shared/goal-overview-section";
import { getPhaseDisplayName } from "@/lib/training/periodization";
import {
  LinkedLogActionDialog,
  type BridgedLogAction,
} from "@/components/activities/linked-log-action-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Activity,
  Role,
  Goal,
  Quadrant,
  ActivityLog,
  ActivityType,
  SessionType,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LucideIcon } from "@/components/ui/lucide-icon";

function NotesPreview({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const firstLine = notes.split("\n")[0];
  const isLong = notes.length > 120 || notes.includes("\n\n");

  if (!isLong) {
    return <p className="text-xs text-muted-foreground mt-1">{notes}</p>;
  }

  return (
    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
      {expanded ? (
        <div className="text-xs text-muted-foreground space-y-1.5">
          {notes.split("\n\n").map((block, i) => {
            const lines = block.split("\n");
            const isHeading = lines.length > 1 && lines[0] === lines[0].toUpperCase() && lines[0].length < 60;
            if (isHeading) {
              return (
                <div key={i}>
                  <span className="font-medium text-foreground/70">{lines[0]}</span>
                  <p className="leading-relaxed">{lines.slice(1).join(" ")}</p>
                </div>
              );
            }
            return <p key={i} className="leading-relaxed">{block}</p>;
          })}
          <button
            className="text-primary text-[11px] hover:underline"
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          <span className="line-clamp-1">{firstLine}</span>
          <button
            className="text-primary text-[11px] hover:underline ml-1"
            onClick={() => setExpanded(true)}
          >
            Show more
          </button>
        </p>
      )}
    </div>
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface LogActivityDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  activityTypes: ActivityType[];
  defaultDate: string;
  defaultActivityTypeId?: number;
  defaultActivityId?: number;
}

function LogActivityDialog({
  open,
  onClose,
  onSave,
  activityTypes,
  defaultDate,
  defaultActivityTypeId,
  defaultActivityId,
}: LogActivityDialogProps) {
  const [activityTypeId, setActivityTypeId] = useState<string>(
    defaultActivityTypeId?.toString() ?? ""
  );
  const [durationMinutes, setDurationMinutes] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setActivityTypeId(defaultActivityTypeId?.toString() ?? "");
      setDurationMinutes("");
      setDate(defaultDate);
      setNotes("");
    }
  }, [open, defaultDate, defaultActivityTypeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mins = parseInt(durationMinutes, 10);
    if (!activityTypeId || !mins || mins <= 0) return;

    setSaving(true);
    try {
      await fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityTypeId: parseInt(activityTypeId),
          activityId: defaultActivityId ?? null,
          date,
          durationMinutes: mins,
          notes: notes.trim() || null,
        }),
      });
      if (defaultActivityId) {
        await fetch(`/api/activities/${defaultActivityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCompleted: true }),
        });
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-type">Activity Type</Label>
            <Select
              value={activityTypeId || "none"}
              onValueChange={(v) => setActivityTypeId(v === "none" ? "" : v)}
            >
              <SelectTrigger id="activity-type">
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((at) => (
                  <SelectItem key={at.id} value={at.id.toString()}>
                    <span className="flex items-center gap-2"><LucideIcon name={at.icon} size="sm" />{at.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !activityTypeId || !durationMinutes}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DailyView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [carryForward, setCarryForward] = useState<Activity[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusGoals, setFocusGoals] = useState<Goal[]>([]);
  const [trainingPhaseInfo, setTrainingPhaseInfo] = useState<
    Record<number, { phaseName: string; phaseStartDate: string; durationWeeks: number }>
  >({});

  const [formOpen, setFormOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logDialogActivity, setLogDialogActivity] = useState<{
    activityTypeId?: number;
    activityId?: number;
  } | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [defaultStartTime, setDefaultStartTime] = useState("");

  // Un-check prompt state. Populated when the user un-checks a scheduled
  // activity that has a linked log; the dialog asks whether to delete or
  // unlink the log before the PATCH fires.
  const [pendingUncheck, setPendingUncheck] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const dateStr = toISODate(currentDate);
  const todayFlag = isToday(currentDate);

  const todayFocusGoals = useMemo(() => {
    const scheduledGoalIds = new Set(
      activities.flatMap((a) => (a.goalId != null ? [a.goalId] : []))
    );
    return focusGoals.filter((g) => scheduledGoalIds.has(g.id));
  }, [activities, focusGoals, trainingPhaseInfo]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const weekStart = getWeekStartDate(currentDate);

    const [actRes, weekRes, rolesRes, goalsRes, logsRes, typesRes, focusRes] = await Promise.all([
      fetch(`/api/activities?date=${dateStr}`),
      fetch(`/api/activities?weekStart=${weekStart}`),
      fetch("/api/roles"),
      fetch("/api/goals?status=active"),
      fetch(`/api/activity-logs?date=${dateStr}`),
      fetch("/api/activity-types"),
      fetch(`/api/weekly-plans/${getFocusGoalWeekKey(currentDate)}/goals`),
    ]);
    const [actData, weekData, rolesData, goalsData, logsData, typesData, focusData] =
      await Promise.all([
        actRes.json(),
        weekRes.json(),
        rolesRes.json(),
        goalsRes.json(),
        logsRes.json(),
        typesRes.json(),
        focusRes.ok ? focusRes.json() : Promise.resolve([]),
      ]);

    setActivities(actData);
    setRoles(rolesData);
    setGoals(goalsData);
    setActivityLogs(logsData);
    setActivityTypes(typesData);

    const incomplete = (weekData as Activity[]).filter(
      (a) => !a.isCompleted && a.activityDate < dateStr
    );
    setCarryForward(incomplete);

    const focusGoalList: Goal[] = Array.isArray(focusData) ? focusData : [];
    setFocusGoals(focusGoalList);

    if (focusGoalList.length > 0) {
      const ids = focusGoalList.map((g) => g.id).join(",");
      const planRes = await fetch(`/api/training-plans?goalIds=${ids}`);
      if (planRes.ok) {
        const planData: Array<{
          goalId: number;
          phases: Array<{ status: string; phaseType: string; startDate: string; durationWeeks: number }>;
        }> = await planRes.json();
        const phaseMap: Record<
          number,
          { phaseName: string; phaseStartDate: string; durationWeeks: number }
        > = {};
        for (const plan of planData) {
          const activePhase = plan.phases.find((ph) => ph.status === "active");
          if (activePhase) {
            phaseMap[plan.goalId] = {
              phaseName: getPhaseDisplayName(activePhase.phaseType),
              phaseStartDate: activePhase.startDate,
              durationWeeks: activePhase.durationWeeks,
            };
          }
        }
        setTrainingPhaseInfo(phaseMap);
      }
    } else {
      setTrainingPhaseInfo({});
    }

    setLoading(false);
  }, [dateStr, currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function persistToggle(
    id: number,
    isCompleted: boolean,
    bridgedLogAction?: BridgedLogAction
  ) {
    // Optimistic update first so the UI responds immediately.
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isCompleted } : a))
    );
    setCarryForward((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isCompleted } : a))
    );

    const res = await fetch(`/api/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isCompleted,
        ...(bridgedLogAction != null && { bridgedLogAction }),
      }),
    });

    if (!res.ok) {
      // Revert to previous value on failure.
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isCompleted: !isCompleted } : a))
      );
      setCarryForward((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isCompleted: !isCompleted } : a))
      );
      return;
    }

    // When the un-check or check-off bridge mutated activity_logs the
    // server-side tracker shifted; reload so the Completed Activities
    // panel below the schedule reflects the new state.
    if (bridgedLogAction != null || isCompleted === true) {
      await fetchData();
    }
  }

  function handleToggle(id: number, isCompleted: boolean) {
    if (!isCompleted) {
      const activity =
        activities.find((a) => a.id === id) ??
        carryForward.find((a) => a.id === id);
      if (activity?.linkedLogId != null) {
        setPendingUncheck({ id, title: activity.title });
        return;
      }
    }
    void persistToggle(id, isCompleted);
  }

  async function handleReschedule(activityId: number) {
    await fetch(`/api/activities/${activityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityDate: dateStr, carryForwardFrom: dateStr }),
    });
    await fetchData();
  }

  function handleDismiss(activityId: number) {
    setCarryForward((prev) => prev.filter((a) => a.id !== activityId));
  }

  async function performDelete(id: number, bridgedLogAction?: BridgedLogAction) {
    const query =
      bridgedLogAction != null ? `?bridgedLogAction=${bridgedLogAction}` : "";
    const res = await fetch(`/api/activities/${id}${query}`, {
      method: "DELETE",
    });

    // If the activity has a linked log and no action was specified, the server
    // responds 409; surface the linked-log dialog so the user can choose.
    if (res.status === 409 && bridgedLogAction == null) {
      const activity =
        activities.find((a) => a.id === id) ??
        carryForward.find((a) => a.id === id);
      setPendingDelete({ id, title: activity?.title ?? "this activity" });
      return;
    }

    if (res.ok) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
      setCarryForward((prev) => prev.filter((a) => a.id !== id));
      setFormOpen(false);
      setEditingActivity(null);
      await fetchData();
    }
  }

  function handleDeleteActivity(activity: Activity) {
    if (activity.linkedLogId != null) {
      setPendingDelete({ id: activity.id, title: activity.title });
      return;
    }
    void performDelete(activity.id);
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
    setFormOpen(false);
    setEditingActivity(null);
    await fetchData();
  }

  const sortedActivities = [...activities].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  const activeCarryForward = carryForward.filter((a) => !a.isCompleted);

  const completedCount = activities.filter((a) => a.isCompleted).length;
  // Completed scheduled activities that have no linked log — shown as simple
  // entries in the Completed Activities panel alongside activityLogs rows.
  const completedWithoutLog = activities.filter(
    (a) => a.isCompleted && !a.linkedLogId
  );

  return (
    <div className="px-6 py-8 space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Daily View</h1>
          <p className="text-muted-foreground">
            Adapt your plan to today&apos;s reality
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subDays(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-[180px] text-center">
            <div className="font-semibold">
              {format(currentDate, "EEEE, MMMM d")}
            </div>
            {todayFlag && (
              <span className="text-xs text-emerald-500 font-medium">
                Today
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!todayFlag && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
            {activeCarryForward.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Carried Forward ({activeCarryForward.length})
                  </CardTitle>
                  <CardDescription>
                    Incomplete activities from earlier this week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeCarryForward.map((activity) => {
                      const sessionType = activity.sessionType ?? "training";
                      const showSupplementalBadge =
                        shouldShowSupplementalBadge(sessionType);
                      return (
                      <div
                        key={activity.id}
                        className={cn(
                          "flex items-center gap-2 text-sm rounded-md border border-amber-200 dark:border-amber-900 p-2",
                          sessionType === "supplemental"
                            ? "bg-muted/50"
                            : "bg-background"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-medium">{activity.title}</span>
                            {showSupplementalBadge && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-normal shrink-0"
                              >
                                Supplemental
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              from{" "}
                              {format(
                                new Date(activity.activityDate + "T00:00:00"),
                                "EEE"
                              )}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => handleReschedule(activity.id)}
                        >
                          <ArrowRight className="mr-1 h-3 w-3" />
                          Move here
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleDismiss(activity.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="font-[family-name:var(--font-display)] text-base font-semibold">Schedule</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {completedCount}/{activities.length} completed
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLogDialogActivity(null);
                      setLogDialogOpen(true);
                    }}
                  >
                    <ClipboardList className="mr-1 h-3.5 w-3.5" />
                    Log Activity
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingActivity(null);
                      setDefaultStartTime("");
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sortedActivities.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Nothing scheduled"
                    description="Your day is wide open. Plan activities or generate a schedule from the Monthly Plan."
                  />
                ) : (
                  <div className="space-y-2">
                    {sortedActivities.map((activity) => {
                      const quadrant = getQuadrantInfo(activity.quadrant);
                      const sessionType = activity.sessionType ?? "training";
                      const isSupplemental = sessionType === "supplemental";
                      const showSupplementalBadge =
                        shouldShowSupplementalBadge(sessionType);
                      const effectiveActivityTypeId =
                        activity.activityTypeId ??
                        goals.find((g) => g.id === activity.goalId)?.activityTypeId ??
                        null;
                      const canLogAndComplete =
                        !activity.isCompleted &&
                        effectiveActivityTypeId != null;
                      return (
                        <div
                          key={activity.id}
                          className={cn(
                            "group relative flex items-start gap-3 rounded-lg border p-3 transition-opacity cursor-pointer hover:bg-accent/50",
                            getSessionTypeCardClasses(sessionType),
                            activity.isCompleted && "opacity-50"
                          )}
                          onClick={() => {
                            setEditingActivity(activity);
                            setFormOpen(true);
                          }}
                          style={{
                            borderLeftWidth: "4px",
                            borderLeftColor:
                              activity.roleColor ?? quadrant.hexColor,
                          }}
                        >
                          {showSupplementalBadge && (
                            <Badge
                              variant="secondary"
                              className="absolute right-2 top-2 z-10 text-[10px] font-normal"
                            >
                              Supplemental
                            </Badge>
                          )}
                          <Checkbox
                            checked={activity.isCompleted}
                            onCheckedChange={(checked) => {
                              handleToggle(activity.id, checked as boolean);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div
                            className={cn(
                              "flex-1 min-w-0",
                              showSupplementalBadge && "pr-24"
                            )}
                          >
                            <div
                              className={`font-medium text-sm ${
                                activity.isCompleted ? "line-through" : ""
                              }`}
                            >
                              {activity.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>
                                {formatTime(activity.startTime)} –{" "}
                                {formatTime(activity.endTime)}
                              </span>
                              {activity.roleName && (
                                <>
                                  <span>·</span>
                                  <span
                                    style={{
                                      color: activity.roleColor ?? undefined,
                                    }}
                                  >
                                    {activity.roleName}
                                  </span>
                                </>
                              )}
                            </div>
                            {activity.notes && (
                              <NotesPreview notes={activity.notes} />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded shrink-0",
                              isSupplemental
                                ? "bg-muted/50 text-muted-foreground"
                                : ""
                            )}
                            style={
                              isSupplemental
                                ? undefined
                                : {
                                    backgroundColor: `${quadrant.hexColor}20`,
                                    color: quadrant.hexColor,
                                  }
                            }
                          >
                            {quadrant.shortLabel}
                          </span>
                          {canLogAndComplete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogDialogActivity({
                                  activityTypeId: effectiveActivityTypeId,
                                  activityId: activity.id,
                                });
                                setLogDialogOpen(true);
                              }}
                              title="Log & Complete"
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {(activityLogs.length > 0 || completedWithoutLog.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-[family-name:var(--font-display)] text-base font-semibold">Completed Activities</CardTitle>
                  <CardDescription>
                    Activity logs for this day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        <LucideIcon name={log.activityTypeIcon ?? "activity"} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {log.activityTypeName ?? "Activity"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{formatDuration(log.durationMinutes)}</span>
                          </div>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {completedWithoutLog.map((act) => (
                      <div
                        key={`act-${act.id}`}
                        className="flex items-start gap-3 rounded-lg border border-dashed p-3 opacity-80"
                      >
                        <LucideIcon name={act.activityTypeId ? "activity" : "check-circle"} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{act.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Marked complete · no log recorded
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {/* Goal overview — active focus goals with training phase context */}
      <GoalOverviewSection
        goals={todayFocusGoals}
        trainingPhaseInfo={trainingPhaseInfo}
        loading={loading}
        heading="Focus today"
      />

      <ActivityForm
        key={editingActivity?.id ?? "new"}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingActivity(null);
        }}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        roles={roles}
        goals={goals}
        activity={editingActivity}
        defaultDate={dateStr}
        defaultStartTime={defaultStartTime}
      />

      <LogActivityDialog
        open={logDialogOpen}
        onClose={() => {
          setLogDialogOpen(false);
          setLogDialogActivity(null);
        }}
        onSave={fetchData}
        activityTypes={activityTypes}
        defaultDate={dateStr}
        defaultActivityTypeId={logDialogActivity?.activityTypeId}
        defaultActivityId={logDialogActivity?.activityId}
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
