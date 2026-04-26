"use client";

import { useAppStore } from "@/lib/store";
import { Menu } from "lucide-react";
import type { SessionUser } from "@/types";

export function TopBar({ user }: { user: SessionUser }) {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const currentEntityId = useAppStore((s) => s.currentEntityId);

  return (
    <header className="h-14 px-4 lg:px-6 flex items-center justify-between border-b border-surface-border bg-surface-1/80 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="lg:hidden btn-ghost p-2">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-2xs text-ink-faint">
          <span className="uppercase tracking-wider">{user.role.replace(/_/g, " ")}</span>
          <span className="text-surface-border-light">·</span>
          <span>{currentEntityId === "consolidated" ? "All Entities" : currentEntityId}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 text-2xs text-ink-faint px-3 py-1.5 rounded-md bg-surface-2 border border-surface-border">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
        Double-Entry · Soft Delete
      </div>
    </header>
  );
}
