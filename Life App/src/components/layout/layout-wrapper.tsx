"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { BackupTrigger } from "./backup-trigger";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-10 shrink-0 items-center px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
        <BackupTrigger />
      </SidebarInset>
    </SidebarProvider>
  );
}
