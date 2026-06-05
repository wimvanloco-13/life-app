# Review: Habit Tracking V2 — Plan & Tasks

**Reviewed:** 2026-06-05
**Artifacts reviewed:** `plan.md`, `tasks.md`
**Source cross-checked against:** `spec.md`, `habit-row.tsx`, `habit-strip.tsx`
**Status:** Two blocking issues found — fix before implementation starts

---

## Blocking

### B1 — §4.2.8 and T027/T028 target the wrong component and reference a non-existent variable

The plan says to add the never-miss-twice nudge to `habit-strip.tsx`, and references a `justLoggedToday` flag it claims "already exists in `habit-strip.tsx`." Neither is correct.

**What the code actually shows:**

- `habit-row.tsx` renders `<HabitCalendar>`, not `<HabitStrip>`. `HabitStrip` is not in the rendering path of a habit row.
- The inline feedback slot (affirmation + error) lives in `habit-row.tsx` at lines 105–112, not inside any strip component.
- There is no `justLoggedToday` variable anywhere. The affirmation is a `string | null` prop passed into `HabitRow` from outside (from `habit-list.tsx`). Both `habit-row.tsx` and `habit-strip.tsx` simply render whatever is passed in.

**Correct implementation:**

The nudge belongs in `habit-row.tsx`, inserted into the inline-feedback block at lines 105–112. `HabitRow` already receives `logDates` and `today` as props, so `shouldShowNeverMissTwice(logDates, today)` can be called directly inside it:

```tsx
const showNudge = !habit.isArchived && shouldShowNeverMissTwice(logDates, today);

{/* Affirmation takes priority; nudge shows when no affirmation and nudge condition is met */}
{!habit.isArchived && affirmation && (
  <p className="pl-6 mt-2 text-xs text-muted-foreground animate-fade-in leading-snug">
    {affirmation}
  </p>
)}
{!habit.isArchived && !affirmation && showNudge && (
  <p className="pl-6 mt-2 text-xs text-muted-foreground leading-snug">
    Yesterday was a miss. Today is the one that counts.
  </p>
)}
{!habit.isArchived && !affirmation && !showNudge && error && (
  <p className="pl-6 mt-2 text-xs text-destructive leading-snug">{error}</p>
)}
```

`shouldShowNeverMissTwice` already checks whether today has a log (step 1 of its logic), so the nudge is naturally suppressed once today is toggled — no separate `justLoggedToday` guard is needed. The `!affirmation` guard gives the affirmation animation priority for its 2-second window.

**Fix:** Update plan §4.2.8 and tasks T027–T028 to target `habit-row.tsx`.

---

### B2 — §4.2.7 Gem icon markup uses `{habit.identity}` but the row renders `{habit.identity || habit.name}`

The plan's proposed markup wraps `habit.identity` in a span beside the Gem icon. But the actual `habit-row.tsx` heading (line 76) uses `{habit.identity || habit.name}` — if `habit.identity` is null, the heading falls back to the habit name. The plan's markup does not handle this fallback: if `identity` is null, the Gem icon would render beside empty text.

**Fix:** Update plan §4.2.7 markup to match the existing fallback pattern:

```tsx
<div className="flex items-center gap-1.5">
  <p className={`font-display text-[17px] font-semibold leading-snug ${...}`}>
    {habit.identity || habit.name}
  </p>
  {habit.isKeystone && (
    <Gem className="w-3.5 h-3.5 text-muted-foreground shrink-0" title="Keystone habit." />
  )}
</div>
```

The existing `<p>` element should be extended, not replaced with a new `<span>`, to preserve the archived line-through styling that is already on that element.

---

## Important

### I1 — Reward field placeholder will produce broken sentences for users who follow it

The walkthrough step 5 placeholder in §4.2.3 is: `"Feel clear-headed and energised"`.

The implementation intention sentence appends `"to feel [reward]"`. A user who types the placeholder verbatim produces: `"…, to feel Feel clear-headed and energised."` — capitalised mid-sentence and the word "feel" doubled. The same issue applies to the manual verification check at the end of §4.2.10, which already shows the broken output: `"to feel feel clear"`.

The placeholder is teaching the wrong input format. It must guide towards a noun phrase or adjective, not a sentence starting with "Feel".

**Fix:** Change placeholder to: `"calm, clear-headed, energised"` (no leading verb). Update FR-1.2 in `spec.md` accordingly. Also add a JSDoc note to `buildImplementationIntention` that `reward` is expected to be a noun phrase or adjective.

---

### I2 — Drafting artifact left in the test fixture table (§4.1.5)

The "cue only" row in the `buildImplementationIntention` fixture table has inline commentary in the expected output column:

```
| cue only | "gym" | null | null | `"When gym, I'll Run, to feel…"` — wait: no reward → `"When gym, I'll Run."` |
```

The `— wait: no reward →` text is a leftover editing note. The expected output column should contain only: `"When gym, I'll Run."` An implementer writing tests from this table will be confused about what the actual expected value is.

**Fix:** Clean up the row to: `| cue only | "gym" | null | null | "When gym, I'll Run." |`

---

## Minor

### M1 — T027/T028 target ambiguity is now resolved

T027 says `habit-strip.tsx` "(or `habit-row.tsx`, wherever the inline affirmation lives)"— the hedge is good instinct, but it leaves ambiguity. Per B1 above, `habit-row.tsx` is the correct target. Update T027–T028 to remove the `habit-strip.tsx` reference entirely to avoid a wrong-file implementation.

### M2 — `userId` source not specified for the `HabitPrinciples` localStorage key

§4.2.9 and T032 say to thread `userId` from `Life App/src/app/habits/page.tsx` to `HabitPrinciples`, but `habits/page.tsx` is a Next.js server component. It gets `userId` via `auth()` from `@/lib/auth`, not `useSession()`. The plan should note this explicitly so the implementer doesn't reach for the client-side `useSession()` hook in the page file.

---

## Summary

| # | Severity | File to fix | Action |
|---|---|---|---|
| B1 | 🔴 Blocking | `plan.md` §4.2.8, `tasks.md` T027–T028 | Retarget nudge to `habit-row.tsx`; remove `justLoggedToday` reference; update implementation snippet |
| B2 | 🔴 Blocking | `plan.md` §4.2.7, `tasks.md` T026 | Fix Gem icon markup to use `{habit.identity \|\| habit.name}` and extend the existing `<p>` |
| I1 | 🟡 Important | `plan.md` §4.2.3 + §4.2.10, `spec.md` FR-1.2 | Change reward placeholder to a noun phrase; add JSDoc note to helper |
| I2 | 🟡 Important | `plan.md` §4.1.5 | Clean up drafting artifact in test fixture table |
| M1 | ⚪ Minor | `tasks.md` T027–T028 | Remove `habit-strip.tsx` reference; say `habit-row.tsx` definitively |
| M2 | ⚪ Minor | `plan.md` §4.2.9, `tasks.md` T032 | Note that `userId` comes from `auth()` in the server component |
