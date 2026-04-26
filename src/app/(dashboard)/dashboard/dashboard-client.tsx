"use client";

import { useAppStore } from "@/lib/store";
import { formatUSD, PF_CONFIG, type PfAccountKey } from "@/lib/utils";
import { PfAccountCard } from "@/components/dashboard/pf-account-card";
import { SubBrandCharts, ConsolidatedComparisonChart } from "@/components/dashboard/sub-brand-charts";
import { MoneyFlowDiagram } from "@/components/dashboard/money-flow-diagram";
import { AllocationEngine } from "@/components/dashboard/allocation-engine";
import { toast } from "sonner";
import type { UserRole } from "@/types";

interface DashboardData {
  entities: {
    id: string; slug: string; name: string; type: string; color: string;
    currentRatios: { quarter: string; profitPct: number; ownerCompPct: number; taxPct: number; opexPct: number } | null;
  }[];
  pfBalances: Record<string, Record<string, { opening: number; deposits: number; withdrawals: number; balance: number }>>;
  entityMonthly: Record<string, { month: string; income: number; expenses: number }[]>;
  recentTransactions: {
    id: string; date: string; description: string; entityName: string; entityColor: string;
    status: string; category: string | null; hasReceipt: boolean;
    lines: { pfAccount: string | null; entryType: string; amount: number }[];
  }[];
  bankAccounts: { id: string; accountName: string; accountType: string; currency: string; bankName: string | null }[];
}

export function DashboardClient({ data, userRole }: { data: DashboardData; userRole: UserRole }) {
  const currentEntityId = useAppStore((s) => s.currentEntityId);
  const isConsolidated = currentEntityId === "consolidated";

  // Get current entity's PF balances
  const getEntityBalances = (entityId: string) => data.pfBalances[entityId] || {};

  // For consolidated, aggregate all entities
  const consolidatedBalances = (() => {
    const result: Record<string, { opening: number; deposits: number; withdrawals: number; balance: number }> = {};
    for (const pf of ["INCOME", "PROFIT", "OWNERS_COMP", "TAX", "OPEX"]) {
      result[pf] = { opening: 0, deposits: 0, withdrawals: 0, balance: 0 };
      for (const eid of Object.keys(data.pfBalances)) {
        const acc = data.pfBalances[eid]?.[pf];
        if (acc) {
          result[pf].opening += acc.opening;
          result[pf].deposits += acc.deposits;
          result[pf].withdrawals += acc.withdrawals;
          result[pf].balance += acc.balance;
        }
      }
    }
    return result;
  })();

  const balances = isConsolidated ? consolidatedBalances : getEntityBalances(currentEntityId);
  const entity = data.entities.find((e) => e.id === currentEntityId);
  const currentRatios = entity?.currentRatios;

  // Total equity
  const totalEquity = Object.values(balances).reduce((s, a) => s + a.balance, 0);

  // Sub-brand chart data
  const subBrands = data.entities.filter((e) => e.type === "SUB_BRAND");
  const chartData = subBrands.map((e) => ({
    entityName: e.name,
    entityColor: e.color,
    monthlyData: data.entityMonthly[e.id] || [],
  }));

  // Consolidated comparison data
  const comparisonData = data.entities.map((e) => {
    const monthly = data.entityMonthly[e.id] || [];
    return {
      name: e.name,
      income: monthly.reduce((s, m) => s + m.income, 0),
      expenses: monthly.reduce((s, m) => s + m.expenses, 0),
      color: e.color,
    };
  });

  const handleAllocate = (total: number, allocations: Record<string, number>) => {
    toast.success(`Allocated ${formatUSD(total)} across PF accounts`, {
      description: Object.entries(allocations)
        .map(([k, v]) => `${PF_CONFIG[k as PfAccountKey]?.label}: ${formatUSD(v)}`)
        .join(" · "),
    });
  };

  // Filter recent transactions by entity
  const filteredTxns = isConsolidated
    ? data.recentTransactions
    : data.recentTransactions.filter((t) => {
        const ent = data.entities.find((e) => e.name === t.entityName);
        return ent?.id === currentEntityId;
      });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="text-2xs text-ink-faint uppercase tracking-wider">
            {isConsolidated ? "Consolidated Group" : entity?.name} · Total Equity
          </div>
          <div className="text-3xl font-bold text-ink-white font-mono tracking-tight mt-1">
            {formatUSD(totalEquity)}
          </div>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-2xs text-ink-faint">Transactions</div>
            <div className="text-lg font-bold text-ink-white">{filteredTxns.length}</div>
          </div>
          <div>
            <div className="text-2xs text-ink-faint">Quarter</div>
            <div className="text-lg font-bold text-accent-green">{currentRatios?.quarter || "Q2-2025"}</div>
          </div>
        </div>
      </div>

      {/* Money Flow Pipeline */}
      <MoneyFlowDiagram />

      {/* Allocation Engine (only for specific entity) */}
      {!isConsolidated && currentRatios && (
        <AllocationEngine ratios={currentRatios} onAllocate={handleAllocate} />
      )}

      {/* PF Account Cards */}
      <div>
        <h3 className="text-base font-semibold text-ink-white mb-4">Profit First Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {(["INCOME", "PROFIT", "OWNERS_COMP", "TAX", "OPEX"] as const).map((pf) => {
            const acc = balances[pf] || { opening: 0, deposits: 0, withdrawals: 0, balance: 0 };
            const targetPct = currentRatios
              ? pf === "PROFIT" ? currentRatios.profitPct
                : pf === "OWNERS_COMP" ? currentRatios.ownerCompPct
                : pf === "TAX" ? currentRatios.taxPct
                : pf === "OPEX" ? currentRatios.opexPct
                : undefined
              : undefined;

            return (
              <PfAccountCard
                key={pf}
                account={pf}
                opening={acc.opening}
                deposits={acc.deposits}
                withdrawals={acc.withdrawals}
                balance={acc.balance}
                targetPct={targetPct}
                trendData={[acc.opening, acc.opening + acc.deposits * 0.3, acc.opening + acc.deposits * 0.6, acc.balance]}
              />
            );
          })}
        </div>
      </div>

      {/* Sub-Brand Income/Expense Charts */}
      {isConsolidated && chartData.length > 0 && (
        <>
          <SubBrandCharts data={chartData} />
          <ConsolidatedComparisonChart data={comparisonData} />
        </>
      )}

      {/* Recent Transactions Table */}
      <div className="table-container">
        <div className="card-header flex items-center justify-between">
          <div className="text-sm font-semibold text-ink-white">Recent Transactions</div>
          <div className="text-2xs text-ink-faint">{filteredTxns.length} entries</div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                {["Date", "Description", "Entity", "Account", "Amount", "Receipt"].map((h) => (
                  <th key={h} className="table-cell text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTxns.slice(0, 15).map((t) => {
                const primaryLine = t.lines[0];
                const isCredit = primaryLine?.entryType === "CREDIT";
                const totalAmount = t.lines.reduce(
                  (s, l) => s + (l.entryType === "CREDIT" ? l.amount : 0), 0
                ) || t.lines.reduce((s, l) => s + (l.entryType === "DEBIT" ? l.amount : 0), 0);

                return (
                  <tr key={t.id} className="table-row">
                    <td className="table-cell font-mono text-xs text-ink-secondary">{t.date}</td>
                    <td className="table-cell text-ink-white">{t.description}</td>
                    <td className="table-cell">
                      <span
                        className="badge"
                        style={{
                          background: `${t.entityColor}15`,
                          color: t.entityColor,
                          border: `1px solid ${t.entityColor}30`,
                        }}
                      >
                        {t.entityName}
                      </span>
                    </td>
                    <td className="table-cell">
                      {primaryLine?.pfAccount && (
                        <span
                          className="text-xs font-medium"
                          style={{ color: PF_CONFIG[primaryLine.pfAccount as PfAccountKey]?.color }}
                        >
                          {PF_CONFIG[primaryLine.pfAccount as PfAccountKey]?.label}
                        </span>
                      )}
                    </td>
                    <td className={`table-cell font-mono font-semibold ${isCredit ? "text-accent-green" : "text-accent-red"}`}>
                      {isCredit ? "+" : "-"}{formatUSD(totalAmount)}
                    </td>
                    <td className="table-cell">
                      {t.hasReceipt ? (
                        <span className="text-2xs text-accent-green">✓ Attached</span>
                      ) : (
                        <span className="text-2xs text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTxns.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-ink-faint py-10">
                    No transactions yet. Record your first income or expense.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
