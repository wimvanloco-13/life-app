# Review: Habit Tracking V2 — Scope & Spec

**Reviewed:** 2026-06-05
**Artifacts reviewed:** `scope.md`, `clarifications.md`, `spec.md`
**Status:** Issues found — address before plan phase

---

## Blocking

### B1 — Scope.md has three sections that were overridden by clarifications but never updated

`scope.md` is the first document a new agent reads. In three places it describes something different from the final decisions in `clarifications.md`:

| Section | What scope.md says | What was decided |
|---|---|---|
| §1 Reward field | "Quick-add modal: new field below minimum version" | C1: quick-add unchanged — reward not shown there |
| §2 Cue type | "Five pill buttons or a small segmented control" | C2: small dropdown |
| §7 Editorial | Existing blocks "permanently visible" | C5: all five blocks collapsible, expanded by default |

**Fix:** Update `scope.md` to reflect the final decisions. The clarifications file records *why* something changed; `scope.md` should always reflect *what* the current state is.

---

### B2 — FR-5.3 describes a logically impossible scenario

FR-5.3 says: *"if both conditions apply simultaneously (user just logged today and there is also no yesterday log) the affirmation takes priority."*

The nudge trigger (FR-5.1) requires **today has no log**. The affirmation fires when the user **just logged today**. These two states are mutually exclusive — once today's cell is toggled on, FR-5.4 explicitly says the nudge disappears. The "both simultaneously" scenario cannot occur.

**Fix:** Remove that sentence from FR-5.3. It will cause confusion during implementation with no benefit.

---

### B3 — Edge case: cue type set but cue text empty — sentence rendering undefined

FR-3.2 says: *"No cue at all (text empty **and** type null): sentence is hidden entirely."*

The AND condition means: if the user picks a cue type (e.g. `time`) but leaves the text field blank, neither condition is met and the sentence would attempt to render — producing `"When Time: , I'll meditate."` — which is broken.

**Fix:** Change the hiding rule to: **cue text empty → sentence hidden, regardless of cue_type value.** One clean rule: cue text must be non-empty for the sentence to show at all.

---

## Important

### I1 — Keystone icon is not committed to a specific Lucide icon

FR-4.3 says `"a small ◆ icon (or equivalent Lucide icon)"`. The design system mandates Lucide icons exclusively — using the `◆` unicode character directly would break that rule. The "or equivalent" leaves the choice to the implementer.

**Fix:** Commit to a specific Lucide icon now. `Gem` is the best fit — it reads as rare and high-value, which matches the keystone concept. `Star` carries "favourite" connotations which is wrong here. Update FR-4.3 to specify `Lucide <Gem />`.

---

### I2 — cue_type → display label mapping is not formally stated anywhere

FR-2.2 defines dropdown display labels and FR-3.2 uses those labels inside the generated sentence (`"When Location: gym, I'll…"`). But the mapping from enum value to display label is never written down in one place. The `buildImplementationIntention()` pure function will need this explicitly, and so will any tests.

The implied mapping from FR-2.2:

| Enum value | Display label |
|---|---|
| `location` | Location |
| `time` | Time |
| `emotional_state` | Feeling |
| `other_people` | Person |
| `preceding_action` | Preceding action |

**Fix:** Add this table to FR-3.2 so there is one authoritative definition and no drift between the dropdown labels and the sentence labels.

---

## Minor

### M1 — Quick-add modal is longer post-V2, not shorter

The reward field was excluded from quick-add (C1) to keep it lean. But quick-add gains a cue type dropdown and a keystone toggle in V2. Net result:

- V1 quick-add: identity, name, cue text, minimum version, color (5 elements)
- V2 quick-add: identity, name, cue type dropdown, cue text, minimum version, keystone toggle, color (7 elements)

This is not a spec error — the field choices are reasonable — but "lean" was the stated justification for removing reward, and the modal is actually growing. Worth a conscious acknowledgement rather than an implicit slide.

---

## Summary

| # | Severity | Action |
|---|---|---|
| B1 | 🔴 Blocking | Update scope.md to reflect C1, C2, C5 |
| B2 | 🔴 Blocking | Remove impossible simultaneous-condition sentence from FR-5.3 |
| B3 | 🔴 Blocking | Add rule: cue text empty → sentence hidden regardless of cue_type |
| I1 | 🟡 Important | Commit to `Lucide <Gem />` for keystone icon in FR-4.3 |
| I2 | 🟡 Important | Add cue_type → display label lookup table to FR-3.2 |
| M1 | ⚪ Minor | Acknowledge quick-add growth in scope.md |
