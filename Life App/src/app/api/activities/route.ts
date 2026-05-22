import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities, activityLogs, roles } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { assertOwnership, OwnershipError } from "@/lib/ownership";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const weekStart = searchParams.get("weekStart");

  if (!date && !weekStart) {
    return NextResponse.json({ error: "date or weekStart query param is required" }, { status: 400 });
  }

  const selectedCols = {
    id: activities.id,
    goalId: activities.goalId,
    roleId: activities.roleId,
    recurringActivityId: activities.recurringActivityId,
    activityTypeId: activities.activityTypeId,
    title: activities.title,
    quadrant: activities.quadrant,
    activityDate: activities.activityDate,
    startTime: activities.startTime,
    endTime: activities.endTime,
    isCompleted: activities.isCompleted,
    createdFromLog: activities.createdFromLog,
    notes: activities.notes,
    carryForwardFrom: activities.carryForwardFrom,
    sessionType: activities.sessionType,
    createdAt: activities.createdAt,
    updatedAt: activities.updatedAt,
    roleName: roles.name,
    roleColor: roles.color,
    // T006b: the schedule-to-log bridge's idempotency guarantee means each
    // activity has at most one linked log, so a direct LEFT JOIN is safe.
    linkedLogId: activityLogs.id,
  };

  // The userId predicate on the activityLogs join prevents leaking foreign
  // log ids when an activity row is shared across the join surface.
  const joinPredicate = and(
    eq(activityLogs.activityId, activities.id),
    eq(activityLogs.userId, userId)
  );

  let result;
  if (date) {
    result = await db
      .select(selectedCols)
      .from(activities)
      .leftJoin(roles, eq(activities.roleId, roles.id))
      .leftJoin(activityLogs, joinPredicate)
      .where(and(eq(activities.activityDate, date), eq(activities.userId, userId)));
  } else {
    const dates: string[] = [];
    const start = new Date(weekStart!);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    result = await db
      .select(selectedCols)
      .from(activities)
      .leftJoin(roles, eq(activities.roleId, roles.id))
      .leftJoin(activityLogs, joinPredicate)
      .where(and(inArray(activities.activityDate, dates), eq(activities.userId, userId)));
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const {
    title,
    quadrant,
    activityDate,
    startTime,
    endTime,
    roleId,
    goalId,
    notes,
    createdFromLog,
    activityTypeId,
    sessionType: rawSessionType,
  } = body;

  if (!title || !activityDate || !startTime || !endTime) {
    return NextResponse.json({ error: "title, activityDate, startTime, and endTime are required" }, { status: 400 });
  }

  try {
    await assertOwnership(userId, {
      roleIds: roleId != null ? [roleId] : [],
      goalId: goalId ?? null,
      activityTypeId: activityTypeId ?? null,
    });
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  let sessionType: "training" | "supplemental" = "training";
  if (rawSessionType !== undefined) {
    if (rawSessionType !== "training" && rawSessionType !== "supplemental") {
      return NextResponse.json({ error: "sessionType must be training or supplemental" }, { status: 400 });
    }
    sessionType = rawSessionType;
  }

  const [created] = await db.insert(activities).values({
    title: title.trim(),
    quadrant: quadrant ?? "Q2",
    activityDate,
    startTime,
    endTime,
    roleId: roleId ?? null,
    goalId: goalId ?? null,
    activityTypeId: activityTypeId ?? null,
    notes: notes?.trim() || null,
    createdFromLog: createdFromLog ?? false,
    sessionType,
    userId,
  }).returning();

  // POST returns a brand-new activity, so no log is linked yet. Surface the
  // shape clients receive from GET so client-side state stays consistent.
  return NextResponse.json({ ...created, linkedLogId: null }, { status: 201 });
}
