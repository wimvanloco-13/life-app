import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, goalRoles, roles, activities, weeklyFocusGoals, trainingPlans } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { deriveQuadrant } from "@/lib/quadrants";
import { auth } from "@/lib/auth";
import { clampSessionsPerWeek } from "@/lib/goal-validation";
import { assertOwnership, OwnershipError, ParentGoalTypeError } from "@/lib/ownership";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const goalId = parseInt(id);
  if (isNaN(goalId)) return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });

  const existing = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const body = await request.json();

  // Validate ownership of any incoming foreign key IDs before writing.
  // We validate the incoming body.roleIds (not the stored ones) because PATCH
  // can replace the role set entirely.
  if (body.roleIds !== undefined || body.activityTypeId !== undefined || body.parentGoalId !== undefined) {
    try {
      await assertOwnership(userId, {
        roleIds: Array.isArray(body.roleIds) ? body.roleIds : undefined,
        activityTypeId: body.activityTypeId ?? null,
        parentGoalId: body.parentGoalId ?? null,
      });
    } catch (err) {
      if (err instanceof ParentGoalTypeError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof OwnershipError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.targetDate !== undefined) updates.targetDate = body.targetDate || null;
  if (body.sessionsPerWeek !== undefined) {
    // FR-016: server-side clamp to [1, 7]. On PATCH, non-finite input is
    // dropped (treated as "no change"); see clampSessionsPerWeek for detail.
    const clamped = clampSessionsPerWeek(body.sessionsPerWeek);
    if (clamped !== null) updates.sessionsPerWeek = clamped;
  }
  if (body.status !== undefined) updates.status = body.status;
  if (body.activityTypeId !== undefined) updates.activityTypeId = body.activityTypeId;
  if (body.targetMetric !== undefined) updates.targetMetric = body.targetMetric;
  if (body.targetValue !== undefined) updates.targetValue = body.targetValue;
  if (body.targetPeriod !== undefined) updates.targetPeriod = body.targetPeriod;
  if (body.targetUnit !== undefined) updates.targetUnit = body.targetUnit?.trim() || null;
  if (body.horizon !== undefined) updates.horizon = body.horizon || null;
  if (body.parentGoalId !== undefined) updates.parentGoalId = body.parentGoalId;
  if (body.month !== undefined) updates.month = body.month || null;
  if (body.preferredDays !== undefined) {
    updates.preferredDays = Array.isArray(body.preferredDays)
      ? JSON.stringify(body.preferredDays)
      : (body.preferredDays || null);
  }
  if (body.preferredTimeSlot !== undefined) updates.preferredTimeSlot = body.preferredTimeSlot || null;
  if (body.isCompleted !== undefined) {
    updates.isCompleted = Boolean(body.isCompleted);
    if (body.isCompleted) updates.status = "completed";
  }

  const [updated] = await db.update(goals).set(updates).where(and(eq(goals.id, goalId), eq(goals.userId, userId))).returning();

  // Cascade archive/restore status to monthly children.
  if (body.status === "archived" || body.status === "active") {
    await db
      .update(goals)
      .set({ status: body.status, updatedAt: new Date().toISOString() })
      .where(and(eq(goals.parentGoalId, goalId), eq(goals.userId, userId)));
  }

  // Remove this goal (and its monthly children) from all weekly focus lists when
  // it is archived or completed so it no longer appears in schedule dialogs.
  if (body.status === "archived" || body.status === "completed" || body.isCompleted) {
    const childIds = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.parentGoalId, goalId), eq(goals.userId, userId)));
    const idsToRemove = [goalId, ...childIds.map((c) => c.id)];
    await db.delete(weeklyFocusGoals).where(inArray(weeklyFocusGoals.goalId, idsToRemove));
  }

  if (Array.isArray(body.roleIds)) {
    await db.delete(goalRoles).where(eq(goalRoles.goalId, goalId));
    for (const rid of body.roleIds) {
      await db.insert(goalRoles).values({ goalId, roleId: rid });
    }
  }

  const goalRoleRows = await db
    .select({ roleId: roles.id, roleName: roles.name, roleColor: roles.color })
    .from(goalRoles)
    .innerJoin(roles, eq(goalRoles.roleId, roles.id))
    .where(eq(goalRoles.goalId, goalId));

  return NextResponse.json({ ...updated, quadrant: deriveQuadrant(updated.targetDate), roles: goalRoleRows.map((r) => ({ id: r.roleId, name: r.roleName, color: r.roleColor })) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const goalId = parseInt(id);
  if (isNaN(goalId)) return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });

  const existing = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const childGoals = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.parentGoalId, goalId), eq(goals.userId, userId)));
  const childGoalIds = childGoals.map((c) => c.id);
  const allGoalIds = [goalId, ...childGoalIds];

  // Delete uncompleted, scheduler-generated activities for this goal and its children.
  // Completed activities and log-created activities are kept as historical records.
  await db.delete(activities).where(
    and(
      inArray(activities.goalId, allGoalIds),
      eq(activities.isCompleted, false),
      eq(activities.createdFromLog, false),
      eq(activities.userId, userId)
    )
  );

  // Remove from all weekly focus lists (goalId is already user-verified above).
  await db.delete(weeklyFocusGoals).where(
    inArray(weeklyFocusGoals.goalId, allGoalIds)
  );

  // Delete training plans (training phases cascade via FK defined in apply-schema.js).
  await db.delete(trainingPlans).where(
    and(
      inArray(trainingPlans.goalId, allGoalIds),
      eq(trainingPlans.userId, userId)
    )
  );

  for (const child of childGoals) {
    await db.delete(goalRoles).where(eq(goalRoles.goalId, child.id));
    await db.delete(goals).where(and(eq(goals.id, child.id), eq(goals.userId, userId)));
  }

  await db.delete(goalRoles).where(eq(goalRoles.goalId, goalId));
  await db.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  return NextResponse.json({ success: true });
}
