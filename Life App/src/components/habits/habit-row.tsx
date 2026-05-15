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
import { ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { HabitCalendar } from "./habit-calendar";

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
  const { current: currentStreak, best: bestStreak } = computeStreaks(logDates, today);

  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-10 py-7 stagger-item ${
        habit.isArchived ? "opacity-50" : ""
      }`}
    >
      {/* ── Left: identity block ── */}
      <div className="w-52 shrink-0 flex flex-col gap-1 pt-1">
        {/* Color dot + identity */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: habit.color }}
            aria-hidden="true"
          />
          <p
            className={`font-display text-[15px] font-semibold leading-snug ${
              habit.isArchived ? "line-through text-muted-foreground" : ""
            }`}
          >
            {habit.identity || habit.name}
          </p>
        </div>

        {/* Habit name (subtitle when identity is separate) */}
        {habit.identity && (
          <p className="text-[12px] text-muted-foreground pl-[22px] leading-snug">
            {habit.name}
          </p>
        )}

        {/* Streak */}
        {!habit.isArchived && (
          <div className="pl-[22px] mt-2">
            <p className="text-[13px] font-mono font-semibold tabular-nums leading-none text-foreground/80">
              {currentStreak}
              <span className="text-[11px] text-muted-foreground font-sans font-normal ml-0.5">
                d streak
              </span>
            </p>
            {bestStreak > currentStreak && bestStreak > 1 && (
              <p className="text-[11px] text-muted-foreground/60 mt-1 leading-none">
                best {bestStreak}d
              </p>
            )}
          </div>
        )}

        {/* Inline feedback */}
        {!habit.isArchived && affirmation && (
          <p className="pl-[22px] mt-1 text-[11px] text-muted-foreground animate-fade-in leading-snug">
            {affirmation}
          </p>
        )}
        {!habit.isArchived && !affirmation && error && (
          <p className="pl-[22px] mt-1 text-[11px] text-destructive leading-snug">{error}</p>
        )}

        {/* Controls */}
        {!habit.isArchived && (
          <div className="flex items-center gap-0.5 pl-[18px] mt-2">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit habit"
              className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More options"
                  className="p-1.5 rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={onArchiveToggle}>
                  <ArchiveRestore className="w-3.5 h-3.5 mr-2" />
                  Archive
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
        )}

        {/* Archived habit controls */}
        {habit.isArchived && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="p-1.5 rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted/60 transition-colors ml-[18px] mt-2 w-fit"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={onArchiveToggle}>
                <ArchiveRestore className="w-3.5 h-3.5 mr-2" />
                Restore
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
        )}
      </div>

      {/* ── Right: 3-week calendar ── */}
      {!habit.isArchived && (
        <div className="flex-1 min-w-0">
          <HabitCalendar
            recentLogDates={logDates}
            habitColor={habit.color}
            habitCreatedAt={habit.createdAt}
            today={today}
            inFlightDates={inFlightDates}
            onToggle={(date) => onToggle(habit.id, date)}
          />
        </div>
      )}
    </div>
  );
}
