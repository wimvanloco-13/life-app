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
import { Loader2 } from "lucide-react";
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

interface Props {
  open: boolean;
  onClose: () => void;
  focusGoals: Goal[];
  currentMonth: string; // "YYYY-MM"
  onConfirm: (startDate: string, patches: GoalPatch[]) => Promise<void>;
  confirming: boolean;
  error?: string;
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

export function SchedulePreferencesDialog({
  open,
  onClose,
  focusGoals,
  currentMonth,
  onConfirm,
  confirming,
  error,
}: Props) {
  const [startDate, setStartDate] = useState(() => getDefaultStartDate(currentMonth));
  const [prefs, setPrefs] = useState<Record<number, GoalPref>>({});

  // Initialise state whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setStartDate(getDefaultStartDate(currentMonth));
    const initial: Record<number, GoalPref> = {};
    for (const g of focusGoals) {
      initial[g.id] = {
        sessionsPerWeek: g.sessionsPerWeek,
        preferredDays: parsePreferredDays(g.preferredDays),
        preferredTimeSlot: g.preferredTimeSlot ?? null,
      };
    }
    setPrefs(initial);
  }, [open, currentMonth, focusGoals]);

  function updatePref<K extends keyof GoalPref>(goalId: number, key: K, value: GoalPref[K]) {
    setPrefs((prev) => ({ ...prev, [goalId]: { ...prev[goalId], [key]: value } }));
  }

  function toggleDay(goalId: number, day: number) {
    const current = prefs[goalId]?.preferredDays ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    updatePref(goalId, "preferredDays", next.sort((a, b) => a - b));
  }

  function handleConfirm() {
    // Compute patches — only goals whose prefs changed from the initial values.
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
    onConfirm(startDate, patches);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !confirming && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule preferences</DialogTitle>
          <DialogDescription>
            Review your goals&apos; scheduling settings and set a start date, then generate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Start date */}
          <div className="space-y-2">
            <Label htmlFor="sched-start-date">Start date</Label>
            <Input
              id="sched-start-date"
              type="date"
              value={startDate}
              min={`${currentMonth}-01`}
              max={getMonthLastDay(currentMonth)}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-48"
            />
            <p className="text-xs text-muted-foreground">
              No activities will be scheduled before this date.
            </p>
          </div>

          {/* Per-goal preference cards */}
          {focusGoals.map((goal) => {
            const pref = prefs[goal.id];
            if (!pref) return null;
            return (
              <div key={goal.id} className="rounded-lg border p-4 space-y-4">
                <p className="text-sm font-medium">{goal.title}</p>

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
          <Button onClick={handleConfirm} disabled={confirming}>
            {confirming && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {confirming ? "Scheduling…" : "Generate & Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
