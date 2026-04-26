"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { formatUSD } from "@/lib/utils";
import dynamic from "next/dynamic";
import { TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";

const PerformanceChart = dynamic(() => import("./_chart").then((m) => m.PerformanceChart), {
  ssr: false,
  loading: () => <div className="h-[280px] rounded-lg bg-surface-2 animate-pulse" />,
});

const InsightsPanel = dynamic(() => import("./_insights").then((m) => m.InsightsPanel), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="h-6 w-56 rounded shimmer" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0,1,2,3].map((i) => <div key={i} className="card h-36 shimmer" />)}
      </div>
    </div>
  ),
});

interface Entity {
  id: string; slug: string; name: string; type: string; color: string; parentId: string | null;
}

interface DashboardClientProps {
  entities: Entity[];
  monthlyByEntity: Record<string, { month: string; income: number; expenses: number }[]>;
  userRole: string;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getEntityStats(
  entityId: string,
  monthlyByEntity: Record<string, { month: string; income: number; expenses: number }[]>,
  monthKey: string
) {
  const data = monthlyByEntity[entityId] || [];
  const row = data.find((d) => d.month === monthKey);
  const income = row?.income ?? 0;
  const expenses = row?.expenses ?? 0;
  return { income, expenses, profit: income - expenses };
}

function consolidatedStats(
  entityIds: string[],
  monthlyByEntity: Record<string, { month: string; income: number; expenses: number }[]>,
  monthKey: string
) {
  let income = 0, expenses = 0;
  for (const eid of entityIds) {
    const s = getEntityStats(eid, monthlyByEntity, monthKey);
    income += s.income;
    expenses += s.expenses;
  }
  return { income, expenses, profit: income - expenses };
}

export function DashboardClient({ entities, monthlyByEntity, userRole }: DashboardClientProps) {
  const canSeeInsights = userRole === "ADMIN" || userRole === "ACCOUNTS_MANAGER";
  const currentEntityId = useAppStore((s) => s.currentEntityId);
  const isConsolidated = currentEntityId === "consolidated";

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;

  const subBrands = entities.filter((e) => e.type === "SUB_BRAND");
  const allEntityIds = entities.map((e) => e.id);

  const stats = isConsolidated
    ? consolidatedStats(allEntityIds, monthlyByEntity, monthKey)
    : getEntityStats(currentEntityId, monthlyByEntity, monthKey);

  const selectedEntity = entities.find((e) => e.id === currentEntityId);

  const chartData = subBrands.map((e) => {
    const s = getEntityStats(e.id, monthlyByEntity, monthKey);
    return { name: e.name, Income: s.income, Expenses: s.expenses, Profit: s.profit };
  });
  if (subBrands.length > 1) {
    const cs = consolidatedStats(allEntityIds, monthlyByEntity, monthKey);
    chartData.push({ name: "Consolidated", Income: cs.income, Expenses: cs.expenses, Profit: cs.profit });
  }

  function prevMonth() {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  }
  function nextMonth() {
    const future = selectedYear > now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth >= now.getMonth());
    if (future) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-ink-white">
            {isConsolidated ? "Consolidated" : selectedEntity?.name ?? "Dashboard"}
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">Income, Expenses & Profit</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg bg-surface-2 border border-surface-border hover:bg-surface-3 text-ink-secondary">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-1.5 rounded-lg bg-surface-2 border border-surface-border text-sm text-ink-white font-medium min-w-[120px] text-center">
            {MONTHS[selectedMonth]} {selectedYear}
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input py-1.5 text-sm w-24"
          >
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={nextMonth} className="p-1.5 rounded-lg bg-surface-2 border border-surface-border hover:bg-surface-3 text-ink-secondary">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent-green" />
            <div className="text-2xs text-ink-faint uppercase tracking-wider">Income</div>
          </div>
          <div className="text-2xl font-bold font-mono text-accent-green">{formatUSD(stats.income)}</div>
          <div className="text-xs text-ink-faint mt-1">{MONTHS[selectedMonth]} {selectedYear}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-accent-red" />
            <div className="text-2xs text-ink-faint uppercase tracking-wider">Expenses</div>
          </div>
          <div className="text-2xl font-bold font-mono text-accent-red">{formatUSD(stats.expenses)}</div>
          <div className="text-xs text-ink-faint mt-1">{MONTHS[selectedMonth]} {selectedYear}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-accent-blue" />
            <div className="text-2xs text-ink-faint uppercase tracking-wider">Profit</div>
          </div>
          <div className={`text-2xl font-bold font-mono ${stats.profit >= 0 ? "text-accent-blue" : "text-accent-red"}`}>
            {formatUSD(stats.profit)}
          </div>
          <div className="text-xs text-ink-faint mt-1">{MONTHS[selectedMonth]} {selectedYear}</div>
        </div>
      </div>

      {/* Sub-brand breakdown */}
      {(isConsolidated ? subBrands : entities.filter(e => e.id === currentEntityId)).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-3">
            {isConsolidated ? "Sub-Brand Breakdown" : "Entity Summary"} — {MONTHS[selectedMonth]} {selectedYear}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(isConsolidated ? subBrands : entities.filter(e => e.id === currentEntityId)).map((e) => {
              const s = getEntityStats(e.id, monthlyByEntity, monthKey);
              return (
                <div key={e.id} className="card p-4" style={{ borderLeftColor: e.color, borderLeftWidth: 3 }}>
                  <div className="text-sm font-semibold mb-3" style={{ color: e.color }}>{e.name}</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-faint">Income</span>
                      <span className="font-mono text-accent-green">{formatUSD(s.income)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-faint">Expenses</span>
                      <span className="font-mono text-accent-red">{formatUSD(s.expenses)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-surface-border pt-1.5 mt-1.5">
                      <span className="text-ink-secondary font-medium">Profit</span>
                      <span className={`font-mono font-semibold ${s.profit >= 0 ? "text-accent-blue" : "text-accent-red"}`}>
                        {formatUSD(s.profit)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Chart — dynamically loaded */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink-white mb-4">
            Income vs Expenses vs Profit — {MONTHS[selectedMonth]} {selectedYear}
          </div>
          <PerformanceChart data={chartData} />
        </div>
      )}

      {chartData.length === 0 && (
        <div className="card p-10 text-center text-ink-faint">
          No entities configured yet. Go to Settings to create your first entity.
        </div>
      )}

      {/* Financial Health Advisor — Admin + Accounts Manager only */}
      {canSeeInsights && entities.length > 0 && (
        <InsightsPanel
          entities={entities}
          monthlyByEntity={monthlyByEntity}
          currentMonthKey={monthKey}
        />
      )}
    </div>
  );
}
