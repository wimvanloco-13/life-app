import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { safeParseMetrics } from "@/lib/activity-metrics";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.activityTypeId !== undefined) updates.activityTypeId = body.activityTypeId;
  if (body.activityId !== undefined) updates.activityId = body.activityId;
  if (body.goalId !== undefined) updates.goalId = body.goalId;
  if (body.date !== undefined) updates.date = body.date;
  if (body.durationMinutes !== undefined) updates.durationMinutes = body.durationMinutes;
  if (body.calories !== undefined) updates.calories = body.calories;
  if (body.steps !== undefined) updates.steps = body.steps;
  if (body.variant !== undefined) updates.variant = body.variant;
  if (body.metrics !== undefined) updates.metrics = JSON.stringify(body.metrics);
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

  const [updated] = await db
    .update(activityLogs)
    .set(updates)
    .where(and(eq(activityLogs.id, parseInt(id)), eq(activityLogs.userId, userId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Activity log not found" }, { status: 404 });
  return NextResponse.json({ ...updated, metrics: safeParseMetrics(updated.metrics) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  await db.delete(activityLogs).where(and(eq(activityLogs.id, parseInt(id)), eq(activityLogs.userId, userId)));
  return NextResponse.json({ success: true });
}
