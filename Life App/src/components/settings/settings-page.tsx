"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Dumbbell, Clock, Loader2, Check } from "lucide-react";

const SECTIONS = [
  {
    title: "Roles",
    description: "Manage the life roles you want to track",
    href: "/settings/roles",
    icon: Users,
    color: "#3B82F6",
  },
  {
    title: "Activity Types",
    description: "Configure activity types, metrics, and defaults",
    href: "/settings/activity-types",
    icon: Dumbbell,
    color: "#EF4444",
  },
  {
    title: "Scheduler",
    description: "Work hours, distribution rules, and blackout dates",
    href: "/settings/scheduler",
    icon: Clock,
    color: "#8B5CF6",
  },
];

export function SettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("New passwords don't match"); return; }
    if (next.length < 8) { setError("New password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to change password"); return; }
      setSuccess(true);
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-10 animate-fade-up">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your app configuration</p>
      </div>

      <div className="grid gap-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:bg-muted/20">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}15` }}
                >
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="pt-2 border-t border-border/60">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-4">Change password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current password</label>
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="8+ characters"
              className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm new password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={saving || success}
            className="flex items-center gap-2 rounded-[0.625rem] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {success ? <><Check className="h-4 w-4" /> Updated</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
