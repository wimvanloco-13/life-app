"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateForDisplay } from "@/lib/dates";

interface HabitStripProps {
  recentLogDates: string[];
  habitColor: string;
  habitCreatedAt: string;
  today: string;
  inFlightDates: Set<string>;
  affirmation?: string | null;
  error?: string | null;
  onToggle: (date: string) => void;
}

/** Build the 14-date window ending on today (inclusive), timezone-safe. */
function buildWindow(today: string): string[] {
  const dates: string[] = [];
  const [y, m, d] = today.split("-").map(Number);
  const anchor = new Date(y, m - 1, d);
  for (let i = 13; i >= 0; i--) {
    const cur = new Date(anchor);
    cur.setDate(anchor.getDate() - i);
    const yy = cur.getFullYear();
    const mm = (cur.getMonth() + 1).toString().padStart(2, "0");
    const dd = cur.getDate().toString().padStart(2, "0");
    dates.push(`${yy}-${mm}-${dd}`);
  }
  return dates;
}

/** Short weekday label from an ISO date string. */
function dayAbbr(isoDate: string): string {
  // Append T12:00:00 to avoid timezone shifting the date to the previous day.
  return new Date(`${isoDate}T12:00:00`)
    .toLocaleDateString("en-US", { weekday: "short" })
    .slice(0, 2);
}

export function HabitStrip({
  recentLogDates,
  habitColor,
  habitCreatedAt,
  today,
  inFlightDates,
  affirmation,
  error,
  onToggle,
}: HabitStripProps) {
  const all14 = buildWindow(today);
  const weeks = [all14.slice(0, 7), all14.slice(7, 14)];
  const logSet = new Set(recentLogDates);
  const createdDate = habitCreatedAt.slice(0, 10);

  return (
    <div className="flex flex-col gap-1.5">
      <TooltipProvider delayDuration={150}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5" role="row">
            {week.map((date) => {
              const isBeforeCreation = date < createdDate;
              const isInFlight = inFlightDates.has(date);
              const filled = logSet.has(date);
              const isToday = date === today;
              const num = parseInt(date.split("-")[2]);

              if (isBeforeCreation) {
                return (
                  <div
                    key={date}
                    aria-hidden="true"
                    className="flex flex-col items-center gap-0.5 w-8"
                  >
                    <span className="text-[9px] text-muted-foreground/40 leading-none">
                      {dayAbbr(date)}
                    </span>
                    <div className="w-8 h-8 rounded-md bg-muted/20" />
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
                        "flex flex-col items-center gap-0.5 w-8 rounded-md transition-all duration-150",
                        isInFlight
                          ? "opacity-60 cursor-wait"
                          : "cursor-pointer hover:opacity-80 active:scale-95",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {/* Day label */}
                      <span
                        className={`text-[9px] leading-none font-medium ${
                          isToday
                            ? "text-foreground/60"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {dayAbbr(date)}
                      </span>

                      {/* Date cell */}
                      <div
                        className={[
                          "w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-medium transition-colors duration-150",
                          isToday && !filled
                            ? "ring-1 ring-foreground/25 ring-offset-1"
                            : "",
                          filled ? "text-white" : "text-muted-foreground bg-muted/40",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={filled ? { backgroundColor: habitColor } : undefined}
                      >
                        {num}
                      </div>
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
      </TooltipProvider>

      {/* Inline feedback — mutually exclusive */}
      {affirmation && (
        <p className="text-[11px] text-muted-foreground animate-fade-in leading-snug mt-0.5">
          {affirmation}
        </p>
      )}
      {!affirmation && error && (
        <p className="text-[11px] text-destructive leading-snug mt-0.5">{error}</p>
      )}
    </div>
  );
}
