"use client";

import { Button } from "@/components/ui/button";
import { HabitPrinciples } from "./habit-principles";

interface HabitEmptyStateProps {
  onQuick: () => void;
  onWalkthrough: () => void;
}

export function HabitEmptyState({ onQuick, onWalkthrough }: HabitEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in px-4">
      {/* Page title */}
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-2 text-center">
        Habits
      </h1>
      <p className="text-sm text-muted-foreground mb-10 text-center max-w-xs leading-relaxed">
        Small, consistent actions shape who you are.
      </p>

      {/* Primary CTAs */}
      <div className="flex flex-col items-center gap-3 mb-16">
        <Button size="default" onClick={onWalkthrough} className="min-w-[200px]">
          Walk me through it
        </Button>
        <button
          type="button"
          onClick={onQuick}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Add a habit
        </button>
      </div>

      {/* Editorial principles */}
      <div className="max-w-md w-full">
        <HabitPrinciples />
      </div>
    </div>
  );
}
