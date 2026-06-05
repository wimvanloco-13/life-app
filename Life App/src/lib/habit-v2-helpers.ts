import { CUE_TYPE_LABELS } from "@/types";
import type { Habit } from "@/types";

/**
 * Builds the implementation intention sentence for a habit row.
 *
 * The `reward` field is expected to be a noun phrase or adjective
 * (e.g. "calm, energised") — not a full sentence starting with "feel".
 * The sentence template appends "to feel [reward]", so passing "feel good"
 * produces "to feel feel good". Placeholder copy in the form guides users
 * toward the correct format.
 *
 * Returns null when cue text is empty (the sentence is hidden entirely).
 */
export function buildImplementationIntention(
  habit: Pick<Habit, "cue" | "cueType" | "name" | "reward">,
): string | null {
  const cueText = habit.cue?.trim() ?? "";
  if (cueText.length === 0) return null;

  const label = habit.cueType ? CUE_TYPE_LABELS[habit.cueType] : null;
  const cueSegment = label ? `${label}: ${cueText}` : cueText;

  const reward = habit.reward?.trim() ?? "";
  if (reward.length > 0) {
    return `When ${cueSegment}, I'll ${habit.name}, to feel ${reward}.`;
  }
  return `When ${cueSegment}, I'll ${habit.name}.`;
}

/**
 * Returns true when the never-miss-twice nudge should be shown for a habit.
 *
 * Trigger conditions (spec FR-5.1):
 * 1. Today has no log.
 * 2. Yesterday has no log (there was a miss).
 * 3. At least one log exists within the last 14 days (recent activity exists).
 */
export function shouldShowNeverMissTwice(
  recentLogDates: string[],
  today: string,
): boolean {
  // Anchor to UTC noon to stay clear of DST and local-timezone midnight drift
  const DAY = 86_400_000;
  const todayNoon = new Date(today + "T12:00:00Z").getTime();

  const yesterdayStr = new Date(todayNoon - DAY).toISOString().slice(0, 10);
  const cutoffStr = new Date(todayNoon - 14 * DAY).toISOString().slice(0, 10);

  const dateSet = new Set(recentLogDates);

  // Condition 1: today already logged → no nudge
  if (dateSet.has(today)) return false;

  // Condition 2: yesterday was logged → no miss yet
  if (dateSet.has(yesterdayStr)) return false;

  // Condition 3: at least one log within the last 14 days (ISO string comparison
  // is safe here — YYYY-MM-DD strings sort lexicographically)
  for (const d of recentLogDates) {
    if (d >= cutoffStr && d < today) return true;
  }

  return false;
}
