"use client";

import { useState, useMemo } from "react";
import { formatUSD, PF_CONFIG } from "@/lib/utils";

interface Ratios {
  profitPct: number;
  ownerCompPct: number;
  taxPct: number;
  opexPct: number;
  quarter: string;
}

export function AllocationEngine({
  ratios,
  onAllocate,
}: {
  ratios: Ratios;
  onAllocate?: (total: number, allocations: Record<string, number>) => void;
}) {
  const [amount, setAmount] = useState("");

  const allocations = useMemo(() => {
    const val = parseFloat(amount) || 0;
    return {
      PROFIT: val * ratios.profitPct / 100,
      OWNERS_COMP: val * ratios.ownerCompPct / 100,
      TAX: val * ratios.taxPct / 100,
      OPEX: val * ratios.opexPct / 100,
    };
  }, [amount, ratios]);

  const total = parseFloat(amount) || 0;

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink-white">Allocation Engine</h3>
            <p className="text-2xs text-ink-muted mt-0.5">Quarter: {ratios.quarter} · Enter income to auto-split</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex gap-3 mb-5">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter total income (USD)"
            className="input flex-1 font-mono"
          />
          <button
            onClick={() => total > 0 && onAllocate?.(total, allocations)}
            disabled={total <= 0}
            className="btn-primary"
          >
            Allocate
          </button>
        </div>

        {total > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {(["PROFIT", "OWNERS_COMP", "TAX", "OPEX"] as const).map((key) => {
              const config = PF_CONFIG[key];
              const pct = key === "PROFIT" ? ratios.profitPct
                : key === "OWNERS_COMP" ? ratios.ownerCompPct
                : key === "TAX" ? ratios.taxPct
                : ratios.opexPct;

              return (
                <div
                  key={key}
                  className="rounded-lg px-3 py-3 text-center border"
                  style={{
                    background: `${config.color}08`,
                    borderColor: `${config.color}25`,
                  }}
                >
                  <div className="text-2xs font-semibold mb-1" style={{ color: config.color }}>
                    {config.label} ({pct}%)
                  </div>
                  <div className="text-base font-bold font-mono text-ink-white">
                    {formatUSD(allocations[key])}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
