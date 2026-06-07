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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { RoleBadge } from "@/components/roles/role-badge";
import { getQuadrantInfo } from "@/lib/quadrants";
import { format } from "date-fns";
import type { Goal, Role } from "@/types";

interface FocusPickerProps {
  open: boolean;
  onClose: () => void;
  onSave: (selectedGoalIds: number[]) => void;
  allGoals: Goal[];
  currentFocusIds: number[];
  roles: Role[];
  currentMonth: string; // "YYYY-MM"
}

function getNextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1); // m is already 1-based, so this gives next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function FocusPicker({
  open,
  onClose,
  onSave,
  allGoals,
  currentFocusIds,
  roles,
  currentMonth,
}: FocusPickerProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set(currentFocusIds));
    }
  }, [open, currentFocusIds]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSave() {
    onSave([...selected]);
  }

  const nextMonth = getNextMonth(currentMonth);
  const relevantMonths = new Set([currentMonth, nextMonth]);

  const yearlyIdsWithChildren = new Set(
    allGoals
      .filter((g) => g.horizon === "monthly" && g.parentGoalId)
      .map((g) => g.parentGoalId!)
  );

  const visibleGoals = allGoals.filter((g) => {
    if (g.horizon === "yearly" && yearlyIdsWithChildren.has(g.id)) return false;
    if (g.horizon === "monthly" && g.month) return relevantMonths.has(g.month);
    return true;
  });

  // Sort: selected goals first (alphabetical), then unselected (alphabetical).
  // Goals with no role are now included — they were previously invisible under role headings.
  const sortedGoals = [...visibleGoals].sort((a, b) => {
    const aSelected = selected.has(a.id) ? 0 : 1;
    const bSelected = selected.has(b.id) ? 0 : 1;
    if (aSelected !== bSelected) return aSelected - bSelected;
    return a.title.localeCompare(b.title);
  });

  const added = [...selected].filter((id) => !currentFocusIds.includes(id));
  const removed = currentFocusIds.filter((id) => !selected.has(id));
  const hasChanges = added.length > 0 || removed.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Focus Goals</DialogTitle>
          <DialogDescription>
            Which goals do you want to work on this week? Pick the ones that
            matter most right now.
          </DialogDescription>
        </DialogHeader>

        {allGoals.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-3">
              No goals created yet.
            </p>
            <Button variant="link" asChild>
              <a href="/goals">Create goals first &rarr;</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedGoals.map((goal) => {
              const quadrant = getQuadrantInfo(goal.quadrant);
              const isSelected = selected.has(goal.id);

              return (
                <div
                  key={goal.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => toggle(goal.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(goal.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{goal.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {goal.roles.map((r) => (
                        <RoleBadge key={r.id} name={r.name} color={r.color} />
                      ))}
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${quadrant.hexColor}20`,
                          color: quadrant.hexColor,
                        }}
                      >
                        {quadrant.shortLabel}
                      </span>
                      {goal.targetDate && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="mr-1 h-3 w-3" />
                          {format(new Date(goal.targetDate + "T00:00:00"), "MMM d")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            {selected.size === 0
              ? "Clear Focus"
              : `Focus on ${selected.size} Goal${selected.size > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
