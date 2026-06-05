# Spec: Habit Tracking V2

**Feature ID:** `habit-tracking-v2`
**Status:** Spec drafted 2026-06-05
**Builds on:** `habit-tracking` V1 (fully shipped)
**Source documents:** `scope.md`, `clarifications.md`
**Last updated:** 2026-06-05

---

## Context

V1 shipped an identity-based habit tracker (Atomic Habits framing): identity statement, habit name, optional cue (free text), minimum version, 14-day strip, streaks, reorder, archive. V2 completes the habit loop by adding three new fields (`reward`, `cue_type`, `is_keystone`), an auto-derived implementation intention sentence, a never-miss-twice nudge, and two new editorial blocks — all within the existing `/habits` page and modal flows. No new routes or pages.

---

## Decisions locked from clarifications

| # | Decision |
|---|---|
| C1 | Reward field appears in the walkthrough (new Step 5) and edit modal only. Quick-add modal unchanged. |
| C2 | Cue type selector is a small dropdown, not pill buttons. |
| C3 | Keystone flag is available in quick-add modal, walkthrough review step, and edit modal. |
| C4 | Never miss twice trigger: yesterday has no log AND any log exists within the last 14 days. |
| C5 | Editorial blocks are collapsible (expanded by default). |

---

## Schema changes

All three are `ALTER TABLE ADD COLUMN` — additive, idempotent in `apply-schema.js`. No migration of existing rows.

| Table | Change |
|---|---|
| `habits` | `ADD COLUMN reward TEXT` — nullable, max 200 chars |
| `habits` | `ADD COLUMN cue_type TEXT` — nullable, one of `location \| time \| emotional_state \| other_people \| preceding_action` |
| `habits` | `ADD COLUMN is_keystone INTEGER NOT NULL DEFAULT 0` |

---

## API changes

### `POST /api/habits` and `PATCH /api/habits/:id`

Both endpoints accept three new optional fields:

| Field | Type | Validation |
|---|---|---|
| `reward` | string or null | Trimmed. Stored as NULL if empty. Max 200 chars. |
| `cueType` | string or null | Must be one of the five enum values or null. Returns 400 on unrecognised value. |
| `isKeystone` | boolean | Coerced to 0/1 on write. Defaults to false/0 if absent. |

### `GET /api/habits`

Each habit object already returns all columns. The three new columns are included automatically — no shape change needed beyond adding the fields to the TypeScript return type.

---

## User stories

**US-1 Reward field (walkthrough)**
As a user creating a habit via the walkthrough, I want to specify what I feel or get after completing it so that my brain has a defined reward to anticipate.

**US-2 Reward field (edit modal)**
As a user reviewing a habit, I want to add or update the reward field so I can complete or refine my habit loop.

**US-3 Structured cue type**
As a user, I want to categorise my cue (location, time, feeling, person, or preceding action) using a dropdown so the habit loop is clearly structured.

**US-4 Implementation intention sentence**
As a user, I want to see a generated sentence like "When [cue], I'll [habit], to feel [reward]" on every habit row so I am constantly reminded of my full plan.

**US-5 Keystone habit flag**
As a user, I want to mark a habit as a keystone habit so I can visually identify which habits I believe have the most cascading influence on my life.

**US-6 Never miss twice nudge**
As a user who missed yesterday but hasn't logged today, I want a calm inline reminder so I feel invited back without pressure.

**US-7 Expanded editorial**
As a user, I want to read two additional editorial blocks (habit loop and replacement) alongside the existing three, and be able to collapse them when I no longer need them.

---

## Functional requirements

### FR-1 Reward field

- FR-1.1 Walkthrough gains a new Step 5 "What's your reward?" inserted before the existing review step (which becomes Step 6). Total walkthrough steps: 6.
- FR-1.2 Step 5 UI: a single text input labelled "What do you feel or get after doing this?" with placeholder `"calm, clear-headed, energised"` (noun phrase — no leading verb) and helper text: "Define the reward your brain learns to crave. Leave it blank if you're not sure yet."
- FR-1.3 Edit modal gains the reward field below the minimum version field.
- FR-1.4 Quick-add modal does not show the reward field.
- FR-1.5 Max 200 chars. Empty string saved as NULL. No server error if omitted.

### FR-2 Cue type

- FR-2.1 The cue section in all creation and edit surfaces gains a dropdown above the existing cue text input.
- FR-2.2 Dropdown options:
  - (none) — default, maps to NULL
  - Location — `location`
  - Time — `time`
  - Feeling — `emotional_state`
  - Person — `other_people`
  - Preceding action — `preceding_action`
- FR-2.3 Both the dropdown and the text input remain fully optional. User may use one, both, or neither.
- FR-2.4 Server rejects a cue_type value not in the enum with a 400 response.

### FR-3 Implementation intention sentence

- FR-3.1 A one-line generated sentence is displayed directly below the habit name on every list row.
- FR-3.2 Construction rules:
  - **Hiding rule:** if cue text is empty (regardless of cue_type value), the sentence is hidden entirely. Cue text is the required anchor.
  - cue type set: prefix the cue text with the display label (e.g. "Location: gym"). The authoritative cue_type → display label mapping is:

    | Enum value | Display label |
    |---|---|
    | `location` | Location |
    | `time` | Time |
    | `emotional_state` | Feeling |
    | `other_people` | Person |
    | `preceding_action` | Preceding action |

  - Full (cue text + cue type + reward): *"When [display label]: [cue text], I'll [habit name], to feel [reward]."*
  - No cue type (cue text + reward, no type): *"When [cue text], I'll [habit name], to feel [reward]."*
  - No reward: *"When [cue text], I'll [habit name]."* (with or without cue type)
  - This mapping is the single authoritative source — both `buildImplementationIntention()` and the dropdown labels in FR-2.2 must use it.
- FR-3.3 Text style: small, muted, italic. Truncated with ellipsis at row width.
- FR-3.4 No toggle — always visible when the conditions are met.
- FR-3.5 Pure client-side string construction. No API call.

### FR-4 Keystone habit flag

- FR-4.1 A toggle/checkbox "This is a keystone habit" appears in:
  - Quick-add modal: below the minimum version field (above submit)
  - Walkthrough Step 6 (review step): below the color picker
  - Edit modal: below the reward field
- FR-4.2 Helper text on the control: "Keystone habits tend to pull other positive changes along with them."
- FR-4.3 When `is_keystone = 1`, a small `<Gem />` icon (Lucide) appears inline with the habit name on the list row.
- FR-4.4 Tooltip on the ◆ icon: "Keystone habit."
- FR-4.5 No automatic sorting; drag order is unaffected.

### FR-5 Never miss twice nudge

- FR-5.1 Trigger: yesterday has no log for this habit AND at least one log exists within the last 14 days AND no log exists for today.
- FR-5.2 Display: a single line of calm muted text below the 14-day strip on the affected habit row — *"Yesterday was a miss. Today is the one that counts."*
- FR-5.3 The nudge and the V1 "mark today done" affirmation are mutually exclusive: the nudge requires today has no log; the affirmation fires when the user just logged today. They cannot co-exist.
- FR-5.4 The nudge disappears automatically once the user toggles today's cell on.
- FR-5.5 Pure client-side logic. No new API or schema change.

### FR-6 Expanded editorial section

- FR-6.1 Two new editorial blocks are added after the existing three:

  **Block 4 — "Habits run on a loop, not willpower."**
  > Every habit has three parts: the trigger that starts it, the behaviour itself, and the reward that tells the brain to repeat it. Define all three, and the habit becomes editable. Leave the reward undefined, and willpower has to fill the gap — which it reliably cannot.

  **Block 5 — "You don't break habits. You replace them."**
  > The trigger and the reward are encoded in the brain and do not disappear. What you can change is the behaviour in between. Keep the same cue, keep the same reward, and substitute a new routine. That is the mechanism. The rest is execution.

- FR-6.2 All five blocks are collapsible (expanded by default). A chevron toggle collapses the section.
- FR-6.3 Collapsed state persists in `localStorage` keyed to the user ID so it survives page reload.
- FR-6.4 Voice rules: no author or framework attribution, calm declarative tone, second person, sentence case, no cheerleading.

---

## Non-functional requirements

- NFR-1 All three schema columns are additive `ALTER TABLE ADD COLUMN` — no data migration, no downtime.
- NFR-2 The implementation intention sentence construction is a pure function with unit tests covering all branching cases (full, no type, no reward, no cue).
- NFR-3 The never miss twice trigger is also a pure function with tests covering: no-log-yesterday-with-recent-history, no-log-yesterday-no-history, today already logged.
- NFR-4 Existing V1 habits (all three new columns NULL / 0) continue to render and function without visual change beyond the new editorial blocks.

---

## Out of scope (confirmed)

- Golden Rule habit replacement wizard (V3 candidate)
- Post-completion reward rating or craving journal
- Cascading habit linkage
- Any new page or route
