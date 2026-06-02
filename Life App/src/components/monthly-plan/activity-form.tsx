"use client";

import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateTimeSlots } from "@/lib/dates";
import type {
  Activity,
  Role,
  Goal,
  Quadrant,
  ActivityType,
  SessionType,
} from "@/types";
import { LucideIcon } from "@/components/ui/lucide-icon";

interface ActivityFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
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
  }) => void;
  /** When provided and editing an existing activity, shows a Delete button. */
  onDelete?: (activity: Activity) => void;
  roles: Role[];
  goals: Goal[];
  activity?: Activity | null;
  defaultDate?: string;
  defaultStartTime?: string;
}

export function ActivityForm({
  open,
  onClose,
  onSave,
  onDelete,
  roles,
  goals,
  activity,
  defaultDate,
  defaultStartTime,
}: ActivityFormProps) {
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roleId, setRoleId] = useState<string>("none");
  const [goalId, setGoalId] = useState<string>("none");
  const [activityTypeId, setActivityTypeId] = useState<string>("none");
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [notes, setNotes] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>("training");
  /** `null` while checking whether the selected goal has a training plan */
  const [goalHasTrainingPlan, setGoalHasTrainingPlan] = useState<
    boolean | null
  >(false);
  const [error, setError] = useState("");

  const timeSlots = generateTimeSlots();
  const isEditing = !!activity;

  // FR-1.1 / FR-1.3: filter the linked-goal picker by the currently-selected
  // activity type. When `activityTypeId` is "none", fall back to the full
  // `goals` list (the calendar form allows scheduling without a type).
  const filteredGoals = useMemo(() => {
    if (activityTypeId === "none") return goals;
    const typeIdNum = parseInt(activityTypeId, 10);
    if (Number.isNaN(typeIdNum)) return goals;
    return goals.filter((g) => g.activityTypeId === typeIdNum);
  }, [goals, activityTypeId]);

  // FR-1.4 / FR-1.5: when the user changes activity type and the currently
  // selected goal no longer matches the new type, silently reset goalId to
  // "none". Done in the Select's onValueChange callback rather than an
  // effect so we don't add a new react-hooks/set-state-in-effect warning.
  const handleActivityTypeChange = (newTypeId: string) => {
    setActivityTypeId(newTypeId);
    if (newTypeId === "none") return;
    if (goalId === "none") return;
    const newTypeIdNum = parseInt(newTypeId, 10);
    if (Number.isNaN(newTypeIdNum)) return;
    const currentGoal = goals.find((g) => g.id.toString() === goalId);
    if (currentGoal && currentGoal.activityTypeId !== newTypeIdNum) {
      setGoalId("none");
    }
  };

  useLayoutEffect(() => {
    if (open) {
      setTitle(activity?.title ?? "");
      setActivityDate(activity?.activityDate ?? defaultDate ?? "");
      setStartTime(activity?.startTime ?? defaultStartTime ?? "06:00");
      setEndTime(activity?.endTime ?? getDefaultEndTime(defaultStartTime ?? "06:00"));
      setRoleId(activity?.roleId?.toString() ?? "none");
      setGoalId(activity?.goalId?.toString() ?? "none");
      setActivityTypeId(activity?.activityTypeId?.toString() ?? "none");
      setNotes(activity?.notes ?? "");
      setSessionType(activity?.sessionType ?? "training");
      setError("");
    }
  }, [open, activity, defaultDate, defaultStartTime]);

  useEffect(() => {
    if (!open) return;
    if (goalId === "none") {
      setGoalHasTrainingPlan(false);
      return;
    }
    let cancelled = false;
    setGoalHasTrainingPlan(null);
    fetch(`/api/training-plans?goalId=${goalId}`)
      .then((res) => res.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const hasPlan = data != null;
        setGoalHasTrainingPlan(hasPlan);
        if (!hasPlan) setSessionType("training");
      })
      .catch(() => {
        if (cancelled) return;
        setGoalHasTrainingPlan(false);
        setSessionType("training");
      });
    return () => {
      cancelled = true;
    };
  }, [open, goalId]);

  useEffect(() => {
    if (open) {
      fetch("/api/activity-types")
        .then((res) => res.json())
        .then((data: ActivityType[]) => setActivityTypes(data))
        .catch(() => setActivityTypes([]));
    }
  }, [open]);

  // Auto-fill activity type from the linked goal when no type is selected yet.
  // Runs both on new-activity creation (goal picker changes) and when editing
  // an existing activity whose goal has a type linked.
  useEffect(() => {
    if (!open || goalId === "none" || activityTypeId !== "none") return;
    const goal = goals.find((g) => g.id.toString() === goalId);
    if (goal?.activityTypeId != null) {
      setActivityTypeId(goal.activityTypeId.toString());
    }
  }, [open, goalId, goals]); // eslint-disable-line react-hooks/exhaustive-deps

  function getDefaultEndTime(start: string): string {
    const [h, m] = start.split(":").map(Number);
    const endH = h + (m >= 30 ? 1 : 0);
    const endM = m >= 30 ? 0 : 30;
    return `${String(Math.min(endH, 23)).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!activityDate) {
      setError("Date is required");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time");
      return;
    }
    if (goalId !== "none" && goalHasTrainingPlan === null) {
      setError("Still loading goal details — try again in a moment");
      return;
    }
    setError("");
    const gid = goalId !== "none" ? parseInt(goalId) : null;
    const resolvedSessionType: SessionType =
      gid != null && goalHasTrainingPlan === true ? sessionType : "training";
    onSave({
      title: title.trim(),
      activityDate,
      startTime,
      endTime,
      quadrant: activity?.quadrant ?? "Q2",
      roleId: roleId !== "none" ? parseInt(roleId) : null,
      goalId: gid,
      activityTypeId: activityTypeId !== "none" ? parseInt(activityTypeId) : null,
      notes: notes.trim(),
      sessionType: resolvedSessionType,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Activity" : "Schedule Activity"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="act-title">Activity</Label>
            <Input
              id="act-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team standup, Gym session"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="act-date">Date</Label>
              <Input
                id="act-date"
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots
                    .filter((t) => t > startTime)
                    .map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role (optional)</Label>
            <Select
              value={roleId}
              onValueChange={(v) => {
                // Changing the role no longer clears the goal. Phase 5
                // (activities-refactoring) removed that side effect; goal
                // selection is independent of role selection.
                setRoleId(v);
                setSessionType("training");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No role</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: r.color }}
                      />
                      {r.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activityTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Activity Type (optional)</Label>
              <Select value={activityTypeId} onValueChange={handleActivityTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activityTypes.map((at) => (
                    <SelectItem key={at.id} value={at.id.toString()}>
                      <span className="flex items-center gap-2">
                        <LucideIcon name={at.icon} size="sm" />
                        {at.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filteredGoals.length > 0 && (
            <div className="space-y-2">
              <Label>Linked Goal (optional)</Label>
              <Select
                value={goalId}
                onValueChange={(v) => {
                  setGoalId(v);
                  if (v === "none") {
                    setSessionType("training");
                    return;
                  }
                  const goal = goals.find((g) => g.id === parseInt(v));
                  // Auto-fill role from goal's first linked role (only when no role selected yet).
                  if (roleId === "none" && goal && goal.roles.length > 0) {
                    setRoleId(goal.roles[0].id.toString());
                  }
                  // Activity type auto-fill is handled by the useEffect below.
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked goal</SelectItem>
                  {filteredGoals.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {goalId !== "none" && goalHasTrainingPlan === true && (
            <div className="space-y-2">
              <Label>Session type</Label>
              <Select
                value={sessionType}
                onValueChange={(v) => setSessionType(v as SessionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="supplemental">Supplemental</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Matches how the scheduler labels on-wall vs gym-style sessions for
                this goal.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="act-notes">Notes (optional)</Label>
            <Textarea
              id="act-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra details..."
              rows={4}
              className="max-h-[240px] overflow-y-auto text-[13px] leading-relaxed"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter className="gap-2 sm:justify-between">
            {isEditing && onDelete && activity ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(activity)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={goalId !== "none" && goalHasTrainingPlan === null}
              >
                {isEditing ? "Save" : "Schedule"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
