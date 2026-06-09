"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { computeWeekN } from "@/lib/training/phase-utils";
import type { Goal } from "@/types";

interface TrainingPhaseEntry {
  phaseName: string;
  phaseStartDate: string;
  durationWeeks: number;
}

interface GoalOverviewSectionProps {
  goals: Goal[];
  trainingPhaseInfo: Record<number, TrainingPhaseEntry>;
  loading?: boolean;
  heading?: string;
}

export function GoalOverviewSection({
  goals,
  trainingPhaseInfo,
  loading = false,
  heading = "Focus this week",
}: GoalOverviewSectionProps) {
  if (!loading && goals.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{heading}</p>

      {loading ? (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-14 w-48 rounded-lg" />
          <Skeleton className="h-14 w-48 rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {goals.map((goal) => {
            const phase = trainingPhaseInfo[goal.id];
            const weekN = phase ? computeWeekN(phase.phaseStartDate, phase.durationWeeks) : null;

            const cardContent = (
              <div className="rounded-lg border p-3 space-y-1 min-w-[160px]">
                <p className="text-sm font-medium leading-tight">{goal.title}</p>
                {phase && weekN !== null && (
                  <p className="text-xs text-muted-foreground">
                    Active: {phase.phaseName} — Week {weekN} of {phase.durationWeeks}
                  </p>
                )}
              </div>
            );

            if (phase) {
              return (
                <Link
                  key={goal.id}
                  href="/goals"
                  className="hover:bg-accent/50 transition-colors rounded-lg block"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={goal.id} className="cursor-default">
                {cardContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
