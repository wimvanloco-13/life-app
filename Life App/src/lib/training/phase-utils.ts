/**
 * Returns the current week number (1-based, capped at durationWeeks) within
 * a training phase. Uses UTC-noon arithmetic to avoid timezone / DST drift.
 */
export function computeWeekN(phaseStartDate: string, durationWeeks: number): number {
  const today = new Date().toISOString().slice(0, 10);
  const raw = Math.ceil(
    (new Date(today + "T12:00:00Z").getTime() -
      new Date(phaseStartDate + "T12:00:00Z").getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  return Math.max(1, Math.min(durationWeeks, raw));
}
