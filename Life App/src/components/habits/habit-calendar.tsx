"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateForDisplay } from "@/lib/dates";

interface HabitCalendarProps {
  recentLogDates: string[];
  habitColor: string;
  habitCreatedAt: string;
  today: string;
  inFlightDates: Set<string>;
  onToggle: (date: string) => void;
}

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getMondayOf(today: string): Date {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  const mon = new Date(dt);
  mon.setDate(dt.getDate() - offset);
  return mon;
}

function isoFrom(dt: Date): string {
  const y = dt.getFullYear();
  const m = (dt.getMonth() + 1).toString().padStart(2, "0");
  const d = dt.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekFrom(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return isoFrom(dt);
  });
}

function getThreeWeeks(today: string) {
  const thisMonday = getMondayOf(today);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  return [
    { label: "Last", dates: weekFrom(lastMonday) },
    { label: "This", dates: weekFrom(thisMonday) },
    { label: "Next", dates: weekFrom(nextMonday) },
  ];
}

export function HabitCalendar({
  recentLogDates,
  habitColor,
  habitCreatedAt,
  today,
  inFlightDates,
  onToggle,
}: HabitCalendarProps) {
  const weeks = getThreeWeeks(today);
  const logSet = new Set(recentLogDates);
  const createdDate = habitCreatedAt.slice(0, 10);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-col gap-1.5">
        {/* Day-of-week header row */}
        <div className="flex gap-2 pl-10">
          {DAY_LABELS.map((lbl) => (
            <div
              key={lbl}
              className="w-11 text-center text-[11px] font-medium text-muted-foreground/50 select-none"
            >
              {lbl}
            </div>
          ))}
        </div>

        {/* Three week rows */}
        {weeks.map(({ label, dates }) => (
          <div key={label} className="flex items-center gap-2">
            {/* Week label */}
            <div className="w-8 shrink-0 text-[10px] font-medium text-muted-foreground/40 text-right leading-none select-none">
              {label}
            </div>

            {dates.map((date) => {
              const isFuture = date > today;
              const isBeforeCreation = date < createdDate;
              const isInFlight = inFlightDates.has(date);
              const filled = logSet.has(date);
              const isToday = date === today;
              const num = parseInt(date.split("-")[2]);

              if (isFuture || isBeforeCreation) {
                return (
                  <div
                    key={date}
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span
                      className={`text-sm font-mono ${
                        isFuture
                          ? "text-muted-foreground/20"
                          : "text-muted-foreground/15"
                      }`}
                    >
                      {num}
                    </span>
                  </div>
                );
              }

              return (
                <Tooltip key={date}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`${formatDateForDisplay(date)}${filled ? " — done" : ""}`}
                      aria-pressed={filled}
                      disabled={isInFlight}
                      onClick={() => onToggle(date)}
                      className={[
                        "w-11 h-11 rounded-lg flex items-center justify-center text-sm font-mono font-medium transition-all duration-150 select-none",
                        isInFlight
                          ? "opacity-50 cursor-wait"
                          : "cursor-pointer hover:opacity-75 active:scale-95",
                        isToday && !filled
                          ? "ring-2 ring-foreground/20 ring-offset-2"
                          : "",
                        filled
                          ? "text-white shadow-sm"
                          : "text-foreground/50 bg-muted/50",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={filled ? { backgroundColor: habitColor } : undefined}
                    >
                      {num}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {formatDateForDisplay(date)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
