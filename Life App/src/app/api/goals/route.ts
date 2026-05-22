import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, goalRoles, roles, activityTypes } from "@/db/schema";
import { eq, and, isNull, type SQL } from "drizzle-orm";
import { deriveQuadrant } from "@/lib/quadrants";
import { auth } from "@/lib/auth";
import { clampSessionsPerWeek, DEFAULT_SESSIONS_PER_WEEK } from "@/lib/goal-validation";
import { attachRoles } from "@/lib/goal-roles";
import { assertOwnership, OwnershipError, ParentGoalTypeError } from "@/lib/ownership";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "active";
  const roleId = searchParams.get("roleId");
  const horizon = searchParams.get("horizon");
  const parentId = searchParams.get("parentId");
  const month = searchParams.get("month");

  const conditions: SQL[] = [eq(goals.userId, userId)];
  if (status !== "all") conditions.push(eq(goals.status, status));
  if (horizon === "standalone") {
    conditions.push(isNull(goals.horizon));
  } else if (horizon) {
    conditions.push(eq(goals.horizon, horizon));
  }
  if (parentId) conditions.push(eq(goals.parentGoalId, parseInt(parentId)));
  if (month) conditions.push(eq(goals.month, month));

  const baseGoals = await db.select().from(goals).where(and(...conditions));

  const roleMap = await attachRoles(baseGoals.map((g) => g.id), userId);

  const activityTypeIds = baseGoals.map((g) => g.activityTypeId).filter((id): id is number => id != null);
  const activityTypeMap = new Map<number, { name: string; icon: string }>();
  if (activityTypeIds.length > 0) {
    const atRows = await db.select({ id: activityTypes.id, name: activityTypes.name, icon: activityTypes.icon }).from(activityTypes);
    for (const at of atRows) {
      if (activityTypeIds.includes(at.id)) activityTypeMap.set(at.id, { name: at.name, icon: at.icon });
    }
  }

  let result = baseGoals.map((g) => {
    const at = g.activityTypeId ? activityTypeMap.get(g.activityTypeId) : undefined;
    return { ...g, quadrant: deriveQuadrant(g.targetDate), roles: roleMap.get(g.id) ?? [], activityTypeName: at?.name, activityTypeIcon: at?.icon };
  });

  if (roleId) {
    const rid = parseInt(roleId);
    result = result.filter((g) => g.roles.some((r) => r.id === rid));
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { title, description, roleIds, targetDate, activityTypeId, targetMetric, targetValue, targetPeriod, targetUnit, horizon, parentGoalId, month, preferredDays, preferredTimeSlot } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    return NextResponse.json({ error: "At least one role is required" }, { status: 400 });
  }
  if (horizon === "monthly" && !month) {
    return NextResponse.json({ error: "Month is required for monthly goals" }, { status: 400 });
  }

  try {
    await assertOwnership(userId, {
      roleIds: roleIds ?? [],
      activityTypeId: activityTypeId ?? null,
      parentGoalId: parentGoalId ?? null,
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

  // FR-016: server-side clamp to [1, 7]. See clampSessionsPerWeek for the
  // full rationale and edge-case behaviour.
  const sessionsPerWeek = clampSessionsPerWeek(body.sessionsPerWeek) ?? DEFAULT_SESSIONS_PER_WEEK;

  const [created] = await db.insert(goals).values({
    title: title.trim(),
    description: description?.trim() || null,
    targetDate: targetDate || null,
    sessionsPerWeek,
    status: "active",
    activityTypeId: activityTypeId ?? null,
    targetMetric: targetMetric ?? null,
    targetValue: targetValue ?? null,
    targetPeriod: targetPeriod ?? null,
    targetUnit: targetUnit?.trim() || null,
    horizon: horizon || null,
    parentGoalId: parentGoalId ?? null,
    month: month || null,
    preferredDays: preferredDays || null,
    preferredTimeSlot: preferredTimeSlot || null,
    userId,
  }).returning();

  for (const rid of roleIds) {
    await db.insert(goalRoles).values({ goalId: created.id, roleId: rid });
  }

  const goalRoleRows = await db
    .select({ roleId: roles.id, roleName: roles.name, roleColor: roles.color })
    .from(goalRoles)
    .innerJoin(roles, eq(goalRoles.roleId, roles.id))
    .where(eq(goalRoles.goalId, created.id));

  let activityTypeName: string | undefined;
  let activityTypeIcon: string | undefined;
  if (created.activityTypeId) {
    const atRows = await db.select({ name: activityTypes.name, icon: activityTypes.icon }).from(activityTypes).where(eq(activityTypes.id, created.activityTypeId));
    if (atRows.length > 0) { activityTypeName = atRows[0].name; activityTypeIcon = atRows[0].icon; }
  }

  return NextResponse.json(
    { ...created, quadrant: deriveQuadrant(created.targetDate), roles: goalRoleRows.map((r) => ({ id: r.roleId, name: r.roleName, color: r.roleColor })), activityTypeName, activityTypeIcon },
    { status: 201 }
  );
}
