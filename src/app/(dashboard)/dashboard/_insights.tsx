"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Flame,
  Clock, Target, BarChart2, Zap, ShieldAlert, Activity,
  ChevronLeft, ChevronRight,
} from "lucide-react";

interface Entity { id: string; name: string; type: string; color: string }
type MonthlyData = Record<string, { month: string; income: number; expenses: number }[]>;

interface Insight {
  id: string;
  level: "positive" | "warning" | "critical" | "info";
  icon: React.ReactNode;
  title: string;
  narrative: string;
  badge?: string;
  badgeColor?: string;
}

// ── Utility helpers ──────────────────────────────────────────────────────────

function getPrevMonths(upToMonth: string, count: number): string[] {
  const [y, m] = upToMonth.split("-").map(Number);
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

function getMonthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "short", year: "2-digit" });
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number) { return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`; }
function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stdDev(arr: number[]) {
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length || 1));
}

function consolidate(entityIds: string[], data: MonthlyData, months: string[]) {
  return months.map((month) => {
    let income = 0, expenses = 0;
    for (const eid of entityIds) {
      const row = (data[eid] || []).find((d) => d.month === month);
      income += row?.income ?? 0;
      expenses += row?.expenses ?? 0;
    }
    return { month, income, expenses, profit: income - expenses };
  });
}

// ── Insight generators ────────────────────────────────────────────────────────

function revenueMomentum(rows: ReturnType<typeof consolidate>): Insight | null {
  const withData = rows.filter((r) => r.income > 0);
  if (withData.length < 3) return null;

  const recent3 = rows.slice(-3);
  const prior3 = rows.slice(-6, -3);
  const recentAvg = avg(recent3.map((r) => r.income));
  const priorAvg = avg(prior3.filter((r) => r.income > 0).map((r) => r.income));

  if (priorAvg === 0) return null;
  const change = (recentAvg - priorAvg) / priorAvg;

  const last = recent3[recent3.length - 1];
  const prev = recent3[recent3.length - 2];
  const momChange = prev.income > 0 ? (last.income - prev.income) / prev.income : 0;

  if (change > 0.15) {
    return {
      id: "revenue-momentum",
      level: "positive",
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Money Coming In Is Growing Fast",
      narrative: `Your money coming in is going up by ${pct(change)}. You're making about ${fmt(recentAvg)}/month now compared to ${fmt(priorAvg)}/month before. This is great! Keep doing what you're doing. Just make sure you can handle the work if it keeps growing.`,
      badge: pct(change) + " growth",
      badgeColor: "text-accent-green bg-accent-green/10",
    };
  } else if (change > 0.03) {
    return {
      id: "revenue-momentum",
      level: "info",
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Money Coming In Is Growing",
      narrative: `Your money coming in is slowly growing by ${pct(change)}. You're averaging about ${fmt(recentAvg)}/month. This is good, but you could do better. Think about how to make more from your current customers or find ways to grow faster.`,
      badge: pct(change) + " growth",
      badgeColor: "text-accent-blue bg-accent-blue/10",
    };
  } else if (change > -0.05) {
    return {
      id: "revenue-momentum",
      level: "warning",
      icon: <Activity className="w-5 h-5" />,
      title: "Money Coming In Has Stopped Growing",
      narrative: `Your money coming in hasn't changed much — you're still at about ${fmt(recentAvg)}/month. This is fine for now, but if your spending keeps going up while your income stays the same, you'll have a problem. Figure out what's holding you back and fix it before it becomes serious.`,
      badge: "Not growing",
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  } else {
    return {
      id: "revenue-momentum",
      level: "critical",
      icon: <TrendingDown className="w-5 h-5" />,
      title: "Money Coming In Is Falling",
      narrative: `Your money coming in dropped by ${pct(Math.abs(change))} — from ${fmt(priorAvg)}/month down to ${fmt(recentAvg)}/month. This is serious and needs your attention right now. Find out why: Are you losing customers? Is work slowing down? Fix the problem as soon as you can.`,
      badge: pct(change) + " decline",
      badgeColor: "text-accent-red bg-accent-red/10",
    };
  }
}

function expenseDiscipline(rows: ReturnType<typeof consolidate>): Insight | null {
  const active = rows.filter((r) => r.income > 0 || r.expenses > 0);
  if (active.length < 3) return null;

  const recent3 = rows.slice(-3);
  const incomes = recent3.map((r) => r.income);
  const expenses = recent3.map((r) => r.expenses);

  const avgIncome = avg(incomes);
  const avgExpense = avg(expenses);
  if (avgIncome === 0) return null;

  const expenseRatio = avgExpense / avgIncome;

  const prior3 = rows.slice(-6, -3).filter((r) => r.income > 0);
  const priorRatio = prior3.length ? avg(prior3.map((r) => r.expenses / r.income)) : expenseRatio;
  const ratioDelta = expenseRatio - priorRatio;

  if (expenseRatio > 0.9) {
    return {
      id: "expense-discipline",
      level: "critical",
      icon: <Flame className="w-5 h-5" />,
      title: "Spending Is Too High",
      narrative: `You're spending ${(expenseRatio * 100).toFixed(0)}% of what you earn — that's about ${fmt(avgExpense)}/month while you make ${fmt(avgIncome)}/month. You're left with almost nothing. This is very risky. Look at your spending right now and cut what you don't need.`,
      badge: `${(expenseRatio * 100).toFixed(0)}% spending`,
      badgeColor: "text-accent-red bg-accent-red/10",
    };
  } else if (expenseRatio > 0.75) {
    return {
      id: "expense-discipline",
      level: "warning",
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "Spending Is Getting High",
      narrative: `You're spending ${(expenseRatio * 100).toFixed(0)}% of what you earn — about ${fmt(avgExpense)}/month against ${fmt(avgIncome)}/month income. You only keep ${(100 - expenseRatio * 100).toFixed(0)}% after spending. This is tight. Focus on reducing spending that doesn't directly make you money.`,
      badge: `${(expenseRatio * 100).toFixed(0)}% spending`,
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  } else if (expenseRatio < 0.5) {
    return {
      id: "expense-discipline",
      level: "positive",
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "Great Spending Control",
      narrative: `You're only spending ${(expenseRatio * 100).toFixed(0)}% of what you make — about ${fmt(avgExpense)}/month while earning ${fmt(avgIncome)}/month. This means you keep over ${(100 - expenseRatio * 100).toFixed(0)}% of your money. Excellent! You have room to invest in your business or save for the future.`,
      badge: `${(expenseRatio * 100).toFixed(0)}% spending`,
      badgeColor: "text-accent-green bg-accent-green/10",
    };
  }

  return {
    id: "expense-discipline",
    level: "info",
    icon: <BarChart2 className="w-5 h-5" />,
    title: "Spending Is Balanced",
    narrative: `You're spending ${(expenseRatio * 100).toFixed(0)}% of what you make — about ${fmt(avgExpense)}/month against ${fmt(avgIncome)}/month. This is a good balance. You keep ${(100 - expenseRatio * 100).toFixed(0)}% of what you earn.`,
    badge: `${(expenseRatio * 100).toFixed(0)}% spending`,
    badgeColor: "text-accent-blue bg-accent-blue/10",
  };
}

function cashRunway(rows: ReturnType<typeof consolidate>): Insight | null {
  const totalEquity = rows.reduce((s, r) => s + r.profit, 0);
  const recentBurn = avg(rows.slice(-3).map((r) => r.expenses));
  if (recentBurn <= 0) return null;

  const runwayMonths = totalEquity / recentBurn;
  const runwayDays = Math.round(runwayMonths * 30);

  if (runwayMonths < 0) {
    return {
      id: "cash-runway",
      level: "critical",
      icon: <ShieldAlert className="w-5 h-5" />,
      title: "You're Spending More Than You Make",
      narrative: `You've spent more money than you've earned. You need to act now: make more money, spend less, or get money from somewhere else to keep going.`,
      badge: "Emergency",
      badgeColor: "text-accent-red bg-accent-red/10",
    };
  } else if (runwayMonths < 3) {
    return {
      id: "cash-runway",
      level: "critical",
      icon: <Clock className="w-5 h-5" />,
      title: `Only ${runwayDays} Days Left`,
      narrative: `Based on your money saved (${fmt(totalEquity)}) and what you spend each month (${fmt(recentBurn)}), you only have about ${runwayDays} days of money left. This is very serious. You need to make money or cut spending immediately.`,
      badge: `${runwayDays} days left`,
      badgeColor: "text-accent-red bg-accent-red/10",
    };
  } else if (runwayMonths < 6) {
    return {
      id: "cash-runway",
      level: "warning",
      icon: <Clock className="w-5 h-5" />,
      title: `${Math.round(runwayMonths)} Months Left`,
      narrative: `You have about ${Math.round(runwayMonths)} months of money saved. That's getting tight. Work on making more money or spending less so you have more time to grow safely.`,
      badge: `${Math.round(runwayMonths)} months left`,
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  } else if (runwayMonths < 18) {
    return {
      id: "cash-runway",
      level: "info",
      icon: <Clock className="w-5 h-5" />,
      title: `${Math.round(runwayMonths)} Months of Money`,
      narrative: `You have about ${Math.round(runwayMonths)} months of money saved. That's decent. You have time to grow and make smart business decisions.`,
      badge: `${Math.round(runwayMonths)} months`,
      badgeColor: "text-accent-blue bg-accent-blue/10",
    };
  } else {
    return {
      id: "cash-runway",
      level: "positive",
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: `${Math.round(runwayMonths)}+ Months of Money`,
      narrative: `You have over ${Math.round(runwayMonths)} months of money saved. Great position! You can take risks, hire people, or invest in your business without worrying.`,
      badge: `${Math.round(runwayMonths)}+ months`,
      badgeColor: "text-accent-green bg-accent-green/10",
    };
  }
}

function subBrandSpotlight(
  entities: Entity[],
  data: MonthlyData,
  months: string[]
): Insight[] {
  const subBrands = entities.filter((e) => e.type === "SUB_BRAND");
  if (subBrands.length < 2) return [];

  const brandStats = subBrands.map((e) => {
    const rows = months.slice(-3).map((m) => {
      const row = (data[e.id] || []).find((d) => d.month === m);
      return { income: row?.income ?? 0, expenses: row?.expenses ?? 0, profit: (row?.income ?? 0) - (row?.expenses ?? 0) };
    });
    const totalIncome = rows.reduce((s, r) => s + r.income, 0);
    const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
    const avgIncome = avg(rows.map((r) => r.income));
    const prevRows = months.slice(-6, -3).map((m) => {
      const row = (data[e.id] || []).find((d) => d.month === m);
      return row?.income ?? 0;
    });
    const prevAvg = avg(prevRows.filter((v) => v > 0));
    const growth = prevAvg > 0 ? (avgIncome - prevAvg) / prevAvg : 0;
    return { entity: e, totalIncome, totalProfit, avgIncome, growth };
  });

  const active = brandStats.filter((b) => b.totalIncome > 0 || b.totalProfit !== 0);
  if (active.length < 2) return [];

  const sorted = [...active].sort((a, b) => b.totalIncome - a.totalIncome);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const insights: Insight[] = [];

  insights.push({
    id: "best-brand",
    level: best.totalProfit > 0 ? "positive" : "warning",
    icon: <Target className="w-5 h-5" />,
    title: `${best.entity.name} Is Your Best`,
    narrative: `${best.entity.name} makes the most money — ${fmt(best.totalIncome)} in the last 3 months. ${best.totalProfit > 0 ? `You also made ${fmt(best.totalProfit)} in profit.` : `But you lost ${fmt(Math.abs(best.totalProfit))}.`} Keep pushing this one.`,
    badge: fmt(best.totalIncome),
    badgeColor: "text-accent-green bg-accent-green/10",
  });

  if (worst.entity.id !== best.entity.id) {
    const isLossMaking = worst.totalProfit < 0;
    insights.push({
      id: "worst-brand",
      level: isLossMaking ? "critical" : worst.totalIncome < best.totalIncome * 0.3 ? "warning" : "info",
      icon: isLossMaking ? <AlertTriangle className="w-5 h-5" /> : <BarChart2 className="w-5 h-5" />,
      title: isLossMaking ? `${worst.entity.name} Is Losing Money` : `${worst.entity.name} Is Slower`,
      narrative: isLossMaking
        ? `${worst.entity.name} made ${fmt(worst.totalIncome)} but lost ${fmt(Math.abs(worst.totalProfit))} in the last 3 months. A business losing money is a problem. Figure out why and fix it.`
        : `${worst.entity.name} only made ${fmt(worst.totalIncome)} in 3 months — way less than ${best.entity.name}'s ${fmt(best.totalIncome)}. Find out why it's slower and help it grow.`,
      badge: isLossMaking ? `Loss: ${fmt(Math.abs(worst.totalProfit))}` : fmt(worst.totalIncome),
      badgeColor: isLossMaking ? "text-accent-red bg-accent-red/10" : "text-accent-amber bg-accent-amber/10",
    });
  }

  return insights;
}

function revenueStability(rows: ReturnType<typeof consolidate>): Insight | null {
  const revenues = rows.filter((r) => r.income > 0).map((r) => r.income);
  if (revenues.length < 4) return null;

  const mean = avg(revenues);
  const cv = stdDev(revenues) / mean; // coefficient of variation

  if (cv > 0.45) {
    return {
      id: "revenue-stability",
      level: "warning",
      icon: <Zap className="w-5 h-5" />,
      title: "Money Coming In Is Jumpy",
      narrative: `Your money from month to month changes a lot — sometimes ${fmt(Math.min(...revenues))}, sometimes ${fmt(Math.max(...revenues))}. This makes it hard to plan. Try to get more steady work with regular customers instead of one-time projects.`,
      badge: "Unpredictable",
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  } else if (cv < 0.15) {
    return {
      id: "revenue-stability",
      level: "positive",
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "Money Coming In Is Steady",
      narrative: `Your money each month is about the same — between ${fmt(Math.min(...revenues))} and ${fmt(Math.max(...revenues))}. This is great! You can plan better and hire people safely. Keep these customers happy.`,
      badge: "Predictable",
      badgeColor: "text-accent-green bg-accent-green/10",
    };
  }
  return null;
}

function momAlert(rows: ReturnType<typeof consolidate>): Insight | null {
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  if (!last || !prev || prev.income === 0) return null;

  const incomeChange = (last.income - prev.income) / prev.income;
  const expenseChange = prev.expenses > 0 ? (last.expenses - prev.expenses) / prev.expenses : 0;

  if (Math.abs(incomeChange) > 0.3) {
    const positive = incomeChange > 0;
    return {
      id: "mom-alert",
      level: positive ? "positive" : "warning",
      icon: positive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
      title: `Money ${positive ? "Jumped Up" : "Dropped"} ${pct(incomeChange)} This Month`,
      narrative: positive
        ? `Your money went from ${fmt(prev.income)} to ${fmt(last.income)} this month — great! But is this real or a one-time thing? Find out if this is something you can repeat.`
        : `Your money dropped from ${fmt(prev.income)} to ${fmt(last.income)} this month. Find out why before you worry — could be a delayed payment, seasonal, or a real problem.`,
      badge: pct(incomeChange),
      badgeColor: positive ? "text-accent-green bg-accent-green/10" : "text-accent-red bg-accent-red/10",
    };
  }

  if (expenseChange > 0.35 && last.expenses > 500) {
    return {
      id: "mom-alert",
      level: "warning",
      icon: <Flame className="w-5 h-5" />,
      title: `Spending Shot Up ${pct(expenseChange)} This Month`,
      narrative: `Your spending went from ${fmt(prev.expenses)} to ${fmt(last.expenses)} — a big jump. Check if this is a one-time cost (like buying equipment) or a new regular cost. If it's new and regular, you need to know about it.`,
      badge: `+${(expenseChange * 100).toFixed(0)}%`,
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  }

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

const LEVEL_STYLES = {
  positive: "border-l-accent-green bg-accent-green/[0.04]",
  warning:  "border-l-accent-amber bg-accent-amber/[0.04]",
  critical: "border-l-accent-red bg-accent-red/[0.06]",
  info:     "border-l-accent-blue bg-accent-blue/[0.04]",
};

const ICON_COLORS = {
  positive: "text-accent-green",
  warning:  "text-accent-amber",
  critical: "text-accent-red",
  info:     "text-accent-blue",
};

export function InsightsPanel({
  entities,
  monthlyByEntity,
  currentMonthKey,
}: {
  entities: Entity[];
  monthlyByEntity: MonthlyData;
  currentMonthKey: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const insights = useMemo(() => {
    const months = getPrevMonths(currentMonthKey, 9);
    const allEntityIds = entities.map((e) => e.id);
    const rows = consolidate(allEntityIds, monthlyByEntity, months);

    const generated: Insight[] = [];
    const add = (i: Insight | null | Insight[]) => {
      if (!i) return;
      if (Array.isArray(i)) generated.push(...i);
      else generated.push(i);
    };

    add(momAlert(rows));
    add(revenueMomentum(rows));
    add(expenseDiscipline(rows));
    add(cashRunway(rows));
    add(subBrandSpotlight(entities, monthlyByEntity, months));
    add(revenueStability(rows));

    return generated;
  }, [entities, monthlyByEntity, currentMonthKey]);

  // Reset index when insights change (e.g. month selector changes)
  useMemo(() => { setActiveIndex(0); }, [insights]);

  if (insights.length === 0) {
    return (
      <div className="card p-6 text-center text-ink-faint text-sm">
        Record at least 3 months of transactions to unlock financial insights.
      </div>
    );
  }

  const criticalCount = insights.filter((i) => i.level === "critical").length;
  const warningCount  = insights.filter((i) => i.level === "warning").length;
  const clampedIndex  = Math.min(activeIndex, insights.length - 1);

  function prev() { setActiveIndex((i) => Math.max(0, i - 1)); }
  function next() { setActiveIndex((i) => Math.min(insights.length - 1, i + 1)); }

  const insight = insights[clampedIndex];

  return (
    <div className="space-y-3">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-blue" />
            Financial Health Advisor
          </h2>
          <p className="text-xs text-ink-faint mt-0.5">
            Automated analysis · {insights.length} insight{insights.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2.5 py-1 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">
              <AlertTriangle className="w-3 h-3" /> {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2.5 py-1 rounded-full bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
              {warningCount} warning{warningCount > 1 ? "s" : ""}
            </span>
          )}
          {criticalCount === 0 && warningCount === 0 && (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2.5 py-1 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/20">
              <CheckCircle2 className="w-3 h-3" /> All clear
            </span>
          )}
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Slide track */}
        <div className="overflow-hidden rounded-xl">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${clampedIndex * 100}%)` }}
          >
            {insights.map((ins) => (
              <div key={ins.id} className="w-full flex-shrink-0">
                <div className={`card border-l-4 p-5 space-y-3 rounded-xl ${LEVEL_STYLES[ins.level]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex-shrink-0 ${ICON_COLORS[ins.level]}`}>
                        {ins.icon}
                      </div>
                      <span className="text-sm font-semibold text-ink-white leading-tight">
                        {ins.title}
                      </span>
                    </div>
                    {ins.badge && (
                      <span className={`flex-shrink-0 text-2xs font-semibold px-2 py-0.5 rounded-full ${ins.badgeColor}`}>
                        {ins.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-secondary leading-relaxed">
                    {ins.narrative}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Left arrow */}
        <button
          onClick={prev}
          disabled={clampedIndex === 0}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 border border-surface-border text-ink-secondary hover:text-ink-primary hover:bg-surface-3 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
          aria-label="Previous insight"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right arrow */}
        <button
          onClick={next}
          disabled={clampedIndex === insights.length - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 border border-surface-border text-ink-secondary hover:text-ink-primary hover:bg-surface-3 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
          aria-label="Next insight"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {insights.map((ins, i) => (
          <button
            key={ins.id}
            onClick={() => setActiveIndex(i)}
            aria-label={`Go to insight ${i + 1}`}
            className={`transition-all rounded-full ${
              i === clampedIndex
                ? `w-5 h-1.5 ${ins.level === "critical" ? "bg-accent-red" : ins.level === "warning" ? "bg-accent-amber" : ins.level === "positive" ? "bg-accent-green" : "bg-accent-blue"}`
                : "w-1.5 h-1.5 bg-surface-border hover:bg-ink-faint"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
