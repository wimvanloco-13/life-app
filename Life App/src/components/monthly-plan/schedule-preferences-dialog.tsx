"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Goal } from "@/types";

const DAYS = [
  { label: "Mo", value: 1 },
  { label: "Tu", value: 2 },
  { label: "We", value: 3 },
  { label: "Th", value: 4 },
  { label: "Fr", value: 5 },
  { label: "Sa", value: 6 },
  { label: "Su", value: 7 },
];

const TIME_SLOTS = [
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
  { label: "Any", value: null },
];

interface GoalPref {
  sessionsPerWeek: number;
  preferredDays: number[];
  preferredTimeSlot: string | null;
}

export interface GoalPatch {
  id: number;
  prefs: Partial<GoalPref>;
}

interface TrainingPhaseEntry {
  phaseName: string;
  phaseStartDate: string;
  durationWeeks: number;
}

interface TrainingPlanDays {
  training: number[];
  supplemental: number[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  focusGoals: Goal[];
  currentMonth: string; // "YYYY-MM"
  onConfirm: (startDate: string, endDate: string, patches: GoalPatch[]) => Promise<void>;
  confirming: boolean;
  error?: string;
  trainingPlanMinimums?: Record<number, number>;
  trainingPhaseInfo?: Record<number, TrainingPhaseEntry>;
  trainingPlanDays?: Record<number, TrainingPlanDays>;
  relaxStartDateMax?: boolean;
}

function parsePreferredDays(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

function getDefaultStartDate(currentMonth: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return today.startsWith(currentMonth) ? today : `${currentMonth}-01`;
}

function getMonthLastDay(currentMonth: string): string {
  const [y, m] = currentMonth.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${currentMonth}-${String(last).padStart(2, "0")}`;
}

function addDays(isoDate: string, days: number): string {
  const ms = new Date(isoDate + "T12:00:00Z").getTime() + days * 24 * 60 * 60 * 1000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function computeWeekN(phaseStartDate: string, durationWeeks: number): number {
  const today = new Date().toISOString().slice(0, 10);
  const raw = Math.ceil(
    (new Date(today + "T12:00:00Z").getTime() - new Date(phaseStartDate + "T12:00:00Z").getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  return Math.max(1, Math.min(durationWeeks, raw));
}

export function SchedulePreferencesDialog({
  open,
  onClose,
  focusGoals,
  currentMonth,
  onConfirm,
  confirming,
  error,
  trainingPlanMinimums = {},
  trainingPhaseInfo = {},
  trainingPlanDays = {},
  relaxStartDateMax = false,
}: Props) {
  const [startDate, setStartDate] = useState(() => getDefaultStartDate(currentMonth));
  const [endDate, setEndDate] = useState(() => getMonthLastDay(currentMonth));
  const [prefs, setPrefs] = useState<Record<number, GoalPref>>({});

  // Initialise all state once whenever the dialog opens (NFR-3).
  useEffect(() => {
    if (!open) return;

    const defaultStart = getDefaultStartDate(currentMonth);
    setStartDate(defaultStart);

    const initial: Record<number, GoalPref> = {};
    for (const g of focusGoals) {
      // Prefer days saved on the goal itself; fall back to training plan days
      // (combined training + supplemental) when the goal has no preference set.
      const goalDays = parsePreferredDays(g.preferredDays);
      const planDays = trainingPlanDays[g.id];
      const derivedDays =
        goalDays.length > 0
          ? goalDays
          : planDays
          ? [...new Set([...planDays.training, ...planDays.supplemental])].sort((a, b) => a - b)
          : [];
      initial[g.id] = {
        sessionsPerWeek: g.sessionsPerWeek,
        preferredDays: derivedDays,
        preferredTimeSlot: g.preferredTimeSlot ?? null,
      };
    }
    setPrefs(initial);

    // Compute endDate default: latest of all per-goal suggestions.
    // Goals with an active phase → phase end date (phase.startDate + durationWeeks*7).
    // Goals without a phase → last day of currentMonth.
    let latestEnd = getMonthLastDay(currentMonth);
    for (const g of focusGoals) {
      const phase = trainingPhaseInfo[g.id];
      const candidate = phase
        ? addDays(phase.phaseStartDate, phase.durationWeeks * 7)
        : getMonthLastDay(currentMonth);
      if (candidate > latestEnd) latestEnd = candidate;
    }
    setEndDate(latestEnd);
  }, [open, currentMonth, focusGoals, trainingPhaseInfo, trainingPlanDays]);

  function updatePref<K extends keyof GoalPref>(goalId: number, key: K, value: GoalPref[K]) {
    setPrefs((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [key]: value } }));
  }

  function toggleDay(goalId: number, day: number) {
    const current = prefs[goalId]?.preferredDays ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    updatePref(goalId, "preferredDays", next.sort((a, b) => a - b));
  }

  const endDateInvalid = endDate < startDate;

  function handleConfirm() {
    if (endDateInvalid) return;
    const patches: GoalPatch[] = [];
    for (const g of focusGoals) {
      const current = prefs[g.id];
      if (!current) continue;
      const patch: Partial<GoalPref> = {};
      if (current.sessionsPerWeek !== g.sessionsPerWeek) patch.sessionsPerWeek = current.sessionsPerWeek;
      const originalDays = parsePreferredDays(g.preferredDays);
      if (JSON.stringify(current.preferredDays) !== JSON.stringify(originalDays)) patch.preferredDays = current.preferredDays;
      const originalSlot = g.preferredTimeSlot ?? null;
      if (current.preferredTimeSlot !== originalSlot) patch.preferredTimeSlot = current.preferredTimeSlot;
      if (Object.keys(patch).length > 0) patches.push({ id: g.id, prefs: patch });
    }
    onConfirm(startDate, endDate, patches);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !confirming && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule preferences</DialogTitle>
          <DialogDescription>
            Review your goals&apos; scheduling settings and set the scheduling window, then generate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sched-start-date">Start date</Label>
              <Input
                id="sched-start-date"
                type="date"
                value={startDate}
                min={`${currentMonth}-01`}
                {...(!relaxStartDateMax ? { max: getMonthLastDay(currentMonth) } : {})}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">No activities before this date.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-end-date">Schedule through</Label>
              <Input
                id="sched-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {endDateInvalid ? (
                <p className="text-xs text-destructive">End date must be on or after the start date.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Can span multiple months.</p>
              )}
            </div>
          </div>

          {/* Per-goal preference cards */}
          {focusGoals.map((goal) => {
            const pref = prefs[goal.id];
            if (!pref) return null;
            const phase = trainingPhaseInfo[goal.id];
            const minimum = trainingPlanMinimums[goal.id];
            const spw = pref.sessionsPerWeek;
            const showTier1 = minimum !== undefined && spw === 1;
            const showTier2 = minimum !== undefined && spw === 2;

            return (
              <div key={goal.id} className="rounded-lg border p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{goal.title}</p>
                  {phase && (
                    <p className="text-xs text-muted-foreground">
                      Active: {phase.phaseName} — Week {computeWeekN(phase.phaseStartDate, phase.durationWeeks)} of {phase.durationWeeks}
                    </p>
                  )}
                </div>

                {/* Sessions per week */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sessions per week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={pref.sessionsPerWeek}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 1 && v <= 7) updatePref(goal.id, "sessionsPerWeek", v);
                    }}
                    className="w-20"
                  />
                  {showTier1 && (
                    <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>1 session/week is too low for structured training. Increase to at least 3 for a full split, or schedule this goal without a training plan.</span>
                    </div>
                  )}
                  {showTier2 && (
                    <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>With 2 sessions/week, no supplemental sessions will be scheduled. Increase to 3+ for a complete training split.</span>
                    </div>
                  )}
                </div>

                {/* Preferred days */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Preferred days</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map((d) => {
                      const active = pref.preferredDays.includes(d.value);
                      return (
                        <Button
                          key={d.value}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className="w-9 h-8 p-0 text-xs"
                          onClick={() => toggleDay(goal.id, d.value)}
                        >
                          {d.label}
                        </Button>
                      );
                    })}
                  </div>
                  {pref.preferredDays.length === 0 && (
                    <p className="text-xs text-muted-foreground">No preference — scheduler picks any day.</p>
                  )}
                </div>

                {/* Time of day */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Time of day</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TIME_SLOTS.map((slot) => {
                      const active = pref.preferredTimeSlot === slot.value;
                      return (
                        <Button
                          key={String(slot.value)}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className="h-8 px-3 text-xs"
                          onClick={() => updatePref(goal.id, "preferredTimeSlot", slot.value)}
                        >
                          {slot.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirming || endDateInvalid}>
            {confirming && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {confirming ? "Scheduling…" : "Generate & Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
