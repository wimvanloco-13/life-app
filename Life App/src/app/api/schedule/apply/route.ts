import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { and, eq, inArray, gte, lte } from "drizzle-orm";
import type { ProposedActivity } from "@/lib/scheduler";
import { auth } from "@/lib/auth";
import { assertOwnership, OwnershipError } from "@/lib/ownership";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const body = await request.json();
    const { activities: proposed, regenerate = false, focusGoalIds = [], dateRange } = body as {
      activities: ProposedActivity[];
      regenerate?: boolean;
      focusGoalIds?: number[];
      dateRange?: { start: string; end: string };
    };

    if (!Array.isArray(proposed) || proposed.length === 0) {
      return NextResponse.json({ error: "No activities to apply" }, { status: 400 });
    }

    // Validate ownership of all unique IDs in one pass (3 queries total).
    const uniqueGoalIds = [...new Set(proposed.map((a) => a.goalId).filter((id): id is number => id != null))];
    const uniqueRoleIds = [...new Set(proposed.map((a) => a.roleId).filter((id): id is number => id != null))];
    const uniqueActivityTypeIds = [...new Set(proposed.map((a) => a.activityTypeId).filter((id): id is number => id != null))];

    try {
      await assertOwnership(userId, {
        goalIds: uniqueGoalIds,
        roleIds: uniqueRoleIds,
        activityTypeIds: uniqueActivityTypeIds,
      });
    } catch (err) {
      if (err instanceof OwnershipError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    let deleted = 0;
    if (regenerate && focusGoalIds.length > 0 && dateRange) {
      const toDelete = await db.select({ id: activities.id }).from(activities).where(
        and(
          inArray(activities.goalId, focusGoalIds),
          eq(activities.createdFromLog, false),
          eq(activities.isCompleted, false),
          gte(activities.activityDate, dateRange.start),
          lte(activities.activityDate, dateRange.end),
          eq(activities.userId, userId)
        )
      );

      if (toDelete.length > 0) {
        await db.delete(activities).where(inArray(activities.id, toDelete.map((r) => r.id)));
        deleted = toDelete.length;
      }
    }

    const created = [];
    for (const act of proposed) {
      const [row] = await db.insert(activities).values({
        title: act.title,
        quadrant: act.quadrant,
        activityDate: act.activityDate,
        startTime: act.startTime,
        endTime: act.endTime,
        roleId: act.roleId ?? null,
        goalId: act.goalId ?? null,
        activityTypeId: act.activityTypeId ?? null,
        notes: act.notes ? `${act.reason}\n\n${act.notes}` : act.reason,
        sessionType: act.sessionType ?? "training",
        userId,
      }).returning();
      created.push(row);
    }

    return NextResponse.json({ created: created.length, deleted, activities: created }, { status: 201 });
  } catch (error) {
    console.error("Schedule apply error:", error);
    return NextResponse.json({ error: "Failed to apply schedule", details: String(error) }, { status: 500 });
  }
}
