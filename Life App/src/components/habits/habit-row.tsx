"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { computeStreaks } from "@/lib/habit-streaks";
import type { HabitWithRecentLogs } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArchiveRestore,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { HabitStrip } from "./habit-strip";

interface HabitRowProps {
  habit: HabitWithRecentLogs;
  logDates: string[];
  today: string;
  inFlightDates: Set<string>;
  affirmation?: string | null;
  error?: string | null;
  onToggle: (habitId: number, date: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchiveToggle: () => void;
}

export function HabitRow({
  habit,
  logDates,
  today,
  inFlightDates,
  affirmation,
  error,
  onToggle,
  onEdit,
  onDelete,
  onArchiveToggle,
}: HabitRowProps) {
  const { current: currentStreak, best: bestStreak } = computeStreaks(
    logDates,
    today,
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`py-5 stagger-item bg-background ${
        habit.isArchived ? "opacity-60" : ""
      }`}
    >
      {/* ── Top row: drag · color · identity/name · streak · edit · more ── */}
      <div className="flex items-start gap-2.5">
        {/* Drag handle */}
        {!habit.isArchived && (
          <button
            type="button"
            className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0 mt-0.5 touch-none"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        {habit.isArchived && <div className="w-4 shrink-0" />}

        {/* Color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: habit.color }}
          aria-hidden="true"
        />

        {/* Identity + name */}
        <div className="flex-1 min-w-0">
          <p
            className={`font-display text-[15px] font-semibold leading-snug truncate ${
              habit.isArchived ? "line-through" : ""
            }`}
          >
            {habit.identity || habit.name}
          </p>
          {habit.identity && (
            <p className="text-xs text-muted-foreground leading-snug truncate mt-0.5">
              {habit.name}
            </p>
          )}
        </div>

        {/* Streak (active only) */}
        {!habit.isArchived && (
          <div className="shrink-0 text-right min-w-[48px]">
            <p className="text-sm font-mono font-semibold tabular-nums leading-none">
              {currentStreak}
              <span className="text-[10px] text-muted-foreground font-sans font-normal ml-0.5">
                d
              </span>
            </p>
            {bestStreak > currentStreak && bestStreak > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                best {bestStreak}
              </p>
            )}
          </div>
        )}

        {/* Edit button — always visible for active habits */}
        {!habit.isArchived && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit habit"
            className="shrink-0 p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Kebab — archive + delete only */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More options"
              className="shrink-0 p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onArchiveToggle}>
              <ArchiveRestore className="w-3.5 h-3.5 mr-2" />
              {habit.isArchived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Calendar grid (active habits only) ── */}
      {!habit.isArchived && (
        <div className="mt-3 pl-[26px]">
          <HabitStrip
            recentLogDates={logDates}
            habitColor={habit.color}
            habitCreatedAt={habit.createdAt}
            today={today}
            inFlightDates={inFlightDates}
            affirmation={affirmation}
            error={error}
            onToggle={(date) => onToggle(habit.id, date)}
          />
        </div>
      )}
    </div>
  );
}
