"use client";

import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Flame,
  Clock, Target, BarChart2, Zap, ShieldAlert, Activity,
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
      title: "Strong Revenue Momentum",
      narrative: `Revenue is accelerating. Your 3-month average of ${fmt(recentAvg)}/mo is ${pct(change)} higher than the prior 3-month average of ${fmt(priorAvg)}/mo. The most recent month saw a ${pct(momChange)} move ${momChange >= 0 ? "up" : "down"} to ${fmt(last.income)}. This kind of consistent upward trajectory is a strong signal — protect it by ensuring your delivery capacity keeps pace with demand.`,
      badge: pct(change) + " vs prior quarter",
      badgeColor: "text-accent-green bg-accent-green/10",
    };
  } else if (change > 0.03) {
    return {
      id: "revenue-momentum",
      level: "info",
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Moderate Revenue Growth",
      narrative: `Revenue is growing steadily at ${pct(change)} over the last two quarters, with a 3-month average of ${fmt(recentAvg)}/mo. Growth is healthy but not exceptional. To accelerate, consider whether existing clients can be upsold or whether a specific sub-brand has untapped capacity that isn't reflected yet.`,
      badge: pct(change) + " vs prior quarter",
      badgeColor: "text-accent-blue bg-accent-blue/10",
    };
  } else if (change > -0.05) {
    return {
      id: "revenue-momentum",
      level: "warning",
      icon: <Activity className="w-5 h-5" />,
      title: "Revenue Has Plateaued",
      narrative: `Revenue has been essentially flat for two consecutive quarters, averaging ${fmt(recentAvg)}/mo — only ${pct(change)} off the prior period. Flat revenue combined with rising costs is a slow leak. Identify whether this is seasonal, a client concentration issue, or a sign of market saturation in one of your sub-brands. Acting now is much easier than acting after a downturn begins.`,
      badge: "Flat (" + pct(change) + ")",
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  } else {
    return {
      id: "revenue-momentum",
      level: "critical",
      icon: <TrendingDown className="w-5 h-5" />,
      title: "Revenue Is Declining",
      narrative: `Revenue has dropped ${pct(Math.abs(change))} comparing the last two 3-month periods — from an average of ${fmt(priorAvg)}/mo down to ${fmt(recentAvg)}/mo. This is a serious signal that requires immediate attention. Investigate whether it's tied to client churn, reduced project volume, or a specific sub-brand. The earlier you address the root cause, the more options you have to recover.`,
      badge: pct(change) + " vs prior quarter",
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
      title: "Expenses Are Consuming Revenue",
      narrative: `Over the last 3 months, expenses have averaged ${fmt(avgExpense)}/mo against revenue of ${fmt(avgIncome)}/mo — a ratio of ${(expenseRatio * 100).toFixed(0)}%. This leaves almost nothing as retained profit. ${ratioDelta > 0.05 ? `Worse, this ratio has increased by ${(ratioDelta * 100).toFixed(0)} percentage points compared to the prior quarter.` : ""} A business operating near 1:1 revenue-to-expense has zero margin for error. Conduct a line-by-line expense audit immediately.`,
      badge: `${(expenseRatio * 100).toFixed(0)}% expense ratio`,
      badgeColor: "text-accent-red bg-accent-red/10",
    };
  } else if (expenseRatio > 0.75) {
    return {
      id: "expense-discipline",
      level: "warning",
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "Expense Ratio Needs Watching",
      narrative: `Expenses are running at ${(expenseRatio * 100).toFixed(0)}% of revenue — averaging ${fmt(avgExpense)}/mo against ${fmt(avgIncome)}/mo income. This isn't critical yet, but a 25% margin is thin for a growth-stage company. ${ratioDelta > 0.03 ? `The ratio has been creeping up (+${(ratioDelta * 100).toFixed(0)}pp vs prior quarter), suggesting expenses are growing faster than revenue.` : "Watch whether this ratio holds or continues to tighten."} Prioritize expenses that directly generate revenue over overhead.`,
      badge: `${(expenseRatio * 100).toFixed(0)}% expense ratio`,
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  } else if (expenseRatio < 0.5) {
    return {
      id: "expense-discipline",
      level: "positive",
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "Strong Cost Discipline",
      narrative: `The company is keeping expenses at ${(expenseRatio * 100).toFixed(0)}% of revenue — averaging ${fmt(avgExpense)}/mo against ${fmt(avgIncome)}/mo. A 50%+ profit margin is exceptional for a service company. This financial discipline gives you significant flexibility to invest in growth, build reserves, or distribute to owners without financial stress. Keep monitoring that this ratio doesn't creep up as you hire or expand operations.`,
      badge: `${(expenseRatio * 100).toFixed(0)}% expense ratio`,
      badgeColor: "text-accent-green bg-accent-green/10",
    };
  }

  return {
    id: "expense-discipline",
    level: "info",
    icon: <BarChart2 className="w-5 h-5" />,
    title: "Expense Ratio Is Healthy",
    narrative: `Expenses are tracking at ${(expenseRatio * 100).toFixed(0)}% of revenue over the last 3 months — ${fmt(avgExpense)}/mo against ${fmt(avgIncome)}/mo. This is a comfortable operating margin. ${Math.abs(ratioDelta) < 0.02 ? "The ratio has been stable, which reflects consistent cost management." : ratioDelta > 0 ? `The ratio has ticked up slightly (+${(ratioDelta * 100).toFixed(0)}pp) — nothing alarming, but worth keeping an eye on.` : `The ratio has actually improved (${(ratioDelta * 100).toFixed(0)}pp) compared to the prior quarter.`}`,
    badge: `${(expenseRatio * 100).toFixed(0)}% expense ratio`,
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
      title: "Company Is Cash-Negative",
      narrative: `Cumulative expenses have exceeded cumulative income in the tracked period. The company is in a net negative equity position based on recorded transactions. This means you are burning through reserves or relying on external funding. Immediate action is needed: either increase revenue, cut costs sharply, or identify the source of capital that's sustaining operations.`,
      badge: "Net negative",
      badgeColor: "text-accent-red bg-accent-red/10",
    };
  } else if (runwayMonths < 3) {
    return {
      id: "cash-runway",
      level: "critical",
      icon: <Clock className="w-5 h-5" />,
      title: `Only ~${runwayDays} Days of Runway`,
      narrative: `Based on cumulative retained earnings of ${fmt(totalEquity)} and a monthly burn rate of ${fmt(recentBurn)}, the company has approximately ${runwayDays} days (${runwayMonths.toFixed(1)} months) of operational runway. This is critically low. You should be actively working to either close new revenue, reduce monthly burn, or secure a capital injection. Do not wait.`,
      badge: `~${runwayDays}d runway`,
      badgeColor: "text-accent-red bg-accent-red/10",
    };
  } else if (runwayMonths < 6) {
    return {
      id: "cash-runway",
      level: "warning",
      icon: <Clock className="w-5 h-5" />,
      title: `~${Math.round(runwayMonths)} Months of Runway`,
      narrative: `With ${fmt(totalEquity)} in cumulative retained earnings and a monthly burn of ${fmt(recentBurn)}, you have roughly ${Math.round(runwayMonths)} months of runway. That's enough breathing room to act, but not to be comfortable. Use this window to either grow revenue or cut non-essential costs. Aim for at least 6 months of runway as a safety buffer.`,
      badge: `~${Math.round(runwayMonths)}mo runway`,
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  } else if (runwayMonths < 18) {
    return {
      id: "cash-runway",
      level: "info",
      icon: <Clock className="w-5 h-5" />,
      title: `${Math.round(runwayMonths)} Months of Runway`,
      narrative: `The company has accumulated ${fmt(totalEquity)} in retained earnings. At the current burn rate of ${fmt(recentBurn)}/mo, that translates to approximately ${Math.round(runwayMonths)} months of runway — a solid position. This buffer gives you strategic options: invest in growth, hire ahead of demand, or simply weather a slowdown if one comes.`,
      badge: `~${Math.round(runwayMonths)}mo runway`,
      badgeColor: "text-accent-blue bg-accent-blue/10",
    };
  } else {
    return {
      id: "cash-runway",
      level: "positive",
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: `Strong: ${Math.round(runwayMonths)}+ Months of Runway`,
      narrative: `With ${fmt(totalEquity)} in retained earnings against a ${fmt(recentBurn)}/mo burn rate, the company has over ${Math.round(runwayMonths)} months of financial runway. This is an enviable position of strength. You can afford to make bolder strategic bets, invest in talent or infrastructure, or begin planning owner distributions without jeopardizing operational stability.`,
      badge: `${Math.round(runwayMonths)}mo+`,
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
    title: `${best.entity.name} Is Leading`,
    narrative: `${best.entity.name} is your top revenue contributor over the last 3 months, generating ${fmt(best.totalIncome)} in revenue with ${best.totalProfit > 0 ? `${fmt(best.totalProfit)} in profit` : `a loss of ${fmt(Math.abs(best.totalProfit))}`}. ${best.growth > 0.1 ? `It's also the fastest growing, up ${pct(best.growth)} vs the prior quarter — a signal that it deserves continued investment.` : best.growth < -0.1 ? `However, its revenue has actually declined ${pct(Math.abs(best.growth))} vs the prior quarter despite leading in absolute terms — watch whether this trend continues.` : "Its performance has been consistent over the period."}`,
    badge: fmt(best.totalIncome) + " / 3mo",
    badgeColor: "text-accent-green bg-accent-green/10",
  });

  if (worst.entity.id !== best.entity.id) {
    const isLossMaking = worst.totalProfit < 0;
    insights.push({
      id: "worst-brand",
      level: isLossMaking ? "critical" : worst.totalIncome < best.totalIncome * 0.3 ? "warning" : "info",
      icon: isLossMaking ? <AlertTriangle className="w-5 h-5" /> : <BarChart2 className="w-5 h-5" />,
      title: isLossMaking ? `${worst.entity.name} Is Loss-Making` : `${worst.entity.name} Is Underperforming`,
      narrative: isLossMaking
        ? `${worst.entity.name} generated ${fmt(worst.totalIncome)} in revenue but ran a loss of ${fmt(Math.abs(worst.totalProfit))} over the last 3 months. A loss-making sub-brand is a drain on the company's overall health — the profits of stronger brands are effectively subsidizing it. Decide whether this is a temporary investment phase or a structural problem that needs to be resolved.`
        : `${worst.entity.name} is generating ${fmt(worst.totalIncome)} over 3 months — significantly behind ${best.entity.name}'s ${fmt(best.totalIncome)}. ${worst.growth < -0.05 ? `Its revenue has also declined ${pct(Math.abs(worst.growth))} versus the prior quarter.` : "While not yet a concern, the gap between your top and bottom performer is worth understanding."} Investigate whether this sub-brand lacks resources, market fit, or simply needs a different sales strategy.`,
      badge: isLossMaking ? `${fmt(Math.abs(worst.totalProfit))} loss` : fmt(worst.totalIncome) + " / 3mo",
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
      title: "Revenue Is Highly Volatile",
      narrative: `Monthly revenue has swung dramatically — ranging from ${fmt(Math.min(...revenues))} to ${fmt(Math.max(...revenues))} with a coefficient of variation of ${(cv * 100).toFixed(0)}%. High volatility makes planning and commitments very difficult. This often signals over-dependence on one-off projects rather than recurring revenue. Consider whether adding retainer-based services or longer-term contracts could reduce this month-to-month uncertainty.`,
      badge: `±${(cv * 100).toFixed(0)}% volatility`,
      badgeColor: "text-accent-amber bg-accent-amber/10",
    };
  } else if (cv < 0.15) {
    return {
      id: "revenue-stability",
      level: "positive",
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "Revenue Is Highly Predictable",
      narrative: `Monthly revenue has been remarkably consistent, ranging from ${fmt(Math.min(...revenues))} to ${fmt(Math.max(...revenues))} with only ${(cv * 100).toFixed(0)}% variation. Predictable revenue is a significant competitive advantage — it allows confident hiring, investment, and planning. This likely reflects strong recurring relationships or retainer agreements. Protect these relationships as a top priority.`,
      badge: `±${(cv * 100).toFixed(0)}% volatility`,
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
      title: `${positive ? "Revenue Jumped" : "Revenue Fell"} ${pct(incomeChange)} This Month`,
      narrative: positive
        ? `Revenue jumped from ${fmt(prev.income)} to ${fmt(last.income)} (${pct(incomeChange)}) this month — the largest single-month move in the tracked period. This is excellent news, but a one-month spike doesn't yet confirm a new trend. Verify whether this is repeatable (new client, launched product) or one-off (large milestone payment, catch-up invoice).`
        : `Revenue dropped from ${fmt(prev.income)} to ${fmt(last.income)} (${pct(incomeChange)}) this month. A ${(Math.abs(incomeChange) * 100).toFixed(0)}% single-month drop is significant. Identify the cause before drawing conclusions — it could be a delayed invoice, a seasonal dip, or a genuine client loss. If it's the latter, act quickly.`,
      badge: pct(incomeChange) + " MoM",
      badgeColor: positive ? "text-accent-green bg-accent-green/10" : "text-accent-red bg-accent-red/10",
    };
  }

  if (expenseChange > 0.35 && last.expenses > 500) {
    return {
      id: "mom-alert",
      level: "warning",
      icon: <Flame className="w-5 h-5" />,
      title: `Expenses Spiked ${pct(expenseChange)} This Month`,
      narrative: `Monthly expenses jumped from ${fmt(prev.expenses)} to ${fmt(last.expenses)} — a ${pct(expenseChange)} increase in a single month. This is larger than typical variation and warrants a review. Check whether this represents a one-time investment (equipment, hiring, project cost) or a new recurring cost line. Unexpected recurring expenses are the most dangerous because they compound over time.`,
      badge: `+${(expenseChange * 100).toFixed(0)}% expenses`,
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
  const insights = useMemo(() => {
    const months = getPrevMonths(currentMonthKey, 9); // up to 9 months back
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

  if (insights.length === 0) {
    return (
      <div className="card p-6 text-center text-ink-faint text-sm">
        Record at least 3 months of transactions to unlock financial insights.
      </div>
    );
  }

  const criticalCount = insights.filter((i) => i.level === "critical").length;
  const warningCount  = insights.filter((i) => i.level === "warning").length;

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-blue" />
            Financial Health Advisor
          </h2>
          <p className="text-xs text-ink-faint mt-0.5">
            Automated analysis based on your last 9 months of transaction data
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

      {/* Insight cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`card border-l-4 p-5 space-y-3 ${LEVEL_STYLES[insight.level]}`}
          >
            {/* Card header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`flex-shrink-0 ${ICON_COLORS[insight.level]}`}>
                  {insight.icon}
                </div>
                <span className="text-sm font-semibold text-ink-white leading-tight">
                  {insight.title}
                </span>
              </div>
              {insight.badge && (
                <span className={`flex-shrink-0 text-2xs font-semibold px-2 py-0.5 rounded-full ${insight.badgeColor}`}>
                  {insight.badge}
                </span>
              )}
            </div>

            {/* Narrative */}
            <p className="text-sm text-ink-secondary leading-relaxed">
              {insight.narrative}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
