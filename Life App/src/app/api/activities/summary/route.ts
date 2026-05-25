import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, activityTypes, bodyMetrics, activities, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

function getWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(y, m - 1, d + mondayOffset);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const weeks = parseInt(searchParams.get("weeks") ?? "8");

  const allWorkouts = await db
    .select({
      id: activityLogs.id,
      activityTypeId: activityLogs.activityTypeId,
      date: activityLogs.date,
      durationMinutes: activityLogs.durationMinutes,
      calories: activityLogs.calories,
      activityTypeName: activityTypes.name,
      activityTypeIcon: activityTypes.icon,
    })
    .from(activityLogs)
    .innerJoin(activityTypes, and(eq(activityLogs.activityTypeId, activityTypes.id), eq(activityTypes.userId, userId)))
    .where(eq(activityLogs.userId, userId));

  const allActivityTypes = await db.select().from(activityTypes).where(eq(activityTypes.userId, userId));
  const allBodyMetrics = await db.select().from(bodyMetrics).where(eq(bodyMetrics.userId, userId));

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);
  const cutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}-${String(cutoffDate.getDate()).padStart(2, "0")}`;

  const recentWorkouts = allWorkouts.filter((w) => w.date >= cutoffStr).sort((a, b) => b.date.localeCompare(a.date));

  const streaks: { activityTypeId: number; activityTypeName: string; activityTypeIcon: string; currentStreak: number }[] = [];
  for (const at of allActivityTypes) {
    const typeWorkouts = allWorkouts.filter((w) => w.activityTypeId === at.id).sort((a, b) => b.date.localeCompare(a.date));
    if (typeWorkouts.length === 0) {
      streaks.push({ activityTypeId: at.id, activityTypeName: at.name, activityTypeIcon: at.icon, currentStreak: 0 });
      continue;
    }
    const weeksSeen = new Set(typeWorkouts.map((w) => getWeekKey(w.date)));
    const now = new Date();
    let streak = 0;
    for (let i = 0; i < 52; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - i * 7);
      const wk = getWeekKey(`${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`);
      if (weeksSeen.has(wk)) streak++;
      else break;
    }
    streaks.push({ activityTypeId: at.id, activityTypeName: at.name, activityTypeIcon: at.icon, currentStreak: streak });
  }

  const latestByType: Record<string, { value: number; unit: string; date: string; trend: number | null; history: { date: string; value: number }[] }> = {};
  for (const mType of ["weight", "vo2max", "resting_hr"]) {
    const entries = allBodyMetrics.filter((m) => m.metricType === mType).sort((a, b) => b.date.localeCompare(a.date));
    if (entries.length > 0) {
      const latest = entries[0];
      const previous = entries.length > 1 ? entries[1] : null;
      const history = entries.slice(0, 10).reverse().map((e) => ({ date: e.date, value: e.value }));
      latestByType[mType] = { value: latest.value, unit: latest.unit, date: latest.date, trend: previous ? latest.value - previous.value : null, history };
    }
  }

  const allRoles = await db.select().from(roles).where(eq(roles.userId, userId));
  const allActivities = await db.select({ id: activities.id, roleId: activities.roleId }).from(activities).where(and(eq(activities.userId, userId), eq(activities.isCompleted, true)));

  const roleCounts: Record<number, number> = {};
  for (const a of allActivities) {
    if (a.roleId) roleCounts[a.roleId] = (roleCounts[a.roleId] || 0) + 1;
  }

  const activityByRole = allRoles.map((r) => ({ roleId: r.id, roleName: r.name, roleColor: r.color, count: roleCounts[r.id] ?? 0 })).sort((a, b) => b.count - a.count);

  const recent = allWorkouts.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const heatmapCutoff = new Date();
  heatmapCutoff.setDate(heatmapCutoff.getDate() - 12 * 7);
  const heatmapCutoffStr = `${heatmapCutoff.getFullYear()}-${String(heatmapCutoff.getMonth() + 1).padStart(2, "0")}-${String(heatmapCutoff.getDate()).padStart(2, "0")}`;

  const heatmapData = allWorkouts.filter((w) => w.date >= heatmapCutoffStr).reduce((acc, w) => { acc[w.date] = (acc[w.date] || 0) + 1; return acc; }, {} as Record<string, number>);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthWorkouts = allWorkouts.filter((w) => w.date.startsWith(currentMonthStr));
  const byTypeMap: Record<number, { name: string; icon: string; count: number }> = {};
  for (const w of monthWorkouts) {
    if (!byTypeMap[w.activityTypeId]) byTypeMap[w.activityTypeId] = { name: w.activityTypeName, icon: w.activityTypeIcon, count: 0 };
    byTypeMap[w.activityTypeId].count++;
  }
  const activityByType = Object.entries(byTypeMap).map(([id, v]) => ({ activityTypeId: Number(id), ...v })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    activityByRole,
    activityByType,
    streaks,
    latestBodyMetrics: latestByType,
    recentWorkouts: recent,
    heatmapData,
    totalWorkouts: allWorkouts.length,
    totalMinutes: allWorkouts.reduce((s, w) => s + w.durationMinutes, 0),
    totalCalories: allWorkouts.reduce((s, w) => s + (w.calories ?? 0), 0),
  });
}
