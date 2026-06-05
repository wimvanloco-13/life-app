# Scope: Habit Tracking V2

**Feature ID:** `habit-tracking-v2`
**Status:** Scope drafted 2026-06-05
**Builds on:** `habit-tracking` (V1, built and shipped)
**Source material:** `Books/Life coaching/The power of habit/The power of habit.txt`
**Last updated:** 2026-06-05

---

## Why V2

V1 implemented identity-based habit tracking (Atomic Habits framing): identity statement, habit name, cue (optional free text), minimum version, 14-day strip, streaks. The habit loop is incomplete — the cue and routine are present, but the reward is absent and the cue has no structure.

*The Power of Habit* (Duhigg) adds a second, complementary framework that fills these gaps: the neurological habit loop (Cue → Routine → Reward), the craving that powers it, cue typing across five scientifically-identified categories, the implementation intention as a written plan, keystone habits, and the "never miss twice" recovery principle (already deferred from V1).

V2 incorporates these principles into the habit tracker and updates the library accordingly.

---

## What's in scope

### 1. Reward field

A new optional text input — "What do I feel or get after doing this?" — completing the Cue → Routine → Reward loop on every habit.

**Schema change:** `ALTER TABLE habits ADD COLUMN reward TEXT` (nullable, max 200 chars)

**UI placement:**
- Walkthrough: new Step 5 "What's your reward?" inserted between minimum version (Step 4) and review (Step 6). Review step becomes Step 6.
- Edit modal: new field below minimum version
- Quick-add modal: reward field is **not shown**. Note: quick-add does gain a cue type dropdown and keystone toggle in V2, growing from 5 to 7 elements. Reward was excluded as the least urgent field for a first-time create; it can always be added in the edit modal immediately after.

**Validation:** optional; if provided, trimmed, max 200 chars. Empty string stored as NULL.

---

### 2. Cue type

A structured tag alongside the existing free-text cue field. The five categories come directly from Duhigg's research: **Location / Time / Emotional state / Other people / Preceding action**.

**Schema change:** `ALTER TABLE habits ADD COLUMN cue_type TEXT` (nullable; one of the five values or NULL)

**UI placement:**
- The cue field becomes a two-part input: a small dropdown for the type selector followed by the existing free-text field.
- Both remain fully optional. A user can fill the text without picking a type, or leave both empty.
- Walkthrough Step 3 (cue) gains the type selector above the text input.

**Validation:** if provided, must be one of `location | time | emotional_state | other_people | preceding_action`. Server returns 400 on invalid value.

---

### 3. Implementation intention sentence

An auto-generated one-liner derived from the stored fields, displayed on every habit row as permanent reinforcement.

**Format:**
- Full: *"When [cue type: cue text], I'll [habit name], to feel [reward]."*
- No cue type: *"When [cue text], I'll [habit name], to feel [reward]."*
- No reward: *"When [cue text], I'll [habit name]."*
- No cue at all: sentence is hidden.

**UI placement:** Always visible directly under the habit name on the list row, in small muted italic text. One line; truncated with ellipsis at available width. No toggle needed — permanent visibility is the point.

**Implementation:** Pure client-side string construction from existing fields. No new API or schema change required.

---

### 4. Keystone habit flag

A boolean on each habit. A keystone habit is one that the user identifies as having cascading influence on other areas of their life.

**Schema change:** `ALTER TABLE habits ADD COLUMN is_keystone INTEGER NOT NULL DEFAULT 0`

**UI placement:**
- Edit modal: a simple toggle/checkbox "This is a keystone habit" with a one-line explanation: "Keystone habits tend to pull other positive changes along with them."
- Habit row: a small ◆ icon appears next to the habit name when `is_keystone = 1`. A tooltip on hover: "Keystone habit."
- No automatic sorting. The user's drag order is preserved.

**Validation:** boolean coercion on the server (0 / 1).

---

### 5. "Never miss twice" nudge

When a habit had a streak > 0 and the user missed yesterday but has not yet logged today, show a calm inline prompt on that habit row.

**Trigger condition (client-side):**
- `currentStreak` (from `computeStreaks`) was > 0 as of yesterday
- No log exists for today
- A log exists for yesterday − 1 or earlier (i.e. there was a real streak, not a brand-new habit)

**UI placement:** Inline below the 14-day strip on the affected habit row only, in the same position as the existing affirmation. Calm muted text: *"Yesterday was a miss. Today is the one that counts."* Disappears automatically once today's cell is toggled.

**Implementation:** Pure client-side logic. No new API or schema change required.

---

### 6. Expanded habit row

The habit row gains two visible elements without restructuring the layout:

1. **Implementation intention sentence** (see §3) — one line under the habit name
2. **Keystone badge** (see §4) — ◆ icon inline with the habit name

The strip, streak readout, and edit affordance remain in their current positions.

---

### 7. Expanded editorial section

The three existing editorial blocks at the bottom of the Habits page ("Start with who you are becoming", "The minimum version is the real habit", "Do not miss twice") are retained. All five blocks (existing three plus two new ones below) are collapsible, expanded by default. Collapsed state persists in `localStorage`.

Two new blocks are added from the Duhigg framework:

**Block 4 — "Habits run on a loop, not willpower."**
> Subtitle: Every habit has three parts: the trigger that starts it, the behaviour itself, and the reward that tells the brain to repeat it. Define all three, and the habit becomes editable. Leave the reward undefined, and willpower has to fill the gap — which it reliably cannot.

**Block 5 — "You don't break habits. You replace them."**
> Subtitle: The trigger and the reward are encoded in the brain and do not disappear. What you can change is the behaviour in between. Keep the same cue, keep the same reward, and substitute a new routine. That is the mechanism. The rest is execution.

All editorial copy follows the existing voice rules from V1: no author or framework attribution, calm and declarative, second person, sentence case, no cheerleading.

---

## What is explicitly out of scope

- The Golden Rule habit replacement wizard (a guided flow for replacing bad habits). This belongs in V3 if needed.
- Post-completion reward rating or craving journal entries.
- Cascading habit linkage (linking a dependent habit to a keystone habit).
- Any new page or route. All changes live within the existing `/habits` page and the existing modal flows.

---

## Schema changes summary

| Table | Change |
|---|---|
| `habits` | `ADD COLUMN reward TEXT` (nullable, max 200) |
| `habits` | `ADD COLUMN cue_type TEXT` (nullable, enum of 5) |
| `habits` | `ADD COLUMN is_keystone INTEGER NOT NULL DEFAULT 0` |

All three are `ALTER TABLE ADD COLUMN` statements — additive and idempotent in `apply-schema.js`. Existing habit rows default to NULL / 0 with no migration needed.

---

## Dependencies

- `habit-tracking` V1 fully shipped (confirmed)
- `scripts/seed-library-lib.cjs` updated with Duhigg-derived content in the Habit Design library topic (done in the same commit as this scope)
