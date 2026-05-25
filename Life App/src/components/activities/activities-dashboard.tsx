"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Dumbbell,
  Timer,
  Clock,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { LucideIcon } from "@/components/ui/lucide-icon";
import { usePalette } from "@/hooks/use-palette";

interface RoleActivity {
  roleId: number;
  roleName: string;
  roleColor: string;
  count: number;
}

interface Streak {
  activityTypeId: number;
  activityTypeName: string;
  activityTypeIcon: string;
  currentStreak: number;
}

interface LatestMetric {
  value: number;
  unit: string;
  date: string;
  trend: number | null;
  history: { date: string; value: number }[];
}

interface ActivityByType {
  activityTypeId: number;
  name: string;
  icon: string;
  count: number;
}

interface SummaryData {
  activityByRole: RoleActivity[];
  activityByType: ActivityByType[];
  streaks: Streak[];
  latestBodyMetrics: Record<string, LatestMetric>;
  recentWorkouts: {
    id: number;
    activityTypeName: string;
    activityTypeIcon: string;
    date: string;
    durationMinutes: number;
    calories: number | null;
  }[];
  totalWorkouts: number;
  totalMinutes: number;
  totalCalories: number;
  heatmapData: Record<string, number>;
}

export function ActivitiesDashboard() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const palette = usePalette();

  const fetchSummary = useCallback(async () => {
    const res = await fetch("/api/activities/summary?weeks=8");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  const bodyMetricLabels: Record<string, string> = {
    weight: "Weight",
    vo2max: "VO2max",
    resting_hr: "Resting HR",
  };

  const bodyMetricColors: Record<string, string> = {
    weight: palette.color("blue"),
    vo2max: palette.color("green"),
    resting_hr: palette.color("red"),
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.color("blue")}15` }}>
              <Dumbbell className="h-5 w-5" style={{ color: palette.color("blue") }} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Workouts</p>
              <p className="text-2xl font-bold tracking-tight">{data.totalWorkouts}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.color("green")}15` }}>
              <Timer className="h-5 w-5" style={{ color: palette.color("green") }} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold tracking-tight">{Math.round(data.totalMinutes / 60)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${palette.color("amber")}15` }}>
              <Flame className="h-5 w-5" style={{ color: palette.color("amber") }} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Calories</p>
              <p className="text-2xl font-bold tracking-tight">{data.totalCalories.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-muted/10 border-b border-border/40">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            This Month by Activity Type
          </CardTitle>
          <CardDescription>Number of logged activities per type this month</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {data.activityByType.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="No activities this month"
              description="Log some activities to see your breakdown by type."
            />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(data.activityByType.length * 48, 120)}>
              <BarChart data={data.activityByType} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tick={({ x, y, payload }) => (
                    <text x={x} y={y} dy={4} textAnchor="end" fill="currentColor" fontSize={12} className="fill-foreground">
                      {payload.value}
                    </text>
                  )}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [`${value ?? 0} sessions`, "Count"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {data.activityByType.map((_, index) => {
                    const colors = [
                      palette.color("blue"),
                      palette.color("green"),
                      palette.color("amber"),
                      palette.color("purple"),
                      palette.color("cyan"),
                      palette.color("pink"),
                      palette.color("red"),
                      palette.color("indigo"),
                    ];
                    return <Cell key={index} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {Object.keys(data.latestBodyMetrics).length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(data.latestBodyMetrics).map(([key, m]) => {
            const improvesDown = key === "weight" || key === "resting_hr";
            const trendColor = m.trend === null || m.trend === 0
              ? "bg-muted text-muted-foreground"
              : (improvesDown ? m.trend < 0 : m.trend > 0)
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400";

            return (
            <Card key={key} className="border-border/50 shadow-sm">
              <CardHeader className="pb-1 pt-5 px-5">
                <CardDescription
                  className="text-xs font-medium"
                  style={{ color: bodyMetricColors[key] }}
                >
                  {bodyMetricLabels[key] ?? key}
                </CardDescription>
                <div className="flex items-baseline gap-2">
                  <CardTitle className="text-2xl">{m.value}</CardTitle>
                  <span className="text-sm text-muted-foreground">{m.unit}</span>
                  {m.trend !== null && (
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${trendColor}`}>
                      {m.trend > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : m.trend < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {m.trend > 0 ? "+" : ""}
                      {Math.round(m.trend * 10) / 10}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(m.date + "T00:00:00"), "MMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent className="pb-3">
                {m.history.length > 1 ? (
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={m.history}>
                      <XAxis dataKey="date" hide />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={bodyMetricColors[key]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip
                        formatter={(v: number | undefined) => [`${v ?? 0} ${m.unit}`, bodyMetricLabels[key]]}
                        labelFormatter={(label) => {
                          const d = new Date(String(label) + "T00:00:00");
                          return Number.isNaN(d.getTime()) ? "" : format(d, "MMM d");
                        }}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[60px] flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Log more to see trend</p>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Activities by Role</CardTitle>
          <CardDescription>Completed activities per role (all time)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.activityByRole.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="No activities yet"
              description="Complete some activities to see your breakdown by role."
            />
          ) : (
            <div className="space-y-3">
              {data.activityByRole.map((r) => {
                const max = Math.max(...data.activityByRole.map((x) => x.count), 1);
                const pct = Math.round((r.count / max) * 100);
                return (
                  <div key={r.roleId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: r.roleColor }}
                        />
                        <span className="font-medium">{r.roleName}</span>
                      </div>
                      <span className="text-muted-foreground tabular-nums">{r.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: r.roleColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consistency Streaks</CardTitle>
            <CardDescription>
              Consecutive weeks with at least 1 session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.streaks.length === 0 ? (
              <EmptyState
                icon={Flame}
                title="No streaks yet"
                description="Define activity types and start logging to build streaks."
                action={{ label: "Set up Activity Types", href: "/settings/activity-types" }}
              />
            ) : (
              <div className="space-y-3">
                {data.streaks.map((s) => {
                  const streakStyle =
                    s.currentStreak <= 0
                      ? "bg-secondary text-secondary-foreground"
                      : s.currentStreak < 4
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                        : s.currentStreak < 8
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400";
                  return (
                  <div
                    key={s.activityTypeId}
                    className="flex items-center gap-3"
                  >
                    <LucideIcon name={s.activityTypeIcon} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.activityTypeName}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${streakStyle}`}>
                      {s.currentStreak > 0 && <Flame className="h-3 w-3" />}
                      {s.currentStreak}w
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentWorkouts.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No activities logged"
                description="Your recent activities will appear here once you start logging."
              />
            ) : (
              <div className="space-y-2">
                {data.recentWorkouts.map((w) => {
                  const hrs = Math.floor(w.durationMinutes / 60);
                  const mins = w.durationMinutes % 60;
                  return (
                    <div
                      key={w.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <LucideIcon name={w.activityTypeIcon} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {w.activityTypeName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {hrs > 0 ? `${hrs}h ` : ""}
                        {mins}m
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(
                          new Date(w.date + "T00:00:00"),
                          "MM/dd"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
