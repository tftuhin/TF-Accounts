"use client";

import { cn, formatUSD, formatPct, PF_CONFIG, type PfAccountKey } from "@/lib/utils";
import { TrendingUp, Diamond, Crown, Scale, Settings } from "lucide-react";

const ICONS = { TrendingUp, Diamond, Crown, Scale, Settings };

interface PfCardProps {
  account: PfAccountKey;
  opening: number;
  deposits: number;
  withdrawals: number;
  balance: number;
  targetPct?: number;
  trendData?: number[];
}

export function PfAccountCard({ account, opening, deposits, withdrawals, balance, targetPct, trendData }: PfCardProps) {
  const config = PF_CONFIG[account];
  const Icon = ICONS[config.icon as keyof typeof ICONS] || Settings;
  const pctChange = opening > 0 ? ((balance - opening) / opening) * 100 : 0;
  const isPositive = pctChange >= 0;

  return (
    <div
      className="pf-card group"
      style={{ borderTopColor: config.color, borderTopWidth: "3px" }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${config.color}15` }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink-white">{config.label}</div>
            {targetPct != null && (
              <div className="text-2xs text-ink-faint">Target: {formatPct(targetPct)}</div>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="text-2xl font-bold text-ink-white font-mono tracking-tight mb-4">
          {formatUSD(balance)}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Opening", value: formatUSD(opening), color: "text-ink-secondary" },
            { label: "Deposits", value: `+${formatUSD(deposits)}`, color: "text-accent-green" },
            { label: "Withdrawals", value: `-${formatUSD(withdrawals)}`, color: "text-accent-red" },
            {
              label: "Change",
              value: `${isPositive ? "▲" : "▼"} ${Math.abs(pctChange).toFixed(1)}%`,
              color: isPositive ? "text-accent-green" : "text-accent-red",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-2 rounded-lg px-3 py-2">
              <div className="text-2xs text-ink-faint mb-0.5">{stat.label}</div>
              <div className={cn("text-xs font-mono font-medium", stat.color)}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Mini sparkline */}
        {trendData && trendData.length > 1 && (
          <div className="mt-3 -mx-1">
            <MiniSparkline data={trendData} color={config.color} />
          </div>
        )}
      </div>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const h = 32;
  const w = 200;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#spark-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
