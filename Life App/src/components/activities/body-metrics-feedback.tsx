"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BodyMetric, UserBodyProfile } from "@/types";
import {
  interpretWeight,
  interpretVo2max,
  interpretRestingHr,
} from "@/lib/body-metrics-guidance";

interface BodyMetricsFeedbackProps {
  profile: UserBodyProfile | null;
  allMetrics: BodyMetric[];
  dobRef: React.RefObject<HTMLInputElement | null>;
  sexRef: React.RefObject<HTMLButtonElement | null>;
  heightRef: React.RefObject<HTMLInputElement | null>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageFromDob(dob: string, today: string): number {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

/** Returns a focusable link button for prompt-state cards. */
function FocusLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="underline underline-offset-2 text-foreground hover:text-foreground/70 transition-colors"
    >
      {label}
    </button>
  );
}

// ─── Weight card ──────────────────────────────────────────────────────────────

function WeightCard({
  allMetrics,
  profile,
  today,
  heightRef,
}: {
  allMetrics: BodyMetric[];
  profile: UserBodyProfile | null;
  today: string;
  heightRef: React.RefObject<HTMLInputElement | null>;
}) {
  const weightReadings = allMetrics
    .filter((m) => m.metricType === "weight")
    .map((m) => ({ value: m.value, date: m.date }));

  const hasWeight = weightReadings.length > 0;
  const hasHeight = !!profile?.heightCm;
  const hasWaist = !!profile?.waistCm;
  const hasWaistAndHeight = hasWaist && hasHeight;

  if (!hasWeight) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Log a weight measurement above to see your BMI.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasHeight) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {hasWaist
              ? <>
                  <FocusLink label="Add your height in About you" onClick={() => heightRef.current?.focus()} />
                  {" "}to see your BMI and waist-to-height ratio.
                </>
              : <>
                  <FocusLink label="Add your height in About you" onClick={() => heightRef.current?.focus()} />
                  {" "}to see whether your weight is in a healthy range.
                </>
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const result = interpretWeight({
    heightCm: profile.heightCm!,
    weightReadings,
    today,
    waistCm: hasWaistAndHeight ? profile.waistCm : null,
    sex: profile.biologicalSex ?? null,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weight</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{result.bmi}</span>
          <span className="text-muted-foreground">BMI · {result.bmiCategory}</span>
        </div>

        <p className="text-muted-foreground">
          Healthy weight range for {profile.heightCm} cm:{" "}
          <span className="text-foreground font-medium">{result.healthyRangeMin} – {result.healthyRangeMax} kg</span>
        </p>

        {result.averagingNote && (
          <p className="text-xs text-muted-foreground">{result.averagingNote}</p>
        )}

        {result.whr != null && result.whrCategory && (
          <div className="pt-1 border-t">
            <p className="text-muted-foreground">
              Waist-to-height ratio:{" "}
              <span className="text-foreground font-medium">{result.whr}</span>
              {" · "}{result.whrCategory}
            </p>
            {result.waistCategory && (
              <p className="text-muted-foreground mt-0.5">
                Absolute waist:{" "}
                <span className={
                  result.waistCategory === "High risk"
                    ? "text-destructive font-medium"
                    : result.waistCategory === "Elevated risk"
                    ? "text-[var(--palette-amber)] font-medium"
                    : "text-foreground font-medium"
                }>
                  {result.waistCategory}
                </span>
                {" "}(European ESC/IDF thresholds)
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground border-t pt-2">
          BMI does not distinguish muscle from fat. If you carry significant muscle mass, this figure may overstate adiposity.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── VO2max card ──────────────────────────────────────────────────────────────

function Vo2maxCard({
  allMetrics,
  profile,
  today,
  dobRef,
  sexRef,
}: {
  allMetrics: BodyMetric[];
  profile: UserBodyProfile | null;
  today: string;
  dobRef: React.RefObject<HTMLInputElement | null>;
  sexRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const vo2Metrics = allMetrics
    .filter((m) => m.metricType === "vo2max")
    .sort((a, b) => b.date.localeCompare(a.date));

  const latest = vo2Metrics[0];
  const hasDob = !!profile?.dateOfBirth;
  const hasSex = !!profile?.biologicalSex;

  if (!latest) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">VO2max</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Log a VO2max reading above to see how it compares.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasDob && !hasSex) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">VO2max</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <FocusLink label="Add your date of birth and biological sex in About you" onClick={() => dobRef.current?.focus()} />
            {" "}to see how your VO2max compares.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasSex) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">VO2max</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <FocusLink label="Add your biological sex in About you" onClick={() => sexRef.current?.focus()} />
            {" "}to see how your VO2max compares.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasDob) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">VO2max</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <FocusLink label="Add your date of birth in About you" onClick={() => dobRef.current?.focus()} />
            {" "}to see how your VO2max compares.
          </p>
        </CardContent>
      </Card>
    );
  }

  const age = ageFromDob(profile.dateOfBirth!, today);
  const result = interpretVo2max(latest.value, age, profile.biologicalSex!);

  const verdicts: Record<string, string> = {
    Superior:  "This is an elite level of cardiovascular fitness, well above average for your age group.",
    Excellent: "This is a strong result, placing you above most people your age.",
    Good:      "This is above average for your age group — solid aerobic fitness.",
    Average:   "This is around the midpoint for your age group. There is room to build from here.",
    Fair:      "This is below average for your age group. Consistent aerobic exercise will move this number.",
    Poor:      "This is in the lower range for your age group. Regular aerobic exercise has the biggest impact here.",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">VO2max</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{latest.value}</span>
          <span className="text-muted-foreground">ml/kg/min</span>
        </div>
        <p>
          <span className="font-medium">{result.category}</span>
          {" · "}{result.percentileLabel} for a {age}-year-old {profile.biologicalSex === "male" ? "man" : "woman"}
        </p>
        <p className="text-muted-foreground">{verdicts[result.category] ?? ""}</p>
        {result.ageBracketNote && (
          <p className="text-xs text-muted-foreground">{result.ageBracketNote}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Resting HR card ──────────────────────────────────────────────────────────

function RestingHrCard({
  allMetrics,
  profile,
  today,
  dobRef,
  sexRef,
}: {
  allMetrics: BodyMetric[];
  profile: UserBodyProfile | null;
  today: string;
  dobRef: React.RefObject<HTMLInputElement | null>;
  sexRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const rhrMetrics = allMetrics
    .filter((m) => m.metricType === "resting_hr")
    .sort((a, b) => b.date.localeCompare(a.date));

  const latest = rhrMetrics[0];
  const hasDob = !!profile?.dateOfBirth;
  const hasSex = !!profile?.biologicalSex;

  if (!latest) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Resting HR</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Log a resting heart rate above to see how it compares.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasDob || !hasSex) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Resting HR</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <FocusLink
              label={!hasDob && !hasSex ? "Add your date of birth and biological sex in About you" : !hasDob ? "Add your date of birth in About you" : "Add your biological sex in About you"}
              onClick={() => (!hasDob ? dobRef.current?.focus() : sexRef.current?.focus())}
            />
            {" "}to see how your resting heart rate compares.
          </p>
        </CardContent>
      </Card>
    );
  }

  const age = ageFromDob(profile.dateOfBirth!, today);
  const result = interpretRestingHr(latest.value, age, profile.biologicalSex!);

  const verdicts: Record<string, string> = {
    Athlete:        "This is typical for people with a high level of cardiovascular fitness — well trained athletes often see values in this range.",
    Excellent:      "This is an excellent resting heart rate, reflecting good cardiovascular health.",
    Good:           "This is a good resting heart rate for your age group.",
    "Above average":"This is above average, indicating solid cardiovascular fitness.",
    Average:        "This is within the average range for your age group.",
    "Below average":"This is slightly below average. Regular aerobic exercise tends to lower resting heart rate over time.",
    Poor:           "This is in the lower range for your age group. Improving aerobic fitness, sleep quality, and hydration can help.",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Resting HR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{latest.value}</span>
          <span className="text-muted-foreground">bpm · {result.category}</span>
        </div>
        <p className="text-muted-foreground">{verdicts[result.category] ?? ""}</p>
        {age < 18 && result.ageBracket && (
          <p className="text-xs text-muted-foreground">
            This comparison uses the closest available age group ({result.ageBracket}).
          </p>
        )}
        {result.highHrNote && (
          <p className="text-xs text-muted-foreground border-t pt-2">
            A persistently high resting heart rate with symptoms warrants a check with a healthcare professional.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function BodyMetricsFeedback({
  profile,
  allMetrics,
  dobRef,
  sexRef,
  heightRef,
}: BodyMetricsFeedbackProps) {
  // Client owns "today" — follows the same pattern as computeStreaks in habit-streaks.ts
  const today = new Date().toLocaleDateString("sv-SE");

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Your metrics</h2>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        <WeightCard
          allMetrics={allMetrics}
          profile={profile}
          today={today}
          heightRef={heightRef}
        />
        <Vo2maxCard
          allMetrics={allMetrics}
          profile={profile}
          today={today}
          dobRef={dobRef}
          sexRef={sexRef}
        />
        <RestingHrCard
          allMetrics={allMetrics}
          profile={profile}
          today={today}
          dobRef={dobRef}
          sexRef={sexRef}
        />
      </div>

      <p className="text-xs text-muted-foreground border rounded-md p-3">
        These are population reference ranges and screening tools, not a diagnosis. Readings outside a normal range, especially if accompanied by symptoms, warrant a consultation with a healthcare professional.
      </p>
    </div>
  );
}
