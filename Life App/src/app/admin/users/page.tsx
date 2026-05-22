"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserPlus, ShieldCheck, ShieldOff, Loader2, Check } from "lucide-react";

interface User {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);

  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.sort((a: User, b: User) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")));
    } catch {
      setError("Could not load user list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Redirect non-admins before rendering any admin UI.
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.replace("/");
    }
  }, [session, status, router]);

  if (status === "loading" || !session || session.user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "Failed to create user"); return; }
      setCreateSuccess(true);
      setUsername("");
      setPassword("");
      setRole("user");
      await fetchUsers();
      setTimeout(() => { setCreateSuccess(false); setShowForm(false); }, 1500);
    } catch {
      setCreateError("Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user: User) {
    setToggling(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Failed to update user"); return; }
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <header className="mb-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
          Admin
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          User Accounts
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {users.length} {users.length === 1 ? "account" : "accounts"} · invite-only
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-[0.625rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* User table */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between py-4 gap-4 animate-fade-up">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{user.username}</span>
                  {user.role === "admin" && (
                    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      admin
                    </span>
                  )}
                  {!user.isActive && (
                    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Joined {formatDate(user.createdAt)}
                </p>
              </div>
              <button
                onClick={() => toggleActive(user)}
                disabled={toggling === user.id}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[0.5rem] transition-colors ${
                  user.isActive
                    ? "text-muted-foreground hover:text-destructive hover:bg-destructive/8"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title={user.isActive ? "Deactivate account" : "Reactivate account"}
              >
                {toggling === user.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : user.isActive ? (
                  <ShieldOff className="h-3.5 w-3.5" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                {user.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create user */}
      <div className="mt-8 pt-8 border-t border-border/60">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add a friend
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 animate-fade-up">
            <h2 className="font-display text-lg font-semibold">New account</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="new-username" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Username
                </label>
                <input
                  id="new-username"
                  type="text"
                  required
                  minLength={2}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alice"
                  className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-role" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </label>
                <select
                  id="new-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "user" | "admin")}
                  className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Temporary password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/50"
              />
              <p className="text-[11px] text-muted-foreground">Share this with your friend. They can change it later in Settings.</p>
            </div>

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={creating || createSuccess}
                className="flex items-center gap-2 rounded-[0.625rem] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createSuccess ? (
                  <><Check className="h-4 w-4" /> Created</>
                ) : creating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                ) : (
                  "Create account"
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setCreateError(""); setUsername(""); setPassword(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
