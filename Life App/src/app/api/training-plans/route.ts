import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans, trainingPhases, goals } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { assessLevel, generatePhases } from "@/lib/training/periodization";
import { assessTennisLevel, generateTennisPhases } from "@/lib/training/tennis-periodization";
import { assessRunningLevel, generateRunningPhases } from "@/lib/training/running-periodization";
import { defaultSplit, isValidSplit } from "@/lib/training/split";
import type { ClimbingSportProfile, ClimbingLimitation, TennisSportProfile, PhysicalLimitation, TennisPlayingStyle, TennisPlayerLevel, RunningSportProfile, RunnerLevel, RunningLimitation } from "@/types";
import { auth } from "@/lib/auth";

function parseSportProfile(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function parseDayArray(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((d) => typeof d === "number") : [];
  } catch { return []; }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");
  const goalIdsParam = searchParams.get("goalIds");

  // Batch mode: goalIds=1,2,3 — returns an array of plan+phases objects
  // (null entries for goals without a plan are omitted).
  if (goalIdsParam) {
    const ids = goalIdsParam
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
    if (ids.length === 0) return NextResponse.json([]);

    const plans = await db
      .select()
      .from(trainingPlans)
      .where(and(inArray(trainingPlans.goalId, ids), eq(trainingPlans.userId, userId)));

    if (plans.length === 0) return NextResponse.json([]);

    // Fetch all phases for the returned plans in one query.
    const planIds = plans.map((p) => p.id);
    const allPhases = await db
      .select()
      .from(trainingPhases)
      .where(inArray(trainingPhases.trainingPlanId, planIds));

    const phasesByPlan = new Map<number, typeof allPhases>();
    for (const phase of allPhases) {
      if (!phasesByPlan.has(phase.trainingPlanId)) phasesByPlan.set(phase.trainingPlanId, []);
      phasesByPlan.get(phase.trainingPlanId)!.push(phase);
    }

    return NextResponse.json(
      plans.map((plan) => ({
        ...plan,
        sportProfile: parseSportProfile(plan.sportProfile),
        trainingPreferredDays: parseDayArray(plan.trainingPreferredDays),
        supplementalPreferredDays: parseDayArray(plan.supplementalPreferredDays),
        phases: (phasesByPlan.get(plan.id) ?? []).sort((a, b) => a.orderIndex - b.orderIndex),
      }))
    );
  }

  // Single-goal mode (existing behaviour).
  if (!goalId) return NextResponse.json({ error: "goalId or goalIds query parameter is required" }, { status: 400 });

  const plans = await db.select().from(trainingPlans).where(and(eq(trainingPlans.goalId, parseInt(goalId)), eq(trainingPlans.userId, userId)));
  if (plans.length === 0) return NextResponse.json(null);

  const plan = plans[0];
  const phases = await db.select().from(trainingPhases).where(eq(trainingPhases.trainingPlanId, plan.id));
  phases.sort((a, b) => a.orderIndex - b.orderIndex);
  return NextResponse.json({
    ...plan,
    sportProfile: parseSportProfile(plan.sportProfile),
    trainingPreferredDays: parseDayArray(plan.trainingPreferredDays),
    supplementalPreferredDays: parseDayArray(plan.supplementalPreferredDays),
    phases,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const {
    goalId,
    sport = "climbing",
    yearsExperience,
    startDate,
    sportProfile,
    trainingSessionsPerWeek: requestedTraining,
    supplementalSessionsPerWeek: requestedSupplemental,
    trainingPreferredDays: requestedTrainingDays,
    supplementalPreferredDays: requestedSupplementalDays,
  } = body;

  if (!goalId || yearsExperience == null || !startDate) return NextResponse.json({ error: "goalId, yearsExperience, and startDate are required" }, { status: 400 });

  const existing = await db.select().from(trainingPlans).where(and(eq(trainingPlans.goalId, goalId), eq(trainingPlans.userId, userId)));
  if (existing.length > 0) return NextResponse.json({ error: "This goal already has a training plan" }, { status: 409 });

  // Fetch the goal to derive default split and to validate any provided values.
  const goalRows = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (goalRows.length === 0) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  const goal = goalRows[0];

  // Resolve the training/supplemental split. If the client provided values, validate them.
  // If not, fall back to the default formula based on the goal's sessionsPerWeek.
  let trainingSessionsPerWeek: number;
  let supplementalSessionsPerWeek: number;
  if (requestedTraining != null || requestedSupplemental != null) {
    if (requestedTraining == null || requestedSupplemental == null) {
      return NextResponse.json({ error: "Both trainingSessionsPerWeek and supplementalSessionsPerWeek must be provided together" }, { status: 400 });
    }
    if (!isValidSplit(requestedTraining, requestedSupplemental, goal.sessionsPerWeek)) {
      return NextResponse.json({ error: `Split is invalid: training + supplemental must equal ${goal.sessionsPerWeek} (the goal's sessions per week)` }, { status: 400 });
    }
    trainingSessionsPerWeek = requestedTraining;
    supplementalSessionsPerWeek = requestedSupplemental;
  } else {
    const d = defaultSplit(goal.sessionsPerWeek);
    trainingSessionsPerWeek = d.training;
    supplementalSessionsPerWeek = d.supplemental;
  }

  const trainingPreferredDays = Array.isArray(requestedTrainingDays) ? requestedTrainingDays.filter((d) => typeof d === "number") : [];
  const supplementalPreferredDays = Array.isArray(requestedSupplementalDays) ? requestedSupplementalDays.filter((d) => typeof d === "number") : [];

  let derivedLevel: string;
  let recommendedModel: string;
  let generatedPhases: { phaseType: string; orderIndex: number; durationWeeks: number; startDate: string; endDate: string; description: string; sportFocusContent?: string | null; supplementalContent?: string | null; mentalGameContent?: string | null; limitationNotes?: string | null }[];

  if (sport === "running") {
    const profile = sportProfile as RunningSportProfile;
    if (profile?.goalDistance == null || profile?.runsPerWeek == null) return NextResponse.json({ error: "Running plans require goalDistance and runsPerWeek in sportProfile" }, { status: 400 });
    const assessment = assessRunningLevel(profile.runsPerWeek, yearsExperience, profile.canRun30MinContinuous ?? false, profile.hasRaced ?? false);
    derivedLevel = assessment.derivedLevel;
    recommendedModel = assessment.recommendedModel;
    generatedPhases = generateRunningPhases(assessment.derivedLevel as RunnerLevel, profile.goalDistance, (profile.physicalLimitations ?? []) as RunningLimitation[], startDate);
  } else if (sport === "tennis") {
    const profile = sportProfile as TennisSportProfile;
    if (!profile?.selfRating || !profile?.playingStyle) return NextResponse.json({ error: "Tennis plans require selfRating and playingStyle in sportProfile" }, { status: 400 });
    const assessment = assessTennisLevel(profile.selfRating, yearsExperience);
    derivedLevel = assessment.derivedLevel;
    recommendedModel = assessment.recommendedModel;
    generatedPhases = generateTennisPhases(assessment.derivedLevel as TennisPlayerLevel, profile.playingStyle as TennisPlayingStyle, (profile.physicalLimitations ?? []) as PhysicalLimitation[], startDate);
  } else {
    const profile = sportProfile as ClimbingSportProfile;
    if (!profile?.maxBoulderGrade || !profile?.maxSportGrade || !profile?.discipline) return NextResponse.json({ error: "Climbing plans require discipline, maxBoulderGrade, and maxSportGrade in sportProfile" }, { status: 400 });
    const assessment = assessLevel(profile.maxBoulderGrade, profile.maxSportGrade, yearsExperience);
    derivedLevel = assessment.derivedLevel;
    recommendedModel = assessment.recommendedModel;
    generatedPhases = generatePhases(derivedLevel as any, profile.discipline, (profile.physicalLimitations ?? []) as ClimbingLimitation[], startDate);
  }

  const [plan] = await db
    .insert(trainingPlans)
    .values({
      goalId,
      sport,
      periodizationModel: recommendedModel,
      playerLevel: derivedLevel,
      yearsExperience,
      sportProfile: JSON.stringify(sportProfile),
      startDate,
      status: "active",
      trainingSessionsPerWeek,
      supplementalSessionsPerWeek,
      trainingPreferredDays: JSON.stringify(trainingPreferredDays),
      supplementalPreferredDays: JSON.stringify(supplementalPreferredDays),
      userId,
    })
    .returning();

  const insertedPhases = [];
  for (const gp of generatedPhases) {
    const [phase] = await db
      .insert(trainingPhases)
      .values({
        trainingPlanId: plan.id,
        phaseType: gp.phaseType,
        orderIndex: gp.orderIndex,
        durationWeeks: gp.durationWeeks,
        startDate: gp.startDate,
        endDate: gp.endDate,
        status: gp.orderIndex === 0 ? "active" : "upcoming",
        description: gp.description,
        // Climbing populates these; tennis/running leave them NULL and the
        // scheduler falls back to `description`.
        sportFocusContent: gp.sportFocusContent ?? null,
        supplementalContent: gp.supplementalContent ?? null,
        mentalGameContent: gp.mentalGameContent ?? null,
        limitationNotes: gp.limitationNotes ?? null,
      })
      .returning();
    insertedPhases.push(phase);
  }

  return NextResponse.json(
    {
      ...plan,
      sportProfile: parseSportProfile(plan.sportProfile),
      trainingPreferredDays,
      supplementalPreferredDays,
      phases: insertedPhases,
    },
    { status: 201 }
  );
}
