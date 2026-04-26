"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { canAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import {
  LayoutDashboard, Receipt, Wallet, Crown, BarChart3, ArrowLeftRight,
  Upload, Settings, Landmark, ChevronDown, Menu, X, TrendingUp, BookOpen, LogOut,
} from "lucide-react";

interface Entity {
  id: string;
  slug: string;
  name: string;
  type: string;
  color: string;
  parentId: string | null;
}

const NAV_ITEMS = [
  { id: "dashboard",      href: "/dashboard",      label: "Dashboard",      icon: LayoutDashboard,  resource: "dashboard" },
  { id: "income",         href: "/income",         label: "Income",         icon: TrendingUp,       resource: "income" },
  { id: "expenses",       href: "/expenses",       label: "Expenses",       icon: Receipt,          resource: "expenses" },
  { id: "petty-cash",     href: "/petty-cash",     label: "Petty Cash",     icon: Wallet,           resource: "petty_cash" },
  { id: "journals",       href: "/journals",       label: "All Journals",   icon: BookOpen,         resource: "journals" },
  { id: "fund-transfers", href: "/fund-transfers", label: "Fund Transfers", icon: Landmark,         resource: "fund_transfers" },
  { id: "drawings",       href: "/drawings",       label: "Drawings",       icon: Crown,            resource: "drawings" },
  { id: "reports",        href: "/reports",        label: "Reports",        icon: BarChart3,        resource: "reports" },
  { id: "reconciliation", href: "/reconciliation", label: "Reconciliation", icon: ArrowLeftRight,   resource: "reconciliation" },
  { id: "import",         href: "/import",         label: "Bulk Import",    icon: Upload,           resource: "import" },
  { id: "settings",       href: "/settings",       label: "Settings",       icon: Settings,         resource: "settings" },
];

export function Sidebar({ entities, user }: { entities: Entity[]; user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentEntityId, setCurrentEntityId, sidebarOpen, toggleSidebar } = useAppStore();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const visibleNav = NAV_ITEMS.filter((item) => canAccess(user.role, item.resource));

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col",
          "bg-surface-1 border-r border-surface-border transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-surface-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
              <span className="text-brand-400 font-display text-sm">◆</span>
            </div>
            <div>
              <div className="text-sm font-bold text-ink-white tracking-tight font-display">Teamosis</div>
              <div className="text-2xs text-ink-faint uppercase tracking-widest">Accounts</div>
            </div>
          </Link>
          <button onClick={toggleSidebar} className="lg:hidden text-ink-muted hover:text-ink-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entity Selector — hide for Entry Manager */}
        {user.role !== "ENTRY_MANAGER" && (
          <div className="px-3 pt-4 pb-2">
            <label className="text-2xs text-ink-faint uppercase tracking-widest px-2 mb-2 block">Entity</label>
            <div className="relative">
              <select
                value={currentEntityId}
                onChange={(e) => setCurrentEntityId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-2 border border-surface-border rounded-lg text-sm text-ink-primary
                           appearance-none cursor-pointer outline-none focus:border-accent-blue/40"
              >
                <option value="consolidated">⊕ Consolidated View</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.type === "SUB_BRAND" ? "└ " : ""}{e.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/15 font-semibold"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-surface-2 border border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-accent-blue" : "text-ink-faint")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent-blue/15 flex items-center justify-center text-2xs font-bold text-accent-blue flex-shrink-0">
              {user.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-ink-primary truncate">{user.fullName}</div>
              <div className="text-2xs text-ink-faint">{user.role.replace(/_/g, " ")}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md text-ink-faint hover:text-accent-red hover:bg-accent-red/10 transition-colors flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
