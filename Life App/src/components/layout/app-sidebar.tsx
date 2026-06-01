"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  Sun,
  CalendarDays,
  Activity,
  Wallet,
  Mountain,
  Repeat,
  Settings,
  LogOut,
  Users,
  Footprints,
  BookOpen,
  Wind,
  Bookmark,
  ShoppingBag,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import TennisRacket from "@/components/ui/icons/tennis-racket";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { signOut, useSession } from "next-auth/react";
import { LogBigPurchaseDialog } from "@/components/budget/log-big-purchase-dialog";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const LIBRARY_TOPICS: NavItem[] = [
  { title: "Tennis",       href: "/library/tennis",       icon: TennisRacket },
  { title: "Climbing",     href: "/library/climbing",     icon: Mountain },
  { title: "Running",      href: "/library/running",      icon: Footprints },
  { title: "Habit Design", href: "/library/habit-design", icon: BookOpen },
  { title: "Breathing",    href: "/library/breathing",    icon: Wind },
  { title: "Budget",       href: "/library/budget",       icon: PiggyBank },
];

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Daily Focus",
    items: [
      { title: "Today", href: "/today", icon: Sun },
      { title: "Monthly Plan", href: "/monthly-plan", icon: CalendarDays },
    ],
  },
  {
    label: "Life Areas",
    items: [
      { title: "Activities", href: "/activities", icon: Activity },
      { title: "Budget", href: "/budget", icon: Wallet },
      { title: "Goals", href: "/goals", icon: Mountain },
      { title: "Habits", href: "/habits", icon: Repeat },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [momentThreshold, setMomentThreshold] = useState(200);

  const fetchThreshold = useCallback(async () => {
    const res = await fetch("/api/budget-settings");
    if (res.ok) {
      const data = await res.json();
      setMomentThreshold(data.momentThreshold ?? 200);
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetchThreshold()]);
  }, [fetchThreshold]);

  function handleSaved() {
    // Notify the budget dashboard targets panel to refresh parked count
    window.dispatchEvent(new CustomEvent("moment-log-saved"));
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              Life App
            </h1>
            <p className="text-[11px] text-muted-foreground tracking-wide uppercase mt-0.5">
              Put First Things First
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDialogOpen(true)}
            title="Log a big purchase"
            className="shrink-0 h-8 w-8"
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
        </div>
        <LogBigPurchaseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          momentThreshold={momentThreshold}
          onSaved={handleSaved}
        />
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 px-3 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href} className="gap-3">
                          <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 1.8} />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Library */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 px-3 mb-1">
            Library
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LIBRARY_TOPICS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href} className="gap-3">
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 1.8} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <Separator className="my-1" />
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/library/bookmarks"}
                >
                  <Link href="/library/bookmarks" className="gap-3">
                    <Bookmark
                      className="h-4 w-4 shrink-0"
                      strokeWidth={pathname === "/library/bookmarks" ? 2.5 : 1.8}
                    />
                    <span className="text-sm">Bookmarks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/admin")}
              >
                <Link href="/admin/users">
                  <Users className="h-4 w-4" />
                  <span>Users</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <div className="flex items-center justify-between">
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/settings")}
                className="flex-1"
              >
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
