import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schedulerSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function getOrCreateSettings(userId: string) {
  const rows = await db.select().from(schedulerSettings).where(eq(schedulerSettings.userId, userId));
  if (rows.length > 0) return rows[0];

  const [created] = await db.insert(schedulerSettings).values({
    workStartTime: "09:00",
    workEndTime: "17:00",
    workDays: "1,2,3,4,5",
    enforceWeeklySpread: true,
    maxActivitiesPerDay: 4,
    userId,
  }).returning();
  return created;
}

function formatResponse(row: typeof schedulerSettings.$inferSelect) {
  return {
    id: row.id,
    workStartTime: row.workStartTime,
    workEndTime: row.workEndTime,
    workDays: row.workDays.split(",").map(Number),
    enforceWeeklySpread: row.enforceWeeklySpread ?? true,
    maxActivitiesPerDay: row.maxActivitiesPerDay ?? 4,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getOrCreateSettings(session.user.id);
  return NextResponse.json(formatResponse(settings));
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const settings = await getOrCreateSettings(userId);
  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.workStartTime !== undefined) updates.workStartTime = body.workStartTime;
  if (body.workEndTime !== undefined) updates.workEndTime = body.workEndTime;
  if (Array.isArray(body.workDays)) updates.workDays = body.workDays.join(",");
  if (body.enforceWeeklySpread !== undefined) updates.enforceWeeklySpread = body.enforceWeeklySpread;
  if (body.maxActivitiesPerDay !== undefined) updates.maxActivitiesPerDay = body.maxActivitiesPerDay;

  const [updated] = await db.update(schedulerSettings).set(updates).where(and(eq(schedulerSettings.id, settings.id), eq(schedulerSettings.userId, userId))).returning();
  return NextResponse.json(formatResponse(updated));
}
