"use client";

import { useAppStore } from "@/lib/store";
import { formatUSD, formatPct, PF_CONFIG } from "@/lib/utils";

interface Entity { id: string; slug: string; name: string; type: string; color: string }
interface RatioHistory {
  id: string; entityName: string; quarter: string;
  profitPct: number; ownerCompPct: number; taxPct: number; opexPct: number; isCurrent: boolean;
}
interface Owner {
  id: string; ownerName: string; ownershipPct: number;
  entityName: string; entityColor: string; effectiveFrom: string;
}

export function ReportsClient({
  entities, ratioHistory, owners,
}: { entities: Entity[]; ratioHistory: RatioHistory[]; owners: Owner[] }) {
  const currentEntityId = useAppStore((s) => s.currentEntityId);
  const isConsolidated = currentEntityId === "consolidated";

  const filteredRatios = isConsolidated
    ? ratioHistory
    : ratioHistory.filter((r) => {
        const ent = entities.find((e) => e.name === r.entityName);
        return ent?.id === currentEntityId;
      });

  return (
    <div className="max-w-4xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-display text-ink-white">Reports</h1>
        <p className="text-sm text-ink-muted mt-1">
          {isConsolidated ? "Consolidated God View" : entities.find((e) => e.id === currentEntityId)?.name} · FY 2025
        </p>
      </div>

      {/* Quarterly Ratio Versioning */}
      <div className="table-container">
        <div className="card-header">
          <div className="text-sm font-semibold text-ink-white">Quarterly Ratio Versioning</div>
          <p className="text-2xs text-ink-faint mt-0.5">Historical ratios preserved — Q1 reports always reflect Q1 ratios</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              {["Entity", "Quarter", "Profit %", "Owner's Comp %", "Tax %", "OPEX %", "Status"].map((h) => (
                <th key={h} className="table-cell text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRatios.map((r) => (
              <tr key={r.id} className="table-row">
                <td className="table-cell text-sm text-ink-white">{r.entityName}</td>
                <td className="table-cell font-mono text-xs text-accent-blue font-semibold">{r.quarter}</td>
                <td className="table-cell font-mono text-xs" style={{ color: PF_CONFIG.PROFIT.color }}>{formatPct(r.profitPct)}</td>
                <td className="table-cell font-mono text-xs" style={{ color: PF_CONFIG.OWNERS_COMP.color }}>{formatPct(r.ownerCompPct)}</td>
                <td className="table-cell font-mono text-xs" style={{ color: PF_CONFIG.TAX.color }}>{formatPct(r.taxPct)}</td>
                <td className="table-cell font-mono text-xs" style={{ color: PF_CONFIG.OPEX.color }}>{formatPct(r.opexPct)}</td>
                <td className="table-cell">
                  {r.isCurrent ? (
                    <span className="badge bg-accent-green/10 text-accent-green">Active</span>
                  ) : (
                    <span className="badge bg-surface-4 text-ink-faint">Archived</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ownership Registry */}
      <div className="card">
        <div className="card-header">
          <div className="text-sm font-semibold text-ink-white">Ownership Registry</div>
          <p className="text-2xs text-ink-faint mt-0.5">Effective ownership percentages with date tracking</p>
        </div>
        <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {owners.map((o) => (
            <div key={o.id} className="bg-surface-2 rounded-lg p-4 border border-surface-border" style={{ borderLeftColor: o.entityColor, borderLeftWidth: 3 }}>
              <div className="text-sm font-semibold text-ink-white">{o.ownerName}</div>
              <div className="text-2xs mt-0.5" style={{ color: o.entityColor }}>{o.entityName}</div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <div className="text-2xs text-ink-faint">Ownership</div>
                  <div className="text-xl font-bold font-mono text-ink-white">{o.ownershipPct}%</div>
                </div>
                <div className="text-right">
                  <div className="text-2xs text-ink-faint">Since</div>
                  <div className="text-xs text-ink-secondary mt-1">{o.effectiveFrom}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
