import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeklyFocusGoals, weeklyPlans, goals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deriveQuadrant } from "@/lib/quadrants";
import { auth } from "@/lib/auth";
import { attachRoles } from "@/lib/goal-roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ weekStartDate: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { weekStartDate } = await params;
  const plan = await db.select().from(weeklyPlans).where(and(eq(weeklyPlans.weekStartDate, weekStartDate), eq(weeklyPlans.userId, userId)));
  if (plan.length === 0) return NextResponse.json([]);

  const focusRows = await db
    .select({ focusId: weeklyFocusGoals.id, goalId: goals.id, title: goals.title, description: goals.description, targetDate: goals.targetDate, status: goals.status, isCompleted: goals.isCompleted, activityTypeId: goals.activityTypeId, sessionsPerWeek: goals.sessionsPerWeek, preferredDays: goals.preferredDays, preferredTimeSlot: goals.preferredTimeSlot, horizon: goals.horizon, month: goals.month, createdAt: goals.createdAt, updatedAt: goals.updatedAt })
    .from(weeklyFocusGoals)
    .innerJoin(goals, and(eq(weeklyFocusGoals.goalId, goals.id), eq(goals.userId, userId), eq(goals.status, "active")))
    .where(eq(weeklyFocusGoals.weeklyPlanId, plan[0].id));

  const goalIds = focusRows.map((r) => r.goalId);
  const roleMap = await attachRoles(goalIds, userId);

  return NextResponse.json(focusRows.map((row) => ({ id: row.goalId, focusId: row.focusId, title: row.title, description: row.description, quadrant: deriveQuadrant(row.targetDate), targetDate: row.targetDate, status: row.status, isCompleted: row.isCompleted, activityTypeId: row.activityTypeId, sessionsPerWeek: row.sessionsPerWeek, preferredDays: row.preferredDays, preferredTimeSlot: row.preferredTimeSlot, horizon: row.horizon, month: row.month, createdAt: row.createdAt, updatedAt: row.updatedAt, roles: roleMap.get(row.goalId) ?? [] })));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weekStartDate: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { weekStartDate } = await params;
  const body = await request.json();
  const { goalId } = body;
  if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

  // Verify goal belongs to user
  const goalRows = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (goalRows.length === 0) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  let plan = await db.select().from(weeklyPlans).where(and(eq(weeklyPlans.weekStartDate, weekStartDate), eq(weeklyPlans.userId, userId)));
  if (plan.length === 0) {
    const [created] = await db.insert(weeklyPlans).values({ weekStartDate, userId }).returning();
    plan = [created];
  }

  const existing = await db.select().from(weeklyFocusGoals).where(and(eq(weeklyFocusGoals.weeklyPlanId, plan[0].id), eq(weeklyFocusGoals.goalId, goalId)));
  if (existing.length > 0) return NextResponse.json({ error: "Goal is already in focus for this week" }, { status: 409 });

  const [focus] = await db.insert(weeklyFocusGoals).values({ weeklyPlanId: plan[0].id, goalId }).returning();
  return NextResponse.json(focus, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ weekStartDate: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { weekStartDate } = await params;
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");
  if (!goalId) return NextResponse.json({ error: "goalId query param is required" }, { status: 400 });

  const plan = await db.select().from(weeklyPlans).where(and(eq(weeklyPlans.weekStartDate, weekStartDate), eq(weeklyPlans.userId, userId)));
  if (plan.length === 0) return NextResponse.json({ success: true });

  await db.delete(weeklyFocusGoals).where(and(eq(weeklyFocusGoals.weeklyPlanId, plan[0].id), eq(weeklyFocusGoals.goalId, parseInt(goalId))));
  return NextResponse.json({ success: true });
}
