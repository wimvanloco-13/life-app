import {
  startOfWeek,
  endOfWeek,
  format,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isMonday,
  parseISO,
  isSameDay,
  isToday as fnsIsToday,
  isBefore,
} from "date-fns";

/**
 * Get the Monday that starts the week containing the given date.
 * Our weeks always start on Monday per the spec clarification.
 */
export function getWeekStartDate(date: Date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

/**
 * Returns the canonical weekly-plan key used to store a month's focus goals.
 * The Monthly Plan always stores focus goals on the week containing the 1st of
 * the month (getWeekStartDate(firstOfMonth)).  This Week and Today must query
 * that same key — not their own ISO week — so they see the same rows.
 */
export function getFocusGoalWeekKey(date: Date): string {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return getWeekStartDate(firstOfMonth);
}

/**
 * Get all 7 dates (Monday through Sunday) for the week containing the given date.
 */
export function getWeekDates(weekStartDate: string): Date[] {
  const start = parseISO(weekStartDate);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

/**
 * Format a time string for display (e.g., "07:00" -> "7:00 AM").
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format a date for display (e.g., "Mon, Mar 3").
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEE, MMM d");
}

/**
 * Format a date as ISO date string (yyyy-MM-dd).
 */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Get the week start date for the next week.
 */
export function getNextWeek(weekStartDate: string): string {
  return format(addWeeks(parseISO(weekStartDate), 1), "yyyy-MM-dd");
}

/**
 * Get the week start date for the previous week.
 */
export function getPreviousWeek(weekStartDate: string): string {
  return format(subWeeks(parseISO(weekStartDate), 1), "yyyy-MM-dd");
}

/**
 * Check if a given date string represents the current week.
 */
export function isCurrentWeek(weekStartDate: string): boolean {
  return weekStartDate === getWeekStartDate();
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  return fnsIsToday(d);
}

/**
 * Check if a date is before today (for carry-forward logic).
 */
export function isBeforeToday(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(d, today);
}

/**
 * Validate that a date string is a Monday.
 */
export function validateIsMonday(dateStr: string): boolean {
  return isMonday(parseISO(dateStr));
}

/**
 * Validate a time string is on 30-minute boundaries (e.g., "07:00", "07:30").
 */
export function validateTimeSlot(time: string): boolean {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const minutes = parseInt(match[2]);
  return minutes === 0 || minutes === 30;
}

/**
 * Generate time slots for a day (06:00 to 23:00 in 30-min increments).
 */
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 23) {
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return slots;
}

/**
 * Calculate duration in minutes between two time strings.
 */
export function getDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

/**
 * Get day of week number (1 = Monday, 7 = Sunday) for a date.
 */
export function getDayOfWeek(date: Date | string): number {
  const d = typeof date === "string" ? parseISO(date) : date;
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

/**
 * Convert an ISO date or ISO datetime string to the user-facing DD-MM-YYYY display format.
 *
 * Used by the Habits feature per spec FR-019. Storage and API wire format stay
 * ISO `YYYY-MM-DD`; only the render boundary uses DD-MM-YYYY.
 *
 * Defensive: malformed input is returned unchanged so a render path never throws.
 * The app-wide sweep of existing ISO display sites to use this helper is tracked
 * as a separate follow-up feature (FR-020).
 */
export function formatDateForDisplay(iso: string): string {
  if (typeof iso !== "string" || iso.length < 10) return iso;
  const datePart = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return iso;
  const [y, m, d] = datePart.split("-");
  return `${d}-${m}-${y}`;
}
