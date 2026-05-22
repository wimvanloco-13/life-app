"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Pencil, Archive, GripVertical, ArchiveRestore, Sparkles } from "lucide-react";
import { RoleBadge } from "./role-badge";
import { RoleForm } from "./role-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { Role } from "@/types";

import { DEFAULT_ROLES } from "@/lib/defaults";

export function RoleList() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    const url = showArchived ? "/api/roles?archived=true" : "/api/roles";
    const res = await fetch(url);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRoles(data);
    setLoading(false);
  }, [showArchived]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  async function handleSave(data: {
    name: string;
    description: string;
    color: string;
    isWorkRole: boolean;
  }) {
    if (editingRole) {
      await fetch(`/api/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setFormOpen(false);
    setEditingRole(null);
    await fetchRoles();
  }

  async function seedDefaults() {
    for (const role of DEFAULT_ROLES) {
      await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role),
      });
    }
    await fetchRoles();
  }

  async function handleArchive(role: Role) {
    await fetch(`/api/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: !role.isArchived }),
    });
    await fetchRoles();
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...roles];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, moved);
    setRoles(reordered);
    setDraggedIndex(index);
  }

  async function handleDragEnd() {
    setDraggedIndex(null);
    const activeRoles = roles.filter((r) => !r.isArchived);
    await fetch("/api/roles/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: activeRoles.map((r) => r.id) }),
    });
  }

  const activeRoles = roles.filter((r) => !r.isArchived);
  const archivedRoles = roles.filter((r) => r.isArchived);

  if (loading) {
    return (
      <div className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Life Roles</h1>
          <p className="text-muted-foreground">
            Define the different roles you play in life. Covey recommends 5-7
            roles to maintain balance.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>

      {activeRoles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              No roles defined yet. Covey recommends 5-7 life roles for balance.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Role
              </Button>
              <Button onClick={seedDefaults}>
                <Sparkles className="mr-2 h-4 w-4" />
                Start with Covey Defaults
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Defaults: Professional, Athlete, Partner, Learner, Friend, Individual.
              You can edit or archive them anytime.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeRoles.map((role, index) => (
            <Card
              key={role.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`transition-opacity ${
                draggedIndex === index ? "opacity-50" : ""
              }`}
            >
              <CardHeader className="flex flex-row items-center gap-4 py-3">
                <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
                <div
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <div className="flex-1">
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  {role.description && (
                    <CardDescription className="mt-0.5">
                      {role.description}
                    </CardDescription>
                  )}
                </div>
                <RoleBadge name={role.name} color={role.color} className="hidden sm:inline-flex" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingRole(role);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(role)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {archivedRoles.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="text-muted-foreground"
          >
            {showArchived ? "Hide" : "Show"} archived roles ({archivedRoles.length})
          </Button>
          {showArchived &&
            archivedRoles.map((role) => (
              <Card key={role.id} className="opacity-60">
                <CardHeader className="flex flex-row items-center gap-4 py-3">
                  <div className="h-5 w-5" />
                  <div
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <div className="flex-1">
                    <CardTitle className="text-base text-muted-foreground line-through">
                      {role.name}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleArchive(role)}>
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Restore
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
              </Card>
            ))}
        </div>
      )}

      <RoleForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingRole(null);
        }}
        onSave={handleSave}
        role={editingRole}
      />
    </div>
  );
}
