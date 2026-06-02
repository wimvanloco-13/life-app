"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { BodyMetric, BodyMetricType, UserBodyProfile } from "@/types";
import { usePalette } from "@/hooks/use-palette";
import type { PaletteColor } from "@/lib/palette";
import { BodyMetricsFeedback } from "./body-metrics-feedback";

const METRIC_CONFIG: {
  type: BodyMetricType;
  label: string;
  unit: string;
  paletteKey: PaletteColor;
  placeholder: string;
}[] = [
  {
    type: "weight",
    label: "Weight",
    unit: "kg",
    paletteKey: "blue",
    placeholder: "e.g., 75.5",
  },
  {
    type: "vo2max",
    label: "VO2max",
    unit: "ml/kg/min",
    paletteKey: "green",
    placeholder: "e.g., 45",
  },
  {
    type: "resting_hr",
    label: "Resting HR",
    unit: "bpm",
    paletteKey: "red",
    placeholder: "e.g., 58",
  },
];

export function BodyMetricsView() {
  const [allMetrics, setAllMetrics] = useState<BodyMetric[]>([]);
  const [profile, setProfile] = useState<UserBodyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const palette = usePalette();

  const [selectedType, setSelectedType] = useState<BodyMetricType>("weight");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  // Refs for focus-on-prompt behaviour (FR-016, US-3)
  const dobRef = useRef<HTMLInputElement>(null);
  const sexRef = useRef<HTMLButtonElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const waistRef = useRef<HTMLInputElement>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, profileRes] = await Promise.all([
        fetch("/api/body-metrics"),
        fetch("/api/body-profile"),
      ]);
      const metricsData = await metricsRes.json() as BodyMetric[];
      setAllMetrics(metricsData);
      if (profileRes.ok) {
        const profileData = await profileRes.json() as UserBodyProfile;
        setProfile(profileData);
      } else {
        setProfile({ id: null, userId: "", dateOfBirth: null, biologicalSex: null, heightCm: null, waistCm: null, waistCmUpdatedAt: null, createdAt: "", updatedAt: "" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  async function handleSave() {
    if (!value) return;
    const config = METRIC_CONFIG.find((m) => m.type === selectedType);
    if (!config) return;

    setSaving(true);
    await fetch("/api/body-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        metricType: selectedType,
        value: parseFloat(value),
        unit: config.unit,
      }),
    });
    setValue("");
    setSaving(false);
    await fetchMetrics();
  }

  function getLatest(type: BodyMetricType) {
    const entries = allMetrics
      .filter((m) => m.metricType === type)
      .sort((a, b) => b.date.localeCompare(a.date));
    return entries[0] ?? null;
  }

  function getTrend(type: BodyMetricType): number | null {
    const entries = allMetrics
      .filter((m) => m.metricType === type)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (entries.length < 2) return null;
    return entries[0].value - entries[1].value;
  }

  function getChartData(type: BodyMetricType) {
    return allMetrics
      .filter((m) => m.metricType === type)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        date: m.date.slice(5),
        value: m.value,
      }));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {METRIC_CONFIG.map((cfg) => {
          const latest = getLatest(cfg.type);
          const trend = getTrend(cfg.type);
          return (
            <Card key={cfg.type}>
              <CardHeader className="pb-2">
                <CardDescription>{cfg.label}</CardDescription>
                <div className="flex items-baseline gap-2">
                  <CardTitle className="text-3xl" style={{ color: palette.color(cfg.paletteKey) }}>
                    {latest ? latest.value : "--"}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {cfg.unit}
                  </span>
                  {trend !== null && (
                    <span className="flex items-center text-xs text-muted-foreground">
                      {trend > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                      ) : trend < 0 ? (
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                      ) : (
                        <Minus className="h-3 w-3 mr-0.5" />
                      )}
                      {trend > 0 ? "+" : ""}
                      {trend.toFixed(1)}
                    </span>
                  )}
                </div>
                {latest && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(latest.date + "T00:00:00"), "MMM d, yyyy")}
                  </p>
                )}
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              {METRIC_CONFIG.map((cfg) => (
                <Button
                  key={cfg.type}
                  variant={selectedType === cfg.type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(cfg.type)}
                  style={
                    selectedType === cfg.type
                      ? { backgroundColor: palette.color(cfg.paletteKey) }
                      : undefined
                  }
                >
                  {cfg.label}
                </Button>
              ))}
            </div>

            {(() => {
              const data = getChartData(selectedType);
              const cfg = METRIC_CONFIG.find((m) => m.type === selectedType)!;
              if (data.length === 0) {
                return (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No {cfg.label.toLowerCase()} data yet.
                  </p>
                );
              }
              return (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11 }}
                      unit={` ${cfg.unit}`}
                    />
                    <Tooltip
                      formatter={(v: number | undefined) => `${v ?? 0} ${cfg.unit}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={palette.color(cfg.paletteKey)}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Log Measurement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Metric</Label>
              <Select
                value={selectedType}
                onValueChange={(v) => setSelectedType(v as BodyMetricType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_CONFIG.map((cfg) => (
                    <SelectItem key={cfg.type} value={cfg.type}>
                      {cfg.label} ({cfg.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  METRIC_CONFIG.find((m) => m.type === selectedType)
                    ?.placeholder
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !value}
              className="w-full"
            >
              {saving ? "Saving..." : "Log Measurement"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AboutYouCard
        profile={profile}
        onProfileUpdate={setProfile}
        dobRef={dobRef}
        sexRef={sexRef}
        heightRef={heightRef}
        waistRef={waistRef}
      />

      <BodyMetricsFeedback
        profile={profile}
        allMetrics={allMetrics}
        dobRef={dobRef}
        sexRef={sexRef}
        heightRef={heightRef}
      />
    </div>
  );
}

// ─── About You card ───────────────────────────────────────────────────────────

interface AboutYouCardProps {
  profile: UserBodyProfile | null;
  onProfileUpdate: (p: UserBodyProfile) => void;
  dobRef: React.RefObject<HTMLInputElement | null>;
  sexRef: React.RefObject<HTMLButtonElement | null>;
  heightRef: React.RefObject<HTMLInputElement | null>;
  waistRef: React.RefObject<HTMLInputElement | null>;
}

function AboutYouCard({ profile, onProfileUpdate, dobRef, sexRef, heightRef, waistRef }: AboutYouCardProps) {
  const today = new Date().toLocaleDateString("sv-SE");

  const [dob, setDob] = useState(profile?.dateOfBirth ?? "");
  const [sex, setSex] = useState<string>(profile?.biologicalSex ?? "");
  const [height, setHeight] = useState(profile?.heightCm != null ? String(profile.heightCm) : "");
  const [waist, setWaist] = useState(profile?.waistCm != null ? String(profile.waistCm) : "");
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync inputs when profile loads (e.g. after fetch)
  useEffect(() => {
    setDob(profile?.dateOfBirth ?? "");
    setSex(profile?.biologicalSex ?? "");
    setHeight(profile?.heightCm != null ? String(profile.heightCm) : "");
    setWaist(profile?.waistCm != null ? String(profile.waistCm) : "");
  }, [profile]);

  async function handleSave() {
    const errors: Record<string, string> = {};

    if (dob && dob > today) errors.dob = "Date of birth cannot be in the future";
    if (height && (isNaN(Number(height)) || Number(height) <= 0)) errors.height = "Height must be a positive number";
    if (waist && (isNaN(Number(waist)) || Number(waist) <= 0)) errors.waist = "Waist must be a positive number";

    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      return;
    }
    setFieldError({});
    setSaveError("");
    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        dateOfBirth: dob || null,
        biologicalSex: sex || null,
        heightCm: height ? Number(height) : null,
        waistCm: waist ? Number(waist) : null,
      };
      const res = await fetch("/api/body-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string } & UserBodyProfile;
      if (!res.ok) {
        const msg = data.error ?? "Something went wrong";
        if (msg.includes("Date of birth")) setFieldError((e) => ({ ...e, dob: msg }));
        else if (msg.includes("Biological sex")) setFieldError((e) => ({ ...e, sex: msg }));
        else if (msg.includes("Height")) setFieldError((e) => ({ ...e, height: msg }));
        else if (msg.includes("Waist")) setFieldError((e) => ({ ...e, waist: msg }));
        else setSaveError(msg);
      } else {
        onProfileUpdate(data);
      }
    } catch {
      setSaveError("Could not save. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const waistUpdatedAt = profile?.waistCmUpdatedAt
    ? format(new Date(profile.waistCmUpdatedAt), "d MMM yyyy")
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">About you</CardTitle>
        <CardDescription>
          These details are optional and are only used to interpret your metrics on this screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bm-dob">Date of birth</Label>
            <Input
              id="bm-dob"
              ref={dobRef}
              type="date"
              max={today}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            {fieldError.dob && <p className="text-xs text-destructive">{fieldError.dob}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bm-sex">Biological sex</Label>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger id="bm-sex" ref={sexRef}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            {fieldError.sex && <p className="text-xs text-destructive">{fieldError.sex}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bm-height">Height <span className="text-muted-foreground font-normal">cm</span></Label>
            <Input
              id="bm-height"
              ref={heightRef}
              type="number"
              step="0.1"
              placeholder="e.g. 175"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
            {fieldError.height && <p className="text-xs text-destructive">{fieldError.height}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bm-waist">
              Waist <span className="text-muted-foreground font-normal">cm</span>{" "}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Input
              id="bm-waist"
              ref={waistRef}
              type="number"
              step="0.1"
              placeholder="e.g. 85"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
            />
            {waistUpdatedAt && !fieldError.waist && (
              <p className="text-xs text-muted-foreground">Last updated {waistUpdatedAt}</p>
            )}
            {fieldError.waist && <p className="text-xs text-destructive">{fieldError.waist}</p>}
          </div>
        </div>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
