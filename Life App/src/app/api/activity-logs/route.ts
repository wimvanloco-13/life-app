import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, activityTypes, activities, goals, goalRoles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { assertOwnership, OwnershipError } from "@/lib/ownership";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const activityTypeId = searchParams.get("activityTypeId");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  const allLogs = await db
    .select({
      id: activityLogs.id,
      activityTypeId: activityLogs.activityTypeId,
      activityId: activityLogs.activityId,
      goalId: activityLogs.goalId,
      date: activityLogs.date,
      durationMinutes: activityLogs.durationMinutes,
      calories: activityLogs.calories,
      steps: activityLogs.steps,
      variant: activityLogs.variant,
      metrics: activityLogs.metrics,
      notes: activityLogs.notes,
      createdAt: activityLogs.createdAt,
      activityTypeName: activityTypes.name,
      activityTypeIcon: activityTypes.icon,
    })
    .from(activityLogs)
    .innerJoin(activityTypes, eq(activityLogs.activityTypeId, activityTypes.id))
    .where(eq(activityLogs.userId, userId));

  let filtered = allLogs;
  if (activityTypeId) filtered = filtered.filter((w) => w.activityTypeId === parseInt(activityTypeId));
  if (date) filtered = filtered.filter((w) => w.date === date);
  if (from) filtered = filtered.filter((w) => w.date >= from);
  if (to) filtered = filtered.filter((w) => w.date <= to);

  filtered.sort((a, b) => b.date.localeCompare(a.date));
  filtered = filtered.slice(0, limit);

  return NextResponse.json(filtered.map((w) => ({ ...w, metrics: JSON.parse(w.metrics) })));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { activityTypeId, activityId, goalId, date, durationMinutes, calories, steps, variant, metrics, notes } = body;

  if (!activityTypeId || !date || !durationMinutes) {
    return NextResponse.json({ error: "activityTypeId, date, and durationMinutes are required" }, { status: 400 });
  }

  try {
    await assertOwnership(userId, { activityTypeId });
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const [created] = await db.insert(activityLogs).values({
    activityTypeId,
    activityId: activityId ?? null,
    goalId: goalId ?? null,
    date,
    durationMinutes,
    calories: calories ?? null,
    steps: steps ?? null,
    variant: variant ?? null,
    metrics: JSON.stringify(metrics ?? {}),
    notes: notes?.trim() || null,
    userId,
  }).returning();

  let finalActivityId = created.activityId;

  if (goalId) {
    const goalRows = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
    if (goalRows.length > 0) {
      const roleRows = await db.select({ roleId: goalRoles.roleId }).from(goalRoles).where(eq(goalRoles.goalId, goalId));
      const roleId = roleRows[0]?.roleId ?? null;

      const existingActivity = await db.select().from(activities).where(and(eq(activities.goalId, goalId), eq(activities.activityDate, date), eq(activities.isCompleted, false), eq(activities.userId, userId)));

      let activityToLink: { id: number } | null = null;
      if (existingActivity.length > 0) {
        const [updated] = await db.update(activities).set({ isCompleted: true }).where(and(eq(activities.id, existingActivity[0].id), eq(activities.userId, userId))).returning({ id: activities.id });
        if (updated) activityToLink = { id: updated.id };
      } else {
        const activityTypeRows = await db.select({ name: activityTypes.name }).from(activityTypes).where(eq(activityTypes.id, activityTypeId));
        const activityTypeName = activityTypeRows[0]?.name ?? "Activity";
        const [newActivity] = await db.insert(activities).values({ title: activityTypeName, goalId, roleId, activityDate: date, startTime: "00:00", endTime: "00:01", isCompleted: true, createdFromLog: true, quadrant: "Q2", userId }).returning({ id: activities.id });
        if (newActivity) activityToLink = { id: newActivity.id };
      }

      if (activityToLink) {
        await db.update(activityLogs).set({ activityId: activityToLink.id }).where(eq(activityLogs.id, created.id));
        finalActivityId = activityToLink.id;
      }
    }
  }

  if (finalActivityId == null) {
    const matchingActivities = await db.select().from(activities).where(and(eq(activities.activityDate, date), eq(activities.activityTypeId, activityTypeId), eq(activities.isCompleted, false), eq(activities.userId, userId)));
    if (matchingActivities.length > 0) {
      const matched = matchingActivities[0];
      await db.update(activities).set({ isCompleted: true }).where(and(eq(activities.id, matched.id), eq(activities.userId, userId)));
      await db.update(activityLogs).set({ activityId: matched.id }).where(eq(activityLogs.id, created.id));
      finalActivityId = matched.id;
    }
  }

  return NextResponse.json({ ...created, activityId: finalActivityId, metrics: JSON.parse(created.metrics) }, { status: 201 });
}
