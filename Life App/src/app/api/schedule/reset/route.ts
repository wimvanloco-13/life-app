import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { start, end } = await request.json();
    if (!start || !end) return NextResponse.json({ error: "start and end dates are required" }, { status: 400 });

    const toDelete = await db.select({ id: activities.id }).from(activities).where(
      and(
        gte(activities.activityDate, start),
        lte(activities.activityDate, end),
        eq(activities.createdFromLog, false),
        eq(activities.isCompleted, false),
        eq(activities.userId, userId)
      )
    );

    if (toDelete.length > 0) {
      await db.delete(activities).where(inArray(activities.id, toDelete.map((r) => r.id)));
    }

    return NextResponse.json({ deleted: toDelete.length });
  } catch (error) {
    return NextResponse.json({ error: "Failed to reset schedule", details: String(error) }, { status: 500 });
  }
}
