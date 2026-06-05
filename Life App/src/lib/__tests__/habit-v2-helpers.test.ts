import { describe, it, expect } from "vitest";
import { buildImplementationIntention, shouldShowNeverMissTwice } from "../habit-v2-helpers";

// ─── buildImplementationIntention ────────────────────────────────────────────

describe("buildImplementationIntention", () => {
  const base = { name: "Run", reward: null, cueType: null };

  it("returns null when cue is null", () => {
    expect(buildImplementationIntention({ ...base, cue: null })).toBeNull();
  });

  it("returns null when cue is empty string", () => {
    expect(buildImplementationIntention({ ...base, cue: "" })).toBeNull();
  });

  it("returns null when cue is whitespace only", () => {
    expect(buildImplementationIntention({ ...base, cue: "   " })).toBeNull();
  });

  it("builds sentence with cue only (no type, no reward)", () => {
    expect(buildImplementationIntention({ ...base, cue: "gym" })).toBe(
      "When gym, I'll Run.",
    );
  });

  it("builds sentence with cue + type (no reward)", () => {
    expect(
      buildImplementationIntention({ ...base, cue: "gym", cueType: "location" }),
    ).toBe("When Location: gym, I'll Run.");
  });

  it("builds sentence with cue + type + reward (full)", () => {
    expect(
      buildImplementationIntention({
        name: "Run",
        cue: "gym",
        cueType: "location",
        reward: "strong",
      }),
    ).toBe("When Location: gym, I'll Run, to feel strong.");
  });

  it("builds sentence with cue + reward, no type", () => {
    expect(
      buildImplementationIntention({ name: "Run", cue: "morning", cueType: null, reward: "clear" }),
    ).toBe("When morning, I'll Run, to feel clear.");
  });

  it("returns null when cue type is set but cue text is empty", () => {
    expect(
      buildImplementationIntention({ ...base, cue: "", cueType: "time" }),
    ).toBeNull();
  });

  it("falls back to plain cue when cue type is unknown", () => {
    expect(
      buildImplementationIntention({ ...base, cue: "park", cueType: "unknown_type" }),
    ).toBe("When park, I'll Run.");
  });
});

// ─── shouldShowNeverMissTwice ─────────────────────────────────────────────────

describe("shouldShowNeverMissTwice", () => {
  const TODAY = "2026-06-05";

  it("returns false when today is already logged", () => {
    expect(shouldShowNeverMissTwice(["2026-06-05"], TODAY)).toBe(false);
  });

  it("returns false when yesterday is logged (no miss yet)", () => {
    expect(shouldShowNeverMissTwice(["2026-06-04"], TODAY)).toBe(false);
  });

  it("returns true when yesterday missed and log exists 2 days ago", () => {
    expect(shouldShowNeverMissTwice(["2026-06-03"], TODAY)).toBe(true);
  });

  it("returns true when yesterday missed and log exists 10 days ago", () => {
    expect(shouldShowNeverMissTwice(["2026-05-26"], TODAY)).toBe(true);
  });

  it("returns false when yesterday missed but log is 15 days ago (outside 14-day window)", () => {
    expect(shouldShowNeverMissTwice(["2026-05-21"], TODAY)).toBe(false);
  });

  it("returns false when log array is empty (brand new habit)", () => {
    expect(shouldShowNeverMissTwice([], TODAY)).toBe(false);
  });

  it("returns false when today is logged even with a gap yesterday", () => {
    expect(shouldShowNeverMissTwice(["2026-06-03", "2026-06-05"], TODAY)).toBe(false);
  });
});
