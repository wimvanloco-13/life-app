"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Pencil,
  Archive,
  ChevronDown,
  ChevronUp,
  Plus,
  Mountain,
} from "lucide-react";
import { RoleBadge } from "@/components/roles/role-badge";
import { LucideIcon } from "@/components/ui/lucide-icon";
import { TrainingPlanSection } from "./training-plan-section";
import type { Goal, GoalProgress, PaceStatus, TrainingPlan } from "@/types";
import { format } from "date-fns";

interface YearlyGoalCardProps {
  goal: Goal;
  progress: GoalProgress | null;
  children: (Goal & { progress: { current: number; target: number; percentage: number } })[];
  currentMonth: string;
  trainingPlan?: TrainingPlan | null;
  onEdit: () => void;
  onArchive: () => void;
  onLogTally: () => void;
  onCreateTrainingPlan?: () => void;
  onTrainingPlanChanged?: () => void;
  onEditTrainingSplit?: () => void;
}

const paceColors: Record<PaceStatus, string> = {
  ahead: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  on_track: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  behind: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  no_data: "bg-muted text-muted-foreground",
};

const paceLabels: Record<PaceStatus, string> = {
  ahead: "Ahead",
  on_track: "On Track",
  behind: "Behind",
  no_data: "No Data",
};

function ProgressBar({ percentage }: { percentage: number }) {
  const clamped = Math.min(percentage, 100);
  const met = clamped >= 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className={`font-semibold tabular-nums ${met ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
          {percentage}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${met ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function YearlyGoalCard({
  goal,
  progress,
  children,
  currentMonth,
  trainingPlan,
  onEdit,
  onArchive,
  onLogTally,
  onCreateTrainingPlan,
  onTrainingPlanChanged,
  onEditTrainingSplit,
}: YearlyGoalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const paceStatus = progress?.paceStatus ?? "no_data";
  const isGradeTarget = goal.targetMetric === "grade" && goal.targetUnit;
  const targetDisplay = isGradeTarget
    ? null
    : goal.targetValue
      ? `${goal.targetValue}${goal.targetUnit ? ` ${goal.targetUnit}` : ""}`
      : null;

  const currentMonthChild = children.find((c) => c.month === currentMonth);

  return (
    <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <CardContent className="p-0">
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {goal.activityTypeIcon && (
                  <LucideIcon name={goal.activityTypeIcon} size="sm" />
                )}
                <h3 className="font-[family-name:var(--font-display)] font-semibold text-base leading-tight truncate">
                  {goal.title}
                </h3>
              </div>
              {isGradeTarget && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {goal.targetUnit}
                </p>
              )}
              {targetDisplay && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {progress?.current ?? 0} / {targetDisplay}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge className={`text-[10px] px-1.5 py-0.5 ${paceColors[paceStatus]}`}>
                {paceLabels[paceStatus]}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onArchive}>
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ProgressBar percentage={progress?.percentage ?? 0} />

          <div className="flex items-center gap-1.5 flex-wrap">
            {goal.roles.map((r) => (
              <RoleBadge key={r.id} name={r.name} color={r.color} />
            ))}
            <Badge variant="outline" className="text-[10px]">
              {goal.sessionsPerWeek}x/wk
            </Badge>
          </div>

          {currentMonthChild && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-2.5 py-1.5">
              {format(new Date(`${currentMonthChild.month}-01`), "MMMM")}:{" "}
              <span className="font-medium text-foreground">
                {currentMonthChild.progress.current} / {currentMonthChild.progress.target}
              </span>
              {goal.targetUnit && ` ${goal.targetUnit}`}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onLogTally}
            >
              <Plus className="mr-1 h-3 w-3" /> Log Progress
            </Button>
            {!trainingPlan && onCreateTrainingPlan && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={onCreateTrainingPlan}
              >
                <Mountain className="mr-1 h-3 w-3" /> Training Plan
              </Button>
            )}
            {children.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs ml-auto"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <><ChevronUp className="mr-1 h-3 w-3" /> Hide months</>
                ) : (
                  <><ChevronDown className="mr-1 h-3 w-3" /> {children.length} months</>
                )}
              </Button>
            )}
          </div>
        </div>

        {trainingPlan && onTrainingPlanChanged && (
          <div className="border-t">
            <TrainingPlanSection
              plan={trainingPlan}
              onRefresh={onTrainingPlanChanged}
              goalSessionsPerWeek={goal.sessionsPerWeek}
              onEditTrainingSplit={onEditTrainingSplit}
            />
          </div>
        )}

        {expanded && children.length > 0 && (
          <div className="border-t px-5 py-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {children.map((child) => {
                const monthLabel = child.month
                  ? format(new Date(`${child.month}-01`), "MMM")
                  : "?";
                const isCurrent = child.month === currentMonth;
                const met = child.progress.percentage >= 100;
                return (
                  <div
                    key={child.id}
                    className={`rounded-md border px-2.5 py-2 text-center text-xs ${
                      isCurrent
                        ? "border-primary/50 bg-primary/5"
                        : met
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-border/50"
                    }`}
                  >
                    <div className="font-medium">{monthLabel}</div>
                    <div className="text-muted-foreground">
                      {child.progress.current}/{child.progress.target}
                    </div>
                    <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(child.progress.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
