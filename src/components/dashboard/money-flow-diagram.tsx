"use client";

import { formatUSD, formatBDT } from "@/lib/utils";
import { ArrowRight, Landmark, Building, Wallet, PiggyBank } from "lucide-react";

interface FlowStage {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  amount: number;
  currency: "USD" | "BDT";
  color: string;
}

export function MoneyFlowDiagram({ usdIncome = 15000, exchangeRate = 121.5 }: { usdIncome?: number; exchangeRate?: number }) {
  const bdtAmount = usdIncome * exchangeRate;

  const stages: FlowStage[] = [
    {
      label: "Foreign USD",
      sublabel: "Stripe · PayPal · Wise",
      icon: <Landmark className="w-5 h-5" />,
      amount: usdIncome,
      currency: "USD",
      color: "#10B981",
    },
    {
      label: "BD Bank (USD)",
      sublabel: "DBBL USD Account",
      icon: <Building className="w-5 h-5" />,
      amount: usdIncome,
      currency: "USD",
      color: "#3B82F6",
    },
    {
      label: "BD Bank (BDT)",
      sublabel: `Rate: ৳${exchangeRate}/$1`,
      icon: <Building className="w-5 h-5" />,
      amount: bdtAmount,
      currency: "BDT",
      color: "#8B5CF6",
    },
    {
      label: "PF Accounts",
      sublabel: "Profit · Comp · Tax · OPEX",
      icon: <PiggyBank className="w-5 h-5" />,
      amount: usdIncome,
      currency: "USD",
      color: "#F59E0B",
    },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-ink-white">Income Flow Pipeline</h3>
        <p className="text-2xs text-ink-muted mt-0.5">
          Foreign USD → Bangladesh Banks → Profit First Allocation
        </p>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-center gap-2 min-w-[140px]">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${stage.color}15`, color: stage.color }}
                >
                  {stage.icon}
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-ink-white">{stage.label}</div>
                  <div className="text-2xs text-ink-faint mt-0.5">{stage.sublabel}</div>
                  <div className="text-sm font-bold font-mono mt-1" style={{ color: stage.color }}>
                    {stage.currency === "BDT" ? formatBDT(stage.amount) : formatUSD(stage.amount)}
                  </div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-ink-faint flex-shrink-0 mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
